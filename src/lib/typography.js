/* Artist-controlled type scale. Pure helpers shared by the client and API. */
export const FONT_SCALE_MIN = 90;
export const FONT_SCALE_MAX = 125;
export const FONT_SCALE_STEP = 5;
export const DEFAULT_FONT_SCALE = 100;
const STORAGE_KEY = 'ys-font-scale-v1';

export const FONT_SCALE_CHOICES = [
  { value: 90, label: 'Compact', note: 'More room for artwork' },
  { value: 100, label: 'Default', note: 'The original V12 rhythm' },
  { value: 110, label: 'Large', note: 'Easier long-form reading' },
  { value: 125, label: 'Extra large', note: 'Maximum legibility' },
];

export function normalizeFontScale(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_FONT_SCALE;
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Math.round(number)));
}

/** The server only accepts whole percentages in the supported range. */
export function isValidFontScale(value) {
  return Number.isInteger(value) && value >= FONT_SCALE_MIN && value <= FONT_SCALE_MAX;
}

export function fontScaleRatio(value) {
  return normalizeFontScale(value) / 100;
}

export function applyFontScale(input, root = typeof document !== 'undefined' ? document.documentElement : null) {
  const scale = normalizeFontScale(input);
  if (!root) return scale;
  root.style.setProperty('--ys-font-scale', String(fontScaleRatio(scale)));
  root.dataset.fontScale = String(scale);
  return scale;
}

export function storeFontScale(scale, savedAt = new Date().toISOString()) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ scale: normalizeFontScale(scale), savedAt })
      );
    }
  } catch {
    /* Private browsing / full quota — the in-memory choice still applies. */
  }
  return savedAt;
}

export function readStoredFontScale() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      scale: normalizeFontScale(parsed.scale),
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
    };
  } catch {
    return null;
  }
}

export function clearStoredFontScale() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Nothing to clear. */
  }
}

const timeOf = (value) => Date.parse(value || '') || 0;

/** A newer device choice covers deployments whose API does not store typography yet. */
export function resolveFontScale(settings) {
  const serverScale = normalizeFontScale(settings?.fontScale);
  const serverAt = timeOf(settings?.fontScaleUpdatedAt || settings?.styleUpdatedAt);
  const stored = readStoredFontScale();
  if (stored && timeOf(stored.savedAt) > serverAt) {
    return { scale: stored.scale, source: 'device', savedAt: stored.savedAt, serverAt };
  }
  return {
    scale: serverScale,
    source: 'server',
    savedAt: settings?.fontScaleUpdatedAt || settings?.styleUpdatedAt || '',
    serverAt,
  };
}
