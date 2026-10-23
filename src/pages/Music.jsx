import { useMemo, useState } from 'react';
import Icon from '../components/Icon';
import TrackRow from '../components/TrackRow';
import useReveal from '../hooks/useReveal';
import { useSite } from '../context/SiteContext';
import { usePlayer } from '../context/PlayerContext';

export default function Music() {
  const { site } = useSite();
  const { play } = usePlayer();
  const [genre, setGenre] = useState('All');
  const tracks = site.tracks;

  const genres = useMemo(() => ['All', ...new Set(tracks.map((t) => t.genre))], [tracks]);
  const filtered = genre === 'All' ? tracks : tracks.filter((t) => t.genre === genre);
  useReveal(filtered);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Discography</span>
          <h1>Music</h1>
          <p>
            Every release, free to stream. If a song means something to you, you can buy it for whatever you think
            it’s worth — the download is yours to keep.
          </p>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <div className="section-head" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {genres.map((g) => (
                <button
                  key={g}
                  className={`chip ${genre === g ? 'is-active' : ''}`}
                  style={
                    genre === g
                      ? { borderColor: 'var(--gold)', color: 'var(--gold-soft)', background: 'rgba(232,163,61,0.1)' }
                      : {}
                  }
                  onClick={() => setGenre(g)}
                >
                  {g}
                </button>
              ))}
            </div>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => play(filtered[0], filtered)}
              disabled={!filtered.length}
            >
              <Icon name="play" size={13} />
              Play all
            </button>
          </div>

          {filtered.length ? (
            <div className="tracklist">
              {filtered.map((track, index) => (
                <TrackRow key={track.id} track={track} index={index} list={filtered} />
              ))}
            </div>
          ) : (
            <div className="empty">No releases in this category yet.</div>
          )}

          <div className="alert alert--info" style={{ marginTop: 30 }}>
            <Icon name="download" size={16} />
            <span>
              Supporting a track unlocks a high-quality download of that record. Supporters’ names and messages appear
              on the wall — unless you choose to stay anonymous.
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
