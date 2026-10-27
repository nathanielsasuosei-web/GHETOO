import { useState } from 'react';
import Icon from './Icon';
import LyricsModal from './LyricsModal';
import { usePlayer } from '../context/PlayerContext';
import { useSupport } from '../context/SupportContext';
import { cedis, compact } from '../lib/format';

export default function TrackRow({ track, index, list }) {
  const { play, isCurrent, playing } = usePlayer();
  const { openSupport } = useSupport();
  const current = isCurrent(track.id);
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
        <button
          className="track__artbtn"
          onClick={() => play(track, list)}
          aria-label={`${current && playing ? 'Pause' : 'Play'} ${track.title}`}
        >
          <Icon name={current && playing ? 'pause' : 'play'} size={18} />
        </button>
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
      </div>

      <div className="track__stat">
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
        <button className="btn btn--ghost btn--sm" onClick={() => play(track, list)}>
          <Icon name={current && playing ? 'pause' : 'play'} size={13} />
          {current && playing ? 'Pause' : 'Play'}
        </button>
      </div>

      {showLyrics ? <LyricsModal track={track} onClose={() => setShowLyrics(false)} /> : null}
    </div>
  );
}
