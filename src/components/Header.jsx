import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import Icon from './Icon';
import BrandLogo from './BrandLogo';
import { useSite } from '../context/SiteContext';
import { useSupport } from '../context/SupportContext';
import { useFan } from '../context/FanContext';

const links = [
  { to: '/music', label: 'Music', icon: 'music', blurb: 'Releases, lyrics and listening links' },
  { to: '/videos', label: 'Videos', icon: 'video', blurb: 'Visuals, sessions and studio diaries' },
  { to: '/events', label: 'Events', icon: 'calendar', blurb: 'Upcoming shows and the archive' },
  { to: '/merch', label: 'Merch', icon: 'bag', blurb: 'Small-run pieces printed in Accra' },
  { to: '/support', label: 'Support', icon: 'heart', blurb: 'Fund the next record directly' },
  { to: '/about', label: 'About', icon: 'mic', blurb: 'The story behind Young Silence' },
];

const primaryLinks = links.slice(0, 3);

export default function Header() {
  const { site } = useSite();
  const { openSupport } = useSupport();
  const { fan, openAuth } = useFan();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const location = useLocation();
  const settings = site?.settings;
  const exploreRef = useRef(null);
  const closeTimer = useRef(null);
  const pointerDownRef = useRef(false);
  const pointerResetRef = useRef(null);

  const openMega = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setMegaOpen(true);
  }, []);

  const scheduleMegaClose = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setMegaOpen(false), 140);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMegaOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setMegaOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    const onPointerDown = (event) => {
      const inside = Boolean(exploreRef.current?.contains(event.target));
      pointerDownRef.current = inside;
      if (pointerResetRef.current) window.clearTimeout(pointerResetRef.current);
      pointerResetRef.current = window.setTimeout(() => {
        pointerDownRef.current = false;
      }, 0);
      if (!inside) setMegaOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      if (pointerResetRef.current) window.clearTimeout(pointerResetRef.current);
    };
  }, []);

  return (
    <div className="header-wrap v12-header-wrap">
      {settings?.announcement ? (
        <div className="notice-bar">
          <span>{settings.announcement}</span>
          <Link to="/music">Listen now →</Link>
        </div>
      ) : null}

      <header className={`header v12-header ${scrolled || open || megaOpen ? 'header--solid' : ''}`}>
        <div className="container header__inner">
          <Link to="/" className="brand" aria-label={`${settings?.artistName || 'Young Silence'} — home`}>
            <BrandLogo settings={settings} />
            <span className="brand__text">
              <span className="brand__name">{settings?.artistName || 'Young Silence'}</span>
            </span>
          </Link>

          <nav className="nav v12-nav" aria-label="Main">
            {primaryLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? 'is-active' : '')}>
                {link.label}
              </NavLink>
            ))}

            <div
              ref={exploreRef}
              className={`v12-nav__explore ${megaOpen ? 'is-open' : ''}`}
              onMouseEnter={openMega}
              onMouseLeave={scheduleMegaClose}
              onFocusCapture={() => {
                // Mouse-triggered focus should not open the menu before the click toggles it.
                if (!pointerDownRef.current) openMega();
              }}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setMegaOpen(false);
              }}
            >
              <button
                type="button"
                className="v12-nav__explore-trigger"
                aria-label="Explore more pages"
                aria-haspopup="true"
                aria-controls="v12-explore-menu"
                aria-expanded={megaOpen}
                onClick={(event) => {
                  // Keyboard activation should keep the menu open; a pointer click toggles it.
                  if (event.detail === 0) setMegaOpen(true);
                  else setMegaOpen((value) => !value);
                }}
              >
                <Icon name="grid" size={15} />
                <span>Explore</span>
                <Icon name="chevronDown" size={14} className="v12-nav__chevron" />
              </button>

              <div
                id="v12-explore-menu"
                className="v12-mega"
                aria-hidden={!megaOpen}
              >
                <nav className="v12-mega__inner" aria-label="Explore Young Silence">
                  <div className="v12-mega__grid">
                    {links.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) => `v12-mega__link ${isActive ? 'is-active' : ''}`}
                        onClick={() => setMegaOpen(false)}
                      >
                        <span className="v12-mega__icon">
                          <Icon name={link.icon} size={17} />
                        </span>
                        <span className="v12-mega__copy">
                          <strong>{link.label}</strong>
                          <small>{link.blurb}</small>
                        </span>
                        <Icon name="arrowUpRight" size={14} className="v12-mega__arrow" />
                      </NavLink>
                    ))}
                  </div>
                </nav>
              </div>
            </div>
          </nav>

          <div className="header__actions">
            {fan ? (
              <NavLink to="/account" className="btn btn--ghost btn--sm fan-account-link" aria-label="My fan account">
                <Icon name="user" size={15} />
                <span>My account</span>
              </NavLink>
            ) : (
              <button
                type="button"
                className="btn btn--ghost btn--sm fan-account-link"
                onClick={() => openAuth('register')}
                aria-label="Create a fan account"
              >
                <Icon name="user" size={15} />
                <span>Join</span>
              </button>
            )}
            <button className="btn btn--gold btn--sm v12-header-cta" onClick={() => openSupport()}>
              <Icon name="heart" size={15} />
              Support the music
            </button>
            <button
              className="icon-btn header__toggle"
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              <Icon name={open ? 'close' : 'menu'} size={20} />
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <div className="mobile-nav v12-mobile-nav">
          <div className="v12-mobile-nav__head">
            <span className="eyebrow eyebrow--plain">Navigate V12</span>
            <span>{settings?.artistName || 'Young Silence'}</span>
          </div>
          <div className="v12-mobile-nav__grid">
            {links.map((link) => (
              <Link key={link.to} to={link.to}>
                <span className="v12-mobile-nav__icon">
                  <Icon name={link.icon} size={17} />
                </span>
                <span>
                  <strong>{link.label}</strong>
                  <small>{link.blurb}</small>
                </span>
                <Icon name="arrowUpRight" size={14} />
              </Link>
            ))}
          </div>
          {fan ? (
            <Link
              to="/account"
              className="btn btn--ghost"
              onClick={() => setOpen(false)}
            >
              <Icon name="user" size={16} />
              My account
            </Link>
          ) : (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setOpen(false);
                openAuth('register');
              }}
            >
              <Icon name="user" size={16} />
              Create account
            </button>
          )}
          <button
            className="btn btn--gold"
            onClick={() => {
              setOpen(false);
              openSupport();
            }}
          >
            <Icon name="heart" size={16} />
            Support the music
          </button>
        </div>
      ) : null}
    </div>
  );
}
