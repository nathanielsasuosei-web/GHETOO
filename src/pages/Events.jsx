import { useMemo } from 'react';
import Icon from '../components/Icon';
import useReveal from '../hooks/useReveal';
import { useSite } from '../context/SiteContext';

export function EventDate({ iso, past = false }) {
  const date = new Date(iso);
  const day = date.toLocaleDateString('en-GB', { day: '2-digit' });
  const month = date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'short' });
  return (
    <div className={`event-date ${past ? 'event-date--past' : ''}`}>
      <strong>{day}</strong>
      <span>{month}</span>
      <em>{weekday}</em>
    </div>
  );
}

export default function Events() {
  const { site } = useSite();
  const events = site.events || [];
  useReveal(events);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    return {
      upcoming: events.filter((e) => new Date(e.date).getTime() >= now),
      past: events
        .filter((e) => new Date(e.date).getTime() < now)
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    };
  }, [events]);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">On stage · {upcoming.length} coming up</span>
          <h1>Events & tour</h1>
          <p>
            Every show is announced here first. Grab tickets early — the small rooms fill up fast, and every ticket
            keeps the independent machine running.
          </p>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          {upcoming.length ? (
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
                    {event.description ? <p className="event-card__desc">{event.description}</p> : null}
                  </div>
                  <div className="event-card__action">
                    {event.ticketUrl ? (
                      <a className="btn btn--gold btn--sm" href={event.ticketUrl} target="_blank" rel="noreferrer noopener">
                        <Icon name="ticket" size={14} /> Tickets
                      </a>
                    ) : (
                      <span className="badge-status badge-status--pending">Pay at the gate</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">No shows announced yet. Join the list below and you’ll be first to know.</div>
          )}

          {past.length ? (
            <>
              <div className="section-head" style={{ margin: '44px 0 18px' }}>
                <div>
                  <span className="eyebrow">The archive</span>
                  <h2>Past shows</h2>
                </div>
              </div>
              <div className="events-list events-list--past">
                {past.map((event) => (
                  <article key={event.id} className="event-card event-card--past reveal">
                    <EventDate iso={event.date} past />
                    <div className="event-card__body">
                      <h3>{event.title}</h3>
                      <div className="event-card__meta">
                        <span>
                          <Icon name="pin" size={14} /> {event.venue} · {event.city}
                        </span>
                      </div>
                    </div>
                    <div className="event-card__action">
                      <span className="badge-status badge-status--draft">Completed</span>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          <div className="alert alert--info" style={{ marginTop: 34 }}>
            <Icon name="calendar" size={16} />
            <span>
              Booking enquiry? Reach out via the{' '}
              <a className="link-arrow" href={`mailto:${site.settings.contactEmail}`} style={{ fontSize: 'inherit' }}>
                contact email
              </a>{' '}
              or the support page.
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
