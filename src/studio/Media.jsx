import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { api } from '../lib/api';

const SITE_ASSETS = [
  {
    id: 'logo',
    target: 'logo',
    label: 'Logo',
    note: 'Header, footer and browser icon',
    fallback: '/media/logo.svg',
    shape: 'logo',
  },
  {
    id: 'hero',
    target: 'hero',
    label: 'Homepage hero',
    note: 'The wide first impression',
    fallback: '/media/hero.jpg',
    shape: 'wide',
  },
  {
    id: 'portrait',
    target: 'portrait',
    label: 'Portrait',
    note: 'Story section and About page',
    fallback: '/media/portrait.jpg',
    shape: 'portrait',
  },
];

const isCustom = (url) => typeof url === 'string' && url.startsWith('/uploads/');

function ImageTile({ asset, src, onFile, onReset, busy, progress }) {
  const inputId = `media-${asset.key.replace(/[^a-z0-9-]/gi, '-')}`;
  return (
    <article className={`media-card media-card--${asset.shape || 'wide'}`}>
      <div className="media-card__image">
        <img src={src} alt="" loading="lazy" />
        <span className={`media-card__state ${asset.custom ? 'is-custom' : ''}`}>
          {asset.custom ? 'Custom upload' : 'Original'}
        </span>
      </div>
      <div className="media-card__body">
        <div className="media-card__copy">
          <strong>{asset.label}</strong>
          <small>{asset.note}</small>
        </div>
        <label className={`media-card__upload ${busy ? 'is-busy' : ''}`} htmlFor={inputId}>
          <input
            id={inputId}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
              event.target.value = '';
            }}
          />
          <Icon name={busy ? 'bolt' : 'upload'} size={15} />
          {busy ? `Uploading… ${progress}%` : asset.custom ? 'Replace image' : 'Upload image'}
        </label>
        {busy ? (
          <span className="upload-progress">
            <i style={{ width: `${progress}%` }} />
          </span>
        ) : null}
        {asset.custom && onReset ? (
          <button type="button" className="media-card__reset" onClick={onReset}>
            <Icon name="close" size={12} /> Use original
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function Media({ data, refresh, toast }) {
  const settings = data.settings || {};
  const [preview, setPreview] = useState({});
  const [uploading, setUploading] = useState('');
  const [progress, setProgress] = useState(0);
  const objectUrls = useRef([]);

  useEffect(() => () => objectUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const upload = async (asset, file) => {
    const localUrl = URL.createObjectURL(file);
    objectUrls.current.push(localUrl);
    setPreview((current) => ({ ...current, [asset.key]: localUrl }));
    setUploading(asset.key);
    setProgress(0);
    const form = new FormData();
    form.append('image', file);
    if (asset.target) form.append('target', asset.target);
    try {
      if (asset.target) await api.uploadSiteImage(form, setProgress);
      else await api.replaceMedia(asset.kind, asset.id, form, setProgress);
      toast(`${asset.label} updated`);
      await refresh();
    } catch (err) {
      setPreview((current) => {
        const next = { ...current };
        delete next[asset.key];
        return next;
      });
      toast(err.message, 'error');
    } finally {
      setUploading('');
      setProgress(0);
    }
  };

  const reset = async (asset) => {
    if (!window.confirm(`Go back to the original ${asset.label.toLowerCase()}? Your upload will be removed.`)) return;
    try {
      await api.resetSiteImage(asset.target);
      setPreview((current) => {
        const next = { ...current };
        delete next[asset.key];
        return next;
      });
      toast(`${asset.label} restored`);
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const srcFor = (asset, value) => preview[asset.key] || value || asset.fallback;
  const siteAssets = SITE_ASSETS.map((item) => {
    const field = { logo: 'logoImage', hero: 'heroImage', portrait: 'portraitImage' }[item.target];
    const current = settings[field] || item.fallback;
    return {
      ...item,
      key: `site:${item.target}`,
      src: srcFor({ ...item, key: `site:${item.target}` }, current),
      custom: isCustom(current),
    };
  });

  const itemAsset = (kind, item, label, note, imageField, shape) => {
    const key = `${kind}:${item.id}`;
    const current = item[imageField] || '/media/covers/placeholder.jpg';
    return {
      key,
      kind,
      id: item.id,
      label,
      note,
      src: srcFor({ key, fallback: '/media/covers/placeholder.jpg' }, current),
      custom: isCustom(current),
      shape,
    };
  };

  const groups = [
    {
      title: 'Release covers',
      note: 'Square artwork shown across music lists, the player and the homepage.',
      empty: 'No releases yet — add one in the Music tab.',
      assets: (data.tracks || []).map((track) =>
        itemAsset('track', track, track.title, track.published === false ? 'Draft release' : 'Live release', 'cover', 'square')
      ),
    },
    {
      title: 'Video thumbnails',
      note: 'Poster frames for the video gallery and lightbox.',
      empty: 'No videos yet — add one in the Videos tab.',
      assets: (data.videos || []).map((video) =>
        itemAsset('video', video, video.title, video.published === false ? 'Draft video' : 'Live video', 'thumb', 'wide')
      ),
    },
    {
      title: 'Merch photos',
      note: 'Product shots used in the store and checkout.',
      empty: 'No products yet — add one in the Merch tab.',
      assets: (data.products || []).map((product) =>
        itemAsset('product', product, product.title, product.published === false ? 'Draft product' : 'Live product', 'image', 'square')
      ),
    },
  ];

  const renderTile = (asset) => (
    <ImageTile
      key={asset.key}
      asset={asset}
      src={asset.src}
      busy={uploading === asset.key}
      progress={progress}
      onFile={(file) => upload(asset, file)}
      onReset={asset.target ? () => reset(asset) : null}
    />
  );

  return (
    <>
      <div className="studio__top">
        <div>
          <h1>Media</h1>
          <p>Replace the logo and any picture on the site, whenever you want. Changes go live as soon as they finish.</p>
        </div>
        <a className="btn btn--ghost btn--sm" href="/" target="_blank" rel="noreferrer">
          <Icon name="external" size={14} /> See it live
        </a>
      </div>

      <div className="panel media-intro">
        <span className="media-intro__icon"><Icon name="droplets" size={20} /></span>
        <div>
          <h3>One place for every visual</h3>
          <p>
            Use a square transparent PNG or WebP for the logo, a wide 2000px+ image for the hero, and square artwork
            for covers. JPG, PNG, WebP and GIF uploads up to 18 MB are accepted. Replacing a custom upload removes
            the old file; the artwork bundled with the site is never deleted.
          </p>
        </div>
      </div>

      <section className="panel media-group">
        <div className="panel__head">
          <div>
            <h3>Brand & homepage</h3>
            <p>The logo, hero and portrait that frame the entire site.</p>
          </div>
          <span className="badge-status badge-status--live">Live everywhere</span>
        </div>
        <div className="media-grid">{siteAssets.map(renderTile)}</div>
      </section>

      {groups.map((group) => (
        <section className="panel media-group" key={group.title}>
          <div className="panel__head">
            <div>
              <h3>{group.title}</h3>
              <p>{group.note}</p>
            </div>
            <span className="badge-status badge-status--draft">{group.assets.length} image{group.assets.length === 1 ? '' : 's'}</span>
          </div>
          {group.assets.length ? (
            <div className="media-grid">{group.assets.map(renderTile)}</div>
          ) : (
            <div className="empty">{group.empty}</div>
          )}
        </section>
      ))}

      <div className="alert alert--info">
        <Icon name="image" size={16} />
        <span>
          Hero framing and homepage words stay in{' '}
          <Link to="/studio/website" className="link-arrow">Website</Link>. Colours and the Liquid Glass finish stay
          in <Link to="/studio/appearance" className="link-arrow">Appearance</Link>.
        </span>
      </div>
    </>
  );
}
