import { useEffect, useState } from 'react';
import Icon from './Icon';
import { api } from '../lib/api';
import { cedis, compact, duration, longDate } from '../lib/format';
import { safeStreamingUrl } from '../lib/streaming';
import { supportMinimum } from '../lib/support';
import { useSite } from '../context/SiteContext';
import { useSupport } from '../context/SupportContext';

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
              <span>{compact(video.views + 1)} site opens</span>
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

function VideoCardContent({ video, youtubeUrl }) {
  return (
    <>
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
          {youtubeUrl ? (
            <span className="video-card__platform">Watch on YouTube ↗</span>
          ) : (
            <span>{compact(video.views)} site opens</span>
          )}
          <span>{longDate(video.createdAt)}</span>
        </div>
      </div>
    </>
  );
}

export default function VideoSection({ videos, title = 'Videos', intro, compactGrid = false }) {
  const [active, setActive] = useState(null);
  const { site } = useSite();
  const { openSupport } = useSupport();
  const minimum = supportMinimum(site?.minSupport);
  if (!videos?.length) return null;

  return (
    <>
      <div className="video-grid">
        {videos.slice(0, compactGrid ? 3 : videos.length).map((video) => {
          const youtubeUrl = safeStreamingUrl('youtubeUrl', video.youtubeUrl);
          return (
            <article key={video.id} className="video-item reveal">
              {youtubeUrl ? (
                <a
                  className="video-card"
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Watch ${video.title} on YouTube (opens in a new tab)`}
                >
                  <VideoCardContent video={video} youtubeUrl={youtubeUrl} />
                </a>
              ) : (
                <button
                  type="button"
                  className="video-card"
                  onClick={() => setActive(video)}
                  aria-label={`Play ${video.title} on this site`}
                >
                  <VideoCardContent video={video} />
                </button>
              )}
              <button
                type="button"
                className="video-card__support"
                onClick={() => openSupport(null, { video })}
                aria-label={`Support ${video.title} from ${cedis(minimum)}`}
              >
                <Icon name="heart" size={14} /> Support from {cedis(minimum)}
              </button>
            </article>
          );
        })}
      </div>
      {active ? <Lightbox video={active} onClose={() => setActive(null)} /> : null}
    </>
  );
}
