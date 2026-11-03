import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { GLASS_INTENSITIES, applyGlass, glassMatches, normalizeGlass } from '../src/lib/glass.js';
import { pricingFor, parseSuggestedAmounts, formatSuggestedAmounts } from '../src/lib/pricing.js';

test('liquid glass settings normalise and apply to the document', () => {
  assert.deepEqual(normalizeGlass({}), { liquidGlass: true, glassIntensity: 'balanced' });
  assert.deepEqual(normalizeGlass({ liquidGlass: 'true', glassIntensity: 'bold' }), { liquidGlass: true, glassIntensity: 'bold' });
  assert.equal(normalizeGlass({ glassIntensity: 'wild' }).glassIntensity, 'balanced');
  assert.equal(glassMatches({ liquidGlass: false, glassIntensity: 'bold' }, { liquidGlass: false, glassIntensity: 'bold' }), true);
  assert.equal(glassMatches({ liquidGlass: true }, { liquidGlass: false }), false);

  const root = { dataset: {} };
  applyGlass({ liquidGlass: true, glassIntensity: 'bold' }, root);
  assert.equal(root.dataset.glass, 'on');
  assert.equal(root.dataset.glassIntensity, 'bold');
  applyGlass({ liquidGlass: false, glassIntensity: 'bold' }, root);
  assert.equal(root.dataset.glass, 'off');
  assert.equal(root.dataset.glassIntensity, undefined);
  assert.equal(GLASS_INTENSITIES.length, 3);
});

test('artist pricing drives quick amounts and the fixed price lock', () => {
  assert.deepEqual(parseSuggestedAmounts('20, 50, 20, 100', 100), [2000, 5000, 10000]);
  assert.deepEqual(parseSuggestedAmounts('5, 50', 1000), [5000]);
  assert.deepEqual(parseSuggestedAmounts('not a number', 100), []);
  assert.equal(formatSuggestedAmounts([2000, 5000, 1250]), '20, 50, 12.5');

  const open = pricingFor({ minSupport: 2500, supportMode: 'open' });
  assert.equal(open.fixed, false);
  assert.deepEqual(open.amounts, [2500, 5000, 12500, 25000]);

  const curated = pricingFor({ minSupport: 2500, supportMode: 'open', supportAmounts: [2500, 7000] });
  assert.deepEqual(curated.amounts, [2500, 7000]);

  const fixed = pricingFor({ minSupport: 2500, supportMode: 'fixed', supportAmounts: [2500, 7000] });
  assert.equal(fixed.fixed, true);
  assert.deepEqual(fixed.amounts, [2500]);
  assert.equal(fixed.title, 'Artist-set price');

  const missing = pricingFor(null);
  assert.deepEqual(missing.amounts, [100, 200, 500, 1000]);
});

test('the new studio and fan UI render with their controls', async () => {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    logLevel: 'silent',
  });
  try {
    const { default: Appearance } = await vite.ssrLoadModule('/src/studio/Appearance.jsx');
    const { default: Settings } = await vite.ssrLoadModule('/src/studio/Settings.jsx');
    const { default: Media } = await vite.ssrLoadModule('/src/studio/Media.jsx');
    const { default: Fans } = await vite.ssrLoadModule('/src/studio/Fans.jsx');
    const { default: Account } = await vite.ssrLoadModule('/src/pages/Account.jsx');
    const { default: BrandMark } = await vite.ssrLoadModule('/src/components/BrandMark.jsx');
    const { SiteProvider } = await vite.ssrLoadModule('/src/context/SiteContext.jsx');
    const { FanProvider } = await vite.ssrLoadModule('/src/context/FanContext.jsx');
    const { ToastProvider } = await vite.ssrLoadModule('/src/context/ToastContext.jsx');
    const { SupportProvider } = await vite.ssrLoadModule('/src/context/SupportContext.jsx');

    const studioProps = {
      data: { settings: { minSupport: 2500, artistName: 'Young Silence' }, fans: [] },
      refresh: async () => {},
      toast: () => {},
    };
    const wrap = (element) =>
      React.createElement(MemoryRouter, null, React.createElement(ToastProvider, null, element));

    const appearance = renderToStaticMarkup(wrap(React.createElement(Appearance, studioProps)));
    assert.match(appearance, /Liquid Glass/);
    assert.match(appearance, /Save liquid glass/);
    assert.match(appearance, /Enable Liquid Glass/);
    for (const intensity of GLASS_INTENSITIES) assert.ok(appearance.includes(intensity.name), intensity.name);
    // Existing colour controls must still be present.
    assert.match(appearance, /Live preview/);
    assert.match(appearance, /Save colours/);

    const settings = renderToStaticMarkup(wrap(React.createElement(Settings, studioProps)));
    assert.match(settings, /Minimum support for all art/);
    assert.match(settings, /Who decides how much fans pay/);
    assert.match(settings, /One set price/);
    assert.match(settings, /Quick amounts/);

    const media = renderToStaticMarkup(wrap(React.createElement(Media, studioProps)));
    assert.match(media, /Every picture on the site/);
    assert.match(media, /All images/);

    const fans = renderToStaticMarkup(wrap(React.createElement(Fans, studioProps)));
    assert.match(fans, /Fan accounts/);
    assert.match(fans, /Linked orders/);

    const account = renderToStaticMarkup(
      React.createElement(MemoryRouter, null,
        React.createElement(ToastProvider, null,
          React.createElement(FanProvider, null,
            React.createElement(SiteProvider, null,
              React.createElement(SupportProvider, null, React.createElement(Account))))))
    );
    // On the server the fan session is still loading, so the page renders its shell.
    assert.match(account, /account-page/);
    assert.match(account, /loader/);

    const mark = renderToStaticMarkup(React.createElement(SiteProvider, null, React.createElement(BrandMark)));
    assert.match(mark, /brand__mark/);
    assert.match(mark, /YS/);
  } finally {
    await vite.close();
  }
});
