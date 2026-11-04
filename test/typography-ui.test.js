import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import {
  DEFAULT_FONT_SCALE,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  applyFontScale,
  fontScaleRatio,
  isValidFontScale,
  normalizeFontScale,
  readStoredFontScale,
  resolveFontScale,
  storeFontScale,
} from '../src/lib/typography.js';

test('font scale is validated, clamped and applied as a numeric CSS multiplier', () => {
  assert.equal(DEFAULT_FONT_SCALE, 100);
  assert.equal(FONT_SCALE_MIN, 90);
  assert.equal(FONT_SCALE_MAX, 125);
  assert.equal(normalizeFontScale(undefined), 100);
  assert.equal(normalizeFontScale(112.4), 112);
  assert.equal(normalizeFontScale(500), 125);
  assert.equal(isValidFontScale(110), true);
  assert.equal(isValidFontScale(100.5), false);
  assert.equal(isValidFontScale(89), false);
  assert.equal(fontScaleRatio(125), 1.25);

  const root = { dataset: {}, style: { properties: new Map(), setProperty(key, value) { this.properties.set(key, value); } } };
  assert.equal(applyFontScale(115, root), 115);
  assert.equal(root.style.properties.get('--ys-font-scale'), '1.15');
  assert.equal(root.dataset.fontScale, '115');

  const previous = globalThis.localStorage;
  globalThis.localStorage = (() => {
    const store = new Map();
    return {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    };
  })();
  try {
    assert.equal(readStoredFontScale(), null);
    assert.equal(resolveFontScale({ fontScale: 110 }).scale, 110);
    storeFontScale(125, '2026-01-02T00:00:00.000Z');
    assert.equal(resolveFontScale({ fontScale: 100 }).source, 'device');
    assert.equal(resolveFontScale({ fontScale: 100 }).scale, 125);
    assert.equal(resolveFontScale({ fontScale: 100, fontScaleUpdatedAt: '2026-02-01T00:00:00.000Z' }).scale, 100);
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});

test('the CSS uses the shared font-scale multiplier for every fixed font size', () => {
  const css = ['../src/styles.css', '../src/styles-v12.css']
    .map((relative) => readFileSync(new URL(relative, import.meta.url), 'utf8'))
    .join('\n');
  assert.match(css, /--ys-font-scale:\s*1/);
  assert.match(css, /font-size:\s*calc\(16px \* var\(--ys-font-scale\)\)/);
  assert.doesNotMatch(css, /font-size:\s*\d+(?:\.\d+)?px;/);
  assert.match(css, /clamp\(calc\(/);
});

test('the appearance tab exposes the font-size control and the 404 actions are distinct', async () => {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: 'silent',
  });
  try {
    const { default: Appearance } = await vite.ssrLoadModule('/src/studio/Appearance.jsx');
    const { default: NotFound } = await vite.ssrLoadModule('/src/pages/NotFound.jsx');
    const appearanceHtml = renderToStaticMarkup(
      React.createElement(Appearance, {
        data: { settings: { theme: {}, fontScale: 110 } },
        refresh: async () => {},
        toast: () => {},
      })
    );
    assert.match(appearanceHtml, /Font size/);
    assert.match(appearanceHtml, /110%/);
    assert.match(appearanceHtml, /type="range"/);
    assert.match(appearanceHtml, /min="90"/);
    assert.match(appearanceHtml, /max="125"/);
    assert.match(appearanceHtml, /Live type preview/);

    const originalError = console.error;
    console.error = (...args) => {
      if (String(args[0]).includes('useLayoutEffect')) return;
      originalError(...args);
    };
    let notFoundHtml;
    try {
      notFoundHtml = renderToStaticMarkup(
        React.createElement(MemoryRouter, null, React.createElement(NotFound))
      );
    } finally {
      console.error = originalError;
    }
    assert.match(notFoundHtml, /href="\/"/);
    assert.match(notFoundHtml, /href="\/music"/);
    assert.match(notFoundHtml, /Back home/);
    assert.match(notFoundHtml, /Listen instead/);
    assert.doesNotMatch(notFoundHtml, /Back homeListen instead/);
    assert.match(notFoundHtml, /not-found__actions/);
  } finally {
    await vite.close();
  }
});

test('the retired mega-menu and duplicated intro copy are gone', () => {
  const sources = ['../src/components/Header.jsx', '../src/pages/Music.jsx', '../src/pages/Videos.jsx']
    .map((relative) => readFileSync(new URL(relative, import.meta.url), 'utf8'))
    .join('\n');
  for (const phrase of [
    'The full world',
    'Go deeper into the music.',
    'One independent universe',
    'Listen on your favourite streaming platforms or play available releases here',
    'Support the music directly. Releases with an uploaded audio file',
    'Visuals, live sessions and studio diaries',
  ]) {
    assert.equal(sources.includes(phrase), false, `removed: ${phrase}`);
  }
});
