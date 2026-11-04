import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import {
  DEFAULT_FONT_STYLE,
  FONT_STYLES,
  FONT_STYLE_CHOICES,
  applyFontStyle,
  ensureFontStyleFonts,
  fontStyleUrl,
  fontStyleVars,
  isValidFontStyle,
  normalizeFontStyle,
  readStoredFontStyle,
  resolveFontStyle,
  storeFontStyle,
} from '../src/lib/fontStyle.js';

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8');

function fakeStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
  return store;
}

function fakeRoot() {
  return {
    dataset: {},
    classList: {
      names: new Set(),
      toggle(name, on) {
        if (on) this.names.add(name);
        else this.names.delete(name);
      },
    },
    style: {
      properties: new Map(),
      setProperty(key, value) {
        this.properties.set(key, value);
      },
    },
  };
}

function fakeDocument() {
  const nodes = new Map();
  const head = {
    appended: [],
    appendChild(node) {
      this.appended.push(node);
      nodes.set(node.id, node);
    },
  };
  return {
    head,
    nodes,
    createElement: (tagName) => ({
      tagName,
      attributes: new Map(),
      setAttribute(key, value) {
        this.attributes.set(key, value);
      },
      getAttribute(key) {
        return this.attributes.has(key) ? this.attributes.get(key) : null;
      },
      remove() {
        nodes.delete(this.id);
        head.appended = head.appended.filter((node) => node !== this);
      },
    }),
    getElementById: (id) => nodes.get(id) || null,
  };
}

test('text style pairings are curated, validated and applied as CSS custom properties', () => {
  assert.equal(DEFAULT_FONT_STYLE, 'studio');
  assert.deepEqual(FONT_STYLES, FONT_STYLE_CHOICES.map((choice) => choice.id));
  assert.equal(FONT_STYLE_CHOICES.length >= 4, true, 'at least four pairings to audition');

  assert.equal(normalizeFontStyle('poster'), 'poster');
  assert.equal(normalizeFontStyle('comic-sans'), DEFAULT_FONT_STYLE);
  assert.equal(normalizeFontStyle(undefined), DEFAULT_FONT_STYLE);
  assert.equal(isValidFontStyle('geometric'), true);
  assert.equal(isValidFontStyle('nope'), false);
  assert.equal(isValidFontStyle(42), false);

  const vars = fontStyleVars('editorial');
  assert.deepEqual(Object.keys(vars).sort(), ['--mono', '--sans', '--serif']);
  assert.match(vars['--serif'], /Fraunces/);
  assert.match(vars['--sans'], /Manrope/);
  assert.match(vars['--mono'], /IBM Plex Mono/);
  // Every stack keeps a generic fallback so a blocked font request degrades.
  for (const choice of FONT_STYLE_CHOICES) {
    const picked = fontStyleVars(choice.id);
    for (const key of ['--serif', '--sans', '--mono']) {
      assert.match(picked[key], /(serif|sans-serif|monospace)$/, `${choice.id} ${key}`);
    }
  }

  const root = fakeRoot();
  assert.equal(applyFontStyle('poster', root), 'poster');
  assert.equal(root.dataset.fontStyle, 'poster');
  assert.match(root.style.properties.get('--serif'), /Syne/);
  assert.match(root.style.properties.get('--sans'), /Karla/);
  assert.equal(root.classList.names.has('ys-type-poster'), true);
  assert.equal(root.classList.names.has('ys-type-editorial'), false);
  assert.equal(applyFontStyle('bogus', root), DEFAULT_FONT_STYLE);
});

test('only a non-default pairing fetches families, and it swaps a single link', () => {
  assert.equal(fontStyleUrl('studio'), '', 'the default ships with index.html');
  assert.match(fontStyleUrl('poster'), /^https:\/\/fonts\.googleapis\.com\/css2\?/);
  assert.match(fontStyleUrl('poster'), /family=Syne/);
  assert.match(fontStyleUrl('poster'), /display=swap/);

  const doc = fakeDocument();
  assert.equal(ensureFontStyleFonts('studio', doc), 'studio');
  assert.equal(doc.head.appended.length, 0);

  ensureFontStyleFonts('editorial', doc);
  assert.equal(doc.head.appended.length, 1);
  const link = doc.head.appended[0];
  assert.equal(link.id, 'ys-font-style');
  assert.equal(link.rel, 'stylesheet');
  assert.match(link.getAttribute('href'), /family=Fraunces/);

  // A second pick rewrites the same tag instead of stacking links.
  ensureFontStyleFonts('geometric', doc);
  assert.equal(doc.head.appended.length, 1);
  assert.match(link.getAttribute('href'), /family=Space\+Grotesk/);

  // Returning to the default drops the extra request again.
  ensureFontStyleFonts('studio', doc);
  assert.equal(doc.head.appended.length, 0);
  assert.equal(ensureFontStyleFonts('poster', null), 'poster', 'server-render safe');
});

test('a newer device pairing covers a deployment whose API does not store it', () => {
  const previous = globalThis.localStorage;
  fakeStorage();
  try {
    assert.equal(readStoredFontStyle(), null);
    assert.equal(resolveFontStyle({ fontStyle: 'editorial' }).style, 'editorial');
    assert.equal(resolveFontStyle({ fontStyle: 'editorial' }).source, 'server');
    assert.equal(resolveFontStyle(undefined).style, DEFAULT_FONT_STYLE);

    storeFontStyle('poster', '2026-03-01T00:00:00.000Z');
    const device = resolveFontStyle({ fontStyle: 'studio', fontStyleUpdatedAt: '2026-01-01T00:00:00.000Z' });
    assert.equal(device.style, 'poster');
    assert.equal(device.source, 'device');

    const server = resolveFontStyle({ fontStyle: 'geometric', fontStyleUpdatedAt: '2026-04-01T00:00:00.000Z' });
    assert.equal(server.style, 'geometric');
    assert.equal(server.source, 'server');
    assert.equal(readStoredFontStyle().style, 'poster');
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});

test('the appearance tab offers every pairing as a live specimen card', async () => {
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
        data: { settings: { theme: {}, fontScale: 100, fontStyle: 'geometric' } },
        refresh: async () => {},
        toast: () => {},
      })
    );

    assert.match(html, /Text style/);
    assert.match(html, /font-style-grid/);
    assert.match(html, /font-style-card__specimen/);
    assert.match(html, /font-style-badge/);
    for (const choice of FONT_STYLE_CHOICES) {
      assert.match(html, new RegExp(choice.name), `pairing offered: ${choice.name}`);
      assert.match(html, new RegExp(choice.display.split("'")[1]), `families named: ${choice.name}`);
    }
    // Exactly one card is selected, and it is the saved pairing.
    const active = html.match(/<button[^>]*class="font-style-card is-active"[\s\S]*?<\/button>/);
    assert.equal(active !== null, true, 'one active card');
    assert.match(active[0], /Neon Geometry/);
    assert.match(active[0], /aria-pressed="true"/);
    assert.equal(html.split('font-style-card is-active').length - 1, 1);
    // The specimen is typed by the pairing it previews, not by the studio theme.
    // React escapes the quotes inside a style attribute as &#x27;.
    assert.match(html, /font-style-card[^>]*style="[^"]*--serif:(?:&#x27;|')Space Grotesk/);
    assert.match(html, /font-scale-preview[^>]*style="[^"]*--serif:(?:&#x27;|')/);
    assert.match(html, /Live type preview/);
  } finally {
    await vite.close();
  }
});

test('the public site, the API and the seed all agree on the saved pairing', () => {
  const context = read('../src/context/SiteContext.jsx');
  assert.match(context, /applyFontStyle\(fontStyle\)/);
  assert.match(context, /ensureFontStyleFonts\(fontStyle\)/);
  assert.match(context, /site\?\.settings\?\.fontStyle,/);
  assert.match(context, /site\?\.settings\?\.fontStyleUpdatedAt,/);

  const server = read('../server/index.js');
  assert.match(server, /isValidFontStyle\(body\.fontStyle\)/);
  assert.match(server, /'fontStyle',/);
  assert.match(server, /state\.settings\.fontStyleUpdatedAt = now/);

  const db = read('../server/db.js');
  assert.match(db, /normalizeFontStyle\(state\.settings\.fontStyle\)/);

  const seed = read('../server/seed.js');
  assert.match(seed, /fontStyle: 'studio'/);

  // First paint stays on the families index.html already links.
  const index = read('../index.html');
  assert.match(index, /Instrument\+Serif/);
  assert.match(index, /Inter\+Tight/);
  assert.match(index, /JetBrains\+Mono/);

  const css = read('../src/styles-v12.css');
  assert.match(css, /\.font-style-card__specimen strong \{[\s\S]*?font-family: var\(--serif\)/);
  assert.match(css, /\.font-style-card__specimen span \{[\s\S]*?font-family: var\(--sans\)/);
  assert.match(css, /\.font-style-card__specimen em \{[\s\S]*?font-family: var\(--mono\)/);
  assert.match(css, /\.font-style-grid \{\s*grid-template-columns: 1fr;/);
  assert.doesNotMatch(css, /font-size:\s*\d+(?:\.\d+)?px;/);
});
