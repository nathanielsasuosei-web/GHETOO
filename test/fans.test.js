import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

async function freePort() {
  const socket = net.createServer();
  await new Promise((resolve, reject) => {
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', resolve);
  });
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

async function startServer(dataDir) {
  const port = await freePort();
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      ARTIST_PASSWORD: 'test-password',
      SESSION_SECRET: 'test-secret',
      PAYSTACK_SECRET_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Server did not start: ${output}`)), 10000);
    child.stdout.on('data', () => {
      if (output.includes('listening on')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.once('error', (err) => { clearTimeout(timeout); reject(err); });
    child.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${output}`)); });
  });
  return { child, base: `http://127.0.0.1:${port}` };
}

async function stopServer(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const done = once(child, 'exit');
  child.kill('SIGTERM');
  await done;
}

async function request(base, url, { method = 'GET', body, cookie } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (body && !(body instanceof FormData)) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const response = await fetch(`${base}${url}`, { method, headers, body });
  const data = await response.json();
  return { response, data };
}

const cookieOf = (response) => response.headers.get('set-cookie')?.split(';')[0] || '';

// A tiny but real PNG so multer's image filter accepts the upload.
const png = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89,
]);

function imageForm(kind, id) {
  const form = new FormData();
  form.append('kind', kind);
  form.append('id', id);
  form.append('image', new Blob([png], { type: 'image/png' }), 'brand.png');
  return form;
}

test('fans can create accounts, sign in, and never unlock the studio', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'ghetoo-fans-'));
  let server;
  try {
    server = await startServer(dataDir);
    const { base } = server;

    const weak = await request(base, '/api/fans/register', {
      method: 'POST', body: { name: 'Ama', email: 'ama@example.com', password: 'short' },
    });
    assert.equal(weak.response.status, 400);

    const created = await request(base, '/api/fans/register', {
      method: 'POST', body: { name: 'Ama Boateng', email: 'Ama@Example.com', phone: '024 111 2222', password: 'accra-nights-2026' },
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.data.fan.email, 'ama@example.com');
    assert.equal(created.data.fan.name, 'Ama Boateng');
    assert.equal(created.data.fan.passwordHash, undefined);
    assert.equal(JSON.stringify(created.data).includes('passwordHash'), false);
    const fanCookie = cookieOf(created.response);
    assert.match(fanCookie, /^ys_fan=/);

    const duplicate = await request(base, '/api/fans/register', {
      method: 'POST', body: { name: 'Someone Else', email: 'ama@example.com', password: 'another-password' },
    });
    assert.equal(duplicate.response.status, 409);

    const me = await request(base, '/api/fans/me', { cookie: fanCookie });
    assert.equal(me.data.fan.email, 'ama@example.com');
    const anonymous = await request(base, '/api/fans/me');
    assert.equal(anonymous.data.fan, null);

    // A fan session must not open any studio endpoint, even though it is a valid signed cookie.
    assert.equal((await request(base, '/api/admin/overview', { cookie: fanCookie })).response.status, 401);
    assert.equal((await request(base, '/api/admin/settings', { method: 'PATCH', cookie: fanCookie, body: { tagline: 'hacked' } })).response.status, 401);
    // Nor may an artist session read a fan-only endpoint.
    const login = await request(base, '/api/admin/login', { method: 'POST', body: { password: 'test-password' } });
    const adminCookie = cookieOf(login.response);
    assert.equal((await request(base, '/api/fans/orders', { cookie: adminCookie })).response.status, 401);

    const wrong = await request(base, '/api/fans/login', {
      method: 'POST', body: { email: 'ama@example.com', password: 'not-the-password' },
    });
    assert.equal(wrong.response.status, 401);
    const signedIn = await request(base, '/api/fans/login', {
      method: 'POST', body: { email: 'ama@example.com', password: 'accra-nights-2026' },
    });
    assert.equal(signedIn.response.status, 200);
    assert.equal(signedIn.data.fan.id, created.data.fan.id);

    // Orders placed while signed in are attached to the account.
    const order = await request(base, '/api/orders', {
      method: 'POST', cookie: fanCookie,
      body: { amount: 1500, method: 'card', email: 'ama@example.com', name: 'Ama Boateng', message: 'For the next one' },
    });
    assert.equal(order.response.status, 201);
    const history = await request(base, '/api/fans/orders', { cookie: fanCookie });
    assert.equal(history.data.orders.length, 1);
    assert.equal(history.data.orders[0].reference, order.data.order.reference);
    assert.equal(history.data.orders[0].kind, 'support');

    const profile = await request(base, '/api/fans/me', {
      method: 'PATCH', cookie: fanCookie, body: { name: 'Ama B.', phone: '055 000 1111' },
    });
    assert.equal(profile.data.fan.name, 'Ama B.');
    assert.equal(profile.data.fan.phone, '055 000 1111');

    const badPassword = await request(base, '/api/fans/password', {
      method: 'POST', cookie: fanCookie, body: { currentPassword: 'nope', password: 'new-password-2026' },
    });
    assert.equal(badPassword.response.status, 400);
    const changed = await request(base, '/api/fans/password', {
      method: 'POST', cookie: fanCookie, body: { currentPassword: 'accra-nights-2026', password: 'new-password-2026' },
    });
    assert.equal(changed.response.status, 200);
    assert.equal((await request(base, '/api/fans/login', {
      method: 'POST', body: { email: 'ama@example.com', password: 'accra-nights-2026' },
    })).response.status, 401);
    assert.equal((await request(base, '/api/fans/login', {
      method: 'POST', body: { email: 'ama@example.com', password: 'new-password-2026' },
    })).response.status, 200);

    const studioFans = await request(base, '/api/admin/fans', { cookie: adminCookie });
    assert.equal(studioFans.data.fans.length, 1);
    assert.equal(studioFans.data.fans[0].orders, 1);
    assert.equal(studioFans.data.fans[0].passwordHash, undefined);

    await request(base, '/api/fans/logout', { method: 'POST', cookie: fanCookie });
    // The browser clears the cookie, and a copied old token is dead too.
    assert.equal((await request(base, '/api/fans/orders', { cookie: fanCookie })).response.status, 401);
    assert.equal((await request(base, '/api/fans/me', { cookie: fanCookie })).data.fan, null);
    assert.equal((await request(base, '/api/fans/login', {
      method: 'POST', body: { email: 'ama@example.com', password: 'new-password-2026' },
    })).response.status, 200, 'the fan can sign in again after logging out');
    await stopServer(server.child);
    server = await startServer(dataDir);
    const persisted = await request(server.base, '/api/admin/fans', { cookie: adminCookie });
    assert.equal(persisted.data.fans.length, 1, 'accounts survive a restart');
  } finally {
    if (server) await stopServer(server.child);
    await rm(dataDir, { recursive: true, force: true });
  }
});

test('the artist controls the price and can replace any picture on the site', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'ghetoo-media-'));
  let server;
  try {
    server = await startServer(dataDir);
    const { base } = server;
    const login = await request(base, '/api/admin/login', { method: 'POST', body: { password: 'test-password' } });
    const cookie = cookieOf(login.response);

    let site = (await request(base, '/api/site')).data;
    assert.equal(site.supportMode, 'open');
    assert.deepEqual(site.supportAmounts, [100, 200, 500, 1000]);
    assert.equal(site.liquidGlass, true);

    // Artist-curated amounts + a single fixed price.
    const pricing = await request(base, '/api/admin/settings', {
      method: 'PATCH', cookie,
      body: { minSupport: 2000, suggestedAmounts: [2000, 5000, 10000, 50], supportMode: 'fixed', liquidGlass: false, glassIntensity: 'bold' },
    });
    assert.equal(pricing.response.status, 200);
    assert.deepEqual(pricing.data.settings.suggestedAmounts, [2000, 5000, 10000]);
    site = (await request(base, '/api/site')).data;
    assert.equal(site.supportMode, 'fixed');
    assert.deepEqual(site.supportAmounts, [2000]);
    assert.equal(site.liquidGlass, false);
    assert.equal(site.glassIntensity, 'bold');
    const aboveFixed = await request(base, '/api/orders', {
      method: 'POST', body: { amount: 3000, method: 'card', email: 'fan@example.com', name: 'A Fan' },
    });
    assert.equal(aboveFixed.response.status, 400);
    assert.match(aboveFixed.data.error, /one price/);
    assert.equal((await request(base, '/api/orders', {
      method: 'POST', body: { amount: 2000, method: 'card', email: 'fan@example.com', name: 'A Fan' },
    })).response.status, 201);

    const open = await request(base, '/api/admin/settings', {
      method: 'PATCH', cookie, body: { supportMode: 'open' },
    });
    assert.equal(open.response.status, 200);
    assert.deepEqual((await request(base, '/api/site')).data.supportAmounts, [2000, 5000, 10000]);
    assert.equal((await request(base, '/api/admin/settings', {
      method: 'PATCH', cookie, body: { supportMode: 'nonsense' },
    })).response.status, 400);
    assert.equal((await request(base, '/api/admin/settings', {
      method: 'PATCH', cookie, body: { logoImage: 'https://evil.example/x.png' },
    })).response.status, 400);

    // Every image slot is listed, and each one can be replaced and reset.
    const slots = (await request(base, '/api/admin/media', { cookie })).data.slots;
    assert.ok(slots.some((slot) => slot.key === 'site:hero'));
    assert.ok(slots.some((slot) => slot.key === 'site:logo'));
    assert.ok(slots.some((slot) => slot.key === 'site:favicon'));
    assert.ok(slots.some((slot) => slot.kind === 'track'));
    assert.ok(slots.some((slot) => slot.kind === 'video'));
    assert.ok(slots.some((slot) => slot.kind === 'product'));

    const logo = await request(base, '/api/admin/media/replace', {
      method: 'POST', cookie, body: imageForm('site', 'logo'),
    });
    assert.equal(logo.response.status, 200);
    assert.match(logo.data.url, /^\/uploads\/site\//);
    assert.equal((await request(base, '/api/site')).data.settings.logoImage, logo.data.url);

    const svg = new FormData();
    svg.append('kind', 'site');
    svg.append('id', 'logo');
    svg.append('image', new Blob(['<svg/>'], { type: 'image/svg+xml' }), 'logo.svg');
    const rejected = await request(base, '/api/admin/media/replace', { method: 'POST', cookie, body: svg });
    assert.equal(rejected.response.status, 400);

    const cover = await request(base, '/api/admin/media/replace', {
      method: 'POST', cookie, body: imageForm('track', 'trk_accra_nights'),
    });
    assert.equal(cover.response.status, 200);
    assert.match(cover.data.url, /^\/uploads\/covers\//);
    site = (await request(base, '/api/site')).data;
    assert.equal(site.tracks.find((track) => track.id === 'trk_accra_nights').cover, cover.data.url);

    const thumb = await request(base, '/api/admin/media/replace', {
      method: 'POST', cookie, body: imageForm('video', 'vid_live'),
    });
    assert.equal(thumb.response.status, 200);
    assert.match(thumb.data.url, /^\/uploads\/thumbs\//);

    const photo = await request(base, '/api/admin/media/replace', {
      method: 'POST', cookie, body: imageForm('product', 'prd_tee'),
    });
    assert.equal(photo.response.status, 200);
    assert.match(photo.data.url, /^\/uploads\/products\//);

    const fetchLogo = await fetch(`${base}${logo.data.url}`);
    assert.equal(fetchLogo.status, 200);
    assert.match(fetchLogo.headers.get('content-type') || '', /image\/png/);

    const resetLogo = await request(base, '/api/admin/media/site/logo', { method: 'DELETE', cookie });
    assert.equal(resetLogo.data.url, '');
    const resetCover = await request(base, '/api/admin/media/track/trk_accra_nights', { method: 'DELETE', cookie });
    assert.equal(resetCover.data.url, '/media/covers/placeholder.jpg');
    // A missing upload falls through to the SPA shell when dist/ exists, so check
    // the content type rather than the status: the image itself must be gone.
    const deleted = await fetch(`${base}${logo.data.url}`);
    assert.doesNotMatch(deleted.headers.get('content-type') || '', /image\//, 'old upload is deleted');
    const bundled = await fetch(`${base}/media/hero.jpg`);
    assert.equal(bundled.status, 200, 'bundled art is never deleted');
    assert.match(bundled.headers.get('content-type') || '', /image\/jpeg/);

    assert.equal((await request(base, '/api/admin/media', { cookie: '' })).response.status, 401);
  } finally {
    if (server) await stopServer(server.child);
    await rm(dataDir, { recursive: true, force: true });
  }
});
