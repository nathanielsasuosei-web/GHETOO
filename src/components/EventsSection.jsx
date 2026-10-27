import { Link } from 'react-router-dom';
import Icon from './Icon';
import { EventDate } from '../pages/Events';

export default function EventsSection({ events, limit = 3 }) {
  const upcoming = events
    .filter((e) => new Date(e.date).getTime() >= Date.now())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, limit);
  if (!upcoming.length) return null;

  return (
    <section className="section section--line">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="eyebrow">Live & direct</span>
            <h2>Upcoming shows</h2>
          </div>
          <Link to="/events" className="link-arrow">
            All events <Icon name="arrow" size={14} />
          </Link>
        </div>
        <div className="events-list">
          {upcoming.map((event) => (
            <article key={event.id} className="event-card reveal">
              <EventDate iso={event.date} />
              <div className="event-card__body">
                <h3>{event.title}</h3>
                <div className="event-card__meta">
                  <span>
                    <Icon name="pin" size={14} /> {event.venue} · {event.city}
                  </span>
                  {event.priceNote ? <span className="event-card__price">{event.priceNote}</span> : null}
                </div>
              </div>
              <div className="event-card__action">
                {event.ticketUrl ? (
                  <a className="btn btn--gold btn--sm" href={event.ticketUrl} target="_blank" rel="noreferrer noopener">
                    <Icon name="ticket" size={14} /> Tickets
                  </a>
                ) : (
                  <Link to="/events" className="btn btn--ghost btn--sm">
                    Details
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
