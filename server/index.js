import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { getState, save, saveNow, UPLOAD_DIR, DATA_DIR, id, reference } from './db.js';
import {
  createSession,
  readSession,
  setSessionCookie,
  clearSessionCookie,
  requireAdmin,
  artistPassword,
  throttleLogin,
  resetLoginThrottle,
} from './auth.js';
import { sendMedia, extFor, safeJoin } from './media.js';
import {
  paymentMode,
  paystackEnabled,
  initializeCard,
  verifyCard,
  MOMO_PROVIDERS,
} from './payments.js';

const ROOT = process.cwd();
const PORT = Number(process.env.PORT || 3000);
const DIST = path.join(ROOT, 'dist');
const PUBLIC_MEDIA = path.join(ROOT, 'media');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!paystackEnabled()) return res.sendStatus(200);
  const signature = req.headers['x-paystack-signature'];
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(req.body)
    .digest('hex');
  if (hash !== signature) return res.sendStatus(401);
  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.sendStatus(400);
  }
  if (event.event === 'charge.success') {
    const state = getState();
    const order = state.orders.find((o) => o.reference === event.data?.reference);
    if (order && order.status !== 'paid') {
      markPaid(order, { paidAmount: event.data.amount, channel: event.data.channel });
      saveNow();
    }
  }
  res.sendStatus(200);
});

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ---------------------------------------------------------------- helpers
const PESEWA_MIN = 100; // GHS 1.00
const PESEWA_MAX = 5_000_000; // GHS 50,000
const emailOk = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const clampText = (v, max) => String(v ?? '').trim().slice(0, max);
const toPesewas = (v) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : NaN;
};

// Light in-memory throttle so the public forms can't be used as a spam cannon.
const rateBuckets = new Map();
function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const bucket = rateBuckets.get(key) || { count: 0, reset: now + windowMs };
  if (now > bucket.reset) {
    bucket.count = 0;
    bucket.reset = now + windowMs;
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  if (rateBuckets.size > 5000) rateBuckets.clear();
  return bucket.count <= limit;
}

function slugify(text = '') {
  return (
    String(text)
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'release'
  );
}

function resolveMediaPath(urlPath = '') {
  if (!urlPath || typeof urlPath !== 'string') return null;
  if (urlPath.startsWith('/media/')) return safeJoin(PUBLIC_MEDIA, urlPath.slice('/media/'.length));
  if (urlPath.startsWith('/uploads/')) return safeJoin(UPLOAD_DIR, urlPath.slice('/uploads/'.length));
  return null;
}

function removeMedia(urlPath) {
  const full = resolveMediaPath(urlPath);
  if (full && fs.existsSync(full)) {
    try {
      fs.unlinkSync(full);
    } catch {
      /* ignore */
    }
  }
}

function publicTrack(t) {
  return {
    id: t.id,
    slug: t.slug,
    title: t.title,
    genre: t.genre,
    year: t.year,
    description: t.description,
    credits: t.credits,
    cover: t.cover,
    duration: t.duration,
    minAmount: t.minAmount,
    plays: t.plays,
    downloads: t.downloads,
    featured: Boolean(t.featured),
    allowStream: t.allowStream !== false,
    createdAt: t.createdAt,
    streamUrl: `/api/stream/${t.id}`,
  };
}

function publicVideo(v) {
  return {
    id: v.id,
    title: v.title,
    description: v.description,
    thumb: v.thumb,
    duration: v.duration,
    views: v.views,
    featured: Boolean(v.featured),
    createdAt: v.createdAt,
    src: v.source === 'url' ? v.src : `/api/video/${v.id}`,
    embedSrc: v.source === 'url' ? v.src : null,
  };
}

function publicOrder(o) {
  return {
    reference: o.reference,
    status: o.status,
    amount: o.amount,
    currency: o.currency,
    method: o.method,
    provider: o.provider || null,
    trackTitle: o.trackTitle || 'General support',
    trackId: o.trackId || null,
    supporterName: o.anonymous ? 'Anonymous supporter' : o.supporterName,
    message: o.message || '',
    createdAt: o.createdAt,
    confirmedAt: o.confirmedAt || null,
    demo: Boolean(o.demo),
    downloadToken: o.status === 'paid' && o.trackId ? o.downloadToken || null : null,
  };
}

function computeStats(state) {
  const paid = state.orders.filter((o) => o.status === 'paid');
  const raised = paid.reduce((sum, o) => sum + o.amount, 0);
  const plays = state.tracks.reduce((s, t) => s + (t.plays || 0), 0);
  const views = state.videos.reduce((s, v) => s + (v.views || 0), 0);
  const downloads = state.tracks.reduce((s, t) => s + (t.downloads || 0), 0);
  return {
    raised,
    supporters: paid.length,
    pending: state.orders.filter((o) => o.status === 'pending').length,
    plays,
    views,
    downloads,
    tracks: state.tracks.length,
    videos: state.videos.length,
    average:
      paid.length > 0 ? Math.round(paid.reduce((s, o) => s + o.amount, 0) / paid.length) : 0,
  };
}

function publicWall(state) {
  return state.orders
    .filter((o) => o.status === 'paid' && o.message)
    .sort((a, b) => new Date(b.confirmedAt || b.createdAt) - new Date(a.confirmedAt || a.createdAt))
    .slice(0, 24)
    .map((o) => ({
      id: o.id,
      name: o.anonymous ? 'Anonymous' : o.supporterName,
      message: o.message,
      trackTitle: o.trackTitle || 'General support',
      createdAt: o.confirmedAt || o.createdAt,
      amount: o.anonymous ? null : o.amount,
    }));
}

function getTrack(state, key) {
  return state.tracks.find((t) => t.id === key || t.slug === key);
}

function markPaid(order, extra = {}) {
  order.status = 'paid';
  order.confirmedAt = new Date().toISOString();
  order.downloadToken ||= crypto.randomBytes(18).toString('base64url');
  Object.assign(order, extra);
  return order;
}

// ---------------------------------------------------------------- uploads
const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const map = { audio: 'audio', cover: 'covers', thumb: 'thumbs', video: 'videos' };
      cb(null, path.join(UPLOAD_DIR, map[file.fieldname] || 'covers'));
    },
    filename(req, file, cb) {
      const base = slugify(req.body?.title || file.originalname.replace(/\.[^.]+$/, ''));
      cb(null, `${base}-${crypto.randomBytes(4).toString('hex')}${extFor(file.mimetype, file.originalname)}`);
    },
  }),
  limits: { fileSize: 800 * 1024 * 1024, files: 4 },
  fileFilter(req, file, cb) {
    const groups = {
      audio: ['audio/', 'application/octet-stream'],
      video: ['video/'],
      cover: ['image/'],
      thumb: ['image/'],
    };
    const allowed = groups[file.fieldname] || [];
    if (allowed.some((prefix) => file.mimetype.startsWith(prefix))) return cb(null, true);
    cb(new Error(`Unsupported file type for ${file.fieldname}: ${file.mimetype}`));
  },
});

function uploadedUrl(file) {
  const rel = path.relative(UPLOAD_DIR, file.path).split(path.sep).join('/');
  return `/uploads/${rel}`;
}

// ---------------------------------------------------------------- public API
app.get('/api/health', (req, res) => res.json({ ok: true, mode: paymentMode() }));

app.get('/api/site', (req, res) => {
  const state = getState();
  const stats = computeStats(state);
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    settings: state.settings,
    tracks: state.tracks
      .filter((t) => t.published !== false)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(publicTrack),
    videos: state.videos
      .filter((v) => v.published !== false)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(publicVideo),
    wall: publicWall(state),
    stats,
    paymentMode: paymentMode(),
    momoProviders: MOMO_PROVIDERS,
    minSupport: PESEWA_MIN,
  });
});

app.get('/api/tracks/:key', (req, res) => {
  const state = getState();
  const track = getTrack(state, req.params.key);
  if (!track || track.published === false) return res.status(404).json({ error: 'Track not found' });
  res.json(publicTrack(track));
});

app.post('/api/tracks/:key/play', (req, res) => {
  const state = getState();
  const track = getTrack(state, req.params.key);
  if (!track) return res.status(404).json({ error: 'Track not found' });
  track.plays = (track.plays || 0) + 1;
  save();
  res.json({ plays: track.plays });
});

app.get('/api/stream/:key', (req, res) => {
  const state = getState();
  const track = getTrack(state, req.params.key);
  if (!track || track.published === false) return res.status(404).json({ error: 'Track not found' });
  if (track.allowStream === false) return res.status(403).json({ error: 'Streaming disabled' });
  const full = resolveMediaPath(track.audio);
  if (!full) return res.status(404).json({ error: 'Audio missing' });
  sendMedia(req, res, full, { cache: 'public, max-age=600' });
});

app.get('/api/video/:key', (req, res) => {
  const state = getState();
  const video = state.videos.find((v) => v.id === req.params.key);
  if (!video || video.published === false) return res.status(404).json({ error: 'Video not found' });
  if (video.source !== 'file') return res.redirect(video.src);
  const full = resolveMediaPath(video.src);
  if (!full) return res.status(404).json({ error: 'Video missing' });
  sendMedia(req, res, full, { cache: 'public, max-age=600' });
});

app.post('/api/video/:key/view', (req, res) => {
  const state = getState();
  const video = state.videos.find((v) => v.id === req.params.key);
  if (!video) return res.status(404).json({ error: 'Video not found' });
  video.views = (video.views || 0) + 1;
  save();
  res.json({ views: video.views });
});

// ---- checkout
app.post('/api/orders', async (req, res) => {
  if (!rateLimit(`order:${req.ip}`, 15, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many attempts — please wait a few minutes and try again.' });
  }
  const state = getState();
  const body = req.body || {};
  const method = body.method === 'card' ? 'card' : 'momo';
  const track = body.trackId ? getTrack(state, body.trackId) : null;
  if (body.trackId && !track) return res.status(400).json({ error: 'That release no longer exists.' });
  if (track && track.published === false) return res.status(400).json({ error: 'That release is not available.' });

  const amount = toPesewas(body.amount);
  const floor = Math.max(PESEWA_MIN, track?.minAmount || 0);
  if (!Number.isFinite(amount) || amount < floor) {
    return res.status(400).json({ error: `Minimum support for this is GH₵${(floor / 100).toFixed(0)}.` });
  }
  if (amount > PESEWA_MAX) return res.status(400).json({ error: 'That amount is too large for checkout.' });

  const supporterName = clampText(body.name, 80);
  const email = clampText(body.email, 160).toLowerCase();
  const message = clampText(body.message, 280);
  const anonymous = Boolean(body.anonymous);
  const provider = method === 'momo' ? String(body.provider || 'mtn') : 'card';

  if (!anonymous && supporterName.length < 2) {
    return res.status(400).json({ error: 'Please add the name to show on the supporter wall.' });
  }
  if (method === 'momo' && !MOMO_PROVIDERS[provider]) {
    return res.status(400).json({ error: 'Choose a mobile money network.' });
  }
  if (email && !emailOk(email)) return res.status(400).json({ error: 'That email doesn’t look right.' });
  if (method === 'card' && !email) {
    return res.status(400).json({ error: 'An email is needed for a card receipt.' });
  }

  const order = {
    id: id('ord_'),
    reference: reference(),
    trackId: track?.id || null,
    trackTitle: track?.title || 'General support',
    amount,
    currency: 'GHS',
    method,
    provider,
    supporterName: anonymous ? 'Anonymous supporter' : supporterName,
    email,
    message,
    anonymous,
    status: method === 'momo' ? 'pending' : 'pending',
    demo: false,
    createdAt: new Date().toISOString(),
    confirmedAt: null,
    downloadToken: null,
  };

  if (method === 'card') {
    if (paystackEnabled()) {
      try {
        const origin = `${req.protocol}://${req.get('host')}`;
        const data = await initializeCard({
          amountPesewas: amount,
          email,
          reference: order.reference,
          callbackUrl: `${origin}/api/payments/callback`,
          metadata: { trackId: order.trackId, trackTitle: order.trackTitle, supporter: order.supporterName },
        });
        order.authorizationUrl = data.authorization_url;
        state.orders.push(order);
        saveNow();
        return res.status(201).json({
          reference: order.reference,
          status: order.status,
          mode: 'live',
          authorizationUrl: data.authorization_url,
        });
      } catch (err) {
        return res.status(502).json({ error: `Could not start the card payment: ${err.message}` });
      }
    }
    // Sandbox: simulate a successful card charge.
    order.demo = true;
    order.demoNote = 'Simulated card payment — no money moved.';
    markPaid(order);
    state.orders.push(order);
    saveNow();
    return res.status(201).json({
      reference: order.reference,
      status: order.status,
      mode: 'sandbox',
      demo: true,
      order: publicOrder(order),
    });
  }

  order.status = 'pending';
  state.orders.push(order);
  saveNow();
  return res.status(201).json({
    reference: order.reference,
    status: order.status,
    mode: paymentMode(),
    order: publicOrder(order),
    momo: {
      provider,
      label: MOMO_PROVIDERS[provider].label,
      number: state.settings.momo?.[provider] || '',
      name: state.settings.momo?.name || state.settings.artistName,
      amount,
      reference: order.reference,
    },
  });
});

app.get('/api/orders/:reference', (req, res) => {
  const state = getState();
  const order = state.orders.find((o) => o.reference.toUpperCase() === req.params.reference.toUpperCase());
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    ...publicOrder(order),
    momo: {
      provider: order.provider,
      label: MOMO_PROVIDERS[order.provider]?.label || 'Mobile money',
      number: state.settings.momo?.[order.provider] || '',
      name: state.settings.momo?.name || state.settings.artistName,
    },
  });
});

app.get('/api/download/:token', (req, res) => {
  const state = getState();
  const order = state.orders.find((o) => o.downloadToken && o.downloadToken === req.params.token);
  if (!order || order.status !== 'paid') return res.status(403).json({ error: 'This download link is not active.' });
  const track = order.trackId ? getTrack(state, order.trackId) : null;
  if (!track) return res.status(404).json({ error: 'Release not found' });
  const full = resolveMediaPath(track.audio);
  if (!full) return res.status(404).json({ error: 'Audio missing' });
  track.downloads = (track.downloads || 0) + 1;
  save();
  const ext = path.extname(full) || '.mp3';
  const baseName = track.title
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, ' ') || 'Young Silence';
  sendMedia(req, res, full, {
    downloadName: `${baseName} - Young Silence${ext}`,
    cache: 'private, no-store',
  });
});

app.post('/api/messages', (req, res) => {
  if (!rateLimit(`msg:${req.ip}`, 6, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many messages — give it a few minutes.' });
  }
  const state = getState();
  const body = req.body || {};
  const name = clampText(body.name, 80);
  const email = clampText(body.email, 160).toLowerCase();
  const subject = clampText(body.subject, 120);
  const text = clampText(body.body, 2000);
  if (!name || !emailOk(email) || !text) return res.status(400).json({ error: 'Name, a valid email and a message are required.' });
  state.messages.unshift({
    id: id('msg_'),
    name,
    email,
    subject: subject || 'New message',
    body: text,
    createdAt: new Date().toISOString(),
    read: false,
  });
  state.messages = state.messages.slice(0, 300);
  saveNow();
  res.status(201).json({ ok: true });
});

// ---- paystack return + webhook
app.get('/api/payments/callback', async (req, res) => {
  const state = getState();
  const ref = String(req.query.reference || '');
  const order = state.orders.find((o) => o.reference === ref);
  if (!order) return res.redirect('/thank-you?status=missing');
  try {
    const data = order && (await verifyCard(ref));
    if (data && data.status === 'success' && data.amount >= order.amount) {
      markPaid(order, { paidAmount: data.amount, channel: data.channel });
      saveNow();
      return res.redirect(`/thank-you?ref=${order.reference}`);
    }
  } catch (err) {
    console.error('paystack verify failed', err.message);
  }
  return res.redirect(`/thank-you?status=failed&ref=${order.reference}`);
});


// ---------------------------------------------------------------- studio auth
app.post('/api/admin/login', (req, res) => {
  const ip = req.ip || 'unknown';
  if (!throttleLogin(ip)) return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  const password = String(req.body?.password || '');
  const expected = artistPassword();
  const ok =
    password.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expected));
  if (!ok) return res.status(401).json({ error: 'Wrong password.' });
  resetLoginThrottle(ip);
  setSessionCookie(res, createSession());
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/admin/me', (req, res) => {
  res.json({ authenticated: Boolean(readSession(req)) });
});

// ---------------------------------------------------------------- studio API
app.use('/api/admin', requireAdmin);

app.get('/api/admin/overview', (req, res) => {
  const state = getState();
  const stats = computeStats(state);
  const now = new Date();
  const series = [];
  for (let i = 29; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const next = new Date(day.getTime() + 86400000);
    const total = state.orders
      .filter((o) => o.status === 'paid' && new Date(o.confirmedAt || o.createdAt) >= day && new Date(o.confirmedAt || o.createdAt) < next)
      .reduce((s, o) => s + o.amount, 0);
    series.push({ date: day.toISOString().slice(0, 10), amount: total });
  }
  const paid = state.orders.filter((o) => o.status === 'paid');
  const byMethod = paid.reduce((acc, o) => {
    const key = o.method === 'card' ? 'Card' : MOMO_PROVIDERS[o.provider]?.label || 'Mobile money';
    acc[key] = (acc[key] || 0) + o.amount;
    return acc;
  }, {});
  const byTrack = {};
  for (const o of paid) {
    const key = o.trackTitle || 'General support';
    byTrack[key] = byTrack[key] || { title: key, amount: 0, count: 0 };
    byTrack[key].amount += o.amount;
    byTrack[key].count += 1;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    settings: state.settings,
    tracks: state.tracks,
    videos: state.videos,
    orders: state.orders.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    messages: state.messages,
    stats,
    series,
    byMethod,
    byTrack: Object.values(byTrack).sort((a, b) => b.amount - a.amount),
    paymentMode: paymentMode(),
  });
});

app.patch('/api/admin/settings', (req, res) => {
  const state = getState();
  const body = req.body || {};
  const allowed = [
    'artistName',
    'tagline',
    'intro',
    'bio',
    'city',
    'currency',
    'heroImage',
    'portraitImage',
    'supportNote',
    'announcement',
    'cardEnabled',
    'goalAmount',
    'showRaised',
    'contactEmail',
  ];
  for (const key of allowed) {
    if (body[key] !== undefined) state.settings[key] = body[key];
  }
  if (body.momo && typeof body.momo === 'object') {
    state.settings.momo = { ...state.settings.momo, ...body.momo };
  }
  if (body.socials && typeof body.socials === 'object') {
    state.settings.socials = { ...state.settings.socials, ...body.socials };
  }
  saveNow();
  res.json({ settings: state.settings });
});

// ---- tracks
app.post('/api/admin/tracks', upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), (req, res) => {
  const state = getState();
  const body = req.body || {};
  const title = clampText(body.title, 120);
  if (!title) return res.status(400).json({ error: 'A title is required.' });
  const audioFile = req.files?.audio?.[0];
  const coverFile = req.files?.cover?.[0];
  if (!audioFile) return res.status(400).json({ error: 'Add an audio file (MP3 or WAV).' });

  let baseSlug = slugify(body.slug || title);
  let slug = baseSlug;
  let n = 2;
  while (state.tracks.some((t) => t.slug === slug)) slug = `${baseSlug}-${n++}`;

  const track = {
    id: id('trk_'),
    slug,
    title,
    genre: clampText(body.genre, 60) || 'Afro-fusion',
    year: Number(body.year) || new Date().getFullYear(),
    description: clampText(body.description, 1200),
    credits: clampText(body.credits, 300),
    cover: coverFile ? uploadedUrl(coverFile) : '/media/covers/placeholder.jpg',
    audio: uploadedUrl(audioFile),
    duration: Number(body.duration) || 0,
    minAmount: Math.max(0, toPesewas(body.minAmount) || 0),
    plays: 0,
    downloads: 0,
    featured: body.featured === 'true' || body.featured === true,
    published: body.published !== 'false' && body.published !== false,
    allowStream: body.allowStream !== 'false' && body.allowStream !== false,
    createdAt: new Date().toISOString(),
  };
  if (track.featured) state.tracks.forEach((t) => (t.featured = false));
  state.tracks.unshift(track);
  saveNow();
  res.status(201).json({ track });
});

app.patch('/api/admin/tracks/:id', (req, res) => {
  const state = getState();
  const track = state.tracks.find((t) => t.id === req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });
  const body = req.body || {};
  const fields = ['title', 'genre', 'year', 'description', 'credits', 'minAmount', 'duration', 'featured', 'published', 'allowStream'];
  for (const key of fields) {
    if (body[key] !== undefined) track[key] = body[key];
  }
  if (body.featured === true) state.tracks.forEach((t) => (t.featured = t.id === track.id));
  saveNow();
  res.json({ track });
});

app.post('/api/admin/tracks/:id/cover', upload.single('cover'), (req, res) => {
  const state = getState();
  const track = state.tracks.find((t) => t.id === req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });
  if (!req.file) return res.status(400).json({ error: 'No image uploaded.' });
  removeMedia(track.cover);
  track.cover = uploadedUrl(req.file);
  saveNow();
  res.json({ track });
});

app.delete('/api/admin/tracks/:id', (req, res) => {
  const state = getState();
  const idx = state.tracks.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Track not found' });
  const [track] = state.tracks.splice(idx, 1);
  removeMedia(track.audio);
  removeMedia(track.cover);
  saveNow();
  res.json({ ok: true });
});

// ---- videos
app.post('/api/admin/videos', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumb', maxCount: 1 }]), (req, res) => {
  const state = getState();
  const body = req.body || {};
  const title = clampText(body.title, 140);
  if (!title) return res.status(400).json({ error: 'A title is required.' });
  const videoFile = req.files?.video?.[0];
  const thumbFile = req.files?.thumb?.[0];
  const isUrl = String(body.source || 'file') === 'url';
  if (!isUrl && !videoFile) return res.status(400).json({ error: 'Upload a video file or switch to a link.' });
  if (isUrl && !/^https?:\/\//.test(String(body.url || ''))) {
    return res.status(400).json({ error: 'Enter a valid video URL.' });
  }

  const video = {
    id: id('vid_'),
    title,
    description: clampText(body.description, 1200),
    thumb: thumbFile ? uploadedUrl(thumbFile) : '/media/thumbs/placeholder.jpg',
    source: isUrl ? 'url' : 'file',
    src: isUrl ? String(body.url) : uploadedUrl(videoFile),
    duration: Number(body.duration) || 0,
    views: 0,
    featured: body.featured === 'true' || body.featured === true,
    published: body.published !== 'false' && body.published !== false,
    createdAt: new Date().toISOString(),
  };
  if (video.featured) state.videos.forEach((v) => (v.featured = false));
  state.videos.unshift(video);
  saveNow();
  res.status(201).json({ video });
});

app.patch('/api/admin/videos/:id', (req, res) => {
  const state = getState();
  const video = state.videos.find((v) => v.id === req.params.id);
  if (!video) return res.status(404).json({ error: 'Video not found' });
  const body = req.body || {};
  for (const key of ['title', 'description', 'featured', 'published', 'thumb', 'url']) {
    if (body[key] !== undefined) {
      if (key === 'url') {
        video.src = body.url;
        video.source = 'url';
      } else {
        video[key] = body[key];
      }
    }
  }
  if (body.featured === true) state.videos.forEach((v) => (v.featured = v.id === video.id));
  saveNow();
  res.json({ video });
});

app.delete('/api/admin/videos/:id', (req, res) => {
  const state = getState();
  const idx = state.videos.findIndex((v) => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Video not found' });
  const [video] = state.videos.splice(idx, 1);
  if (video.source === 'file') removeMedia(video.src);
  removeMedia(video.thumb);
  saveNow();
  res.json({ ok: true });
});

// ---- orders
app.patch('/api/admin/orders/:id', (req, res) => {
  const state = getState();
  const order = state.orders.find((o) => o.id === req.params.id || o.reference === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const status = String(req.body?.status || '');
  if (status === 'paid' && order.status !== 'paid') {
    markPaid(order, { confirmedBy: 'artist' });
  } else if (['pending', 'cancelled'].includes(status)) {
    order.status = status;
    if (status === 'cancelled') order.confirmedAt = null;
  }
  saveNow();
  res.json({ order });
});

app.delete('/api/admin/orders/:id', (req, res) => {
  const state = getState();
  const idx = state.orders.findIndex((o) => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });
  state.orders.splice(idx, 1);
  saveNow();
  res.json({ ok: true });
});

app.post('/api/admin/messages/:id/read', (req, res) => {
  const state = getState();
  const msg = state.messages.find((m) => m.id === req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  msg.read = true;
  saveNow();
  res.json({ ok: true });
});

// ---------------------------------------------------------------- static
app.use('/media', express.static(PUBLIC_MEDIA, { maxAge: '7d', fallthrough: true }));
app.use('/uploads/covers', express.static(path.join(UPLOAD_DIR, 'covers'), { maxAge: '7d', fallthrough: true }));
app.use('/uploads/thumbs', express.static(path.join(UPLOAD_DIR, 'thumbs'), { maxAge: '7d', fallthrough: true }));

if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(DIST, 'index.html'));
  });
} else {
  app.get('/', (req, res) =>
    res
      .status(200)
      .send('<h1>Young Silence</h1><p>Frontend not built yet. Run <code>npm run build</code>.</p>')
  );
}

// ---------------------------------------------------------------- errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: 'That file is too large. Audio max 800MB, video max 800MB.',
    };
    return res.status(400).json({ error: messages[err.code] || err.message });
  }
  if (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Something went wrong.' });
  }
  next();
});

app.listen(PORT, '0.0.0.0', () => {
  const state = getState();
  console.log(`Young Silence · listening on http://0.0.0.0:${PORT}`);
  console.log(`Payments: ${paymentMode()} · Studio password: ${process.env.ARTIST_PASSWORD ? 'set via env' : 'youngsilence (default)'}`);
  console.log(`${state.tracks.length} tracks · ${state.videos.length} videos · ${state.orders.length} orders`);
});

// make sure counters are flushed on shutdown
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    saveNow();
    process.exit(0);
  });
}
