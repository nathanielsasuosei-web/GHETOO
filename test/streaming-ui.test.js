import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const spotify = 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT';
const apple = 'https://music.apple.com/us/album/example/123456789?i=123456790';
const youtube = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

test('public controls and studio expose the configured platforms', async () => {
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null, setItem: () => {} };
  const vite = await createServer({
    server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] }, logLevel: 'silent',
  });
  try {
    const { default: TrackListen } = await vite.ssrLoadModule('/src/components/TrackListen.jsx');
    const { default: TrackRow } = await vite.ssrLoadModule('/src/components/TrackRow.jsx');
    const { default: VideoSection } = await vite.ssrLoadModule('/src/components/VideoSection.jsx');
    const { default: Releases } = await vite.ssrLoadModule('/src/studio/Releases.jsx');
    const { default: VideoManager } = await vite.ssrLoadModule('/src/studio/VideoManager.jsx');
    const { default: Settings } = await vite.ssrLoadModule('/src/studio/Settings.jsx');
    const { PlayerProvider } = await vite.ssrLoadModule('/src/context/PlayerContext.jsx');
    const { SupportProvider } = await vite.ssrLoadModule('/src/context/SupportContext.jsx');
    const { SiteProvider } = await vite.ssrLoadModule('/src/context/SiteContext.jsx');
    const track = {
      id: 'track-1', title: 'My Song', genre: 'Soul', year: 2025, cover: '/cover.jpg', description: '',
      minAmount: 500, plays: 3, downloads: 0, allowStream: true, published: true, createdAt: '2025-01-01',
      spotifyUrl: spotify, appleMusicUrl: apple, youtubeUrl: youtube,
    };
    const wrapPlayer = (element) => React.createElement(PlayerProvider, null, element);
    const linkHtml = renderToStaticMarkup(wrapPlayer(React.createElement(TrackListen, {
      track, children: ({ link }) => `Listen on ${link?.label || 'site'}`,
    })));
    assert.match(linkHtml, /<a /);
    assert.ok(linkHtml.includes(`href="${spotify}"`));
    assert.match(linkHtml, /noopener noreferrer/);
    assert.match(linkHtml, /Listen on Spotify/);

    const localHtml = renderToStaticMarkup(wrapPlayer(React.createElement(TrackListen, {
      track: { ...track, spotifyUrl: '', appleMusicUrl: '', youtubeUrl: '' }, children: 'Play here',
    })));
    assert.match(localHtml, /<button/);
    assert.match(localHtml, /Play here/);
    const unavailable = renderToStaticMarkup(wrapPlayer(React.createElement(TrackListen, {
      track: { ...track, spotifyUrl: '', appleMusicUrl: '', youtubeUrl: '', allowStream: false }, children: 'Play here',
    })));
    assert.equal(unavailable, '');

    const rowHtml = renderToStaticMarkup(wrapPlayer(React.createElement(SupportProvider, null,
      React.createElement(TrackRow, { track, index: 0, list: [track] }))));
    for (const platform of ['Spotify', 'Apple Music', 'YouTube']) assert.ok(rowHtml.includes(platform));
    assert.match(rowHtml, /Streaming platforms for My Song/);
    assert.match(rowHtml, /Support/);

    const video = {
      id: 'video-1', title: 'My Video', description: 'Visual', thumb: '/thumb.jpg',
      views: 2, createdAt: '2025-01-01', youtubeUrl: youtube,
    };
    const renderVideos = (videos) => renderToStaticMarkup(React.createElement(SiteProvider, null,
      React.createElement(SupportProvider, null, React.createElement(VideoSection, { videos }))));
    const videoHtml = renderVideos([video]);
    assert.ok(videoHtml.includes(`href="${youtube}"`));
    assert.match(videoHtml, /Watch on YouTube/);
    assert.match(videoHtml, /Support from GH₵ 1/);
    assert.doesNotMatch(videoHtml, /site opens/);
    const localVideoHtml = renderVideos([{ ...video, youtubeUrl: '' }]);
    assert.match(localVideoHtml, /<button/);
    assert.match(localVideoHtml, /2 site opens/);

    const data = { tracks: [track], videos: [video], stats: { plays: 3, views: 2 }, settings: { minSupport: 2500 } };
    const studioProps = { data, refresh: () => {}, toast: () => {} };
    const releasesHtml = renderToStaticMarkup(React.createElement(Releases, studioProps));
    assert.match(releasesHtml, /Edit streaming links/);
    const videosHtml = renderToStaticMarkup(React.createElement(VideoManager, studioProps));
    assert.match(videosHtml, /Edit YouTube link/);
    const settingsHtml = renderToStaticMarkup(React.createElement(Settings, studioProps));
    assert.match(settingsHtml, /Minimum support for all art/);
    assert.match(settingsHtml, /id="s-min-support"[^>]*value="25"/);
  } finally {
    await vite.close();
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});
