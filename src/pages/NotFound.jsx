import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';

export default function NotFound() {
  useEffect(() => {
    document.title = '404 — Page not found';
  }, []);

  return (
    <section className="not-found">
      <div className="container">
        <div className="not-found__card">
          <span className="not-found__code">
            <Icon name="close" size={12} /> 404 · Page not found
          </span>
          <h1>Silence here.</h1>
          <p>This page doesn’t exist — but the music does.</p>

          <div className="not-found__actions">
            <Link to="/" className="btn btn--gold" aria-label="Back to the home page">
              <Icon name="arrow" size={16} style={{ transform: 'rotate(180deg)' }} />
              <span>Back home</span>
            </Link>
            <Link to="/music" className="btn btn--ghost" aria-label="Go to the music page">
              <Icon name="play" size={15} />
              <span>Listen instead</span>
            </Link>
          </div>

          <p className="not-found__hint">Choose one of the two links above to get back to the music.</p>
        </div>
      </div>
    </section>
  );
}
