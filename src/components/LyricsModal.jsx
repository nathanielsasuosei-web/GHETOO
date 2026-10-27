import { useEffect } from 'react';
import Icon from './Icon';

export default function LyricsModal({ track, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!track) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={`${track.title} lyrics`}>
        <div className="modal__head">
          <div className="lyrics-head">
            <img src={track.cover} alt="" />
            <div>
              <span className="eyebrow">Lyrics</span>
              <h3>{track.title}</h3>
              <p>
                {track.genre} · {track.year}
              </p>
            </div>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="modal__body">
          <pre className="lyrics-body">{track.lyrics}</pre>
        </div>
      </div>
    </div>
  );
}
