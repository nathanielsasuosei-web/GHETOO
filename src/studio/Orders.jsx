import { useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { api } from '../lib/api';
import { cedis, relativeTime } from '../lib/format';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Awaiting MoMo' },
  { id: 'paid', label: 'Confirmed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const METHOD_LABEL = { mtn: 'MTN MoMo', telecel: 'Telecel Cash', at: 'AirtelTigo', card: 'Card' };

export default function Orders({ data, refresh, toast }) {
  const [filter, setFilter] = useState('pending');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.orders.filter((o) => {
      const matchFilter = filter === 'all' ? true : o.status === filter;
      const matchQuery =
        !q ||
        o.reference.toLowerCase().includes(q) ||
        o.supporterName.toLowerCase().includes(q) ||
        (o.email || '').toLowerCase().includes(q) ||
        (o.trackTitle || '').toLowerCase().includes(q);
      return matchFilter && matchQuery;
    });
  }, [data.orders, filter, query]);

  const totals = useMemo(() => {
    const paid = data.orders.filter((o) => o.status === 'paid');
    return {
      paid: paid.reduce((s, o) => s + o.amount, 0),
      pending: data.orders.filter((o) => o.status === 'pending').reduce((s, o) => s + o.amount, 0),
      count: paid.length,
    };
  }, [data.orders]);

  const update = async (order, status) => {
    try {
      await api.updateOrder(order.id, status);
      toast(
        status === 'paid'
          ? `Confirmed — ${cedis(order.amount)} from ${order.supporterName}`
          : status === 'cancelled'
            ? 'Marked as cancelled'
            : 'Moved back to pending'
      );
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const remove = async (order) => {
    if (!window.confirm(`Delete order ${order.reference}? This removes it from your records.`)) return;
    try {
      await api.deleteOrder(order.id);
      toast('Order deleted');
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const copy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      toast(`Copied ${value}`);
    } catch {
      toast('Could not copy', 'error');
    }
  };

  return (
    <>
      <div className="studio__top">
        <div>
          <h1>Supporters</h1>
          <p>Confirm Mobile Money payments once they land in your wallet. Card payments confirm automatically.</p>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--muted)' }}>
              CONFIRMED
            </div>
            <strong style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--gold)' }}>{cedis(totals.paid)}</strong>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--muted)' }}>
              AWAITING
            </div>
            <strong style={{ fontFamily: 'var(--serif)', fontSize: 24 }}>{cedis(totals.pending)}</strong>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel__head">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FILTERS.map((f) => {
              const count =
                f.id === 'all' ? data.orders.length : data.orders.filter((o) => o.status === f.id).length;
              return (
                <button
                  key={f.id}
                  className={`chip ${filter === f.id ? 'is-active' : ''}`}
                  style={
                    filter === f.id
                      ? { borderColor: 'var(--gold)', color: 'var(--gold-soft)', background: 'rgba(232,163,61,0.1)' }
                      : {}
                  }
                  onClick={() => setFilter(f.id)}
                >
                  {f.label} · {count}
                </button>
              );
            })}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reference, name, email…"
            style={{
              background: '#0a0b0c',
              border: '1px solid var(--line-strong)',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 12.5,
              minWidth: 240,
            }}
          />
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Supporter</th>
                <th>Supported art</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>When</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td>
                    <strong>{o.supporterName}</strong>
                    <div className="sub">
                      <button
                        onClick={() => copy(o.reference)}
                        className="mono"
                        style={{ color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                        title="Copy reference"
                      >
                        {o.reference} <Icon name="copy" size={10} />
                      </button>
                      {o.email ? ` · ${o.email}` : ''}
                    </div>
                    {o.message ? (
                      <div className="sub" style={{ fontStyle: 'italic', maxWidth: 300 }}>
                        “{o.message}”
                      </div>
                    ) : null}
                  </td>
                  <td className="muted">{o.trackTitle}</td>
                  <td>
                    <strong>{cedis(o.amount)}</strong>
                  </td>
                  <td className="muted">{METHOD_LABEL[o.provider] || METHOD_LABEL[o.method] || o.method}</td>
                  <td>
                    <span className={`badge-status badge-status--${o.status}`}>{o.status}</span>
                    {o.demo ? (
                      <div className="sub" style={{ fontSize: 10 }}>
                        sandbox
                      </div>
                    ) : null}
                  </td>
                  <td className="muted">{relativeTime(o.createdAt)}</td>
                  <td>
                    <div className="table__actions">
                      {o.status !== 'paid' ? (
                        <button className="btn btn--gold btn--sm" onClick={() => update(o, 'paid')}>
                          <Icon name="check" size={12} /> Confirm
                        </button>
                      ) : (
                        <button className="btn btn--ghost btn--sm" onClick={() => update(o, 'pending')}>
                          Undo
                        </button>
                      )}
                      {o.status === 'pending' ? (
                        <button className="btn btn--ghost btn--sm" onClick={() => update(o, 'cancelled')}>
                          Cancel
                        </button>
                      ) : null}
                      <button className="icon-btn icon-btn--sm" onClick={() => remove(o)} title="Delete">
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filtered.length ? (
          <div className="empty">
            {filter === 'pending'
              ? 'Nothing waiting for confirmation. Every MoMo payment has been matched.'
              : 'No orders match this view.'}
          </div>
        ) : null}
      </div>

      {data.paymentMode === 'sandbox' ? (
        <div className="alert alert--info">
          <Icon name="wallet" size={16} />
          <span>
            Card payments are in sandbox mode. Add a <code>PAYSTACK_SECRET_KEY</code> environment variable and restart to
            take real card payments. Mobile Money confirmations are always manual.
          </span>
        </div>
      ) : null}
    </>
  );
}
