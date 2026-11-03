/* ==========================================================================
   Artist-controlled pricing for direct support.

   The artist sets one amount in Studio → Settings. In "fans choose" mode that
   amount is the floor and fans may give more; in "one set price" mode it is the
   exact price. The artist can also curate the quick-amount buttons.
   ========================================================================== */

import { MAX_SUPPORT_PESEWAS, supportMinimum, supportPresets } from './support.js';

export const MAX_SUGGESTED_AMOUNTS = 6;

/** Clean a comma-separated GH₵ string from a studio input into pesewas. */
export function parseSuggestedAmounts(text, floor) {
  const values = String(text ?? '')
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => /^\d+(\.\d{1,2})?$/.test(part))
    .map((part) => Math.round(Number(part) * 100));
  const unique = [];
  for (const value of values) {
    if (!Number.isSafeInteger(value) || value < floor || value > MAX_SUPPORT_PESEWAS) continue;
    if (!unique.includes(value)) unique.push(value);
    if (unique.length === MAX_SUGGESTED_AMOUNTS) break;
  }
  return unique.sort((a, b) => a - b);
}

export function formatSuggestedAmounts(amounts = []) {
  return amounts
    .map((value) => String((value / 100).toFixed(2)).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1'))
    .join(', ');
}

/** The quick amounts + copy the public site should show, derived from /api/site. */
export function pricingFor(site) {
  const floor = supportMinimum(site?.minSupport);
  const fixed = site?.supportMode === 'fixed' || site?.settings?.supportMode === 'fixed';
  const serverAmounts = Array.isArray(site?.supportAmounts) ? site.supportAmounts : [];
  const curated = serverAmounts.filter(
    (value) => Number.isSafeInteger(value) && value >= floor && value <= MAX_SUPPORT_PESEWAS
  );
  const amounts = fixed ? [floor] : curated.length ? curated.slice(0, MAX_SUGGESTED_AMOUNTS) : supportPresets(floor);
  return {
    floor,
    fixed,
    mode: fixed ? 'fixed' : 'open',
    amounts,
    title: fixed ? 'Artist-set price' : 'Support from',
    hint: fixed
      ? 'The artist has set one price for all support.'
      : 'The artist sets the minimum — you can give more if you want to.',
  };
}
