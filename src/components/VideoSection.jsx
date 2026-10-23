import { useEffect, useState } from 'react';
import Icon from './Icon';
import { api } from '../lib/api';
import { compact, duration, longDate } from '../lib/format';

function Lightbox({ video, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    api.countView(video.id);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [video.id, onClose]);

  const isEmbed = video.embedSrc;

  return (
    <div className="lightbox" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lightbox__panel">
        <div className="lightbox__head">
          <div>
            <h3>{video.title}</h3>
            <p>{video.description}</p>
            <div className="video-card__meta" style={{ marginTop: 10 }}>
              <span>{compact(video.views + 1)} views</span>
              <span>{longDate(video.createdAt)}</span>
            </div>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Close video">
            <Icon name="close" size={18} />
          </button>
        </div>
        {isEmbed ? (
          <iframe
            className="lightbox__video"
            style={{ aspectRatio: '16/9', border: 0 }}
            src={isEmbed}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video className="lightbox__video" src={video.src} poster={video.thumb} controls autoPlay playsInline />
        )}
      </div>
    </div>
  );
}

export default function VideoSection({ videos, title = 'Videos', intro, compactGrid = false }) {
  const [active, setActive] = useState(null);
  if (!videos?.length) return null;

  return (
    <>
      <div className="video-grid">
        {videos.slice(0, compactGrid ? 3 : videos.length).map((video) => (
          <article
            key={video.id}
            className="video-card reveal"
            onClick={() => setActive(video)}
            onKeyDown={(e) => e.key === 'Enter' && setActive(video)}
            tabIndex={0}
            role="button"
            aria-label={`Play ${video.title}`}
          >
            <div className="video-card__thumb">
              <img src={video.thumb} alt="" loading="lazy" />
              {video.featured ? <span className="video-card__tag">Latest</span> : null}
              <div className="video-card__play">
                <span>
                  <Icon name="play" size={22} />
                </span>
              </div>
              {video.duration ? <span className="video-card__time">{duration(video.duration)}</span> : null}
            </div>
            <div className="video-card__body">
              <h3>{video.title}</h3>
              <p>{video.description}</p>
              <div className="video-card__meta">
                <span>{compact(video.views)} views</span>
                <span>{longDate(video.createdAt)}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
      {active ? <Lightbox video={active} onClose={() => setActive(null)} /> : null}
    </>
  );
}
