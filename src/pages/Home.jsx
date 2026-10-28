import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import TrackRow from '../components/TrackRow';
import TrackListen from '../components/TrackListen';
import VideoSection from '../components/VideoSection';
import EventsSection from '../components/EventsSection';
import MerchSection from '../components/MerchSection';
import MerchModal from '../components/MerchModal';
import SupportPanel from '../components/SupportPanel';
import Wall from '../components/Wall';
import useReveal from '../hooks/useReveal';
import { useSite } from '../context/SiteContext';
import { useSupport } from '../context/SupportContext';
import { cedis, compact } from '../lib/format';

export default function Home() {
  const { site } = useSite();
  const { openSupport } = useSupport();
  const [merchProduct, setMerchProduct] = useState(null);
  const settings = site.settings;
  const tracks = site.tracks;
  const featured = tracks.find((t) => t.featured) || tracks[0];
  const latest = tracks.slice(0, 4);
  const videos = site.videos;
  useReveal(site);

  return (
    <>
      <section className="hero">
        <div className="hero__bg">
          <img
            src={settings.heroImage}
            alt=""
            fetchpriority="high"
            style={{
              objectPosition:
                settings.heroFocus === 'left' ? '22% 40%' : settings.heroFocus === 'right' ? '82% 40%' : '58% 40%',
            }}
          />
        </div>
        <div className="container hero__inner">
          <div>
            {/* Tagline hidden for now
            <span className="eyebrow">{settings.tagline}</span>
            */}
            <h1 className="hero__title">
              Young
              <br />
              <em>Silence</em>
            </h1>
            {/* Intro hidden for now
            <p className="hero__intro">{settings.intro}</p>
            */}

            <div className="hero__actions">
              {featured ? (
                <TrackListen track={featured} list={tracks} className="btn btn--gold btn--lg">
                  {({ link, playing }) => (
                    <>
                      <Icon name={link ? 'external' : playing ? 'pause' : 'play'} size={18} />
                      {link ? `Listen on ${link.label}` : playing ? 'Pause' : 'Play latest'}
                    </>
                  )}
                </TrackListen>
              ) : null}
              <button className="btn btn--ghost btn--lg" onClick={() => openSupport()}>
                <Icon name="heart" size={17} />
                Support the music
              </button>
            </div>

            <div className="hero__meta">
              <div className="hero__stat">
                <strong>{compact(site.stats.plays)}</strong>
                <span>On-site plays</span>
              </div>
              {/* Supporter / raised stats hidden for now
              <div className="hero__stat">
                <strong>{site.stats.supporters}</strong>
                <span>Supporters</span>
              </div>
              <div className="hero__stat">
                <strong>{cedis(site.stats.raised)}</strong>
                <span>Given to the art</span>
              </div>
              */}
            </div>
          </div>

          {featured ? (
            <aside className="hero__card">
              <div className="hero__card-label">
                <span>
                  <span className="dot" /> Newest release
                </span>
                <span>{featured.year}</span>
              </div>
              <div className="hero__release">
                <img src={featured.cover} alt={`${featured.title} cover`} />
                <div>
                  <h4>{featured.title}</h4>
                  <p>
                    {featured.genre} · {compact(featured.plays)} site plays
                  </p>
                </div>
              </div>
              <div className="hero__card-foot">
                <TrackListen track={featured} list={tracks} className="hero__play">
                  {({ link, playing }) => (
                    <>
                      <span className="play-badge">
                        <Icon name={link ? 'external' : playing ? 'pause' : 'play'} size={17} />
                      </span>
                      {link ? `Listen on ${link.label}` : playing ? 'Playing now' : 'Listen now'}
                    </>
                  )}
                </TrackListen>
                <button className="link-arrow" onClick={() => openSupport(featured)}>
                  Support <Icon name="arrow" size={14} />
                </button>
              </div>
            </aside>
          ) : null}
        </div>
        <span className="scroll-hint">Scroll</span>
      </section>

      {/* Marquee hidden for now
      <div className="marquee" aria-hidden="true">
        <div className="marquee__track">
          {[0, 1].map((copy) => (
            <span key={copy}>
              {settings.artistName} <span>Afro-fusion</span> <span>Accra, Ghana</span> <span>No label</span>{' '}
              <span>Funded by fans</span> <span>New music every season</span>
            </span>
          ))}
        </div>
      </div>
      */}

      {featured ? (
        <section className="section">
          <div className="container">
            <div className="spotlight">
              <div className="spotlight__art reveal">
                <span className="spotlight__badge">Spotlight</span>
                <img src={featured.cover} alt={`${featured.title} cover art`} />
                <TrackListen track={featured} list={tracks} className="spotlight__play">
                  {({ link, playing }) => <Icon name={link ? 'external' : playing ? 'pause' : 'play'} size={26} />}
                </TrackListen>
              </div>
              <div className="spotlight__body reveal">
                <span className="eyebrow">Latest release</span>
                <h2>{featured.title}</h2>
                <p className="spotlight__desc">{featured.description}</p>
                <div className="spotlight__meta">
                  <span className="chip">
                    <strong>{featured.genre}</strong>
                  </span>
                  <span className="chip">{featured.year}</span>
                  <span className="chip">
                    <Icon name="headphone" size={13} /> {compact(featured.plays)} site plays
                  </span>
                  <span className="chip">
                    <Icon name="download" size={13} /> {compact(featured.downloads)} downloads
                  </span>
                  <span className="chip">
                    from <strong>{cedis(featured.minAmount)}</strong>
                  </span>
                </div>
                <div className="spotlight__actions">
                  <button className="btn btn--gold" onClick={() => openSupport(featured)}>
                    <Icon name="heart" size={16} />
                    Support this record
                  </button>
                  <TrackListen track={featured} list={tracks} className="btn btn--ghost">
                    {({ link, playing }) => (
                      <>
                        <Icon name={link ? 'external' : playing ? 'pause' : 'play'} size={15} />
                        {link ? `Listen on ${link.label}` : playing ? 'Pause' : 'Stream'}
                      </>
                    )}
                  </TrackListen>
                  <Link to="/music" className="link-arrow" style={{ marginLeft: 6 }}>
                    All music <Icon name="arrow" size={14} />
                  </Link>
                </div>
                <p className="spotlight__credits">{featured.credits}</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="section section--line">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">The catalogue</span>
              <h2>Music</h2>
            </div>
            <Link to="/music" className="link-arrow">
              View all {tracks.length} releases <Icon name="arrow" size={14} />
            </Link>
          </div>
          <div className="tracklist">
            {latest.map((track, index) => (
              <TrackRow key={track.id} track={track} index={index} list={latest} />
            ))}
          </div>
        </div>
      </section>

      {videos.length ? (
        <section className="section section--line">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="eyebrow">Visuals</span>
                <h2>Videos</h2>
              </div>
              <Link to="/videos" className="link-arrow">
                All videos <Icon name="arrow" size={14} />
              </Link>
            </div>
            <VideoSection videos={videos} compactGrid />
          </div>
        </section>
      ) : null}

      <EventsSection events={site.events || []} />

      {/* Merch section hidden for now
      <MerchSection onOrder={(product) => setMerchProduct(product)} />
      */}

      {/* Direct support panel hidden for now
      <section className="section" id="support">
        <div className="container">
          <SupportPanel />
        </div>
      </section>
      */}

      {/* Supporter wall hidden for now
      <section className="section section--line">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Supporter wall</span>
              <h2>People who keep this going</h2>
            </div>
            <Link to="/support" className="link-arrow">
              Add your name <Icon name="arrow" size={14} />
            </Link>
          </div>
          <Wall items={site.wall} limit={6} />
        </div>
      </section>
      */}

      <section className="section section--line">
        <div className="container">
          <div className="about">
            <div className="about__img reveal">
              <img src={settings.portraitImage} alt={`${settings.artistName} portrait`} loading="lazy" />
              <div className="about__stamp">
                {settings.city}
                <br />
                Independent artist
              </div>
            </div>
            <div className="reveal">
              <span className="eyebrow">The story</span>
              <h2>Quiet kid. Loud music.</h2>
              <div className="about__bio">
                {settings.bio.split('\n\n').slice(0, 2).map((para) => (
                  <p key={para.slice(0, 24)}>{para}</p>
                ))}
              </div>
              <div className="about__facts">
                <div className="about__fact">
                  <span>Based in</span>
                  <strong>{settings.city}</strong>
                </div>
                <div className="about__fact">
                  <span>Sound</span>
                  <strong>Afro-fusion · Highlife · Alté</strong>
                </div>
                <div className="about__fact">
                  <span>Supporters</span>
                  <strong>{site.stats.supporters} and counting</strong>
                </div>
                <div className="about__fact">
                  <span>Label</span>
                  <strong>Independent</strong>
                </div>
              </div>
              <div style={{ marginTop: 28 }}>
                <Link to="/about" className="link-arrow">
                  Read the full story <Icon name="arrow" size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {merchProduct ? <MerchModal product={merchProduct} onClose={() => setMerchProduct(null)} /> : null}
    </>
  );
}
