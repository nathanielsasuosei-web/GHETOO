import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const SupportContext = createContext(null);

export function SupportProvider({ children }) {
  const [state, setState] = useState({ open: false, track: null, video: null, amount: null });

  const openSupport = useCallback((track = null, options = {}) => {
    setState({ open: true, track: track || null, video: track ? null : options.video || null, amount: options.amount ?? null });
  }, []);

  const closeSupport = useCallback(() => {
    setState({ open: false, track: null, video: null, amount: null });
  }, []);

  const value = useMemo(
    () => ({ ...state, openSupport, closeSupport }),
    [state, openSupport, closeSupport]
  );

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
}

export function useSupport() {
  const ctx = useContext(SupportContext);
  if (!ctx) throw new Error('useSupport must be used inside SupportProvider');
  return ctx;
}
