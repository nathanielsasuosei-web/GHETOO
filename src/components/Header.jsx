import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import Icon from './Icon';
import { useSite } from '../context/SiteContext';
import { useSupport } from '../context/SupportContext';

const links = [
  { to: '/music', label: 'Music' },
  { to: '/videos', label: 'Videos' },
  { to: '/events', label: 'Events' },
  { to: '/merch', label: 'Merch' },
  { to: '/support', label: 'Support' },
  { to: '/about', label: 'About' },
];

export default function Header() {
  const { site } = useSite();
  const { openSupport } = useSupport();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const settings = site?.settings;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="header-wrap">
      {settings?.announcement ? (
        <div className="notice-bar">
          <span>{settings.announcement}</span>
          <Link to="/music">Listen now →</Link>
        </div>
      ) : null}

      <header className={`header ${scrolled || open ? 'header--solid' : ''}`}>
        <div className="container header__inner">
          <Link to="/" className="brand" aria-label="Young Silence — home">
            <span className="brand__mark">YS</span>
            <span className="brand__text">
              <span className="brand__name">{settings?.artistName || 'Young Silence'}</span>
              <span className="brand__sub">{settings?.city || 'Accra, Ghana'}</span>
            </span>
          </Link>

          <nav className="nav" aria-label="Main">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? 'is-active' : '')}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="header__actions">
            <button className="btn btn--gold btn--sm" onClick={() => openSupport()}>
              <Icon name="heart" size={15} />
              Support the music
            </button>
            <button
              className="icon-btn header__toggle"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              <Icon name={open ? 'close' : 'menu'} size={20} />
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <div className="mobile-nav">
          {links.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
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
