import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { useFan } from '../context/FanContext';
import { useSite } from '../context/SiteContext';
import { useSupport } from '../context/SupportContext';
import { useToast } from '../context/ToastContext';
import { cedis, longDate, initials } from '../lib/format';
import { api } from '../lib/api';

const STATUS = {
  paid: { label: 'Confirmed', tone: 'paid' },
  pending: { label: 'Awaiting confirmation', tone: 'pending' },
  cancelled: { label: 'Cancelled', tone: 'cancelled' },
};

function Guest() {
  const { openAuth } = useFan();
  return (
    <div className="account-guest">
      <span className="eyebrow">Your corner of the music</span>
      <h1 className="display">Keep every cedi<br /><em>you gave close.</em></h1>
      <p>
        Create a free fan account to keep your support, downloads and merch orders together. Checkout fills itself
        in, and your receipt is always one click away.
      </p>
      <div className="account-guest__actions">
        <button className="btn btn--gold btn--lg" onClick={() => openAuth('signup')}>
          <Icon name="user" size={17} /> Create a free account
        </button>
        <button className="btn btn--ghost btn--lg" onClick={() => openAuth('signin')}>
          I already have one
        </button>
      </div>
      <div className="account-guest__grid">
        <div><Icon name="wallet" size={18} /><strong>One place for support</strong><small>Every contribution and its status.</small></div>
        <div><Icon name="download" size={18} /><strong>Downloads that stay</strong><small>Come back for the records you supported.</small></div>
        <div><Icon name="bolt" size={18} /><strong>Quicker checkout</strong><small>Your name and email, remembered.</small></div>
      </div>
    </div>
  );
}

function OrderRow({ order }) {
  const status = STATUS[order.status] || STATUS.pending;
  const isMerch = order.kind === 'merch';
  return (
    <div className="fan-order">
      <span className={`fan-order__icon ${isMerch ? 'is-merch' : ''}`}>
        <Icon name={isMerch ? 'bag' : 'heart'} size={17} />
      </span>
      <div className="fan-order__copy">
        <strong>{isMerch ? order.items?.map((line) => line.title).join(', ') : order.trackTitle || 'General support'}</strong>
        <small>
          {longDate(order.createdAt)} · {order.reference}
          {isMerch ? ' · merch order' : order.method === 'card' ? ' · card' : ' · mobile money'}
        </small>
      </div>
      <span className={`badge-status badge-status--${status.tone}`}>{status.label}</span>
      <strong className="fan-order__amount">{cedis(order.amount)}</strong>
      <div className="fan-order__links">
        <Link to={`/thank-you?ref=${encodeURIComponent(order.reference)}`} className="link-arrow">Receipt</Link>
        {order.downloadToken ? (
          <a href={`/api/download/${order.downloadToken}`} className="link-arrow">Download</a>
        ) : null}
      </div>
    </div>
  );
}

export default function Account() {
  const { site } = useSite();
  const { fan, orders, loading, signOut, updateProfile, refreshOrders } = useFan();
  const { openSupport } = useSupport();
  const { toast } = useToast();
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => {
    if (fan) setProfile({ name: fan.name || '', email: fan.email || '', phone: fan.phone || '' });
  }, [fan]);

  useEffect(() => {
    if (fan) refreshOrders();
  }, [fan, refreshOrders]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await updateProfile(profile);
      toast('Your details are saved');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordBusy(true);
    try {
      await api.changeFanPassword(passwords);
      setPasswords({ currentPassword: '', password: '' });
      toast('Password updated');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setPasswordBusy(false);
    }
  };

  const leave = async () => {
    try {
      await signOut();
      toast('Signed out');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const artistName = site?.settings?.artistName || 'Young Silence';
  const paid = orders.filter((order) => order.status === 'paid');
  const total = paid.reduce((sum, order) => sum + (order.amount || 0), 0);

  return (
    <div className="container account-page">
      {!fan ? (
        loading ? <div className="account-loading"><div className="loader" /></div> : <Guest />
      ) : (
        <>
          <div className="account-head">
            <div className="account-head__avatar">{initials(fan.name) || 'F'}</div>
            <div>
              <span className="eyebrow">Fan account</span>
              <h1 className="display">Hi, {fan.name.split(/\s+/)[0]}.</h1>
              <p>Everything you’ve done for {artistName}, in one quiet place.</p>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={leave}>
              <Icon name="logout" size={15} /> Sign out
            </button>
          </div>

          <div className="account-stats">
            <div><span>Orders</span><strong>{orders.length}</strong><small>support + merch</small></div>
            <div><span>Confirmed</span><strong>{cedis(total)}</strong><small>total given</small></div>
            <div><span>Member since</span><strong>{longDate(fan.createdAt)}</strong><small>part of the circle</small></div>
          </div>

          <div className="account-grid">
            <section className="panel">
              <div className="panel__head">
                <div><h3>Your details</h3><p>Used to fill in checkout for you.</p></div>
              </div>
              <form onSubmit={saveProfile} className="account-form">
                <div className="field">
                  <label htmlFor="ac-name">Name</label>
                  <input id="ac-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} maxLength={80} required />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="ac-email">Email</label>
                    <input id="ac-email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} maxLength={160} required />
                  </div>
                  <div className="field">
                    <label htmlFor="ac-phone">Phone</label>
                    <input id="ac-phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} maxLength={30} placeholder="024 000 0000" />
                  </div>
                </div>
                <button className="btn btn--gold btn--sm" disabled={busy}>
                  <Icon name="check" size={15} /> {busy ? 'Saving…' : 'Save details'}
                </button>
              </form>
            </section>

            <section className="panel">
              <div className="panel__head">
                <div><h3>Security</h3><p>Change your password any time.</p></div>
              </div>
              <form onSubmit={changePassword} className="account-form">
                <div className="field">
                  <label htmlFor="ac-current">Current password</label>
                  <input id="ac-current" type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} autoComplete="current-password" required />
                </div>
                <div className="field">
                  <label htmlFor="ac-new">New password</label>
                  <input id="ac-new" type="password" minLength={8} maxLength={128} value={passwords.password} onChange={(e) => setPasswords({ ...passwords, password: e.target.value })} autoComplete="new-password" required />
                  <div className="field__hint">At least 8 characters.</div>
                </div>
                <button className="btn btn--ghost btn--sm" disabled={passwordBusy}>
                  <Icon name="lock" size={15} /> {passwordBusy ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </section>
          </div>

          <section className="panel account-history">
            <div className="panel__head">
              <div>
                <h3>Your support & orders</h3>
                <p>Orders placed while signed in show up here. Older receipts are still available by reference.</p>
              </div>
              <button className="btn btn--gold btn--sm" onClick={() => openSupport()}>
                <Icon name="heart" size={15} /> Support again
              </button>
            </div>
            {orders.length ? (
              <div className="fan-orders">{orders.map((order) => <OrderRow key={`${order.kind}-${order.reference}`} order={order} />)}</div>
            ) : (
              <div className="account-empty">
                <Icon name="heart" size={22} />
                <strong>Nothing here yet.</strong>
                <p>When you support the music or pick up merch while signed in, it will appear here.</p>
                <button className="btn btn--ghost btn--sm" onClick={() => openSupport()}>Support the music</button>
              </div>
            )}
          </section>

          <p className="field__hint" style={{ marginTop: 18 }}>
            <Icon name="shield" size={12} /> Only you and the artist studio can see orders linked to this account.
          </p>
        </>
      )}
    </div>
  );
}
