import { useState } from 'react';
import Icon from './Icon';
import LyricsModal from './LyricsModal';
import TrackListen from './TrackListen';
import { trackPlatformLinks } from '../lib/streaming';
import { usePlayer } from '../context/PlayerContext';
import { useSupport } from '../context/SupportContext';
import { cedis, compact } from '../lib/format';

export default function TrackRow({ track, index, list }) {
  const { isCurrent, playing } = usePlayer();
  const { openSupport } = useSupport();
  const current = isCurrent(track.id);
  const platformLinks = trackPlatformLinks(track);
  const [showLyrics, setShowLyrics] = useState(false);

  return (
    <div className={`track ${current ? 'is-playing' : ''}`}>
      <div className="track__index">
        {current && playing ? (
          <span className="track__eq" aria-label="Now playing">
            <i />
            <i />
            <i />
          </span>
        ) : (
          String(index + 1).padStart(2, '0')
        )}
      </div>

      <div className="track__art">
        <img src={track.cover} alt={`${track.title} cover art`} loading="lazy" />
        <TrackListen track={track} list={list} className="track__artbtn">
          {({ playing: isPlaying }) => <Icon name={isPlaying ? 'pause' : 'play'} size={18} />}
        </TrackListen>
      </div>

      <div className="track__info">
        <h3>
          {track.title}
          {track.featured ? <span className="chip" style={{ padding: '2px 8px', fontSize: 9 }}>New</span> : null}
          {track.lyrics ? (
            <button className="lyrics-badge" onClick={() => setShowLyrics(true)}>
              <Icon name="mic" size={11} /> Lyrics
            </button>
          ) : null}
        </h3>
        <p>
          {track.genre} · {track.year}
          {track.description ? ` · ${track.description.slice(0, 70)}${track.description.length > 70 ? '…' : ''}` : ''}
        </p>
        {platformLinks.length ? (
          <div className="track__platforms" aria-label={`Streaming platforms for ${track.title}`}>
            <span>Listen on</span>
            {platformLinks.map((link) => (
              <a
                key={link.key}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Listen to ${track.title} on ${link.label} (opens in a new tab)`}
              >
                {link.label} <Icon name="arrowUpRight" size={11} />
              </a>
            ))}
          </div>
        ) : null}
      </div>

      <div className="track__stat" title="On-site plays, not platform streams">
        <Icon name="headphone" size={13} />
        {compact(track.plays)}
      </div>

      <div className="track__price">
        from <strong style={{ color: 'var(--ivory)' }}>{cedis(track.minAmount)}</strong>
      </div>

      <div className="track__actions">
        <button className="btn btn--gold btn--sm" onClick={() => openSupport(track)}>
          <Icon name="heart" size={13} />
          Support
        </button>
        <TrackListen track={track} list={list} className="btn btn--ghost btn--sm">
          {({ link, playing: isPlaying }) => (
            <>
              <Icon name={link ? 'external' : isPlaying ? 'pause' : 'play'} size={13} />
              {link ? 'Listen' : isPlaying ? 'Pause' : 'Play'}
            </>
          )}
        </TrackListen>
      </div>

      {showLyrics ? <LyricsModal track={track} onClose={() => setShowLyrics(false)} /> : null}
    </div>
  );
}
