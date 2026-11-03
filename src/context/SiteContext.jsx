import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { applyTheme, resolveTheme } from '../lib/theme';
import { applyGlass } from '../lib/glass';

const SiteContext = createContext(null);

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

  useEffect(() => {
    if (!site) return;
    document.title = `${site.settings.artistName} — Music from ${site.settings.city?.split(',')[0] || 'Accra'}`;
  }, [site]);

  // The owner's saved colours restyle the whole site (see Studio → Appearance).
  useEffect(() => {
    applyTheme(resolveTheme(site?.settings).theme);
  }, [site?.settings?.theme, site?.settings?.themeUpdatedAt]);

  // Liquid Glass is an artist-level appearance switch, published to every visitor.
  useEffect(() => {
    if (!site) return;
    applyGlass(site.settings);
  }, [site, site?.settings?.liquidGlass, site?.settings?.glassIntensity]);

  // Replacing the logo also replaces the browser tab icon, live.
  useEffect(() => {
    if (!site) return;
    const icon = document.querySelector('link[rel="icon"]');
    const next = site.settings?.faviconImage || site.settings?.logoImage || '/favicon.svg';
    if (!icon) return;
    const type = next.endsWith('.svg')
      ? 'image/svg+xml'
      : /\.png($|\?)/.test(next)
        ? 'image/png'
        : /\.jpe?g($|\?)/.test(next)
          ? 'image/jpeg'
          : /\.webp($|\?)/.test(next)
            ? 'image/webp'
            : 'image/png';
    if (icon.getAttribute('href') !== next) {
      icon.setAttribute('href', next);
      icon.setAttribute('type', type);
    }
  }, [site, site?.settings?.faviconImage, site?.settings?.logoImage]);

  const value = useMemo(() => ({ site, loading, error, reload: load }), [site, loading, error, load]);
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside SiteProvider');
  return ctx;
}
