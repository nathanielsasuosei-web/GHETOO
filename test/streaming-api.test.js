import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { seedState } from '../server/seed.js';

const spotify = 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT';
const apple = 'https://music.apple.com/us/album/example/123456789?i=123456790';
const youtube = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const otherYoutube = 'https://www.youtube.com/watch?v=abcdefghijk';

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

function form(fields, file) {
  const result = new FormData();
  for (const [key, value] of Object.entries(fields)) result.append(key, value);
  if (file) result.append(file.key, new Blob([file.data], { type: file.type }), file.name);
  return result;
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

test('streaming links persist safely and platform-only releases do not promise downloads', async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'ghetoo-streaming-'));
  let server;
  try {
    server = await startServer(dataDir);
    let { base } = server;
    const login = await request(base, '/api/admin/login', { method: 'POST', body: { password: 'test-password' } });
    assert.equal(login.response.status, 200);
    const cookie = login.response.headers.get('set-cookie').split(';')[0];

    const unauthenticated = await request(base, '/api/admin/tracks/trk_accra_nights', {
      method: 'PATCH', body: { spotifyUrl: spotify },
    });
    assert.equal(unauthenticated.response.status, 401);

    const created = await request(base, '/api/admin/tracks', {
      method: 'POST', cookie,
      body: form({ title: 'Platform-only song', spotifyUrl: spotify, published: 'true' }),
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.data.track.audio, '');
    const trackId = created.data.track.id;
    let site = (await request(base, '/api/site')).data;
    assert.equal(site.minSupport, 100);
    let publicTrack = site.tracks.find((track) => track.id === trackId);
    assert.equal(publicTrack.spotifyUrl, spotify);
    assert.equal(publicTrack.allowStream, false);
    assert.equal(publicTrack.hasDownload, false);

    const invalid = await request(base, `/api/admin/tracks/${trackId}`, {
      method: 'PATCH', cookie,
      body: { title: 'Must not be saved', spotifyUrl: 'https://open.spotify.com.evil.example/track/4cOdK2wGLETKBW3PvgPWqT' },
    });
    assert.equal(invalid.response.status, 400);
    let track = (await request(base, `/api/tracks/${trackId}`)).data;
    assert.equal(track.title, 'Platform-only song');
    assert.equal(track.spotifyUrl, spotify);

    const updated = await request(base, `/api/admin/tracks/${trackId}`, {
      method: 'PATCH', cookie, body: { appleMusicUrl: apple, youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ' },
    });
    assert.equal(updated.response.status, 200);
    track = (await request(base, `/api/tracks/${trackId}`)).data;
    assert.equal(track.appleMusicUrl, apple);
    assert.equal(track.youtubeUrl, youtube);
    const clearAll = await request(base, `/api/admin/tracks/${trackId}`, {
      method: 'PATCH', cookie, body: { spotifyUrl: '', appleMusicUrl: '', youtubeUrl: '' },
    });
    assert.equal(clearAll.response.status, 400);
    const clearOne = await request(base, `/api/admin/tracks/${trackId}`, {
      method: 'PATCH', cookie, body: { spotifyUrl: '' },
    });
    assert.equal(clearOne.response.status, 200);

    const noDownload = await request(base, '/api/orders', {
      method: 'POST',
      body: { trackId, amount: 500, method: 'card', email: 'listener@example.com', name: 'Test Listener' },
    });
    assert.equal(noDownload.data.mode, 'sandbox');
    assert.equal(noDownload.data.order.downloadToken, null);

    const audio = await request(base, '/api/admin/tracks', {
      method: 'POST', cookie,
      body: form({ title: 'Audio release' }, { key: 'audio', data: 'test-audio', type: 'audio/mpeg', name: 'song.mp3' }),
    });
    assert.equal(audio.response.status, 201);
    const audioId = audio.data.track.id;
    assert.equal((await request(base, `/api/tracks/${audioId}`)).data.hasDownload, true);
    const withDownload = await request(base, '/api/orders', {
      method: 'POST',
      body: { trackId: audioId, amount: 500, method: 'card', email: 'listener@example.com', name: 'Test Listener' },
    });
    assert.ok(withDownload.data.order.downloadToken);
    const file = await fetch(`${base}/api/download/${withDownload.data.order.downloadToken}`);
    assert.equal(file.status, 200);
    assert.equal(await file.text(), 'test-audio');

    const audioDir = path.join(dataDir, 'uploads', 'audio');
    const before = await readdir(audioDir);
    const rejectedUpload = await request(base, '/api/admin/tracks', {
      method: 'POST', cookie,
      body: form({ title: 'Invalid song', spotifyUrl: 'https://example.com/' }, { key: 'audio', data: 'orphan', type: 'audio/mpeg', name: 'orphan.mp3' }),
    });
    assert.equal(rejectedUpload.response.status, 400);
    assert.deepEqual(await readdir(audioDir), before);
    const oldPricing = await request(base, '/api/admin/tracks', {
      method: 'POST', cookie,
      body: form({ title: 'Old per-track pricing', minAmount: '100' }, { key: 'audio', data: 'orphan', type: 'audio/mpeg', name: 'old-price.mp3' }),
    });
    assert.equal(oldPricing.response.status, 400);
    assert.match(oldPricing.data.error, /applies to all support/);
    assert.deepEqual(await readdir(audioDir), before);

    const video = await request(base, '/api/admin/videos', {
      method: 'POST', cookie,
      body: form({ title: 'YouTube video', source: 'url', url: 'https://youtu.be/dQw4w9WgXcQ' }),
    });
    assert.equal(video.response.status, 201);
    const videoId = video.data.video.id;
    site = (await request(base, '/api/site')).data;
    assert.equal(site.videos.find((entry) => entry.id === videoId).youtubeUrl, youtube);
    const badVideo = await request(base, `/api/admin/videos/${videoId}`, {
      method: 'PATCH', cookie, body: { title: 'Must not be saved', youtubeUrl: 'https://example.com/video' },
    });
    assert.equal(badVideo.response.status, 400);
    const override = await request(base, `/api/admin/videos/${videoId}`, {
      method: 'PATCH', cookie, body: { youtubeUrl: otherYoutube },
    });
    assert.equal(override.response.status, 200);
    site = (await request(base, '/api/site')).data;
    assert.equal(site.videos.find((entry) => entry.id === videoId).youtubeUrl, otherYoutube);
    const clearOverride = await request(base, `/api/admin/videos/${videoId}`, {
      method: 'PATCH', cookie, body: { youtubeUrl: '' },
    });
    assert.equal(clearOverride.response.status, 200);
    site = (await request(base, '/api/site')).data;
    assert.equal(site.videos.find((entry) => entry.id === videoId).youtubeUrl, youtube);
    assert.equal(site.videos.find((entry) => entry.id === videoId).title, 'YouTube video');

    const invalidSource = await request(base, '/api/admin/videos', {
      method: 'POST', cookie, body: form({ title: 'Invalid YouTube', source: 'url', url: 'https://youtube.com/watch?v=nope' }),
    });
    assert.equal(invalidSource.response.status, 400);

    const uploadedVideo = await request(base, '/api/admin/videos/vid_accra_nights', {
      method: 'PATCH', cookie, body: { youtubeUrl: otherYoutube },
    });
    assert.equal(uploadedVideo.response.status, 200);
    site = (await request(base, '/api/site')).data;
    assert.equal(site.videos.find((entry) => entry.id === 'vid_accra_nights').youtubeUrl, otherYoutube);
    await request(base, '/api/admin/videos/vid_accra_nights', {
      method: 'PATCH', cookie, body: { youtubeUrl: '' },
    });
    site = (await request(base, '/api/site')).data;
    assert.equal(site.videos.find((entry) => entry.id === 'vid_accra_nights').youtubeUrl, '');
    assert.equal(site.videos.find((entry) => entry.id === 'vid_accra_nights').src, '/api/video/vid_accra_nights');

    await stopServer(server.child);
    server = await startServer(dataDir);
    base = server.base;
    site = (await request(base, '/api/site')).data;
    publicTrack = site.tracks.find((entry) => entry.id === trackId);
    assert.equal(publicTrack.appleMusicUrl, apple);
    assert.equal(publicTrack.youtubeUrl, youtube);
    assert.equal(publicTrack.spotifyUrl, '');
    assert.equal(site.videos.find((entry) => entry.id === videoId).youtubeUrl, youtube);

    const noSettingsAuth = await request(base, '/api/admin/settings', {
      method: 'PATCH', body: { minSupport: 2550 },
    });
    assert.equal(noSettingsAuth.response.status, 401);
    for (const invalidMinimum of [0, 99, 100.5, '2550', 5_000_001]) {
      const rejected = await request(base, '/api/admin/settings', {
        method: 'PATCH', cookie, body: { minSupport: invalidMinimum, artistName: 'Must not save' },
      });
      assert.equal(rejected.response.status, 400);
    }
    const savedMinimum = await request(base, '/api/admin/settings', {
      method: 'PATCH', cookie, body: { minSupport: 2550 },
    });
    assert.equal(savedMinimum.response.status, 200);
    assert.equal(savedMinimum.data.settings.artistName, 'Young Silence');
    site = (await request(base, '/api/site')).data;
    assert.equal(site.minSupport, 2550);
    assert.equal(site.maxSupport, 5_000_000);
    assert.ok(site.tracks.every((entry) => entry.minAmount === 2550));
    const overview = (await request(base, '/api/admin/overview', { cookie })).data;
    assert.ok(overview.tracks.every((entry) => entry.minAmount === 2550));

    const orderFor = (body) => request(base, '/api/orders', {
      method: 'POST', body: { amount: 2550, method: 'card', email: 'listener@example.com', name: 'Test Listener', ...body },
    });
    for (const target of [{}, { trackId }, { videoId }]) {
      const below = await orderFor({ ...target, amount: 2549 });
      assert.equal(below.response.status, 400);
      assert.match(below.data.error, /25\.50/);
    }
    assert.equal((await orderFor({ trackId, videoId })).response.status, 400);
    assert.equal((await orderFor({ videoId: 'missing' })).response.status, 400);
    assert.equal((await orderFor({ amount: 2550.5 })).response.status, 400);
    assert.equal((await orderFor({ amount: 5_000_001 })).response.status, 400);
    for (const target of [{}, { trackId }, { videoId }]) {
      for (const amount of [2550, 3000]) {
        const supported = await orderFor({ ...target, amount });
        assert.equal(supported.response.status, 201);
        assert.equal(supported.data.order.amount, amount);
        assert.equal(supported.data.order.trackId, target.trackId || null);
        assert.equal(supported.data.order.videoId, target.videoId || null);
        if (target.videoId) assert.equal(supported.data.order.downloadToken, null);
      }
    }
    const videoSupport = await orderFor({ videoId, amount: 2550, method: 'momo', provider: 'mtn', message: 'Great video' });
    assert.equal(videoSupport.response.status, 201);
    assert.equal(videoSupport.data.order.videoId, videoId);
    assert.equal(videoSupport.data.order.trackTitle, 'YouTube video');
    assert.equal(videoSupport.data.order.downloadToken, null);
    const confirmed = await request(base, `/api/admin/orders/${videoSupport.data.order.reference}`, {
      method: 'PATCH', cookie, body: { status: 'paid' },
    });
    assert.equal(confirmed.response.status, 200);
    const videoReceipt = (await request(base, `/api/orders/${videoSupport.data.order.reference}`)).data;
    assert.equal(videoReceipt.status, 'paid');
    assert.equal(videoReceipt.videoId, videoId);
    assert.equal(videoReceipt.downloadToken, null);
    assert.equal((await request(base, `/api/admin/videos/${videoId}`, {
      method: 'PATCH', cookie, body: { published: false },
    })).response.status, 200);
    assert.equal((await orderFor({ videoId })).response.status, 400);
    site = (await request(base, '/api/site')).data;
    assert.ok(site.wall.some((entry) => entry.message === 'Great video' && entry.trackTitle === 'YouTube video'));
    const oldPerTrackSetting = await request(base, `/api/admin/tracks/${trackId}`, {
      method: 'PATCH', cookie, body: { minAmount: 100 },
    });
    assert.equal(oldPerTrackSetting.response.status, 400);

    await stopServer(server.child);
    server = await startServer(dataDir);
    site = (await request(server.base, '/api/site')).data;
    assert.equal(site.minSupport, 2550);
    assert.ok(site.tracks.every((entry) => entry.minAmount === 2550));
  } finally {
    if (server) await stopServer(server.child);
    await rm(dataDir, { recursive: true, force: true });
  }
});

test('legacy release minima migrate to one safe global minimum and can be changed', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'ghetoo-legacy-support-'));
  let server;
  try {
    const legacy = seedState();
    delete legacy.settings.minSupport;
    await writeFile(path.join(dataDir, 'db.json'), JSON.stringify(legacy));
    server = await startServer(dataDir);
    let site = (await request(server.base, '/api/site')).data;
    assert.equal(site.minSupport, 1000);
    assert.ok(site.tracks.every((entry) => entry.minAmount === 1000));
    const login = await request(server.base, '/api/admin/login', { method: 'POST', body: { password: 'test-password' } });
    const cookie = login.response.headers.get('set-cookie').split(';')[0];
    const changed = await request(server.base, '/api/admin/settings', { method: 'PATCH', cookie, body: { minSupport: 200 } });
    assert.equal(changed.response.status, 200);
    await stopServer(server.child);
    server = await startServer(dataDir);
    site = (await request(server.base, '/api/site')).data;
    assert.equal(site.minSupport, 200);
    assert.ok(site.tracks.every((entry) => entry.minAmount === 200));
    const setMaximum = await request(server.base, '/api/admin/settings', {
      method: 'PATCH', cookie, body: { minSupport: 5_000_000 },
    });
    assert.equal(setMaximum.response.status, 200);
    const checkout = (amount) => request(server.base, '/api/orders', {
      method: 'POST', body: { amount, method: 'card', email: 'listener@example.com', name: 'Test Listener' },
    });
    assert.equal((await checkout(4_999_999)).response.status, 400);
    assert.equal((await checkout(5_000_000)).response.status, 201);
    assert.equal((await checkout(5_000_001)).response.status, 400);
  } finally {
    if (server) await stopServer(server.child);
    await rm(dataDir, { recursive: true, force: true });
  }
});
