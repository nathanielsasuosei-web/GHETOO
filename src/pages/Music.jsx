import Icon from '../components/Icon';
import TrackRow from '../components/TrackRow';
import useReveal from '../hooks/useReveal';
import { useSite } from '../context/SiteContext';
import { usePlayer } from '../context/PlayerContext';
import { canPlayOnSite } from '../lib/streaming';

export default function Music() {
  const { site } = useSite();
  const { play } = usePlayer();
  const tracks = site.tracks;
  const onSiteTracks = tracks.filter(canPlayOnSite);
  useReveal(tracks);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Discography</span>
          <h1>Music</h1>
          <p>
            Listen on your favourite streaming platforms or play available releases here. You can also support the
            music directly; select releases include a download to keep.
          </p>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          {onSiteTracks.length ? (
            <div className="section-head" style={{ marginBottom: 24, justifyContent: 'flex-end' }}>
              <button className="btn btn--ghost btn--sm" onClick={() => play(onSiteTracks[0], onSiteTracks)}>
                <Icon name="play" size={13} />
                {onSiteTracks.length === tracks.length ? 'Play all' : 'Play on-site releases'}
              </button>
            </div>
          ) : null}

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
              Support the music directly. Releases with an uploaded audio file include a download; supporters’ names
              and messages appear on the wall unless you choose to stay anonymous.
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
