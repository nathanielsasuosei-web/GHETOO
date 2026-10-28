import { usePlayer } from '../context/PlayerContext';
import { canPlayOnSite, trackPlatformLinks } from '../lib/streaming';

/** Prefer the artist's platform link; keep the local player as a fallback. */
export default function TrackListen({ track, list, className, children, style }) {
  const { play, isCurrent, playing } = usePlayer();
  if (!track) return null;

  const link = trackPlatformLinks(track)[0];
  const isPlaying = isCurrent(track.id) && playing;
  const content = typeof children === 'function' ? children({ link, playing: isPlaying }) : children;

  if (link) {
    return (
      <a
        className={className}
        style={style}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Listen to ${track.title} on ${link.label} (opens in a new tab)`}
      >
        {content}
      </a>
    );
  }
  if (!canPlayOnSite(track)) return null;
  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={() => play(track, list)}
      aria-label={`${isPlaying ? 'Pause' : 'Play'} ${track.title} on this site`}
    >
      {content}
    </button>
  );
}
