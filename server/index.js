import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { MUSIC_PLATFORMS, normalizeStreamingUrl, safeStreamingUrl, videoYouTubeUrl } from '../src/lib/streaming.js';
import { MIN_SUPPORT_PESEWAS, MAX_SUPPORT_PESEWAS, isValidSupportMinimum, supportMinimum, supportPresets } from '../src/lib/support.js';
import { sanitizeTheme } from '../src/lib/theme.js';
import {
  hashPassword,
  verifyPassword,
  publicFan,
  createFanSession,
  readFanSession,
  clearFanCookie,
  setFanCookie,
  requireFan,
  currentFan,
} from './fans.js';
import { getState, save, saveNow, UPLOAD_DIR, DATA_DIR, DATA_DIR_CONFIGURED, BOOT_COUNT, id, reference } from './db.js';
import { capabilities } from './capabilities.js';
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
const PUBLIC_MEDIA = path.join(ROOT, 'public', 'media');

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
      return res.sendStatus(200);
    }
    const merchOrder = findMerchOrder(state, event.data?.reference);
    if (merchOrder && merchOrder.status !== 'paid') {
      markMerchPaid(state, merchOrder, { paidAmount: event.data.amount, channel: event.data.channel });
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
const PESEWA_MIN = MIN_SUPPORT_PESEWAS; // GHS 1.00
const PESEWA_MAX = MAX_SUPPORT_PESEWAS; // GHS 50,000
const emailOk = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const emailValid = (v) => typeof v === 'string' && v.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const clampText = (v, max) => String(v ?? '').trim().slice(0, max);
const toPesewas = (v) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : NaN;
};
const boolSetting = (v) => v === true || v === 'true' || v === 1 || v === '1';
const SUPPORT_MODES = ['open', 'fixed'];
const GLASS_INTENSITIES = ['subtle', 'balanced', 'bold'];
const MAX_SUGGESTED = 6;

/** Only local, bundled or uploaded assets may be used as an image URL. */
function safeAssetPath(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (!v) return '';
  if (v === '/favicon.svg') return v;
  if (/^\/(media|uploads)\/[A-Za-z0-9._\-/]+$/.test(v) && !v.includes('..')) return v;
  return null;
}

/** Artist-curated quick amounts, always legal for the current minimum. */
function normalizeSuggestedAmounts(input, floor) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const value of input) {
    const n = Number(value);
    if (!Number.isSafeInteger(n) || n < floor || n > PESEWA_MAX) continue;
    if (!out.includes(n)) out.push(n);
    if (out.length >= MAX_SUGGESTED) break;
  }
  return out.sort((a, b) => a - b);
}

function publicSupportAmounts(settings, floor) {
  if (settings.supportMode === 'fixed') return [floor];
  const custom = normalizeSuggestedAmounts(settings.suggestedAmounts, floor);
  return custom.length ? custom : supportPresets(floor);
}

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

function adminTrack(track) {
  return { ...track, minAmount: supportMinimum(getState().settings.minSupport) };
}

function publicTrack(t) {
  return {
    ...Object.fromEntries(MUSIC_PLATFORMS.map(({ key }) => [key, safeStreamingUrl(key, t[key])])),
    id: t.id,
    slug: t.slug,
    title: t.title,
    genre: t.genre,
    year: t.year,
    description: t.description,
    credits: t.credits,
    cover: t.cover,
    duration: t.duration,
    // Keep the old response field for clients, but use the artist's global minimum.
    minAmount: supportMinimum(getState().settings.minSupport),
    plays: t.plays,
    downloads: t.downloads,
    featured: Boolean(t.featured),
    allowStream: Boolean(t.audio) && t.allowStream !== false,
    hasDownload: Boolean(t.audio),
    lyrics: t.lyrics || '',
    createdAt: t.createdAt,
    streamUrl: `/api/stream/${t.id}`,
  };
}

function publicEvent(e) {
  return {
    id: e.id,
    title: e.title,
    venue: e.venue,
    city: e.city,
    date: e.date,
    priceNote: e.priceNote || '',
    ticketUrl: e.ticketUrl || '',
    description: e.description || '',
    createdAt: e.createdAt,
  };
}

function publicProduct(p) {
  return {
    id: p.id,
    title: p.title,
    description: p.description || '',
    price: p.price,
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    image: p.image || '/media/covers/placeholder.jpg',
    sold: p.sold || 0,
    createdAt: p.createdAt,
  };
}

function publicMerchOrder(o) {
  return {
    id: o.id,
    reference: o.reference,
    kind: 'merch',
    items: o.items || [],
    amount: o.amount,
    currency: o.currency || 'GHS',
    method: o.method,
    provider: o.provider || null,
    supporterName: o.supporterName,
    email: o.email || '',
    phone: o.phone || '',
    location: o.location || '',
    status: o.status,
    demo: Boolean(o.demo),
    createdAt: o.createdAt,
    confirmedAt: o.confirmedAt || null,
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
    youtubeUrl: videoYouTubeUrl(v),
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
    videoId: o.videoId || null,
    videoTitle: o.videoTitle || null,
    supporterName: o.anonymous ? 'Anonymous supporter' : o.supporterName,
    message: o.message || '',
    createdAt: o.createdAt,
    confirmedAt: o.confirmedAt || null,
    demo: Boolean(o.demo),
    downloadToken:
      o.status === 'paid' && o.trackId && getTrack(getState(), o.trackId)?.audio ? o.downloadToken || null : null,
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
  if (order.trackId && getTrack(getState(), order.trackId)?.audio) {
    order.downloadToken ||= crypto.randomBytes(18).toString('base64url');
  }
  Object.assign(order, extra);
  return order;
}

function findMerchOrder(state, key) {
  return state.merchOrders.find((o) => o.id === key || o.reference.toUpperCase() === String(key).toUpperCase());
}

/** Confirming a merch order also counts the units sold on each product. */
function markMerchPaid(state, order, extra = {}) {
  const wasPaid = order.status === 'paid';
  order.status = 'paid';
  order.confirmedAt = new Date().toISOString();
  Object.assign(order, extra);
  if (!wasPaid) {
    for (const line of order.items || []) {
      const product = state.products.find((p) => p.id === line.productId);
      if (product) product.sold = (product.sold || 0) + (line.qty || 1);
    }
  }
  return order;
}

// ---------------------------------------------------------------- uploads
const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const map = { audio: 'audio', cover: 'covers', thumb: 'thumbs', video: 'videos', product: 'products' };
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
      product: ['image/'],
    };
    const allowed = groups[file.fieldname] || [];
    if (allowed.some((prefix) => file.mimetype.startsWith(prefix))) return cb(null, true);
    const err = new Error(`Unsupported file type for ${file.fieldname}: ${file.mimetype}`);
    err.status = 400;
    cb(err);
  },
});

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

function imageFileFilter(req, file, cb) {
  // SVG is deliberately excluded: an uploaded SVG can carry scripts when used
  // as a favicon or opened directly in a browser tab.
  if (ALLOWED_IMAGE_MIMES.has(file.mimetype)) return cb(null, true);
  const err = new Error('Please choose a JPG, PNG, WebP, GIF or AVIF image.');
  err.status = 400;
  cb(err);
}

const siteUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, path.join(UPLOAD_DIR, 'site'));
    },
    filename(req, file, cb) {
      const wanted = String(req.body?.target || 'hero');
      const target = SITE_IMAGE_TARGETS[wanted] ? wanted : 'hero';
      cb(null, `${target}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}${extFor(file.mimetype, file.originalname) || '.jpg'}`);
    },
  }),
  limits: { fileSize: 18 * 1024 * 1024, files: 1 },
  fileFilter: imageFileFilter,
});

/** One uploader for every picture on the site — see Studio → Media. */
const IMAGE_KIND_DIRS = { site: 'site', track: 'covers', video: 'thumbs', product: 'products' };
const mediaUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const dir = IMAGE_KIND_DIRS[String(req.body?.kind || '')] || 'site';
      cb(null, path.join(UPLOAD_DIR, dir));
    },
    filename(req, file, cb) {
      const kind = IMAGE_KIND_DIRS[String(req.body?.kind || '')] ? String(req.body.kind) : 'site';
      cb(null, `${kind}-${slugify(req.body?.id || 'image')}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}${extFor(file.mimetype, file.originalname) || '.jpg'}`);
    },
  }),
  limits: { fileSize: 18 * 1024 * 1024, files: 1 },
  fileFilter: imageFileFilter,
});

const SITE_IMAGE_TARGETS = {
  hero: { field: 'heroImage', fallback: '/media/hero.jpg', label: 'Homepage hero', group: 'Site branding' },
  portrait: { field: 'portraitImage', fallback: '/media/portrait.jpg', label: 'Portrait photo', group: 'Site branding' },
  logo: { field: 'logoImage', fallback: '', label: 'Logo / brand mark', group: 'Site branding' },
  favicon: { field: 'faviconImage', fallback: '/favicon.svg', label: 'Browser icon', group: 'Site branding' },
};

/** Only delete files the artist uploaded — never the artwork bundled in /media. */
function removeUploadedSiteImage(urlPath) {
  if (typeof urlPath === 'string' && urlPath.startsWith('/uploads/site/')) removeMedia(urlPath);
}

function uploadedUrl(file) {
  const rel = path.relative(UPLOAD_DIR, file.path).split(path.sep).join('/');
  return `/uploads/${rel}`;
}

function discardUploads(files) {
  for (const group of Object.values(files || {})) {
    for (const file of group) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        // An already-removed upload needs no further cleanup.
      }
    }
  }
}

function discardUpload(file) {
  if (!file) return;
  try {
    fs.unlinkSync(file.path);
  } catch {
    /* already removed */
  }
}

function musicLinksFrom(body, partial = false) {
  const links = {};
  for (const { key } of MUSIC_PLATFORMS) {
    if (!partial || body[key] !== undefined) links[key] = normalizeStreamingUrl(key, body[key]);
  }
  return links;
}

function normalizeVideoSource(value) {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Enter a valid video URL.');
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('Enter a valid video URL.');
  }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Enter a valid video URL.');
  }
  const youtube = MUSIC_PLATFORMS.find(({ key }) => key === 'youtubeUrl');
  if (youtube.hosts.includes(url.hostname.toLowerCase())) return normalizeStreamingUrl('youtubeUrl', value);
  return url.href;
}

// ---------------------------------------------------------------- public API
// Deployment probe: `/api/health` tells the studio whether the API in front of
// it is the current build and whether its DATA_DIR survives a restart.
app.get('/api/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, mode: paymentMode(), ...capabilities() });
});

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
    events: state.events
      .filter((e) => e.published !== false)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(publicEvent),
    products: state.products
      .filter((p) => p.published !== false)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(publicProduct),
    wall: publicWall(state),
    stats,
    paymentMode: paymentMode(),
    momoProviders: MOMO_PROVIDERS,
    minSupport: supportMinimum(state.settings.minSupport),
    maxSupport: PESEWA_MAX,
    supportMode: SUPPORT_MODES.includes(state.settings.supportMode) ? state.settings.supportMode : 'open',
    supportAmounts: publicSupportAmounts(state.settings, supportMinimum(state.settings.minSupport)),
    capabilities: capabilities(),
    liquidGlass: state.settings.liquidGlass !== false,
    glassIntensity: GLASS_INTENSITIES.includes(state.settings.glassIntensity)
      ? state.settings.glassIntensity
      : 'balanced',
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
  if (body.trackId && body.videoId) return res.status(400).json({ error: 'Choose a song or a video, not both.' });
  const track = body.trackId ? getTrack(state, body.trackId) : null;
  const video = body.videoId ? state.videos.find((item) => item.id === body.videoId) : null;
  if (body.trackId && !track) return res.status(400).json({ error: 'That release no longer exists.' });
  if (track && track.published === false) return res.status(400).json({ error: 'That release is not available.' });
  if (body.videoId && !video) return res.status(400).json({ error: 'That video no longer exists.' });
  if (video && video.published === false) return res.status(400).json({ error: 'That video is not available.' });

  const amount = Number(body.amount);
  const floor = supportMinimum(state.settings.minSupport);
  if (!Number.isSafeInteger(amount) || amount < floor) {
    return res.status(400).json({ error: `Minimum support is GH₵${(floor / 100).toFixed(2)}.` });
  }
  if (amount > PESEWA_MAX) return res.status(400).json({ error: 'That amount is too large for checkout.' });
  // When the artist sets one price, checkout cannot be used to send any other amount.
  if (state.settings.supportMode === 'fixed' && amount !== floor) {
    return res.status(400).json({ error: `The artist has set one price of GH₵${(floor / 100).toFixed(2)}.` });
  }

  const fan = currentFan(req, state);
  const supporterName = clampText(body.name, 80) || (fan ? fan.name : '');
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
    fanId: fan?.id || null,
    trackId: track?.id || null,
    videoId: video?.id || null,
    videoTitle: video?.title || null,
    trackTitle: track?.title || video?.title || 'General support',
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
          metadata: { trackId: order.trackId, videoId: order.videoId, trackTitle: order.trackTitle, supporter: order.supporterName },
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
  const ref = req.params.reference.toUpperCase();
  const order = state.orders.find((o) => o.reference.toUpperCase() === ref);
  res.setHeader('Cache-Control', 'no-store');
  if (order) {
    return res.json({
      ...publicOrder(order),
      momo: {
        provider: order.provider,
        label: MOMO_PROVIDERS[order.provider]?.label || 'Mobile money',
        number: state.settings.momo?.[order.provider] || '',
        name: state.settings.momo?.name || state.settings.artistName,
      },
    });
  }
  const merchOrder = findMerchOrder(state, ref);
  if (!merchOrder) return res.status(404).json({ error: 'Order not found' });
  return res.json({
    ...publicMerchOrder(merchOrder),
    momo: {
      provider: merchOrder.provider,
      label: MOMO_PROVIDERS[merchOrder.provider]?.label || 'Mobile money',
      number: state.settings.momo?.[merchOrder.provider] || '',
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

// ---- newsletter
app.post('/api/subscribe', (req, res) => {
  if (!rateLimit(`sub:${req.ip}`, 5, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many attempts — give it a few minutes.' });
  }
  const state = getState();
  const email = clampText(req.body?.email, 160).toLowerCase();
  if (!emailOk(email)) return res.status(400).json({ error: 'That email doesn’t look right.' });
  const already = state.subscribers.some((s) => s.email === email);
  if (!already) {
    state.subscribers.unshift({ id: id('sub_'), email, createdAt: new Date().toISOString() });
    state.subscribers = state.subscribers.slice(0, 5000);
    saveNow();
  }
  res.status(201).json({ ok: true, already });
});

// ---------------------------------------------------------------- fan accounts
// Fans can create an account, sign back in, edit their details and see every
// order placed while signed in. These are public endpoints — the fan cookie is
// signed, httpOnly and never accepted by /api/admin.
app.post('/api/fans/register', (req, res) => {
  if (!rateLimit(`fanreg:${req.ip}`, 6, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many sign-ups from here. Try again in a few minutes.' });
  }
  const state = getState();
  const name = clampText(req.body?.name, 80);
  const email = clampText(req.body?.email, 160).toLowerCase();
  const phone = clampText(req.body?.phone, 30);
  const password = String(req.body?.password || '');
  if (name.length < 2) return res.status(400).json({ error: 'Please add your name.' });
  if (!emailValid(email)) return res.status(400).json({ error: 'That email doesn’t look right.' });
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Use a password with at least 8 characters.' });
  }
  if (state.fans.some((fan) => fan.email === email)) {
    return res.status(409).json({ error: 'An account with that email already exists — try signing in.' });
  }
  const now = new Date().toISOString();
  const fan = {
    id: id('fan_'),
    name,
    email,
    phone,
    passwordHash: hashPassword(password),
    sessionVersion: 0,
    createdAt: now,
    lastLoginAt: now,
  };
  state.fans.unshift(fan);
  saveNow();
  setFanCookie(res, createFanSession(fan));
  res.status(201).json({ fan: publicFan(fan) });
});

app.post('/api/fans/login', (req, res) => {
  if (!rateLimit(`fanlogin:${req.ip}`, 10, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
  }
  const state = getState();
  const email = clampText(req.body?.email, 160).toLowerCase();
  const password = String(req.body?.password || '');
  const fan = state.fans.find((item) => item.email === email);
  // The same message for a missing account and a wrong password: no account fishing.
  if (!fan || !verifyPassword(password, fan.passwordHash)) {
    return res.status(401).json({ error: 'That email and password don’t match.' });
  }
  fan.lastLoginAt = new Date().toISOString();
  saveNow();
  setFanCookie(res, createFanSession(fan));
  res.json({ fan: publicFan(fan) });
});

app.post('/api/fans/logout', (req, res) => {
  const state = getState();
  const session = readFanSession(req);
  const fan = session ? (state.fans || []).find((item) => item.id === session.sub) : null;
  if (fan) {
    fan.sessionVersion = (fan.sessionVersion || 0) + 1;
    saveNow();
  }
  clearFanCookie(res);
  res.json({ ok: true });
});

app.get('/api/fans/me', (req, res) => {
  const state = getState();
  const fan = currentFan(req, state);
  if (readFanSession(req) && !fan) clearFanCookie(res);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ fan: fan ? publicFan(fan) : null });
});

app.patch('/api/fans/me', requireFan, (req, res) => {
  const state = getState();
  const fan = currentFan(req, state);
  if (!fan) {
    clearFanCookie(res);
    return res.status(401).json({ error: 'That account is no longer available. Please sign in again.' });
  }
  const body = req.body || {};
  if (body.name !== undefined) {
    const name = clampText(body.name, 80);
    if (name.length < 2) return res.status(400).json({ error: 'Please add your name.' });
    fan.name = name;
  }
  if (body.phone !== undefined) fan.phone = clampText(body.phone, 30);
  if (body.email !== undefined) {
    const email = clampText(body.email, 160).toLowerCase();
    if (!emailValid(email)) return res.status(400).json({ error: 'That email doesn’t look right.' });
    if (state.fans.some((item) => item.id !== fan.id && item.email === email)) {
      return res.status(409).json({ error: 'Another account already uses that email.' });
    }
    fan.email = email;
  }
  saveNow();
  res.json({ fan: publicFan(fan) });
});

app.post('/api/fans/password', requireFan, (req, res) => {
  const state = getState();
  const fan = currentFan(req, state);
  if (!fan) {
    clearFanCookie(res);
    return res.status(401).json({ error: 'That account is no longer available. Please sign in again.' });
  }
  const current = String(req.body?.currentPassword || '');
  const next = String(req.body?.password || '');
  if (!verifyPassword(current, fan.passwordHash)) {
    return res.status(400).json({ error: 'Your current password is not right.' });
  }
  if (next.length < 8 || next.length > 128) {
    return res.status(400).json({ error: 'Use a new password with at least 8 characters.' });
  }
  fan.passwordHash = hashPassword(next);
  fan.sessionVersion = (fan.sessionVersion || 0) + 1;
  setFanCookie(res, createFanSession(fan));
  saveNow();
  res.json({ ok: true });
});

app.get('/api/fans/orders', requireFan, (req, res) => {
  const state = getState();
  const fan = currentFan(req, state);
  if (!fan) return res.status(401).json({ error: 'Sign in to your fan account first.' });
  const support = state.orders
    .filter((order) => order.fanId === fan.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((order) => ({ ...publicOrder(order), kind: 'support' }));
  const merch = state.merchOrders
    .filter((order) => order.fanId === fan.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((order) => ({ ...publicMerchOrder(order), kind: 'merch' }));
  res.setHeader('Cache-Control', 'no-store');
  res.json({ orders: [...support, ...merch].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

// ---- merch checkout
app.post('/api/merch-orders', async (req, res) => {
  if (!rateLimit(`morder:${req.ip}`, 15, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many attempts — please wait a few minutes and try again.' });
  }
  const state = getState();
  const body = req.body || {};
  const method = body.method === 'card' ? 'card' : 'momo';
  const provider = method === 'momo' ? String(body.provider || 'mtn') : 'card';
  if (method === 'momo' && !MOMO_PROVIDERS[provider]) {
    return res.status(400).json({ error: 'Choose a mobile money network.' });
  }

  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 12) : [];
  const items = [];
  for (const line of rawItems) {
    const product = state.products.find((p) => p.id === String(line?.productId || ''));
    if (!product || product.published === false) {
      return res.status(400).json({ error: 'An item in your cart is no longer available.' });
    }
    const qty = Math.min(5, Math.max(1, Math.round(Number(line.qty) || 0)));
    if (!qty) continue;
    const size = String(line.size || '').trim();
    if (product.sizes.length && !product.sizes.includes(size)) {
      return res.status(400).json({ error: `Pick a size for ${product.title}.` });
    }
    items.push({ productId: product.id, title: product.title, size, qty, unitPrice: product.price });
  }
  if (!items.length) return res.status(400).json({ error: 'Your cart is empty.' });

  const amount = items.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
  if (amount > PESEWA_MAX) return res.status(400).json({ error: 'That order is too large for checkout.' });

  const supporterName = clampText(body.name, 80);
  const email = clampText(body.email, 160).toLowerCase();
  const phone = clampText(body.phone, 30);
  const location = clampText(body.location, 200);
  if (supporterName.length < 2) return res.status(400).json({ error: 'Add the name for the delivery.' });
  if (phone.length < 7) return res.status(400).json({ error: 'A working phone number is needed for delivery.' });
  if (email && !emailOk(email)) return res.status(400).json({ error: 'That email doesn’t look right.' });
  if (method === 'card' && !email) return res.status(400).json({ error: 'An email is needed for a card receipt.' });

  const order = {
    id: id('mord_'),
    reference: reference(),
    kind: 'merch',
    fanId: currentFan(req, state)?.id || null,
    items,
    amount,
    currency: 'GHS',
    method,
    provider,
    supporterName,
    email,
    phone,
    location,
    status: 'pending',
    demo: false,
    createdAt: new Date().toISOString(),
    confirmedAt: null,
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
          metadata: { kind: 'merch', items: items.map((i) => `${i.title}${i.size ? ` (${i.size})` : ''} x${i.qty}`) },
        });
        order.authorizationUrl = data.authorization_url;
        state.merchOrders.push(order);
        saveNow();
        return res.status(201).json({ reference: order.reference, status: order.status, mode: 'live', authorizationUrl: data.authorization_url });
      } catch (err) {
        return res.status(502).json({ error: `Could not start the card payment: ${err.message}` });
      }
    }
    order.demo = true;
    order.demoNote = 'Simulated card payment — no money moved.';
    markMerchPaid(state, order);
    state.merchOrders.push(order);
    saveNow();
    return res.status(201).json({ reference: order.reference, status: order.status, mode: 'sandbox', demo: true, order: publicMerchOrder(order) });
  }

  state.merchOrders.push(order);
  saveNow();
  return res.status(201).json({
    reference: order.reference,
    status: order.status,
    mode: paymentMode(),
    order: publicMerchOrder(order),
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

// ---- paystack return + webhook
app.get('/api/payments/callback', async (req, res) => {
  const state = getState();
  const ref = String(req.query.reference || '');
  const order = state.orders.find((o) => o.reference === ref);
  const merchOrder = order ? null : findMerchOrder(state, ref);
  if (!order && !merchOrder) return res.redirect('/thank-you?status=missing');
  const target = order || merchOrder;
  try {
    const data = await verifyCard(ref);
    if (data && data.status === 'success' && data.amount >= target.amount) {
      if (order) markPaid(order, { paidAmount: data.amount, channel: data.channel });
      else markMerchPaid(state, merchOrder, { paidAmount: data.amount, channel: data.channel });
      saveNow();
      return res.redirect(`/thank-you?ref=${target.reference}`);
    }
  } catch (err) {
    console.error('paystack verify failed', err.message);
  }
  return res.redirect(`/thank-you?status=failed&ref=${target.reference}`);
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
  const merchPaid = state.merchOrders.filter((o) => o.status === 'paid');
  const merchStats = {
    revenue: merchPaid.reduce((s, o) => s + o.amount, 0),
    orders: merchPaid.length,
    pending: state.merchOrders.filter((o) => o.status === 'pending').length,
    subscribers: state.subscribers.length,
    events: state.events.length,
    products: state.products.length,
    fans: (state.fans || []).length,
    fanAccounts: (state.fans || []).length,
  };
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    settings: state.settings,
    tracks: state.tracks.map(adminTrack),
    videos: state.videos,
    orders: state.orders.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    messages: state.messages,
    events: state.events.slice().sort((a, b) => new Date(a.date) - new Date(b.date)),
    products: state.products,
    merchOrders: state.merchOrders.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    subscribers: state.subscribers,
    fans: (state.fans || []).map(publicFan),
    merchStats,
    stats,
    series,
    byMethod,
    byTrack: Object.values(byTrack).sort((a, b) => b.amount - a.amount),
    paymentMode: paymentMode(),
    capabilities: capabilities(),
  });
});

app.patch('/api/admin/settings', (req, res) => {
  const state = getState();
  const body = req.body || {};
  if (body.minSupport !== undefined && !isValidSupportMinimum(body.minSupport)) {
    return res.status(400).json({
      error: `Set a minimum between GH₵${(PESEWA_MIN / 100).toFixed(2)} and GH₵${(PESEWA_MAX / 100).toFixed(2)}.`,
    });
  }
  if (body.supportMode !== undefined && !SUPPORT_MODES.includes(body.supportMode)) {
    return res.status(400).json({ error: 'Choose “fans choose” or “one set price”.' });
  }
  if (body.glassIntensity !== undefined && !GLASS_INTENSITIES.includes(body.glassIntensity)) {
    return res.status(400).json({ error: 'Choose a liquid glass intensity.' });
  }
  for (const key of ['heroImage', 'portraitImage', 'logoImage', 'faviconImage']) {
    if (body[key] !== undefined && safeAssetPath(body[key]) === null) {
      return res.status(400).json({ error: `${key} must be a bundled /media or uploaded /uploads image.` });
    }
  }
  const allowed = [
    'artistName',
    'tagline',
    'intro',
    'bio',
    'city',
    'currency',
    'heroImage',
    'portraitImage',
    'logoImage',
    'faviconImage',
    'heroFocus',
    'supportNote',
    'minSupport',
    'supportMode',
    'announcement',
    'cardEnabled',
    'goalAmount',
    'showRaised',
    'contactEmail',
    'liquidGlass',
    'glassIntensity',
  ];
  for (const key of allowed) {
    if (key === 'liquidGlass') {
      if (body[key] !== undefined) state.settings.liquidGlass = boolSetting(body[key]);
    } else if (body[key] !== undefined) {
      state.settings[key] = body[key];
    }
  }
  if (body.suggestedAmounts !== undefined) {
    const floor = supportMinimum(body.minSupport ?? state.settings.minSupport);
    state.settings.suggestedAmounts = normalizeSuggestedAmounts(body.suggestedAmounts, floor);
  }
  // Raising the minimum can never leave an illegal quick amount behind.
  state.settings.suggestedAmounts = normalizeSuggestedAmounts(
    state.settings.suggestedAmounts,
    supportMinimum(state.settings.minSupport)
  );
  if (body.theme !== undefined) {
    try {
      state.settings.theme = { ...(state.settings.theme || {}), ...sanitizeTheme(body.theme) };
      state.settings.themeUpdatedAt = new Date().toISOString();
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }
  if (body.momo && typeof body.momo === 'object') {
    state.settings.momo = { ...state.settings.momo, ...body.momo };
  }
  if (body.socials && typeof body.socials === 'object') {
    state.settings.socials = { ...state.settings.socials, ...body.socials };
  }
  // A save only counts once it is on disk. On a read-only or ephemeral volume
  // we must fail loudly instead of telling the artist the palette was published.
  try {
    saveNow();
  } catch (err) {
    console.error('settings save failed:', err);
    return res.status(500).json({
      error: 'Settings could not be written to disk. Check that DATA_DIR points at writable, persistent storage.',
    });
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json({ settings: state.settings, capabilities: capabilities() });
});

// ---- site imagery (hero + portrait)
app.post('/api/admin/site-images', siteUpload.single('image'), (req, res) => {
  const state = getState();
  const target = SITE_IMAGE_TARGETS[req.body?.target] ? req.body.target : 'hero';
  const meta = SITE_IMAGE_TARGETS[target];
  if (!req.file) return res.status(400).json({ error: 'No image uploaded.' });
  removeUploadedSiteImage(state.settings[meta.field]);
  state.settings[meta.field] = uploadedUrl(req.file);
  state.settings.heroUpdatedAt = new Date().toISOString();
  saveNow();
  res.json({ settings: state.settings, target, url: state.settings[meta.field] });
});

app.delete('/api/admin/site-images/:target', (req, res) => {
  const state = getState();
  const meta = SITE_IMAGE_TARGETS[req.params.target];
  if (!meta) return res.status(400).json({ error: 'Unknown image.' });
  removeUploadedSiteImage(state.settings[meta.field]);
  state.settings[meta.field] = meta.fallback;
  state.settings.heroUpdatedAt = new Date().toISOString();
  saveNow();
  res.json({ settings: state.settings, target: req.params.target, url: meta.fallback });
});

// ---- media library: replace ANY picture on the site from one place
const CONTENT_IMAGE_KINDS = {
  track: { collection: 'tracks', field: 'cover', fallback: '/media/covers/placeholder.jpg' },
  video: { collection: 'videos', field: 'thumb', fallback: '/media/thumbs/placeholder.jpg' },
  product: { collection: 'products', field: 'image', fallback: '/media/covers/placeholder.jpg' },
};

function imageSlots(state) {
  const slot = (key, kind, id, label, group, url, fallback) => ({
    key,
    kind,
    id,
    label,
    group,
    url: url || fallback,
    fallback,
    custom: typeof url === 'string' && url.startsWith('/uploads/'),
  });
  const out = Object.entries(SITE_IMAGE_TARGETS).map(([target, meta]) =>
    slot(`site:${target}`, 'site', target, meta.label, meta.group, state.settings[meta.field], meta.fallback)
  );
  for (const [kind, config] of Object.entries(CONTENT_IMAGE_KINDS)) {
    const group = {
      track: 'Release covers',
      video: 'Video thumbnails',
      product: 'Merch photos',
    }[kind];
    for (const item of state[config.collection] || []) {
      out.push(
        slot(
          `${kind}:${item.id}`,
          kind,
          item.id,
          `${item.title} — ${kind === 'track' ? 'cover' : kind === 'video' ? 'thumbnail' : 'photo'}`,
          group,
          item[config.field],
          config.fallback
        )
      );
    }
  }
  return out;
}

app.get('/api/admin/media', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ slots: imageSlots(getState()) });
});

app.post('/api/admin/media/replace', mediaUpload.single('image'), (req, res) => {
  const state = getState();
  const kind = String(req.body?.kind || '');
  const key = String(req.body?.id || '');
  if (!req.file) return res.status(400).json({ error: 'No image uploaded.' });
  if (!IMAGE_KIND_DIRS[kind]) {
    discardUpload(req.file);
    return res.status(400).json({ error: 'Unknown image kind.' });
  }

  let oldUrl = null;
  const url = uploadedUrl(req.file);
  if (kind === 'site') {
    const meta = SITE_IMAGE_TARGETS[key];
    if (!meta) {
      discardUpload(req.file);
      return res.status(400).json({ error: 'Unknown site image.' });
    }
    oldUrl = state.settings[meta.field];
    state.settings[meta.field] = url;
    state.settings.heroUpdatedAt = new Date().toISOString();
  } else {
    const config = CONTENT_IMAGE_KINDS[kind];
    const item = state[config.collection].find((entry) => entry.id === key);
    if (!item) {
      discardUpload(req.file);
      return res.status(404).json({ error: 'That item no longer exists.' });
    }
    oldUrl = item[config.field];
    item[config.field] = url;
  }
  if (typeof oldUrl === 'string' && oldUrl.startsWith('/uploads/')) removeMedia(oldUrl);
  saveNow();
  res.json({ ok: true, url, slots: imageSlots(state) });
});

app.delete('/api/admin/media/:kind/:id', (req, res) => {
  const state = getState();
  const kind = req.params.kind;
  const key = req.params.id;
  let oldUrl;
  let fallback;
  if (kind === 'site') {
    const meta = SITE_IMAGE_TARGETS[key];
    if (!meta) return res.status(400).json({ error: 'Unknown site image.' });
    oldUrl = state.settings[meta.field];
    fallback = meta.fallback;
    state.settings[meta.field] = fallback;
  } else if (CONTENT_IMAGE_KINDS[kind]) {
    const config = CONTENT_IMAGE_KINDS[kind];
    const item = state[config.collection].find((entry) => entry.id === key);
    if (!item) return res.status(404).json({ error: 'That item no longer exists.' });
    oldUrl = item[config.field];
    fallback = config.fallback;
    item[config.field] = fallback;
  } else {
    return res.status(400).json({ error: 'Unknown image kind.' });
  }
  if (typeof oldUrl === 'string' && oldUrl.startsWith('/uploads/')) removeMedia(oldUrl);
  saveNow();
  res.json({ ok: true, url: fallback, slots: imageSlots(state) });
});

// ---- fan accounts (studio view)
app.get('/api/admin/fans', (req, res) => {
  const state = getState();
  const fans = (state.fans || []).map((fan) => {
    const support = state.orders.filter((order) => order.fanId === fan.id);
    const merch = state.merchOrders.filter((order) => order.fanId === fan.id);
    return {
      ...publicFan(fan),
      orders: support.length + merch.length,
      contributed: support
        .filter((order) => order.status === 'paid')
        .reduce((sum, order) => sum + order.amount, 0),
    };
  });
  res.setHeader('Cache-Control', 'no-store');
  res.json({ fans });
});

app.delete('/api/admin/fans/:id', (req, res) => {
  const state = getState();
  const idx = (state.fans || []).findIndex((fan) => fan.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Fan account not found.' });
  state.fans.splice(idx, 1);
  // Orders stay in the ledger; just remove the link to the deleted account.
  for (const order of state.orders) if (order.fanId === req.params.id) order.fanId = null;
  for (const order of state.merchOrders) if (order.fanId === req.params.id) order.fanId = null;
  saveNow();
  res.json({ ok: true });
});

// ---- tracks
app.post('/api/admin/tracks', upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), (req, res) => {
  const state = getState();
  const body = req.body || {};
  const title = clampText(body.title, 120);
  const audioFile = req.files?.audio?.[0];
  const coverFile = req.files?.cover?.[0];
  if (body.minAmount !== undefined) {
    discardUploads(req.files);
    return res.status(400).json({ error: 'Set the support minimum in Studio → Settings; it applies to all support.' });
  }
  if (!title) {
    discardUploads(req.files);
    return res.status(400).json({ error: 'A title is required.' });
  }
  let streamingLinks;
  try {
    streamingLinks = musicLinksFrom(body);
  } catch (err) {
    discardUploads(req.files);
    return res.status(400).json({ error: err.message });
  }
  if (!audioFile && !Object.values(streamingLinks).some(Boolean)) {
    discardUploads(req.files);
    return res.status(400).json({ error: 'Add an audio file or a streaming platform link.' });
  }

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
    lyrics: clampText(body.lyrics, 8000),
    cover: coverFile ? uploadedUrl(coverFile) : '/media/covers/placeholder.jpg',
    audio: audioFile ? uploadedUrl(audioFile) : '',
    ...streamingLinks,
    duration: Number(body.duration) || 0,
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
  res.status(201).json({ track: adminTrack(track) });
});

app.patch('/api/admin/tracks/:id', (req, res) => {
  const state = getState();
  const track = state.tracks.find((t) => t.id === req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });
  const body = req.body || {};
  if (body.minAmount !== undefined) {
    return res.status(400).json({ error: 'Set the support minimum in Studio → Settings; it applies to all support.' });
  }
  let streamingLinks;
  try {
    streamingLinks = musicLinksFrom(body, true);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  const nextLinks = { ...track, ...streamingLinks };
  if (!track.audio && !MUSIC_PLATFORMS.some(({ key }) => safeStreamingUrl(key, nextLinks[key]))) {
    return res.status(400).json({ error: 'This release needs an audio file or at least one streaming link.' });
  }
  const fields = ['title', 'genre', 'year', 'description', 'credits', 'lyrics', 'duration', 'featured', 'published', 'allowStream'];
  for (const key of fields) {
    if (body[key] !== undefined) track[key] = body[key];
  }
  Object.assign(track, streamingLinks);
  if (body.featured === true) state.tracks.forEach((t) => (t.featured = t.id === track.id));
  saveNow();
  res.json({ track: adminTrack(track) });
});

app.post('/api/admin/tracks/:id/cover', upload.single('cover'), (req, res) => {
  const state = getState();
  const track = state.tracks.find((t) => t.id === req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });
  if (!req.file) return res.status(400).json({ error: 'No image uploaded.' });
  if (track.cover?.startsWith('/uploads/covers/')) removeMedia(track.cover);
  track.cover = uploadedUrl(req.file);
  saveNow();
  res.json({ track: adminTrack(track) });
});

app.delete('/api/admin/tracks/:id', (req, res) => {
  const state = getState();
  const idx = state.tracks.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Track not found' });
  const [track] = state.tracks.splice(idx, 1);
  if (track.audio?.startsWith('/uploads/audio/')) removeMedia(track.audio);
  if (track.cover?.startsWith('/uploads/covers/')) removeMedia(track.cover);
  saveNow();
  res.json({ ok: true });
});

// ---- videos
app.post('/api/admin/videos', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumb', maxCount: 1 }]), (req, res) => {
  const state = getState();
  const body = req.body || {};
  const title = clampText(body.title, 140);
  const videoFile = req.files?.video?.[0];
  const thumbFile = req.files?.thumb?.[0];
  const isUrl = String(body.source || 'file') === 'url';
  if (!title || (!isUrl && !videoFile)) {
    discardUploads(req.files);
    return res.status(400).json({ error: !title ? 'A title is required.' : 'Upload a video file or switch to a link.' });
  }
  let youtubeUrl;
  let sourceUrl;
  try {
    youtubeUrl = normalizeStreamingUrl('youtubeUrl', body.youtubeUrl);
    if (isUrl) sourceUrl = normalizeVideoSource(body.url);
  } catch (err) {
    discardUploads(req.files);
    return res.status(400).json({ error: err.message });
  }
  if (isUrl && videoFile) discardUploads({ video: [videoFile] });

  const video = {
    id: id('vid_'),
    title,
    description: clampText(body.description, 1200),
    thumb: thumbFile ? uploadedUrl(thumbFile) : '/media/thumbs/placeholder.jpg',
    source: isUrl ? 'url' : 'file',
    src: isUrl ? sourceUrl : uploadedUrl(videoFile),
    youtubeUrl,
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
  let youtubeUrl;
  let sourceUrl;
  try {
    if (body.youtubeUrl !== undefined) youtubeUrl = normalizeStreamingUrl('youtubeUrl', body.youtubeUrl);
    if (body.url !== undefined) sourceUrl = normalizeVideoSource(body.url);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  for (const key of ['title', 'description', 'featured', 'published', 'thumb', 'url']) {
    if (body[key] !== undefined) {
      if (key === 'url') {
        video.src = sourceUrl;
        video.source = 'url';
      } else {
        video[key] = body[key];
      }
    }
  }
  if (youtubeUrl !== undefined) video.youtubeUrl = youtubeUrl;
  if (body.featured === true) state.videos.forEach((v) => (v.featured = v.id === video.id));
  saveNow();
  res.json({ video });
});

app.delete('/api/admin/videos/:id', (req, res) => {
  const state = getState();
  const idx = state.videos.findIndex((v) => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Video not found' });
  const [video] = state.videos.splice(idx, 1);
  if (video.source === 'file' && video.src?.startsWith('/uploads/videos/')) removeMedia(video.src);
  if (video.thumb?.startsWith('/uploads/thumbs/')) removeMedia(video.thumb);
  saveNow();
  res.json({ ok: true });
});

// ---- events
app.post('/api/admin/events', (req, res) => {
  const state = getState();
  const body = req.body || {};
  const title = clampText(body.title, 140);
  const venue = clampText(body.venue, 120);
  const city = clampText(body.city, 80);
  const date = new Date(body.date);
  if (!title || !venue || !city || Number.isNaN(date.getTime())) {
    return res.status(400).json({ error: 'Title, venue, city and a valid date are required.' });
  }
  const event = {
    id: id('evt_'),
    title,
    venue,
    city,
    date: date.toISOString(),
    priceNote: clampText(body.priceNote, 120),
    ticketUrl: clampText(body.ticketUrl, 300),
    description: clampText(body.description, 1200),
    published: body.published !== false && body.published !== 'false',
    createdAt: new Date().toISOString(),
  };
  if (event.ticketUrl && !/^https?:\/\//.test(event.ticketUrl)) event.ticketUrl = `https://${event.ticketUrl}`;
  state.events.push(event);
  state.events.sort((a, b) => new Date(a.date) - new Date(b.date));
  saveNow();
  res.status(201).json({ event });
});

app.patch('/api/admin/events/:id', (req, res) => {
  const state = getState();
  const event = state.events.find((e) => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const body = req.body || {};
  for (const key of ['title', 'venue', 'city', 'priceNote', 'ticketUrl', 'description', 'published']) {
    if (body[key] !== undefined) event[key] = body[key];
  }
  if (body.date) {
    const date = new Date(body.date);
    if (!Number.isNaN(date.getTime())) event.date = date.toISOString();
  }
  if (event.ticketUrl && !/^https?:\/\//.test(event.ticketUrl)) event.ticketUrl = `https://${event.ticketUrl}`;
  state.events.sort((a, b) => new Date(a.date) - new Date(b.date));
  saveNow();
  res.json({ event });
});

app.delete('/api/admin/events/:id', (req, res) => {
  const state = getState();
  const idx = state.events.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Event not found' });
  state.events.splice(idx, 1);
  saveNow();
  res.json({ ok: true });
});

// ---- products
app.post('/api/admin/products', upload.single('product'), (req, res) => {
  const state = getState();
  const body = req.body || {};
  const title = clampText(body.title, 140);
  if (!title) return res.status(400).json({ error: 'A product name is required.' });
  const price = toPesewas(body.price);
  if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ error: 'Set a price in cedis.' });
  const sizes = String(body.sizes || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
  const product = {
    id: id('prd_'),
    title,
    description: clampText(body.description, 1200),
    price,
    sizes,
    image: req.file ? uploadedUrl(req.file) : '/media/covers/placeholder.jpg',
    published: body.published !== 'false' && body.published !== false,
    sold: 0,
    createdAt: new Date().toISOString(),
  };
  state.products.unshift(product);
  saveNow();
  res.status(201).json({ product });
});

app.patch('/api/admin/products/:id', (req, res) => {
  const state = getState();
  const product = state.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const body = req.body || {};
  for (const key of ['title', 'description', 'published']) {
    if (body[key] !== undefined) product[key] = body[key];
  }
  if (body.price !== undefined) {
    const price = toPesewas(body.price);
    if (Number.isFinite(price) && price > 0) product.price = price;
  }
  if (body.sizes !== undefined) {
    product.sizes = String(body.sizes)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  saveNow();
  res.json({ product });
});

app.post('/api/admin/products/:id/image', upload.single('product'), (req, res) => {
  const state = getState();
  const product = state.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (!req.file) return res.status(400).json({ error: 'No image uploaded.' });
  if (product.image?.startsWith('/uploads/products/')) removeMedia(product.image);
  product.image = uploadedUrl(req.file);
  saveNow();
  res.json({ product });
});

app.delete('/api/admin/products/:id', (req, res) => {
  const state = getState();
  const idx = state.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  const [product] = state.products.splice(idx, 1);
  if (product.image?.startsWith('/uploads/products/')) removeMedia(product.image);
  saveNow();
  res.json({ ok: true });
});

// ---- merch orders
app.patch('/api/admin/merch-orders/:id', (req, res) => {
  const state = getState();
  const order = findMerchOrder(state, req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const status = String(req.body?.status || '');
  if (status === 'paid' && order.status !== 'paid') {
    markMerchPaid(state, order, { confirmedBy: 'artist' });
  } else if (['pending', 'cancelled'].includes(status)) {
    order.status = status;
    if (status === 'cancelled') order.confirmedAt = null;
  }
  saveNow();
  res.json({ order: publicMerchOrder(order) });
});

app.delete('/api/admin/merch-orders/:id', (req, res) => {
  const state = getState();
  const idx = state.merchOrders.findIndex((o) => o.id === req.params.id || o.reference === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });
  state.merchOrders.splice(idx, 1);
  saveNow();
  res.json({ ok: true });
});

// ---- subscribers
app.get('/api/admin/subscribers/export', (req, res) => {
  const state = getState();
  const rows = [['email', 'subscribed_at']].concat(
    state.subscribers.map((s) => [s.email, new Date(s.createdAt).toISOString()])
  );
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="newsletter-subscribers.csv"');
  res.send(csv);
});

app.delete('/api/admin/subscribers/:id', (req, res) => {
  const state = getState();
  const idx = state.subscribers.findIndex((s) => s.id === req.params.id || s.email === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Subscriber not found' });
  state.subscribers.splice(idx, 1);
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
app.use('/uploads/site', express.static(path.join(UPLOAD_DIR, 'site'), { maxAge: '1h', fallthrough: true }));
app.use('/uploads/products', express.static(path.join(UPLOAD_DIR, 'products'), { maxAge: '7d', fallthrough: true }));

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
  if (err.status && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: err.message || 'Bad request.' });
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
  console.log(`API build: ${capabilities().version} · theme storage: on`);
  console.log(
    `Data: ${DATA_DIR} · boot #${BOOT_COUNT} on this volume · ${DATA_DIR_CONFIGURED ? 'DATA_DIR configured' : 'default ./data (set DATA_DIR to a persistent volume in production)'}`
  );
  if (!DATA_DIR_CONFIGURED) {
    console.warn('WARNING: DATA_DIR is not set. On ephemeral hosts settings, themes and uploads reset on every restart.');
  }
  console.log(
    `${state.tracks.length} tracks · ${state.videos.length} videos · ${state.orders.length} support orders · ${state.events.length} events · ${state.products.length} products · ${state.subscribers.length} subscribers`
  );
});

// make sure counters are flushed on shutdown
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    saveNow();
    process.exit(0);
  });
}
