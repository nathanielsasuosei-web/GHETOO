import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import Overview from '../studio/Overview';
import Releases from '../studio/Releases';
import VideoManager from '../studio/VideoManager';
import Orders from '../studio/Orders';
import Messages from '../studio/Messages';
import Settings from '../studio/Settings';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'releases', label: 'Music', icon: 'music' },
  { id: 'videos', label: 'Videos', icon: 'video' },
  { id: 'supporters', label: 'Supporters', icon: 'wallet' },
  { id: 'messages', label: 'Messages', icon: 'mail' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

function Login({ onDone }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.login(password);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="studio-login">
      <div className="studio-login__card">
        <span className="eyebrow">Artist studio</span>
        <h1>Welcome back.</h1>
        <p>This is where you upload music, publish visuals and confirm the support that comes in.</p>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="studio-pass">Studio password</label>
            <input
              id="studio-pass"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error ? (
            <div className="alert alert--error">
              <Icon name="close" size={15} />
              <span>{error}</span>
            </div>
          ) : null}
          <button className="btn btn--gold btn--block btn--lg" disabled={busy}>
            {busy ? 'Opening…' : 'Enter the studio'}
          </button>
        </form>
        <p className="studio-login__hint">
          Default password is <code>youngsilence</code> — set <code>ARTIST_PASSWORD</code> in the environment to change
          it.
        </p>
        <p className="studio-login__hint" style={{ marginTop: 10 }}>
          <Link to="/" className="link-arrow" style={{ fontSize: 11 }}>
            ← Back to the site
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function Studio() {
  const location = useLocation();
  const navigate = useNavigate();
  const tab = location.pathname.split('/')[2];
  const { toast } = useToast();
  const [authed, setAuthed] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const active = TABS.some((t) => t.id === tab) ? tab : 'overview';

  const checkAuth = useCallback(async () => {
    try {
      const res = await api.me();
      setAuthed(res.authenticated);
    } catch {
      setAuthed(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await api.overview();
      setData(res);
    } catch (err) {
      if (err.status === 401) setAuthed(false);
      else toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authed) refresh();
  }, [authed, refresh]);

  const logout = async () => {
    await api.logout();
    setAuthed(false);
    navigate('/studio');
  };

  if (authed === null) {
    return (
      <div className="loading-screen">
        <div className="loader" />
      </div>
    );
  }

  if (!authed) {
    return (
      <Login
        onDone={() => {
          setAuthed(true);
        }}
      />
    );
  }

  if (loading || !data) {
    return (
      <div className="loading-screen">
        <div className="loader" />
      </div>
    );
  }

  const pendingCount = data.orders.filter((o) => o.status === 'pending').length;
  const unread = data.messages.filter((m) => !m.read).length;

  const common = { data, refresh, toast };

  return (
    <div className="studio">
      <aside className="studio__side">
        <Link to="/" className="brand" style={{ padding: '0 6px' }}>
          <span className="brand__mark">YS</span>
          <span className="brand__text">
            <span className="brand__name">Studio</span>
            <span className="brand__sub">{data.settings.artistName}</span>
          </span>
        </Link>

        <nav className="studio__nav">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={active === t.id ? 'is-active' : ''}
              onClick={() => navigate(`/studio/${t.id}`)}
            >
              <Icon name={t.icon} size={16} />
              {t.label}
              {t.id === 'supporters' && pendingCount ? <span className="badge">{pendingCount}</span> : null}
              {t.id === 'messages' && unread ? <span className="badge">{unread}</span> : null}
            </button>
          ))}
        </nav>

        <div className="studio__side-foot">
          <Link to="/" className="link-arrow" style={{ fontSize: 10.5 }}>
            View public site <Icon name="external" size={12} />
          </Link>
          <span className={`badge-status ${data.paymentMode === 'live' ? 'badge-status--paid' : 'badge-status--draft'}`}>
            Payments: {data.paymentMode}
          </span>
          <button
            onClick={logout}
            className="studio__nav"
            style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 11.5 }}
          >
            <Icon name="logout" size={14} /> Sign out
          </button>
        </div>
      </aside>

      <main className="studio__main">
        <div className="studio__mobile">
          <div className="row">
            <Link to="/" className="brand">
              <span className="brand__mark" style={{ width: 30, height: 30, fontSize: 15 }}>
                YS
              </span>
              <span className="brand__name" style={{ fontSize: 12 }}>
                Studio
              </span>
            </Link>
            <button onClick={logout} className="icon-btn icon-btn--sm" aria-label="Sign out">
              <Icon name="logout" size={15} />
            </button>
          </div>
          <div className="tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={active === t.id ? 'is-active' : ''}
                onClick={() => navigate(`/studio/${t.id}`)}
              >
                {t.label}
                {t.id === 'supporters' && pendingCount ? ` (${pendingCount})` : ''}
              </button>
            ))}
          </div>
        </div>

        {active === 'overview' ? <Overview {...common} /> : null}
        {active === 'releases' ? <Releases {...common} /> : null}
        {active === 'videos' ? <VideoManager {...common} /> : null}
        {active === 'supporters' ? <Orders {...common} /> : null}
        {active === 'messages' ? <Messages {...common} /> : null}
        {active === 'settings' ? <Settings {...common} /> : null}
      </main>
    </div>
  );
}
