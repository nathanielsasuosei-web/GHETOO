/* Public-site finish. Pure helpers so the server and studio can validate it. */
export const VISUAL_STYLES = ['liquid', 'classic'];
export const DEFAULT_VISUAL_STYLE = 'liquid';
const STORAGE_KEY = 'ys-visual-style-v1';

export const VISUAL_STYLE_CHOICES = [
  {
    id: 'liquid',
    name: 'Liquid Glass',
    note: 'Translucent refraction, soft colour blooms and luminous edges',
  },
  {
    id: 'classic',
    name: 'Midnight Classic',
    note: 'The original solid dark V12 surfaces',
  },
];

export function normalizeVisualStyle(value) {
  return VISUAL_STYLES.includes(value) ? value : DEFAULT_VISUAL_STYLE;
}

export function applyVisualStyle(input, root = typeof document !== 'undefined' ? document.documentElement : null) {
  const style = normalizeVisualStyle(input);
  if (!root) return style;
  root.dataset.visualStyle = style;
  root.classList.toggle('ys-liquid', style === 'liquid');
  root.classList.toggle('ys-classic', style === 'classic');
  return style;
}

export function storeVisualStyle(style, savedAt = new Date().toISOString()) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ style: normalizeVisualStyle(style), savedAt })
      );
    }
  } catch {
    /* Private browsing / full quota — the in-memory choice still applies. */
  }
  return savedAt;
}

export function readStoredVisualStyle() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      style: normalizeVisualStyle(parsed.style),
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
    };
  } catch {
    return null;
  }
}

export function clearStoredVisualStyle() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Nothing to clear. */
  }
}

const timeOf = (value) => Date.parse(value || '') || 0;

/** A newer device choice covers deployments whose API does not store styles yet. */
export function resolveVisualStyle(settings) {
  const serverStyle = normalizeVisualStyle(settings?.visualStyle);
  const serverAt = timeOf(settings?.styleUpdatedAt);
  const stored = readStoredVisualStyle();
  if (stored && timeOf(stored.savedAt) > serverAt) {
    return { style: stored.style, source: 'device', savedAt: stored.savedAt, serverAt };
  }
  return { style: serverStyle, source: 'server', savedAt: settings?.styleUpdatedAt || '', serverAt };
}
