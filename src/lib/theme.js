/* ==========================================================================
   Theme engine — the owner's colour controls for the public site.
   Pure helpers (no React, no DOM) so the server can validate the same rules.
   ========================================================================== */

export const THEME_KEYS = ['accent', 'glow', 'background', 'surface', 'text'];

export const THEME_DEFAULTS = {
  accent: '#f0b354',
  glow: '#9c8cff',
  background: '#070910',
  surface: '#10141e',
  text: '#f8f5ef',
};

export const THEME_PRESETS = [
  {
    id: 'aurum',
    name: 'Aurum',
    note: 'Gold on midnight',
    theme: { ...THEME_DEFAULTS },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    note: 'Coral and amber',
    theme: { accent: '#ff7a59', glow: '#ffb020', background: '#0d0708', surface: '#1b1013', text: '#fdf2ea' },
  },
  {
    id: 'tide',
    name: 'Tide',
    note: 'Ocean and mint',
    theme: { accent: '#4fb3ff', glow: '#34e0c4', background: '#050c14', surface: '#0c1a27', text: '#eef7ff' },
  },
  {
    id: 'jade',
    name: 'Jade',
    note: 'Emerald and lime',
    theme: { accent: '#4ad295', glow: '#b8f36b', background: '#050f0c', surface: '#0c1c16', text: '#eefaf3' },
  },
  {
    id: 'orchid',
    name: 'Orchid',
    note: 'Violet and pink',
    theme: { accent: '#b08bff', glow: '#ff6ec7', background: '#09060f', surface: '#150f22', text: '#f7f2ff' },
  },
  {
    id: 'mono',
    name: 'Mono',
    note: 'Quiet greys',
    theme: { accent: '#e8e6e1', glow: '#8f949d', background: '#0a0a0b', surface: '#151517', text: '#f7f5f2' },
  },
];

const HEX_PATTERN = /^#?([0-9a-fA-F]{6})$/;
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function isHex(value) {
  return typeof value === 'string' && HEX_PATTERN.test(value.trim());
}

export function normalizeHex(value, fallback = THEME_DEFAULTS.accent) {
  if (typeof value !== 'string') return fallback;
  const match = value.trim().match(HEX_PATTERN);
  if (!match) return fallback;
  return `#${match[1].toLowerCase()}`;
}

export function hexToRgb(value) {
  const hex = normalizeHex(value).slice(1);
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }) {
  const part = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** CSS-ready channel list: "#f0b354" -> "240, 179, 84" (for rgba(var(--x), a)). */
export function rgbChannels(value) {
  const { r, g, b } = hexToRgb(value);
  return `${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}`;
}

/** Blend two colours; t=0 returns a, t=1 returns b. */
export function mix(a, b, t) {
  const from = hexToRgb(a);
  const to = hexToRgb(b);
  const amount = clamp(t);
  return rgbToHex({
    r: from.r + (to.r - from.r) * amount,
    g: from.g + (to.g - from.g) * amount,
    b: from.b + (to.b - from.b) * amount,
  });
}

/** amount > 0 lightens toward white, amount < 0 darkens toward black. */
export function shade(value, amount) {
  return mix(value, amount >= 0 ? '#ffffff' : '#000000', Math.abs(amount));
}

export function relativeLuminance(value) {
  const { r, g, b } = hexToRgb(value);
  const channel = (n) => {
    const s = n / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a, b) {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isLight(value) {
  return relativeLuminance(value) > 0.42;
}

/** A label colour that stays readable on top of `value`. */
export function readableOn(value) {
  const dark = '#111318';
  const light = '#fffdf8';
  return contrastRatio(dark, value) >= contrastRatio(light, value) ? dark : light;
}

/** Best body colour for a background, keeping the owner's hue. */
export function suggestText(background) {
  const bg = normalizeHex(background, THEME_DEFAULTS.background);
  return isLight(bg) ? shade(bg, -0.86) : mix(bg, '#ffffff', 0.94);
}

export function normalizeTheme(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    accent: normalizeHex(source.accent, THEME_DEFAULTS.accent),
    glow: normalizeHex(source.glow, THEME_DEFAULTS.glow),
    background: normalizeHex(source.background, THEME_DEFAULTS.background),
    surface: normalizeHex(source.surface, THEME_DEFAULTS.surface),
    text: normalizeHex(source.text, THEME_DEFAULTS.text),
  };
}

export function themeMatches(a, b) {
  const left = normalizeTheme(a);
  const right = normalizeTheme(b);
  return THEME_KEYS.every((key) => left[key] === right[key]);
}

/** Validates an incoming theme patch for the server. Throws a friendly error. */
export function sanitizeTheme(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Send colours as an object of hex values.');
  }
  const patch = {};
  for (const key of THEME_KEYS) {
    if (input[key] === undefined) continue;
    if (!isHex(input[key])) {
      throw new Error(`"${key}" must be a 6-digit hex colour, like #f0b354.`);
    }
    patch[key] = normalizeHex(input[key]);
  }
  if (!Object.keys(patch).length) throw new Error('No colours were included in that request.');
  return patch;
}

/**
 * The custom properties the site reads. Setting these on <html> restyles every
 * surface, gradient and accent that is built from the theme.
 */
export function themeVars(input) {
  const theme = normalizeTheme(input);
  const accent = theme.accent;
  const accentSoft = shade(accent, 0.28);
  const accentDeep = shade(accent, -0.3);
  const background = theme.background;
  const surface = theme.surface;
  const text = theme.text;
  const glow = theme.glow;

  const textChannels = rgbChannels(text);
  const backgroundHi = mix(background, '#ffffff', isLight(background) ? 0.04 : 0.055);
  const backgroundLo = shade(background, isLight(background) ? -0.05 : -0.06);

  return {
    '--gold': accent,
    '--gold-rgb': rgbChannels(accent),
    '--gold-soft': accentSoft,
    '--gold-soft-rgb': rgbChannels(accentSoft),
    '--gold-deep': accentDeep,
    '--gold-deep-rgb': rgbChannels(accentDeep),
    '--on-gold': readableOn(accent),
    '--on-gold-rgb': rgbChannels(readableOn(accent)),
    '--v12-gold': accent,
    '--v12-gold-soft': accentSoft,
    '--glow': glow,
    '--glow-rgb': rgbChannels(glow),
    '--v12-violet': glow,
    '--v12-cyan': mix(glow, accent, 0.22),

    '--ink': background,
    '--ink-rgb': rgbChannels(background),
    '--ink-2': mix(background, surface, 0.6),
    '--v12-bg': background,
    '--v12-bg-hi': backgroundHi,
    '--v12-bg-lo': backgroundLo,

    '--panel': surface,
    '--panel-rgb': rgbChannels(surface),
    '--panel-2': mix(surface, text, 0.05),
    '--panel-3': mix(surface, text, 0.09),
    '--v12-surface-solid': surface,
    '--v12-surface-rgb': rgbChannels(surface),
    '--v12-surface': `rgba(${rgbChannels(surface)}, 0.82)`,
    '--v12-surface-2': `rgba(${rgbChannels(mix(surface, text, 0.06))}, 0.78)`,

    '--ivory': text,
    '--text-rgb': textChannels,
    '--ivory-dim': mix(text, background, 0.2),
    '--v12-text': text,
    '--muted': mix(text, background, 0.55),
    '--muted-2': mix(text, background, 0.7),
    '--v12-muted': mix(text, background, 0.52),
    '--v12-muted-2': mix(text, background, 0.68),

    '--line': `rgba(${textChannels}, 0.1)`,
    '--line-strong': `rgba(${textChannels}, 0.2)`,
    '--v12-line': `rgba(${textChannels}, 0.11)`,
    '--v12-line-strong': `rgba(${textChannels}, 0.2)`,
  };
}

/** Writes the theme onto an element (defaults to <html>). */
export function applyTheme(input, root = typeof document !== 'undefined' ? document.documentElement : null) {
  if (!root) return;
  const entries = Object.entries(themeVars(input));
  for (const [property, value] of entries) root.style.setProperty(property, value);
  root.style.colorScheme = isLight(normalizeTheme(input).background) ? 'light' : 'dark';
}

/** Contrast read-outs for the studio UI. */
export function themeReport(input) {
  const theme = normalizeTheme(input);
  const body = contrastRatio(theme.text, theme.background);
  const accent = contrastRatio(theme.accent, theme.background);
  const label = contrastRatio(readableOn(theme.accent), theme.accent);
  const grade = (ratio) => {
    if (ratio >= 7) return { ratio, level: 'AAA', tone: 'good' };
    if (ratio >= 4.5) return { ratio, level: 'AA', tone: 'good' };
    if (ratio >= 3) return { ratio, level: 'AA large', tone: 'warn' };
    return { ratio, level: 'Low', tone: 'bad' };
  };
  return { body: grade(body), accent: grade(accent), label: grade(label) };
}

/** Colour inputs the studio shows, in a stable order. */
export const THEME_CONTROLS = [
  { key: 'accent', label: 'Accent', hint: 'Buttons, links, highlights' },
  { key: 'glow', label: 'Glow', hint: 'Ambient light behind the site' },
  { key: 'background', label: 'Background', hint: 'The page canvas' },
  { key: 'surface', label: 'Surface', hint: 'Cards, panels and glass' },
  { key: 'text', label: 'Text', hint: 'Headings and body copy' },
];

const THEME_STORAGE_KEY = 'ys-theme-v1';

/**
 * A device copy of the palette. The studio writes this on every save so colours
 * survive a reload even if the API that answered is not yet storing themes.
 */
export function readStoredTheme() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.theme) return null;
    return {
      theme: normalizeTheme(parsed.theme),
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
    };
  } catch {
    return null;
  }
}

export function storeTheme(theme, savedAt = new Date().toISOString()) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ theme: normalizeTheme(theme), savedAt }));
    }
  } catch {
    /* Private mode or a full quota — the in-memory theme still applies. */
  }
  return savedAt;
}

export function clearStoredTheme() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    /* Nothing to clear. */
  }
}

const timeOf = (value) => Date.parse(value || '') || 0;

/**
 * Picks the palette to show: the server's saved theme, unless this device holds a
 * newer one (which happens when the API in front of us does not store themes yet).
 */
export function resolveTheme(settings) {
  const serverTheme = normalizeTheme(settings?.theme);
  const serverAt = timeOf(settings?.themeUpdatedAt);
  const stored = readStoredTheme();
  if (stored && timeOf(stored.savedAt) > serverAt) {
    return { theme: stored.theme, source: 'device', savedAt: stored.savedAt, serverAt };
  }
  return { theme: serverTheme, source: 'server', savedAt: settings?.themeUpdatedAt || '', serverAt };
}
