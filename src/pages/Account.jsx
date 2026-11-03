import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { useFan } from '../context/FanContext';
import { useSite } from '../context/SiteContext';
import { useToast } from '../context/ToastContext';
import { cedis, longDate } from '../lib/format';

function orderSummary(order) {
  return (order.items || [])
    .map((line) => `${line.title}${line.size ? ` (${line.size})` : ''} ×${line.qty || 1}`)
    .join(', ');
}

export default function Account() {
  const {
    fan,
    orders,
    merchOrders,
    loading,
    refresh,
    logout,
    openAuth,
    saveProfile,
  } = useFan();
  const { site } = useSite();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    setName(fan?.name || '');
    setPhone(fan?.phone || '');
  }, [fan?.name, fan?.phone]);

  useEffect(() => {
    if (fan?.id) refresh();
    // Only re-read history when the signed-in account changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fan?.id]);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await saveProfile({ name, phone });
      toast('Profile saved');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setLeaving(true);
    try {
      await logout();
      toast('Signed out');
      navigate('/');
    } catch (err) {
      toast(err.message, 'error');
      setLeaving(false);
    }
  };

  if (loading) {
    return (
      <section className="page-hero account-guest">
        <div className="container">
          <div className="loader" />
        </div>
      </section>
    );
  }

  if (!fan) {
    return (
      <section className="page-hero account-guest">
        <div className="container account-guest__inner">
          <span className="eyebrow">Fan account</span>
          <h1>
            Your place in
            <br />
            <em>the music.</em>
          </h1>
          <p>
            Create a free account to save your name and email at checkout, keep track of support, and find eligible
            download links again. No subscription and no paywall — just a closer connection to the art.
          </p>
          <div className="account-guest__actions">
            <button className="btn btn--gold btn--lg" onClick={() => openAuth('register')}>
              <Icon name="sparkle" size={17} /> Create account
            </button>
            <button className="btn btn--ghost btn--lg" onClick={() => openAuth('login')}>
              <Icon name="lock" size={16} /> I already have one
            </button>
          </div>
          <div className="account-benefits">
            <span><Icon name="check" size={14} /> Faster checkout</span>
            <span><Icon name="check" size={14} /> Support history</span>
            <span><Icon name="check" size={14} /> Download links</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="page-hero account-hero">
        <div className="container">
          <span className="eyebrow">Fan account</span>
          <h1>
            Medaase,
            <br />
            <em>{fan.name.split(/\s+/)[0]}.</em>
          </h1>
          <p>
            Every {site?.settings?.artistName || 'Young Silence'} order placed while you are signed in appears here.
            Your details are filled in automatically when you support the music or shop.
          </p>
        </div>
      </section>

      <section className="section section--tight account-page">
        <div className="container account-grid">
          <div className="account-side">
            <form className="panel account-card" onSubmit={save}>
              <div className="panel__head">
                <div>
                  <h3>Your details</h3>
                  <p>Signed in as {fan.email}</p>
                </div>
                <span className="account-avatar">
                  <Icon name="user" size={21} />
                </span>
              </div>
              <div className="field">
                <label htmlFor="account-name">Display name</label>
                <input
                  id="account-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={80}
                  minLength={2}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="account-phone">Phone (optional)</label>
                <input
                  id="account-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  maxLength={30}
                  placeholder="024 000 0000"
                />
              </div>
              <button className="btn btn--gold btn--block" disabled={busy}>
                <Icon name="check" size={15} /> {busy ? 'Saving…' : 'Save profile'}
              </button>
              <button type="button" className="btn btn--ghost btn--block" onClick={signOut} disabled={leaving}>
                <Icon name="logout" size={15} /> {leaving ? 'Signing out…' : 'Sign out'}
              </button>
            </form>

            <div className="panel account-card account-card--note">
              <span className="eyebrow">What an account does</span>
              <ul className="account-list">
                <li><Icon name="check" size={14} /> Prefills support and merch checkout</li>
                <li><Icon name="check" size={14} /> Keeps support and merch receipts together</li>
                <li><Icon name="check" size={14} /> Reopens eligible music download links</li>
                <li><Icon name="check" size={14} /> Never gates the music behind a subscription</li>
              </ul>
              <Link to="/support" className="link-arrow">
                Support the music <Icon name="arrow" size={14} />
              </Link>
            </div>
          </div>

          <div className="account-history">
            <div className="panel account-card">
              <div className="panel__head">
                <div>
                  <h3>Support history</h3>
                  <p>{orders.length} order{orders.length === 1 ? '' : 's'} placed while signed in.</p>
                </div>
              </div>
              {orders.length ? (
                <div className="table-wrap">
                  <table className="table account-table">
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Supporting</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.reference}>
                          <td>
                            <code>{order.reference}</code>
                            {order.downloadToken ? (
                              <a className="account-download" href={`/api/download/${order.downloadToken}`}>
                                <Icon name="download" size={12} /> Download
                              </a>
                            ) : null}
                          </td>
                          <td>{order.trackTitle || 'General support'}</td>
                          <td>{cedis(order.amount)}</td>
                          <td>{longDate(order.createdAt)}</td>
                          <td><span className={`badge-status badge-status--${order.status}`}>{order.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">
                  No support orders yet. When you give while signed in, your reference will live here.
                </div>
              )}
            </div>

            <div className="panel account-card">
              <div className="panel__head">
                <div>
                  <h3>Merch orders</h3>
                  <p>{merchOrders.length} store order{merchOrders.length === 1 ? '' : 's'}.</p>
                </div>
              </div>
              {merchOrders.length ? (
                <div className="table-wrap">
                  <table className="table account-table">
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Items</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {merchOrders.map((order) => (
                        <tr key={order.reference}>
                          <td><code>{order.reference}</code></td>
                          <td>{orderSummary(order)}</td>
                          <td>{cedis(order.amount)}</td>
                          <td>{longDate(order.createdAt)}</td>
                          <td><span className={`badge-status badge-status--${order.status}`}>{order.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">No merch orders yet. Your delivery references will appear here.</div>
              )}
            </div>

            <p className="field__hint">
              For privacy, older orders placed before you signed in are not linked automatically. Keep the
              <code> YS-XXXXXX </code> reference if you need help with one of those.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
