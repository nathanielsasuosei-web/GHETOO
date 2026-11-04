import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const FanContext = createContext(null);

export function FanProvider({ children }) {
  const [fan, setFan] = useState(null);
  const [orders, setOrders] = useState([]);
  const [merchOrders, setMerchOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('register');

  const refresh = useCallback(async () => {
    try {
      const data = await api.fanMe();
      setFan(data.fan || null);
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setMerchOrders(Array.isArray(data.merchOrders) ? data.merchOrders : []);
    } catch {
      setFan(null);
      setOrders([]);
      setMerchOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openAuth = useCallback((mode = 'register') => {
    setAuthMode(mode === 'login' ? 'login' : 'register');
    setAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => setAuthOpen(false), []);

  const register = useCallback(
    async (payload) => {
      const data = await api.fanRegister(payload);
      setAuthOpen(false);
      await refresh();
      return data.fan;
    },
    [refresh]
  );

  const login = useCallback(
    async (payload) => {
      const data = await api.fanLogin(payload);
      setAuthOpen(false);
      await refresh();
      return data.fan;
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    await api.fanLogout();
    setFan(null);
    setOrders([]);
    setMerchOrders([]);
    setAuthOpen(false);
  }, []);

  const saveProfile = useCallback(
    async (payload) => {
      const data = await api.fanUpdate(payload);
      await refresh();
      return data.fan;
    },
    [refresh]
  );

  const value = useMemo(
    () => ({
      fan,
      orders,
      merchOrders,
      loading,
      authOpen,
      authMode,
      openAuth,
      closeAuth,
      setAuthMode,
      register,
      login,
      logout,
      saveProfile,
      refresh,
    }),
    [
      fan,
      orders,
      merchOrders,
      loading,
      authOpen,
      authMode,
      openAuth,
      closeAuth,
      register,
      login,
      logout,
      saveProfile,
      refresh,
    ]
  );

  return <FanContext.Provider value={value}>{children}</FanContext.Provider>;
}

export function useFan() {
  const ctx = useContext(FanContext);
  if (!ctx) throw new Error('useFan must be used inside FanProvider');
  return ctx;
}
