import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { usePlayer } from '../context/PlayerContext';
import { useSupport } from '../context/SupportContext';
import { duration } from '../lib/format';

export default function Player() {
  const { current, playing, time, duration: total, volume, muted, toggle, next, previous, seek, setVolume, toggleMute, stop } =
    usePlayer();
  const { openSupport } = useSupport();
  const barRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  if (!current) return null;

  const pct = total > 0 ? Math.min(100, (time / total) * 100) : 0;

  const seekFromEvent = (event) => {
    const bar = barRef.current;
    if (!bar || !total) return;
    const rect = bar.getBoundingClientRect();
    const x = (event.touches?.[0]?.clientX ?? event.clientX) - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    return ratio * total;
  };

  const onBarInteraction = (event) => {
    const value = seekFromEvent(event);
    if (typeof value === 'number') seek(value);
  };

  return (
    <div className="player" role="region" aria-label="Audio player">
      <div
        className="player__progress"
        ref={barRef}
        onPointerDown={(e) => {
          setDragging(true);
          onBarInteraction(e);
        }}
        onPointerMove={(e) => dragging && onBarInteraction(e)}
        onPointerUp={(e) => {
          setDragging(false);
          onBarInteraction(e);
        }}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(time)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') seek(time + 5);
          if (e.key === 'ArrowLeft') seek(time - 5);
        }}
      >
        <i style={{ width: `${pct}%` }} />
      </div>

      <div className="player__inner">
        <div className="player__track">
          <img className="player__art" src={current.cover} alt="" />
          <div style={{ minWidth: 0 }}>
            <div className="player__title">{current.title}</div>
            <div className="player__artist">
              Young Silence · {current.genre}
            </div>
          </div>
        </div>

        <div className="player__controls">
          <button className="player__btn" onClick={previous} aria-label="Previous track">
            <Icon name="prev" size={17} />
          </button>
          <button className="player__btn player__btn--main" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
            <Icon name={playing ? 'pause' : 'play'} size={19} />
          </button>
          <button className="player__btn" onClick={next} aria-label="Next track">
            <Icon name="next" size={17} />
          </button>
        </div>

        <div className="player__right">
          <span className="player__time">
            {duration(time)} / {duration(total)}
          </span>
          <div className="player__vol">
            <button className="player__btn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
              <Icon name={muted ? 'mute' : 'volume'} size={17} />
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={muted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
            />
          </div>
          <button className="btn btn--gold player__support" onClick={() => openSupport(current)}>
            <Icon name="heart" size={14} />
            Support
          </button>
        </div>

        <button className="player__close" onClick={stop} aria-label="Close player">
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  );
}
