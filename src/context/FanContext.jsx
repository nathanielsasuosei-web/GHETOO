import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const FanContext = createContext(null);

export function FanProvider({ children }) {
  const [fan, setFan] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signup');

  const loadOrders = useCallback(async () => {
    try {
      const data = await api.fanOrders();
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
    } catch {
      setOrders([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await api.fanMe();
      setFan(data?.fan || null);
      if (data?.fan) await loadOrders();
      else setOrders([]);
    } catch {
      setFan(null);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [loadOrders]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openAuth = useCallback((mode = 'signin') => {
    setAuthMode(mode === 'signup' ? 'signup' : 'signin');
    setAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => setAuthOpen(false), []);

  const signUp = useCallback(
    async (payload) => {
      const data = await api.registerFan(payload);
      setFan(data.fan);
      setAuthOpen(false);
      await loadOrders();
      return data.fan;
    },
    [loadOrders]
  );

  const signIn = useCallback(
    async (payload) => {
      const data = await api.loginFan(payload);
      setFan(data.fan);
      setAuthOpen(false);
      await loadOrders();
      return data.fan;
    },
    [loadOrders]
  );

  const signOut = useCallback(async () => {
    await api.logoutFan();
    setFan(null);
    setOrders([]);
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const data = await api.updateFan(payload);
    setFan(data.fan);
    return data.fan;
  }, []);

  const value = useMemo(
    () => ({
      fan,
      orders,
      loading,
      authOpen,
      authMode,
      setAuthMode,
      openAuth,
      closeAuth,
      signUp,
      signIn,
      signOut,
      updateProfile,
      refresh,
      refreshOrders: loadOrders,
    }),
    [fan, orders, loading, authOpen, authMode, openAuth, closeAuth, signUp, signIn, signOut, updateProfile, refresh, loadOrders]
  );

  return <FanContext.Provider value={value}>{children}</FanContext.Provider>;
}

export function useFan() {
  const ctx = useContext(FanContext);
  if (!ctx) throw new Error('useFan must be used inside FanProvider');
  return ctx;
}
