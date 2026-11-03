import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { THEME_DEFAULTS, themeMatches, themePublished } from '../src/lib/theme.js';

const PALETTE = {
  accent: '#4fb3ff',
  glow: '#34e0c4',
  background: '#050c14',
  surface: '#0c1a27',
  text: '#eef7ff',
};

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
  if (body) headers['content-type'] = 'application/json';
  const response = await fetch(`${base}${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  return { response, data };
}

test('only an anonymous /api/site response proves a palette is published', () => {
  assert.equal(themePublished({ settings: { theme: PALETTE } }, PALETTE), true);
  // An older API can answer 200 while dropping theme entirely.
  assert.equal(themePublished({ settings: { artistName: 'Young Silence' } }, PALETTE), false);
  assert.equal(themePublished({ settings: {} }, PALETTE), false);
  assert.equal(themePublished(null, PALETTE), false);
  assert.equal(themePublished({ settings: { theme: THEME_DEFAULTS } }, PALETTE), false);
  assert.equal(themePublished({ settings: { theme: 'orange' } }, PALETTE), false);
  assert.equal(themePublished({ settings: { theme: [] } }, PALETTE), false);
  // Hex case and missing keys normalise rather than producing a false negative.
  assert.equal(themeMatches({ ...PALETTE, accent: '#4FB3FF' }, PALETTE), true);
});

test('the Render blueprint deploys the latest backend onto a persistent DATA_DIR', async () => {
  const blueprint = await readFile(new URL('../render.yaml', import.meta.url), 'utf8');
  assert.match(blueprint, /branch:\s*main/, 'production builds from main, not the branch the blueprint was applied from');
  assert.match(blueprint, /autoDeploy:\s*true/, 'pushes to main deploy automatically');
  assert.match(blueprint, /plan:\s*starter/, 'Render free cannot attach a persistent disk');
  assert.match(blueprint, /disk:\s*\n\s*name:\s*young-silence-data/);
  assert.match(blueprint, /mountPath:\s*\/var\/data/);
  assert.match(blueprint, /sizeGB:\s*1/);
  assert.match(blueprint, /key:\s*DATA_DIR\s*\n\s*value:\s*\/var\/data/, 'DATA_DIR must match the disk mount');
  assert.match(blueprint, /healthCheckPath:\s*\/api\/health/);

  const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  const apiHeaders = (vercel.headers || []).find((entry) => entry.source === '/api/(.*)');
  assert.ok(apiHeaders, 'API responses are not cached by the CDN');
  assert.ok(apiHeaders.headers.some((header) => /no-store/.test(header.value)));
});

test('a saved theme survives a restart and is published to anonymous visitors', async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'ghetoo-publish-'));
  let server;
  try {
    server = await startServer(dataDir);
    let { base } = server;

    const health = (await request(base, '/api/health')).data;
    assert.equal(health.themeStorage, true, 'current build advertises theme storage');
    assert.ok(health.version, 'build version is exposed for stale-deploy checks');
    assert.equal(health.dataDirConfigured, true);
    assert.equal(health.dataDirWritable, true);

    const login = await request(base, '/api/admin/login', {
      method: 'POST',
      body: { password: 'test-password' },
    });
    assert.equal(login.response.status, 200);
    const cookie = login.response.headers.get('set-cookie').split(';')[0];

    const saved = await request(base, '/api/admin/settings', {
      method: 'PATCH',
      cookie,
      body: { theme: PALETTE },
    });
    assert.equal(saved.response.status, 200);
    assert.equal(saved.response.headers.get('cache-control'), 'no-store');
    assert.ok(Date.parse(saved.data.settings.themeUpdatedAt) > 0);
    assert.equal(saved.data.capabilities.themeStorage, true);

    // The palette is on disk, not just in memory.
    const db = JSON.parse(await readFile(path.join(dataDir, 'db.json'), 'utf8'));
    assert.equal(themeMatches(db.settings.theme, PALETTE), true);
    assert.ok(db.settings.themeUpdatedAt);

    // Restart against the same DATA_DIR, as a redeploy would.
    await stopServer(server.child);
    server = await startServer(dataDir);
    base = server.base;

    const site = (await request(base, '/api/site')).data;
    assert.equal(themePublished(site, PALETTE), true, 'an unsigned-in visitor sees the saved palette');
    assert.equal(site.settings.themeUpdatedAt, saved.data.settings.themeUpdatedAt);
    assert.equal(site.capabilities.themeStorage, true);

    const overview = await request(base, '/api/admin/overview', { cookie });
    assert.equal(overview.response.status, 200);
    assert.equal(overview.data.capabilities.dataSurvivedRestart, true);
    assert.ok(overview.data.capabilities.dataBoots >= 2, 'the volume survived a restart');
  } finally {
    if (server) await stopServer(server.child);
    await rm(dataDir, { recursive: true, force: true });
  }
});
