import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import useReveal from '../hooks/useReveal';
import { useSite } from '../context/SiteContext';
import { usePlayer } from '../context/PlayerContext';
import { cedis } from '../lib/format';

export default function About() {
  const { site } = useSite();
  const { play } = usePlayer();
  const settings = site.settings;
  const featured = site.tracks.find((t) => t.featured) || site.tracks[0];
  useReveal(site);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">The story</span>
          <h1>{settings.artistName}</h1>
          <p>{settings.tagline}</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="about" style={{ alignItems: 'start' }}>
            <div className="about__img reveal">
              <img src={settings.portraitImage} alt={`${settings.artistName} portrait`} />
              <div className="about__stamp">
                {settings.city}
                <br />
                Est. 2019 · Independent
              </div>
            </div>
            <div className="reveal about__bio">
              <span className="eyebrow">Biography</span>
              <h2 style={{ marginTop: 14 }}>From Nima, with everything</h2>
              {settings.bio.split('\n\n').map((para) => (
                <p key={para.slice(0, 30)} style={{ marginTop: 14 }}>
                  {para}
                </p>
              ))}
              <div className="about__facts">
                <div className="about__fact">
                  <span>City</span>
                  <strong>{settings.city}</strong>
                </div>
                <div className="about__fact">
                  <span>Genre</span>
                  <strong>Afro-fusion, highlife, alté</strong>
                </div>
                <div className="about__fact">
                  <span>Releases</span>
                  <strong>{site.stats.tracks} records</strong>
                </div>
                <div className="about__fact">
                  <span>Supported by</span>
                  <strong>{site.stats.supporters} fans · {cedis(site.stats.raised)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--line">
        <div className="container">
          <div className="support-panel reveal">
            <div className="support-panel__grid">
              <div>
                <span className="eyebrow">Why this site exists</span>
                <h2>
                  No label.
                  <br />
                  <em>No gatekeepers.</em>
                </h2>
                <p className="support-panel__text">
                  Streaming pays fractions of a cedi. So the music lives here: free to hear, and available to buy at
                  whatever price you decide. When you support a record, the money is the difference between recording
                  next month or not recording at all.
                </p>
              </div>
              <div className="support-panel__box">
                <div className="toggle-row">
                  <div>
                    <strong>Streams</strong>
                    <small>Unlimited, no account needed</small>
                  </div>
                  <span className="badge-status badge-status--paid">Free</span>
                </div>
                <div className="toggle-row">
                  <div>
                    <strong>Downloads</strong>
                    <small>Yours to keep after you support</small>
                  </div>
                  <span className="badge-status badge-status--pending">Pay what you want</span>
                </div>
                <div className="toggle-row">
                  <div>
                    <strong>Messages</strong>
                    <small>Posted on the supporter wall</small>
                  </div>
                  <span className="badge-status badge-status--live">Public</span>
                </div>
                <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
                  {featured ? (
                    <button className="btn btn--gold btn--block" onClick={() => play(featured, site.tracks)}>
                      <Icon name="play" size={15} />
                      Listen to “{featured.title}”
                    </button>
                  ) : null}
                  <Link to="/support" className="btn btn--ghost btn--block">
                    Support the next release
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--tight section--line">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">In his own words</span>
              <h2>Quotes</h2>
            </div>
          </div>
          <div className="wall">
            {[
              {
                quote:
                  'I make music for the people who feel everything and say nothing. That was me for a long time.',
                tag: 'On the name',
              },
              {
                quote:
                  'Accra gives you rhythm before it gives you anything else. You hear it in the traffic, in the market, in the way people argue.',
                tag: 'On the city',
              },
              {
                quote:
                  'A cedi from a thousand people builds a studio. A label deal builds a debt. I know which one I want.',
                tag: 'On independence',
              },
            ].map((item) => (
              <article className="wall-card reveal" key={item.tag}>
                <Icon name="quote" size={22} style={{ color: 'var(--gold)' }} />
                <p className="wall-card__msg" style={{ fontStyle: 'italic' }}>
                  {item.quote}
                </p>
                <div className="wall-card__amount">
                  <span>{item.tag}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
