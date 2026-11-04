import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import BrandLogo from '../components/BrandLogo';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useSite } from '../context/SiteContext';
import Overview from '../studio/Overview';
import Releases from '../studio/Releases';
import VideoManager from '../studio/VideoManager';
import Events from '../studio/Events';
import Merch from '../studio/Merch';
import Orders from '../studio/Orders';
import Messages from '../studio/Messages';
import Newsletter from '../studio/Newsletter';
import Settings from '../studio/Settings';
import Website from '../studio/Website';
import Media from '../studio/Media';
import Appearance from '../studio/Appearance';

const TABS = [
  {
    id: 'overview', label: 'Overview', icon: 'dashboard', group: 'Workspace',
    description: 'Pulse, revenue and performance', keywords: 'home stats analytics chart summary',
  },
  {
    id: 'website', label: 'Website', icon: 'image', group: 'Workspace',
    description: 'Homepage image and hero copy', keywords: 'hero photo portrait announcement design',
  },
  {
    id: 'media', label: 'Media', icon: 'image', group: 'Workspace',
    description: 'Replace the logo and every site picture', keywords: 'logo hero portrait covers thumbnails product photos images uploads branding',
  },
  {
    id: 'appearance', label: 'Appearance', icon: 'sparkle', group: 'Workspace',
    description: 'Liquid Glass, font size, colours and live preview', keywords: 'theme colours colors palette brand design accent background dark light font size type liquid glass',
  },
  {
    id: 'releases', label: 'Music', icon: 'music', group: 'Workspace',
    description: 'Releases, links, audio and lyrics', keywords: 'tracks songs albums spotify uploads',
  },
  {
    id: 'videos', label: 'Videos', icon: 'video', group: 'Workspace',
    description: 'Visual releases and YouTube links', keywords: 'clips films thumbnails',
  },
  {
    id: 'events', label: 'Events', icon: 'calendar', group: 'Workspace',
    description: 'Upcoming shows and tour dates', keywords: 'tickets venue calendar concerts',
  },
  {
    id: 'merch', label: 'Merch', icon: 'bag', group: 'Workspace',
    description: 'Products, sizes and orders', keywords: 'shop products inventory clothing',
  },
  {
    id: 'supporters', label: 'Supporters', icon: 'wallet', group: 'Community',
    description: 'Confirm support and review orders', keywords: 'payments momo donations references',
  },
  {
    id: 'messages', label: 'Messages', icon: 'mail', group: 'Community',
    description: 'Read and reply to fan messages', keywords: 'inbox email contact',
  },
  {
    id: 'newsletter', label: 'Newsletter', icon: 'send', group: 'Community',
    description: 'Subscribers and CSV export', keywords: 'mailing list emails export',
  },
  {
    id: 'settings', label: 'Settings', icon: 'settings', group: 'System',
    description: 'Profile, payouts and support minimum', keywords: 'password payment profile socials configuration',
  },
];

const GROUPS = [
  { id: 'workspace', label: 'Workspace', items: TABS.filter((tab) => tab.group === 'Workspace') },
  { id: 'community', label: 'Community', items: TABS.filter((tab) => tab.group === 'Community') },
  { id: 'system', label: 'System', items: TABS.filter((tab) => tab.group === 'System') },
];

function initialsFor(name = 'Young Silence') {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'YS';
}

function Login({ onDone, settings }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
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
    <div className="studio-login v12-login">
      <div className="v12-login__aurora" aria-hidden="true" />
      <div className="studio-login__card v12-login__card">
        <section className="v12-login__showcase" aria-label="Studio V12">
          <Link to="/" className="v12-login__brand">
            <BrandLogo settings={settings} />
            <span>
              <strong>{settings?.artistName || 'Young Silence'}</strong>
              <small>Studio V12</small>
            </span>
          </Link>

          <div className="v12-login__mock" aria-hidden="true">
            <div className="v12-login__mock-head">
              <span />
              <span />
              <span />
            </div>
            <div className="v12-login__mock-body">
              <div className="v12-login__mock-nav">
                <i /><i /><i /><i />
              </div>
              <div>
                <div className="v12-login__mock-title" />
                <div className="v12-login__mock-cards">
                  <span /><span /><span />
                </div>
                <div className="v12-login__mock-chart">
                  <i /><i /><i /><i /><i /><i /><i /><i />
                </div>
              </div>
            </div>
          </div>

          <h2>One calm place for the whole independent machine.</h2>
          <p>Publish releases, follow support, manage the community and shape the site — without the noise.</p>
          <ul>
            <li><Icon name="check" size={14} /> Hover-expanding workspace</li>
            <li><Icon name="check" size={14} /> Live pulse and quick search</li>
            <li><Icon name="check" size={14} /> Built for mobile, too</li>
          </ul>
        </section>

        <section className="v12-login__form">
          <span className="eyebrow">Artist studio · V12</span>
          <h1>Welcome back.</h1>
          <p>Enter your studio password to open the command centre.</p>
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="studio-pass">Studio password</label>
              <input
                id="studio-pass"
                type="password"
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
              {busy ? null : <Icon name="arrow" size={16} />}
            </button>
          </form>
          <p className="studio-login__hint">
            Default password is <code>youngsilence</code> — set <code>ARTIST_PASSWORD</code> in the environment to change it.
          </p>
          <p className="studio-login__hint" style={{ marginTop: 10 }}>
            <Link to="/" className="link-arrow" style={{ fontSize: 'calc(11px * var(--ys-font-scale))' }}>
              ← Back to the site
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}

export default function Studio() {
  const location = useLocation();
  const navigate = useNavigate();
  const tab = location.pathname.split('/')[2];
  const { toast } = useToast();
  const { site, reload: reloadSite } = useSite();
  const [authed, setAuthed] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [railPinned, setRailPinned] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem('ys-studio-rail-v12') === 'pinned';
    } catch {
      return false;
    }
  });
  const [railHovered, setRailHovered] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [alertsOpen, setAlertsOpen] = useState(false);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const alertsRef = useRef(null);

  const active = TABS.some((item) => item.id === tab) ? tab : 'overview';
  const activeTab = TABS.find((item) => item.id === active) || TABS[0];
  const railOpen = railPinned || railHovered;

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
      // Keep public pages in sync when returning from the studio without a full reload.
      await reloadSite();
    } catch (err) {
      if (err.status === 401) setAuthed(false);
      else toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, reloadSite]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authed) refresh();
  }, [authed, refresh]);

  useEffect(() => {
    if (!authed) return undefined;
    const onPointerDown = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setSearchOpen(false);
      if (alertsRef.current && !alertsRef.current.contains(event.target)) setAlertsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [authed]);

  useEffect(() => {
    if (!authed) return undefined;
    const onKeyDown = (event) => {
      const target = event.target;
      const tag = target?.tagName?.toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
      const shortcut = event.key === '/' && !typing;
      const command = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (shortcut || command) {
        event.preventDefault();
        setAlertsOpen(false);
        setSearchOpen(true);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setAlertsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [authed]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const filteredTabs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return TABS;
    return TABS.filter((item) =>
      `${item.label} ${item.description} ${item.keywords}`.toLowerCase().includes(needle)
    );
  }, [query]);

  const dateLabel = useMemo(
    () => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()),
    []
  );

  const logout = async () => {
    await api.logout();
    setAuthed(false);
    navigate('/studio');
  };

  const togglePin = () => {
    setRailPinned((value) => {
      const next = !value;
      try {
        window.localStorage.setItem('ys-studio-rail-v12', next ? 'pinned' : 'hover');
      } catch {
        /* Storage is optional; the in-memory preference still works. */
      }
      return next;
    });
  };

  const goToTab = (id) => {
    navigate(`/studio/${id}`);
    setSearchOpen(false);
    setAlertsOpen(false);
    setQuery('');
  };

  if (authed === null) {
    return (
      <div className="loading-screen v12-loading">
        <div className="loader" />
        <span className="v12-loading__label">Opening Studio V12</span>
      </div>
    );
  }

  if (!authed) {
    return (
      <Login
        settings={site?.settings}
        onDone={() => {
          setAuthed(true);
        }}
      />
    );
  }

  if (loading || !data) {
    return (
      <div className="loading-screen v12-loading">
        <div className="loader" />
        <span className="v12-loading__label">Gathering your numbers</span>
      </div>
    );
  }

  const pendingCount = (data.orders || []).filter((order) => order.status === 'pending').length;
  const merchPending = (data.merchOrders || []).filter((order) => order.status === 'pending').length;
  const unread = (data.messages || []).filter((message) => !message.read).length;
  const liveReleases = (data.tracks || []).filter((track) => track.published !== false).length;
  const subscriberCount = data.merchStats?.subscribers ?? (data.subscribers || []).length;
  const artistName = data.settings?.artistName || 'Young Silence';
  const initials = initialsFor(artistName);
  const alertCount = pendingCount + merchPending + unread;
  const paymentLive = data.paymentMode === 'live';

  const alerts = [
    { id: 'supporters', label: 'Support awaiting confirmation', count: pendingCount, icon: 'wallet', tone: 'gold' },
    { id: 'merch', label: 'Merch orders to review', count: merchPending, icon: 'bag', tone: 'violet' },
    { id: 'messages', label: 'Unread messages', count: unread, icon: 'mail', tone: 'cyan' },
  ];

  const countFor = (id) => {
    if (id === 'supporters') return pendingCount;
    if (id === 'merch') return merchPending;
    if (id === 'messages') return unread;
    return 0;
  };

  const common = { data, refresh, toast };
  const statusText = paymentLive ? 'Live' : 'Sandbox';

  return (
    <div className={`studio v12-studio ${railOpen ? 'studio--rail-open' : ''}`}>
      <aside
        className="studio__side v12-rail"
        onMouseEnter={() => setRailHovered(true)}
        onMouseLeave={() => setRailHovered(false)}
        onFocusCapture={() => setRailHovered(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setRailHovered(false);
        }}
      >
        <div className="v12-rail__head">
          <Link to="/" className="brand v12-rail__brand">
            <BrandLogo settings={data.settings} />
            <span className="brand__text v12-rail__brand-text">
              <span className="brand__name">Studio V12</span>
              <span className="brand__sub">{artistName}</span>
            </span>
          </Link>
          <button
            type="button"
            className="v12-rail__pin"
            onClick={togglePin}
            aria-pressed={railPinned}
            aria-label={railPinned ? 'Use hover-to-expand menu' : 'Keep menu expanded'}
            title={railPinned ? 'Use hover-to-expand menu' : 'Keep menu expanded'}
            tabIndex={railOpen ? 0 : -1}
          >
            <Icon name={railPinned ? 'close' : 'panelLeft'} size={16} />
          </button>
        </div>

        <div className="v12-rail__scroll">
          {GROUPS.map((group) => (
            <div className="v12-nav-group" key={group.id}>
              <span className="v12-nav-group__label">{group.label}</span>
              <div className="v12-nav-group__items">
                {group.items.map((item) => {
                  const count = countFor(item.id);
                  return (
                    <Link
                      key={item.id}
                      to={`/studio/${item.id}`}
                      className={`v12-nav-item ${active === item.id ? 'is-active' : ''}`}
                      aria-current={active === item.id ? 'page' : undefined}
                      aria-label={railOpen ? undefined : item.label}
                      title={railOpen ? undefined : item.label}
                    >
                      <span className="v12-nav-item__icon">
                        <Icon name={item.icon} size={17} />
                      </span>
                      <span className="v12-nav-item__label">{item.label}</span>
                      {count ? <span className="v12-nav-item__count">{count}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="v12-rail__foot">
          <div className="v12-rail__system">
            <span className={`v12-rail__system-dot ${paymentLive ? 'is-live' : ''}`} />
            <span className="v12-rail__system-copy">
              <small>Payments</small>
              <strong>{statusText}</strong>
            </span>
          </div>
          <Link to="/" className="v12-rail__link" aria-label="View public site">
            <Icon name="external" size={15} />
            <span>View public site</span>
          </Link>
          <button type="button" onClick={logout} className="v12-nav-item v12-nav-item--danger" aria-label="Sign out">
            <span className="v12-nav-item__icon"><Icon name="logout" size={17} /></span>
            <span className="v12-nav-item__label">Sign out</span>
          </button>
        </div>
      </aside>

      <main className="studio__main v12-main">
        <header className="v12-topbar">
          <div className="v12-topbar__left">
            <div className="v12-breadcrumb">
              <span>Workspace</span>
              <Icon name="chevronRight" size={12} />
              <strong>{activeTab.label}</strong>
            </div>

            <div className="v12-search" ref={searchRef}>
              <button
                type="button"
                className="v12-search__trigger"
                onClick={() => setSearchOpen((value) => !value)}
                aria-expanded={searchOpen}
                aria-controls="v12-command-menu"
              >
                <Icon name="search" size={15} />
                <span>Search the studio</span>
                <kbd>/</kbd>
              </button>
              {searchOpen ? (
                <div className="v12-command" id="v12-command-menu" role="dialog" aria-label="Search studio sections">
                  <div className="v12-command__field">
                    <Icon name="search" size={16} />
                    <input
                      ref={searchInputRef}
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Find a tool, release or setting…"
                      aria-label="Search studio sections"
                    />
                    <kbd>ESC</kbd>
                  </div>
                  <div className="v12-command__label">Quick jump</div>
                  <div className="v12-command__results">
                    {filteredTabs.map((item) => (
                      <button key={item.id} type="button" onClick={() => goToTab(item.id)}>
                        <span className="v12-command__icon"><Icon name={item.icon} size={16} /></span>
                        <span>
                          <strong>{item.label}</strong>
                          <small>{item.description}</small>
                        </span>
                        <Icon name="arrowUpRight" size={14} />
                      </button>
                    ))}
                    {!filteredTabs.length ? (
                      <p className="v12-command__empty">No studio tools match “{query}”.</p>
                    ) : null}
                  </div>
                  <div className="v12-command__foot">Press <kbd>/</kbd> anywhere to open · <kbd>Esc</kbd> to close</div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="v12-topbar__right">
            <span className="v12-date"><Icon name="calendar" size={14} /> {dateLabel}</span>

            <div className="v12-alerts" ref={alertsRef}>
              <button
                type="button"
                className="v12-icon-btn"
                onClick={() => setAlertsOpen((value) => !value)}
                aria-expanded={alertsOpen}
                aria-controls="v12-alerts-menu"
                aria-label={`${alertCount} items needing attention`}
              >
                <Icon name="bell" size={17} />
                {alertCount ? <i>{alertCount > 9 ? '9+' : alertCount}</i> : null}
              </button>
              {alertsOpen ? (
                <div className="v12-popover" id="v12-alerts-menu" role="dialog" aria-label="Studio alerts">
                  <div className="v12-popover__head">
                    <div>
                      <span>Needs attention</span>
                      <strong>{alertCount ? `${alertCount} open items` : 'All caught up'}</strong>
                    </div>
                    <Icon name="sparkle" size={16} />
                  </div>
                  {alerts.map((alert) => (
                    <button key={alert.id} type="button" className="v12-popover__item" onClick={() => goToTab(alert.id)}>
                      <span className={`v12-popover__icon v12-popover__icon--${alert.tone}`}>
                        <Icon name={alert.icon} size={16} />
                      </span>
                      <span>
                        <strong>{alert.label}</strong>
                        <small>Open {TABS.find((item) => item.id === alert.id)?.label}</small>
                      </span>
                      <b>{alert.count}</b>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <Link to="/" className="v12-view-site">
              <Icon name="external" size={14} /> View site
            </Link>

            <div className="v12-profile" title={artistName}>
              <span className="v12-avatar">{initials}</span>
              <span className="v12-profile__copy">
                <strong>{artistName}</strong>
                <small>Artist admin</small>
              </span>
            </div>
          </div>
        </header>

        <div className="studio__mobile v12-mobile-bar">
          <div className="v12-mobile-bar__top">
            <Link to="/" className="brand">
              <BrandLogo settings={data.settings} className="brand__mark--sm" />
              <span className="brand__name" style={{ fontSize: 'calc(12px * var(--ys-font-scale))' }}>Studio V12</span>
            </Link>
            <button onClick={logout} className="icon-btn icon-btn--sm" aria-label="Sign out">
              <Icon name="logout" size={15} />
            </button>
          </div>
          <div className="tabs v12-mobile-tabs">
            {TABS.map((item) => {
              const count = countFor(item.id);
              return (
                <button
                  key={item.id}
                  className={active === item.id ? 'is-active' : ''}
                  onClick={() => navigate(`/studio/${item.id}`)}
                >
                  <Icon name={item.icon} size={13} />
                  {item.label}
                  {count ? <span>{count}</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="v12-content">
          <div className="v12-pulse" aria-label="Studio status">
            <div className="v12-pulse__item">
              <span>Payment engine</span>
              <strong className={paymentLive ? 'is-live' : ''}>
                <i /> {statusText}
              </strong>
              <small>{paymentLive ? 'Paystack live mode' : 'Safe test mode'}</small>
            </div>
            <div className="v12-pulse__item">
              <span>Open tasks</span>
              <strong>{alertCount}</strong>
              <small>{pendingCount} support · {merchPending} merch · {unread} mail</small>
            </div>
            <div className="v12-pulse__item">
              <span>Live catalogue</span>
              <strong>{liveReleases}</strong>
              <small>{data.videos?.length || 0} videos · {data.events?.length || 0} events</small>
            </div>
            <div className="v12-pulse__item">
              <span>Community</span>
              <strong>{subscriberCount}</strong>
              <small>{data.fanCount || 0} fan accounts · {subscriberCount} newsletter</small>
            </div>
          </div>

          {active === 'overview' ? <Overview {...common} /> : null}
          {active === 'website' ? <Website {...common} /> : null}
          {active === 'media' ? <Media {...common} /> : null}
          {active === 'appearance' ? <Appearance {...common} /> : null}
          {active === 'releases' ? <Releases {...common} /> : null}
          {active === 'videos' ? <VideoManager {...common} /> : null}
          {active === 'events' ? <Events {...common} /> : null}
          {active === 'merch' ? <Merch {...common} /> : null}
          {active === 'supporters' ? <Orders {...common} /> : null}
          {active === 'messages' ? <Messages {...common} /> : null}
          {active === 'newsletter' ? <Newsletter {...common} /> : null}
          {active === 'settings' ? <Settings {...common} /> : null}
        </div>
      </main>
    </div>
  );
}
