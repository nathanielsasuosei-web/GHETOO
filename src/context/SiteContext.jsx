import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

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

  const value = useMemo(() => ({ site, loading, error, reload: load }), [site, loading, error, load]);
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside SiteProvider');
  return ctx;
}
