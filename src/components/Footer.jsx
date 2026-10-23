import { Link } from 'react-router-dom';
import Icon from './Icon';
import { useSite } from '../context/SiteContext';

const socialIcons = { instagram: 'instagram', tiktok: 'tiktok', youtube: 'youtube', x: 'x', audiomack: 'music' };

export default function Footer() {
  const { site } = useSite();
  const settings = site?.settings || {};
  const socials = Object.entries(settings.socials || {}).filter(([, url]) => url);

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__top">
          <div className="footer__brand">
            <Link to="/" className="brand">
              <span className="brand__mark">YS</span>
              <span className="brand__text">
                <span className="brand__name">{settings.artistName}</span>
                <span className="brand__sub">{settings.tagline}</span>
              </span>
            </Link>
            <p>{settings.supportNote}</p>
            <div className="socials" style={{ marginTop: 18 }}>
              {socials.map(([key, url]) => (
                <a
                  key={key}
                  href={url}
                  className="icon-btn icon-btn--sm"
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={key}
                >
                  <Icon name={socialIcons[key] || 'external'} size={16} />
                </a>
              ))}
            </div>
          </div>

          <div className="footer__col">
            <h4>Listen</h4>
            <Link to="/music">All music</Link>
            <Link to="/videos">Videos</Link>
            <Link to="/support">Support the artist</Link>
            <Link to="/about">The story</Link>
          </div>

          <div className="footer__col">
            <h4>Connect</h4>
            <a href={`mailto:${settings.contactEmail || 'hello@youngsilence.gh'}`}>Bookings & press</a>
            <Link to="/studio">Artist studio</Link>
            <span>{settings.city}</span>
          </div>
        </div>

        <div className="footer__bottom">
          <span>
            © {new Date().getFullYear()} {settings.artistName}. All rights reserved.
          </span>
          <span>Independent · Made in Accra 🇬🇭</span>
        </div>
      </div>
    </footer>
  );
}
