import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { applyTheme, resolveTheme } from '../lib/theme';
import { applyVisualStyle, resolveVisualStyle } from '../lib/visualStyle';
import { applyFontScale, resolveFontScale } from '../lib/typography';

const SiteContext = createContext(null);

function safeLogoUrl(value) {
  if (typeof value !== 'string') return '';
  return /^(\/(?:media|uploads)\/|https?:\/\/)/.test(value) ? value : '';
}

export function SiteProvider({ children }) {
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.site();
      setSite(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load the site');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Branding, prices and artwork can change at any time from the studio. Public
  // tabs pick those changes up when they regain focus or after a quiet poll.
  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshWhenVisible);
    const timer = window.setInterval(refreshWhenVisible, 60000);
    return () => {
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', refreshWhenVisible);
      window.clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    if (!site) return;
    document.title = `${site.settings.artistName} — Music from ${site.settings.city?.split(',')[0] || 'Accra'}`;
  }, [site]);

  // The owner's saved colours and finish restyle the whole site.
  useEffect(() => {
    const settings = site?.settings;
    const palette = resolveTheme(settings).theme;
    const visual = resolveVisualStyle(settings).style;
    const fontScale = resolveFontScale(settings).scale;
    applyTheme(palette);
    applyVisualStyle(visual);
    applyFontScale(fontScale);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', palette.background);

    const logo = safeLogoUrl(settings?.logoImage);
    const favicon = document.getElementById('site-favicon');
    if (logo && favicon) {
      const ext = logo.split('?')[0].split('.').pop()?.toLowerCase();
      favicon.setAttribute('href', logo);
      favicon.setAttribute(
        'type',
        ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/svg+xml'
      );
    }
  }, [
    site?.settings?.theme,
    site?.settings?.themeUpdatedAt,
    site?.settings?.visualStyle,
    site?.settings?.styleUpdatedAt,
    site?.settings?.fontScale,
    site?.settings?.fontScaleUpdatedAt,
    site?.settings?.logoImage,
    site?.settings?.siteImagesUpdatedAt,
  ]);

  const value = useMemo(() => ({ site, loading, error, reload: load }), [site, loading, error, load]);
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside SiteProvider');
  return ctx;
}
