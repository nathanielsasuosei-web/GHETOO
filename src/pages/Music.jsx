import Icon from '../components/Icon';
import TrackRow from '../components/TrackRow';
import useReveal from '../hooks/useReveal';
import { useSite } from '../context/SiteContext';
import { usePlayer } from '../context/PlayerContext';

export default function Music() {
  const { site } = useSite();
  const { play } = usePlayer();
  const tracks = site.tracks;
  useReveal(tracks);

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
          <div className="section-head" style={{ marginBottom: 24, justifyContent: 'flex-end' }}>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => play(tracks[0], tracks)}
              disabled={!tracks.length}
            >
              <Icon name="play" size={13} />
              Play all
            </button>
          </div>

          {tracks.length ? (
            <div className="tracklist">
              {tracks.map((track, index) => (
                <TrackRow key={track.id} track={track} index={index} list={tracks} />
              ))}
            </div>
          ) : (
            <div className="empty">No releases yet.</div>
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
