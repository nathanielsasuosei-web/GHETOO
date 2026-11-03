/* ==========================================================================
   Liquid Glass — the site-wide surface treatment.

   Pure helpers (no React) so the studio can preview a look, the server can
   validate it and the public site can apply it from `/api/site`.
   ========================================================================== */

export const GLASS_INTENSITIES = [
  { id: 'subtle', name: 'Subtle', note: 'A light sheen, closest to V12' },
  { id: 'balanced', name: 'Balanced', note: 'Refractive panels and soft caustics' },
  { id: 'bold', name: 'Bold', note: 'Maximum depth, bloom and colour refraction' },
];

export const GLASS_DEFAULTS = {
  liquidGlass: true,
  glassIntensity: 'balanced',
};

const INTENSITY_IDS = GLASS_INTENSITIES.map((item) => item.id);

export function normalizeGlass(input) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    liquidGlass: source.liquidGlass === undefined ? GLASS_DEFAULTS.liquidGlass : source.liquidGlass === true || source.liquidGlass === 'true',
    glassIntensity: INTENSITY_IDS.includes(source.glassIntensity) ? source.glassIntensity : GLASS_DEFAULTS.glassIntensity,
  };
}

export function glassMatches(a, b) {
  const left = normalizeGlass(a);
  const right = normalizeGlass(b);
  return left.liquidGlass === right.liquidGlass && left.glassIntensity === right.glassIntensity;
}

/**
 * Turns the effect on or off for the whole document. The CSS lives in
 * styles-liquidglass.css and keys off these two data attributes.
 */
export function applyGlass(input, root = typeof document !== 'undefined' ? document.documentElement : null) {
  if (!root) return;
  const glass = normalizeGlass(input);
  if (glass.liquidGlass) {
    root.dataset.glass = 'on';
    root.dataset.glassIntensity = glass.glassIntensity;
  } else {
    root.dataset.glass = 'off';
    delete root.dataset.glassIntensity;
  }
}
