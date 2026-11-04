import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

test('the media studio shows the logo and every replaceable image group', async () => {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: 'silent',
  });
  try {
    const { default: Media } = await vite.ssrLoadModule('/src/studio/Media.jsx');
    const { default: BrandLogo } = await vite.ssrLoadModule('/src/components/BrandLogo.jsx');
    const data = {
      settings: {
        artistName: 'Young Silence',
        logoImage: '/media/logo.svg',
        heroImage: '/media/hero.jpg',
        portraitImage: '/media/portrait.jpg',
      },
      tracks: [{ id: 'trk_1', title: 'Accra Nights', cover: '/media/covers/accra-nights.jpg', published: true }],
      videos: [{ id: 'vid_1', title: 'Live Session', thumb: '/media/thumbs/accra-nights.jpg', published: true }],
      products: [{ id: 'prd_1', title: 'Tour Tee', image: '/media/covers/placeholder.jpg', published: true }],
    };
    // React Router intentionally warns about useLayoutEffect in this SSR-only
    // smoke test; the component itself is client-rendered in the app.
    const originalError = console.error;
    console.error = (...args) => {
      if (String(args[0]).includes('useLayoutEffect')) return;
      originalError(...args);
    };
    let html;
    try {
      html = renderToStaticMarkup(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(Media, { data, refresh: async () => {}, toast: () => {} })
        )
      );
    } finally {
      console.error = originalError;
    }

    assert.match(html, /Media/);
    assert.match(html, /Logo/);
    assert.match(html, /Homepage hero/);
    assert.match(html, /Portrait/);
    assert.match(html, /Release covers/);
    assert.match(html, /Video thumbnails/);
    assert.match(html, /Merch photos/);
    assert.match(html, /Accra Nights/);
    assert.match(html, /Live Session/);
    assert.match(html, /Tour Tee/);
    assert.match(html, /Upload image/);
    assert.match(html, /accept="image\/png,image\/jpeg,image\/webp,image\/gif"/);
    assert.ok(html.includes('/media/logo.svg'));
    assert.ok(html.includes('/studio/website'));
    assert.ok(html.includes('/studio/appearance'));

    const logo = renderToStaticMarkup(
      React.createElement(BrandLogo, { settings: data.settings })
    );
    assert.match(logo, /brand__mark--logo/);
    assert.ok(logo.includes('/media/logo.svg'));
  } finally {
    await vite.close();
  }
});
