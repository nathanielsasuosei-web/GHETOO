import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { cedis, longDate, initials } from '../lib/format';

export default function Fans({ data, refresh }) {
  const { toast } = useToast();
  const [fans, setFans] = useState(data?.fans || []);
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await api.listFans();
      setFans(result.fans || []);
    } catch (err) {
      toast(err.message, 'error');
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return fans;
    return fans.filter((fan) => `${fan.name} ${fan.email} ${fan.phone || ''}`.toLowerCase().includes(needle));
  }, [fans, query]);

  const remove = async (fan) => {
    if (!window.confirm(`Delete ${fan.name}’s account? Their support and merch orders stay in your ledger.`)) return;
    setDeleting(fan.id);
    try {
      await api.deleteFan(fan.id);
      setFans((list) => list.filter((item) => item.id !== fan.id));
      await refresh();
      toast('Fan account removed');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDeleting('');
    }
  };

  const totalGiven = fans.reduce((sum, fan) => sum + (fan.contributed || 0), 0);
  const totalOrders = fans.reduce((sum, fan) => sum + (fan.orders || 0), 0);

  return (
    <>
      <div className="studio__top">
        <div>
          <h1>Fans</h1>
          <p>Everyone who made an account. Passwords are hashed — you only ever see names and contact details.</p>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={load}>
          <Icon name="bolt" size={14} /> Refresh
        </button>
      </div>

      <div className="fan-admin-stats">
        <div><span>Accounts</span><strong>{fans.length}</strong></div>
        <div><span>Linked orders</span><strong>{totalOrders}</strong></div>
        <div><span>Confirmed support</span><strong>{cedis(totalGiven)}</strong></div>
      </div>

      <div className="panel">
        <div className="panel__head">
          <div>
            <h3>Fan accounts</h3>
            <p>Orders placed while signed in are linked to these accounts.</p>
          </div>
          <div className="field" style={{ minWidth: 220, margin: 0 }}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or email…"
              aria-label="Search fan accounts"
            />
          </div>
        </div>

        {visible.length ? (
          <div className="fan-admin-list">
            {visible.map((fan) => (
              <div className="fan-admin-row" key={fan.id}>
                <span className="fan-admin-row__avatar">{initials(fan.name) || 'F'}</span>
                <div className="fan-admin-row__copy">
                  <strong>{fan.name}</strong>
                  <small>{fan.email}{fan.phone ? ` · ${fan.phone}` : ''}</small>
                </div>
                <div className="fan-admin-row__meta">
                  <span>{fan.orders || 0} orders</span>
                  <strong>{cedis(fan.contributed || 0)}</strong>
                  <small>joined {longDate(fan.createdAt)}</small>
                </div>
                <button
                  type="button"
                  className="icon-btn icon-btn--sm"
                  onClick={() => remove(fan)}
                  disabled={deleting === fan.id}
                  aria-label={`Delete ${fan.name}'s account`}
                  title="Delete account"
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="account-empty">
            <Icon name="users" size={22} />
            <strong>{query ? 'No accounts match that search.' : 'No fan accounts yet.'}</strong>
            <p>Fans can create one from the “Sign in” button in the header or at /account.</p>
          </div>
        )}
      </div>
    </>
  );
}
