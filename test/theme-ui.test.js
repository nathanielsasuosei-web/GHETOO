import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { THEME_PRESETS } from '../src/lib/theme.js';

test('the appearance tab renders the owner colour controls and live preview', async () => {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: 'silent',
  });
  try {
    const { default: Appearance } = await vite.ssrLoadModule('/src/studio/Appearance.jsx');
    const html = renderToStaticMarkup(
      React.createElement(Appearance, {
        data: { settings: { theme: { accent: '#4fb3ff', glow: '#34e0c4', background: '#050c14', surface: '#0c1a27', text: '#eef7ff' } } },
        refresh: async () => {},
        toast: () => {},
      })
    );

    assert.match(html, /Appearance/);
    assert.match(html, /Live preview/);
    for (const preset of THEME_PRESETS) assert.ok(html.includes(preset.name), `${preset.name} preset`);
    for (const value of ['#4fb3ff', '#34e0c4', '#050c14', '#0c1a27', '#eef7ff']) {
      assert.ok(html.toLowerCase().includes(value), `${value} shown`);
    }
    assert.match(html, /type="color"/);
    assert.match(html, /Save appearance/);
    assert.match(html, /Liquid Glass/);
    assert.match(html, /Midnight Classic/);
    assert.match(html, /Body text/);
    assert.match(html, /title="Accent #4fb3ff"/);
    // The preview scopes the palette so it keeps working even before saving.
    assert.match(html, /theme-preview/);
  } finally {
    await vite.close();
  }
});

test('a device-only palette can be republished in one click once the API is updated', async () => {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: 'silent',
  });
  const savedStorage = globalThis.localStorage;
  try {
    globalThis.localStorage = {
      getItem: (key) =>
        key === 'ys-theme-v1'
          ? JSON.stringify({
              theme: { accent: '#4fb3ff', glow: '#34e0c4', background: '#050c14', surface: '#0c1a27', text: '#eef7ff' },
              savedAt: '2026-11-03T00:00:00.000Z',
            })
          : null,
      setItem: () => {},
      removeItem: () => {},
    };
    const { default: Appearance } = await vite.ssrLoadModule('/src/studio/Appearance.jsx');
    const html = renderToStaticMarkup(
      React.createElement(Appearance, {
        // No capabilities: the deployed API is an older build.
        data: { settings: { theme: THEME_PRESETS[0].theme } },
        refresh: async () => {},
        toast: () => {},
      })
    );
    assert.match(html, /saved on this device only/i);
    assert.match(html, /older build/i);
    assert.match(html, /Publish colours/);
    assert.match(html, /persistent/);
  } finally {
    if (savedStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = savedStorage;
    await vite.close();
  }
});
