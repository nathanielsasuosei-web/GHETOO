import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="thanks">
      <div className="container">
        <div className="thanks__card">
          <span className="eyebrow">404</span>
          <h1>Silence here.</h1>
          <p>This page doesn’t exist — but the music does.</p>
          <div className="thanks__actions">
            <Link to="/" className="btn btn--gold">
              Back home
            </Link>
            <Link to="/music" className="btn btn--ghost">
              Listen instead
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
