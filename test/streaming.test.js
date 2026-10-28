import test from 'node:test';
import assert from 'node:assert/strict';
import { canPlayOnSite, normalizeStreamingUrl, trackPlatformLinks, videoYouTubeUrl } from '../src/lib/streaming.js';

const spotify = 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=abc';
const apple = 'https://music.apple.com/us/album/example/123456789?i=123456790';
const youtube = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

test('valid streaming links are accepted and YouTube variants become watch links', () => {
  assert.equal(normalizeStreamingUrl('spotifyUrl', spotify), spotify);
  assert.equal(normalizeStreamingUrl('spotifyUrl', 'https://open.spotify.com/intl-en/album/4cOdK2wGLETKBW3PvgPWqT'), 'https://open.spotify.com/intl-en/album/4cOdK2wGLETKBW3PvgPWqT');
  assert.equal(normalizeStreamingUrl('appleMusicUrl', apple), apple);
  for (const url of [
    youtube,
    'https://youtu.be/dQw4w9WgXcQ?feature=share',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=anything',
    'https://youtube.com/shorts/dQw4w9WgXcQ',
  ]) {
    assert.equal(normalizeStreamingUrl('youtubeUrl', url), youtube);
  }
  assert.equal(normalizeStreamingUrl('spotifyUrl', '  '), '');
});

test('rejects unsafe, off-platform, and non-song URLs', () => {
  for (const [key, value] of [
    ['spotifyUrl', 'javascript:alert(1)'],
    ['spotifyUrl', 'http://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT'],
    ['spotifyUrl', 'https://open.spotify.com.evil.example/track/4cOdK2wGLETKBW3PvgPWqT'],
    ['spotifyUrl', 'https://user:pass@open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT'],
    ['spotifyUrl', 'https://open.spotify.com/artist/4cOdK2wGLETKBW3PvgPWqT'],
    ['appleMusicUrl', 'https://music.apple.com/'],
    ['youtubeUrl', 'https://youtube.com/redirect?q=https://example.com'],
    ['youtubeUrl', 'https://youtu.be/short'],
    ['youtubeUrl', ['https://youtu.be/dQw4w9WgXcQ']],
  ]) {
    assert.throws(() => normalizeStreamingUrl(key, value));
  }
  assert.throws(() => normalizeStreamingUrl('spotifyUrl', `https://open.spotify.com/track/${'a'.repeat(2049)}`));
});

test('platform links take priority and local playback stays a fallback', () => {
  const linked = { allowStream: true, spotifyUrl: spotify, appleMusicUrl: apple, youtubeUrl: youtube };
  assert.deepEqual(trackPlatformLinks(linked).map((link) => link.label), ['Spotify', 'Apple Music', 'YouTube']);
  assert.equal(canPlayOnSite(linked), false);
  assert.equal(canPlayOnSite({ allowStream: true }), true);
  assert.equal(canPlayOnSite({ allowStream: false }), false);
  assert.equal(canPlayOnSite(null), false);
  assert.deepEqual(trackPlatformLinks({ spotifyUrl: 'javascript:alert(1)' }), []);
});

test('video links prefer the explicit YouTube URL and support existing embeds', () => {
  assert.equal(videoYouTubeUrl({ youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ', source: 'file' }), youtube);
  assert.equal(videoYouTubeUrl({ source: 'url', src: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }), youtube);
  assert.equal(videoYouTubeUrl({ source: 'url', src: 'https://player.vimeo.com/video/123' }), '');
  assert.equal(videoYouTubeUrl({ source: 'file', src: '/uploads/videos/a.mp4' }), '');
});
