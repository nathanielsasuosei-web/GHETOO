import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {
  THEME_DEFAULTS,
  THEME_PRESETS,
  contrastRatio,
  isHex,
  normalizeHex,
  normalizeTheme,
  readableOn,
  readStoredTheme,
  resolveTheme,
  sanitizeTheme,
  storeTheme,
  suggestText,
  themeReport,
  themeVars,
} from '../src/lib/theme.js';

function fakeStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
  return store;
}

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

async function request(base, url, { method = 'GET', body, cookie } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (body) headers['content-type'] = 'application/json';
  const response = await fetch(`${base}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  return { response, data };
}

test('theme colours normalise, mix and stay readable', () => {
  assert.equal(isHex('#f0b354'), true);
  assert.equal(isHex('f0b354'), true);
  assert.equal(isHex('#f0b35'), false);
  assert.equal(isHex('var(--gold)'), false);

  assert.equal(normalizeHex('  #F0B354 '), '#f0b354');
  assert.equal(normalizeHex('nope'), THEME_DEFAULTS.accent);

  const vars = themeVars({ accent: '#4fb3ff', background: '#050c14', surface: '#0c1a27', text: '#eef7ff' });
  assert.equal(vars['--gold'], '#4fb3ff');
  assert.equal(vars['--gold-rgb'], '79, 179, 255');
  assert.match(vars['--line'], /^rgba\(238, 247, 255, 0\.1\)$/);
  assert.equal(vars['--v12-bg'], '#050c14');
  assert.equal(vars['--on-gold'], readableOn('#4fb3ff'));

  // Soft/deep shades are derived, not stored.
  assert.notEqual(vars['--gold-soft'], vars['--gold']);
  assert.notEqual(vars['--gold-deep'], vars['--gold']);

  assert.ok(contrastRatio('#ffffff', '#000000') > 20);
  assert.ok(contrastRatio('#f8f5ef', '#070910') > 15);
  assert.ok(contrastRatio('#777777', '#777777') === 1);

  const lightish = suggestText('#f4f1ea');
  assert.ok(contrastRatio(lightish, '#f4f1ea') > 7);

  for (const preset of THEME_PRESETS) {
    const report = themeReport(preset.theme);
    assert.ok(report.body.ratio > 7, `${preset.id} body contrast`);
    assert.ok(report.label.ratio > 4.5, `${preset.id} button label contrast`);
  }

  assert.equal(normalizeTheme(null).accent, THEME_DEFAULTS.accent);
  assert.deepEqual(normalizeTheme({ accent: '#ABCDEF' }).accent, '#abcdef');

  assert.deepEqual(sanitizeTheme({ accent: '#FF0000' }), { accent: '#ff0000' });
  assert.throws(() => sanitizeTheme({ accent: 'gold' }), /6-digit hex/);
  assert.throws(() => sanitizeTheme({ accent: '#fff' }), /6-digit hex/);
  assert.throws(() => sanitizeTheme({}), /No colours/);
  assert.throws(() => sanitizeTheme(null), /hex values/);
});

test('a device copy keeps the palette when the API has not stored it yet', () => {
  fakeStorage();
  const serverTheme = { accent: '#ff7a59', background: '#0d0708', surface: '#1b1013', text: '#fdf2ea', glow: '#ffb020' };

  // Nothing on this device yet: the server wins.
  assert.deepEqual(resolveTheme({ theme: serverTheme }).theme, normalizeTheme(serverTheme));
  assert.equal(resolveTheme({ theme: serverTheme }).source, 'server');

  // A newer device copy wins over an older server theme.
  storeTheme({ ...serverTheme, accent: '#4fb3ff' }, '2026-01-02T00:00:00.000Z');
  const deviceFirst = resolveTheme({ theme: serverTheme, themeUpdatedAt: '2026-01-01T00:00:00.000Z' });
  assert.equal(deviceFirst.source, 'device');
  assert.equal(deviceFirst.theme.accent, '#4fb3ff');

  // A server save that happened later wins again.
  const serverLast = resolveTheme({ theme: serverTheme, themeUpdatedAt: '2026-02-01T00:00:00.000Z' });
  assert.equal(serverLast.source, 'server');
  assert.equal(serverLast.theme.accent, '#ff7a59');

  // An API that drops the theme entirely still leaves the device copy in charge.
  const dropped = resolveTheme({ artistName: 'Young Silence' });
  assert.equal(dropped.source, 'device');

  assert.equal(readStoredTheme().theme.accent, '#4fb3ff');
  globalThis.localStorage.setItem('ys-theme-v1', '{not json');
  assert.equal(readStoredTheme(), null);
  delete globalThis.localStorage;
  assert.equal(resolveTheme({ theme: serverTheme }).source, 'server');
});

test('the owner can save colours from the studio and the site serves them', async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'ghetoo-theme-'));
  let server;
  try {
    server = await startServer(dataDir);
    const { base } = server;

    let site = (await request(base, '/api/site')).data;
    assert.equal(site.settings.theme.accent, THEME_DEFAULTS.accent);
    assert.equal(site.settings.theme.background, THEME_DEFAULTS.background);

    const anonymous = await request(base, '/api/admin/settings', {
      method: 'PATCH',
      body: { theme: { accent: '#ff0000' } },
    });
    assert.equal(anonymous.response.status, 401);

    const login = await request(base, '/api/admin/login', { method: 'POST', body: { password: 'test-password' } });
    assert.equal(login.response.status, 200);
    const cookie = login.response.headers.get('set-cookie').split(';')[0];

    const invalid = await request(base, '/api/admin/settings', {
      method: 'PATCH', cookie,
      body: { theme: { accent: 'red' } },
    });
    assert.equal(invalid.response.status, 400);
    assert.match(invalid.data.error, /hex colour/);
    site = (await request(base, '/api/site')).data;
    assert.equal(site.settings.theme.accent, THEME_DEFAULTS.accent);

    const saved = await request(base, '/api/admin/settings', {
      method: 'PATCH', cookie,
      body: { theme: { accent: '#4FB3FF', background: '#050c14', surface: '#0c1a27', text: '#eef7ff', glow: '#34e0c4' } },
    });
    assert.equal(saved.response.status, 200);
    assert.equal(saved.data.settings.theme.accent, '#4fb3ff');
    assert.equal(saved.data.settings.theme.glow, '#34e0c4');
    assert.ok(Date.parse(saved.data.settings.themeUpdatedAt) > 0, 'themeUpdatedAt is stamped');

    site = (await request(base, '/api/site')).data;
    assert.equal(site.settings.theme.accent, '#4fb3ff');
    assert.equal(site.settings.theme.background, '#050c14');
    assert.equal(site.settings.themeUpdatedAt, saved.data.settings.themeUpdatedAt);

    // A partial patch keeps the rest of the palette.
    const partial = await request(base, '/api/admin/settings', {
      method: 'PATCH', cookie,
      body: { theme: { accent: '#4ad295' } },
    });
    assert.equal(partial.data.settings.theme.accent, '#4ad295');
    assert.equal(partial.data.settings.theme.background, '#050c14');

    // Other settings are untouched by a colour save.
    const profile = await request(base, '/api/admin/settings', {
      method: 'PATCH', cookie,
      body: { tagline: 'Colours changed, copy intact' },
    });
    assert.equal(profile.data.settings.tagline, 'Colours changed, copy intact');
    assert.equal(profile.data.settings.theme.accent, '#4ad295');
  } finally {
    if (server) {
      const done = once(server.child, 'exit');
      server.child.kill('SIGTERM');
      await done;
    }
    await rm(dataDir, { recursive: true, force: true });
  }
});
