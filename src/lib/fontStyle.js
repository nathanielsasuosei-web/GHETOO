/* ==========================================================================
   Text style — the owner's typeface pairings for the public site.

   Pure helpers (no React, no DOM) so the API validates the same rules and the
   studio can preview a pairing before it is published. Each choice rewrites the
   three custom properties the whole design system already reads:

     --serif  display type (hero, titles, release names)
     --sans   body type (paragraphs, buttons, forms)
     --mono   label type (eyebrows, meta, counters)
   ========================================================================== */

export const DEFAULT_FONT_STYLE = 'studio';
const STORAGE_KEY = 'ys-font-style-v1';
const LINK_ID = 'ys-font-style';
const FONTS_ENDPOINT = 'https://fonts.googleapis.com/css2';

export const FONT_STYLE_CHOICES = [
  {
    id: 'studio',
    name: 'Studio Serif',
    note: 'The current voice — airy serif headlines over Inter Tight',
    display: "'Instrument Serif', 'Iowan Old Style', Georgia, 'Times New Roman', serif",
    body: "'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    label: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
    // Already linked from index.html, so the default costs no extra request.
    families: '',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    note: 'Fraunces headlines with warm Manrope reading copy',
    display: "'Fraunces', 'Iowan Old Style', Georgia, 'Times New Roman', serif",
    body: "'Manrope', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    label: "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace",
    families:
      'family=Fraunces:opsz,wght@9..144,400..700&family=Manrope:wght@300..800&family=IBM+Plex+Mono:wght@400;500',
  },
  {
    id: 'geometric',
    name: 'Neon Geometry',
    note: 'Space Grotesk headlines, neutral Inter body, Space Mono labels',
    display: "'Space Grotesk', 'Segoe UI', Helvetica, Arial, sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    label: "'Space Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
    families: 'family=Space+Grotesk:wght@400..700&family=Inter:wght@300..800&family=Space+Mono:wght@400;700',
  },
  {
    id: 'poster',
    name: 'Poster Loud',
    note: 'Syne display type cut against Karla body copy',
    display: "'Syne', 'Arial Black', Helvetica, Arial, sans-serif",
    body: "'Karla', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    label: "'DM Mono', ui-monospace, 'SF Mono', Menlo, monospace",
    families: 'family=Syne:wght@400..800&family=Karla:wght@300..700&family=DM+Mono:wght@400;500',
  },
];

export const FONT_STYLES = FONT_STYLE_CHOICES.map((choice) => choice.id);

export function normalizeFontStyle(value) {
  return FONT_STYLES.includes(value) ? value : DEFAULT_FONT_STYLE;
}

/** The server only accepts a pairing it can serve to every visitor. */
export function isValidFontStyle(value) {
  return FONT_STYLES.includes(value);
}

export function fontStyleChoice(value) {
  const id = normalizeFontStyle(value);
  return FONT_STYLE_CHOICES.find((choice) => choice.id === id) || FONT_STYLE_CHOICES[0];
}

/** CSS-ready custom properties for a pairing; also used to type studio previews. */
export function fontStyleVars(value) {
  const choice = fontStyleChoice(value);
  return { '--serif': choice.display, '--sans': choice.body, '--mono': choice.label };
}

/** Google Fonts URL for a pairing, or '' when index.html already ships it. */
export function fontStyleUrl(value) {
  const choice = fontStyleChoice(value);
  return choice.families ? `${FONTS_ENDPOINT}?${choice.families}&display=swap` : '';
}

/** Writes a pairing onto an element (defaults to <html>). */
export function applyFontStyle(input, root = typeof document !== 'undefined' ? document.documentElement : null) {
  const id = normalizeFontStyle(input);
  if (!root) return id;
  const vars = fontStyleVars(id);
  for (const [property, value] of Object.entries(vars)) root.style.setProperty(property, value);
  root.dataset.fontStyle = id;
  for (const style of FONT_STYLES) root.classList.toggle(`ys-type-${style}`, style === id);
  return id;
}

/**
 * Fetches the families a pairing needs, once. The default pairing is already
 * linked from index.html, so most visitors never trigger a request.
 */
export function ensureFontStyleFonts(input, doc = typeof document !== 'undefined' ? document : null) {
  const id = normalizeFontStyle(input);
  if (!doc || !doc.head) return id;
  const href = fontStyleUrl(id);
  const existing = typeof doc.getElementById === 'function' ? doc.getElementById(LINK_ID) : null;
  if (!href) {
    if (existing && typeof existing.remove === 'function') existing.remove();
    return id;
  }
  let link = existing;
  if (!link) {
    link = doc.createElement('link');
    link.id = LINK_ID;
    link.rel = 'stylesheet';
    doc.head.appendChild(link);
  }
  if (link.getAttribute('href') !== href) link.setAttribute('href', href);
  return id;
}

export function storeFontStyle(style, savedAt = new Date().toISOString()) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ style: normalizeFontStyle(style), savedAt })
      );
    }
  } catch {
    /* Private browsing / full quota — the in-memory choice still applies. */
  }
  return savedAt;
}

export function readStoredFontStyle() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      style: normalizeFontStyle(parsed.style),
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
    };
  } catch {
    return null;
  }
}

export function clearStoredFontStyle() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Nothing to clear. */
  }
}

const timeOf = (value) => Date.parse(value || '') || 0;

/** A newer device choice covers deployments whose API does not store type yet. */
export function resolveFontStyle(settings) {
  const serverStyle = normalizeFontStyle(settings?.fontStyle);
  const serverAt = timeOf(settings?.fontStyleUpdatedAt || settings?.styleUpdatedAt);
  const stored = readStoredFontStyle();
  if (stored && timeOf(stored.savedAt) > serverAt) {
    return { style: stored.style, source: 'device', savedAt: stored.savedAt, serverAt };
  }
  return {
    style: serverStyle,
    source: 'server',
    savedAt: settings?.fontStyleUpdatedAt || settings?.styleUpdatedAt || '',
    serverAt,
  };
}
