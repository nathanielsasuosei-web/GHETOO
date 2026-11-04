import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_VISUAL_STYLE,
  VISUAL_STYLE_CHOICES,
  applyVisualStyle,
  normalizeVisualStyle,
  readStoredVisualStyle,
  resolveVisualStyle,
  storeVisualStyle,
} from '../src/lib/visualStyle.js';
import {
  allowsCustomSupport,
  supportChoices,
  supportPricePrefix,
  supportPresets,
} from '../src/lib/support.js';

function fakeStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
}

test('visual finish is normalised, applied and kept as a device fallback', () => {
  assert.equal(DEFAULT_VISUAL_STYLE, 'liquid');
  assert.equal(normalizeVisualStyle(undefined), 'liquid');
  assert.equal(normalizeVisualStyle('classic'), 'classic');
  assert.equal(normalizeVisualStyle('unknown'), 'liquid');
  assert.deepEqual(VISUAL_STYLE_CHOICES.map((choice) => choice.id), ['liquid', 'classic']);

  const root = {
    dataset: {},
    classList: {
      values: new Set(),
      toggle(name, on) { if (on) this.values.add(name); else this.values.delete(name); },
    },
  };
  assert.equal(applyVisualStyle('classic', root), 'classic');
  assert.equal(root.dataset.visualStyle, 'classic');
  assert.equal(root.classList.values.has('ys-classic'), true);
  assert.equal(root.classList.values.has('ys-liquid'), false);
  assert.equal(applyVisualStyle('liquid', root), 'liquid');
  assert.equal(root.classList.values.has('ys-liquid'), true);
  assert.equal(root.classList.values.has('ys-classic'), false);

  const previous = globalThis.localStorage;
  fakeStorage();
  try {
    assert.equal(readStoredVisualStyle(), null);
    assert.equal(resolveVisualStyle({ visualStyle: 'classic' }).style, 'classic');
    storeVisualStyle('classic', '2026-01-02T00:00:00.000Z');
    const device = resolveVisualStyle({ visualStyle: 'liquid' });
    assert.equal(device.source, 'device');
    assert.equal(device.style, 'classic');
    const server = resolveVisualStyle({ visualStyle: 'liquid', styleUpdatedAt: '2026-02-01T00:00:00.000Z' });
    assert.equal(server.source, 'server');
    assert.equal(server.style, 'liquid');
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});

test('fixed artist pricing has exactly one choice and no "from" prefix', () => {
  assert.equal(allowsCustomSupport(undefined), true);
  assert.equal(allowsCustomSupport(false), false);
  assert.deepEqual(supportChoices(2500, true), supportPresets(2500));
  assert.deepEqual(supportChoices(2500, false), [2500]);
  assert.equal(supportPricePrefix(true), 'from ');
  assert.equal(supportPricePrefix(false), '');
});

test('the Liquid Glass layer is wired into the app and respects accessibility', () => {
  const main = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/styles-liquid.css', import.meta.url), 'utf8');
  assert.match(main, /styles-liquid\.css/);
  assert.match(css, /html\.ys-liquid/);
  assert.match(css, /backdrop-filter/);
  assert.match(css, /@supports not/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /prefers-contrast/);
});
