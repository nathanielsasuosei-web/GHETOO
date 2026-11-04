import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
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

async function adminCookie(base) {
  const login = await request(base, '/api/admin/login', { method: 'POST', body: { password: 'test-password' } });
  assert.equal(login.response.status, 200);
  return login.response.headers.get('set-cookie').split(';')[0];
}

function imageForm(fields = {}, bytes = 'image-bytes', type = 'image/png', name = 'image.png') {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  form.append('image', new Blob([bytes], { type }), name);
  return form;
}

test('unknown front-end paths return HTTP 404 while built client routes stay 200', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'ghetoo-404-'));
  let server;
  try {
    server = await startServer(dataDir);
    const missing = await fetch(`${server.base}/definitely-not-a-page`);
    assert.equal(missing.status, 404);
    const missingAsset = await fetch(`${server.base}/assets/not-a-real-file.css`);
    assert.equal(missingAsset.status, 404);
    if (existsSync(path.join(process.cwd(), 'dist', 'index.html'))) {
      const music = await fetch(`${server.base}/music`);
      assert.equal(music.status, 200);
      const studio = await fetch(`${server.base}/studio/media`);
      assert.equal(studio.status, 200);
    }
  } finally {
    if (server) await stopServer(server.child);
    await rm(dataDir, { recursive: true, force: true });
  }
});

test('fans can register, sign in, keep support history and safely sign out', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'ghetoo-fans-'));
  let server;
  try {
    server = await startServer(dataDir);
    const { base } = server;

    const short = await request(base, '/api/fans/register', {
      method: 'POST',
      body: { name: 'Ama', email: 'ama@example.com', password: 'short' },
    });
    assert.equal(short.response.status, 400);

    const signup = await request(base, '/api/fans/register', {
      method: 'POST',
      body: { name: 'Ama Boateng', email: 'AMA@example.com', password: 'accra-nights-2026' },
    });
    assert.equal(signup.response.status, 201);
    assert.equal(signup.data.fan.email, 'ama@example.com');
    assert.equal(signup.data.fan.passwordHash, undefined);
    let cookie = signup.response.headers.get('set-cookie').split(';')[0];
    assert.match(cookie, /^ys_fan=/);

    const duplicate = await request(base, '/api/fans/register', {
      method: 'POST',
      body: { name: 'Another Ama', email: 'ama@example.com', password: 'another-password' },
    });
    assert.equal(duplicate.response.status, 409);

    const profile = await request(base, '/api/fans/me', { cookie });
    assert.equal(profile.data.fan.name, 'Ama Boateng');
    const changed = await request(base, '/api/fans/me', {
      method: 'PATCH',
      cookie,
      body: { name: 'Ama B.', phone: '024 000 0000' },
    });
    assert.equal(changed.response.status, 200);
    assert.equal(changed.data.fan.name, 'Ama B.');
    assert.equal(changed.data.fan.phone, '024 000 0000');

    const order = await request(base, '/api/orders', {
      method: 'POST',
      cookie,
      body: {
        amount: 100,
        method: 'card',
        email: 'ama@example.com',
        name: 'Ama B.',
        message: 'Keep making this',
      },
    });
    assert.equal(order.response.status, 201);
    const me = await request(base, '/api/fans/me', { cookie });
    assert.equal(me.data.orders.length, 1);
    assert.equal(me.data.orders[0].reference, order.data.order.reference);
    assert.equal(me.data.orders[0].message, 'Keep making this');

    // A fan token must never open the artist studio.
    const studioWithFanCookie = await fetch(`${base}/api/admin/overview`, { headers: { cookie } });
    assert.equal(studioWithFanCookie.status, 401);

    const wrongLogin = await request(base, '/api/fans/login', {
      method: 'POST',
      body: { email: 'ama@example.com', password: 'wrong-password' },
    });
    assert.equal(wrongLogin.response.status, 401);

    const loggedOut = await request(base, '/api/fans/logout', { method: 'POST', cookie });
    assert.equal(loggedOut.response.status, 200);
    const stale = await request(base, '/api/fans/me', { cookie });
    assert.equal(stale.data.fan, null);

    const login = await request(base, '/api/fans/login', {
      method: 'POST',
      body: { email: 'ama@example.com', password: 'accra-nights-2026' },
    });
    assert.equal(login.response.status, 200);
    cookie = login.response.headers.get('set-cookie').split(';')[0];
    const returned = await request(base, '/api/fans/me', { cookie });
    assert.equal(returned.data.fan.name, 'Ama B.');
    assert.equal(returned.data.orders.length, 1);
  } finally {
    if (server) await stopServer(server.child);
    await rm(dataDir, { recursive: true, force: true });
  }
});

test('the artist can set one exact price and switch the public visual finish', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'ghetoo-pricing-'));
  let server;
  try {
    server = await startServer(dataDir);
    const { base } = server;
    const cookie = await adminCookie(base);

    let site = (await request(base, '/api/site')).data;
    assert.equal(site.settings.visualStyle, 'liquid');
    assert.equal(site.allowCustomSupport, true);
    assert.equal(site.tracks[0].fixedPrice, false);

    const badStyle = await request(base, '/api/admin/settings', {
      method: 'PATCH', cookie, body: { visualStyle: 'glossy' },
    });
    assert.equal(badStyle.response.status, 400);
    const badMode = await request(base, '/api/admin/settings', {
      method: 'PATCH', cookie, body: { allowCustomSupport: 'no' },
    });
    assert.equal(badMode.response.status, 400);
    const badFontScale = await request(base, '/api/admin/settings', {
      method: 'PATCH', cookie, body: { fontScale: 400 },
    });
    assert.equal(badFontScale.response.status, 400);

    const saved = await request(base, '/api/admin/settings', {
      method: 'PATCH',
      cookie,
      body: { minSupport: 2550, allowCustomSupport: false, visualStyle: 'classic', fontScale: 110 },
    });
    assert.equal(saved.response.status, 200);
    assert.equal(saved.data.settings.allowCustomSupport, false);
    assert.equal(saved.data.settings.visualStyle, 'classic');
    assert.equal(saved.data.settings.fontScale, 110);
    assert.ok(Date.parse(saved.data.settings.fontScaleUpdatedAt) > 0);
    assert.ok(Date.parse(saved.data.settings.styleUpdatedAt) > 0);

    site = (await request(base, '/api/site')).data;
    assert.equal(site.minSupport, 2550);
    assert.equal(site.allowCustomSupport, false);
    assert.equal(site.settings.visualStyle, 'classic');
    assert.equal(site.settings.fontScale, 110);
    assert.equal(site.tracks[0].fixedPrice, true);
    assert.equal(site.videos[0].fixedPrice, true);

    const checkout = (amount) => request(base, '/api/orders', {
      method: 'POST',
      body: { amount, method: 'card', email: 'listener@example.com', name: 'Test Listener' },
    });
    assert.equal((await checkout(2549)).response.status, 400);
    assert.equal((await checkout(2550)).response.status, 201);
    const tooMuch = await checkout(3000);
    assert.equal(tooMuch.response.status, 400);
    assert.match(tooMuch.data.error, /one support price/);

    const flexible = await request(base, '/api/admin/settings', {
      method: 'PATCH', cookie, body: { allowCustomSupport: true, visualStyle: 'liquid', fontScale: 100 },
    });
    assert.equal(flexible.response.status, 200);
    assert.equal((await checkout(3000)).response.status, 201);
    site = (await request(base, '/api/site')).data;
    assert.equal(site.settings.visualStyle, 'liquid');
    assert.equal(site.settings.fontScale, 100);
    assert.equal(site.tracks[0].fixedPrice, false);
  } finally {
    if (server) await stopServer(server.child);
    await rm(dataDir, { recursive: true, force: true });
  }
});

test('the artist can replace the logo and every catalogue picture at any time', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'ghetoo-media-'));
  let server;
  try {
    server = await startServer(dataDir);
    const { base } = server;
    const cookie = await adminCookie(base);

    let site = (await request(base, '/api/site')).data;
    assert.equal(site.settings.logoImage, '/media/logo.svg');
    const trackId = site.tracks[0].id;
    const videoId = site.videos[0].id;
    const productId = site.products[0].id;

    const firstLogo = await request(base, '/api/admin/site-images', {
      method: 'POST', cookie, body: imageForm({ target: 'logo' }, 'first-logo'),
    });
    assert.equal(firstLogo.response.status, 200);
    assert.match(firstLogo.data.url, /^\/uploads\/site\/logo-/);
    const firstName = path.basename(firstLogo.data.url);

    const secondLogo = await request(base, '/api/admin/site-images', {
      method: 'POST', cookie, body: imageForm({ target: 'logo' }, 'second-logo', 'image/webp', 'logo.webp'),
    });
    assert.equal(secondLogo.response.status, 200);
    assert.notEqual(secondLogo.data.url, firstLogo.data.url);
    assert.equal((await readdir(path.join(dataDir, 'uploads', 'site'))).includes(firstName), false);

    site = (await request(base, '/api/site')).data;
    assert.equal(site.settings.logoImage, secondLogo.data.url);
    assert.ok(Date.parse(site.settings.siteImagesUpdatedAt) > 0);

    const reset = await request(base, '/api/admin/site-images/logo', { method: 'DELETE', cookie });
    assert.equal(reset.response.status, 200);
    assert.equal(reset.data.url, '/media/logo.svg');
    assert.deepEqual(await readdir(path.join(dataDir, 'uploads', 'site')), []);

    const replacements = [
      { kind: 'track', id: trackId, dir: 'covers', field: 'tracks', image: 'cover' },
      { kind: 'video', id: videoId, dir: 'thumbs', field: 'videos', image: 'thumb' },
      { kind: 'product', id: productId, dir: 'products', field: 'products', image: 'image' },
    ];
    for (const item of replacements) {
      const unauthorized = await request(base, `/api/admin/media/${item.kind}/${item.id}`, {
        method: 'POST', body: imageForm({}, 'unauthorized'),
      });
      assert.equal(unauthorized.response.status, 401);
      const updated = await request(base, `/api/admin/media/${item.kind}/${item.id}`, {
        method: 'POST', cookie, body: imageForm({}, `new-${item.kind}`, 'image/jpeg', `${item.kind}.jpg`),
      });
      assert.equal(updated.response.status, 200);
      assert.match(updated.data.url, new RegExp(`^/uploads/${item.dir}/`));
    }

    site = (await request(base, '/api/site')).data;
    assert.match(site.tracks.find((entry) => entry.id === trackId).cover, /^\/uploads\/covers\//);
    assert.match(site.videos.find((entry) => entry.id === videoId).thumb, /^\/uploads\/thumbs\//);
    assert.match(site.products.find((entry) => entry.id === productId).image, /^\/uploads\/products\//);
    assert.equal((await request(base, '/api/site')).data.settings.logoImage, '/media/logo.svg');
  } finally {
    if (server) await stopServer(server.child);
    await rm(dataDir, { recursive: true, force: true });
  }
});
