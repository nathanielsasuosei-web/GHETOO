import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { api } from '../lib/api';
import { initials } from '../lib/format';
import { useToast } from '../context/ToastContext';

const LABELS = { hero: 'Hero photo', portrait: 'Portrait photo', logo: 'Logo', favicon: 'Browser icon' };

const FOCUS = [
  { id: 'left', label: 'Left', position: '22% 40%' },
  { id: 'center', label: 'Centre', position: '58% 40%' },
  { id: 'right', label: 'Right', position: '82% 40%' },
];
const positionFor = (id) => FOCUS.find((f) => f.id === id)?.position || FOCUS[1].position;

function ImageDrop({ id, accept = 'image/*', label, hint, onFile, busy, progress }) {
  const [name, setName] = useState('');
  return (
    <label className="upload-drop" htmlFor={id}>
      <input
        id={id}
        type="file"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setName(file.name);
            onFile(file);
          }
          e.target.value = '';
        }}
      />
      <Icon name="upload" size={18} style={{ margin: '0 auto 8px' }} />
      <strong>{busy ? `Uploading… ${progress}%` : label}</strong>
      {name && !busy ? <span className="file-name">{name}</span> : <span>{hint}</span>}
      {busy ? (
        <span className="upload-progress">
          <i style={{ width: `${progress}%` }} />
        </span>
      ) : null}
    </label>
  );
}

export default function Website({ data, refresh }) {
  const { toast } = useToast();
  const s = data.settings;

  const [copy, setCopy] = useState({ tagline: s.tagline || '', intro: s.intro || '', announcement: s.announcement || '' });
  const [dirty, setDirty] = useState(false);
  const [savingCopy, setSavingCopy] = useState(false);

  const [uploading, setUploading] = useState(null); // 'hero' | 'portrait' | 'logo' | 'favicon'
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState({});
  const objectUrls = useRef([]);

  // keep the copy fields in sync when the studio data refreshes, unless being edited
  useEffect(() => {
    if (dirty) return;
    setCopy({ tagline: s.tagline || '', intro: s.intro || '', announcement: s.announcement || '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.tagline, s.intro, s.announcement]);

  useEffect(
    () => () => objectUrls.current.forEach((url) => URL.revokeObjectURL(url)),
    []
  );

  const upload = async (target, file) => {
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    setPreview((p) => ({ ...p, [target]: url }));
    setUploading(target);
    setProgress(0);
    const form = new FormData();
    form.append('target', target);
    form.append('image', file);
    try {
      await api.uploadSiteImage(form, setProgress);
      toast(LABELS[target] ? `${LABELS[target]} updated` : 'Image updated');
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
      setPreview((p) => ({ ...p, [target]: null }));
    } finally {
      setUploading(null);
      setProgress(0);
    }
  };

  const reset = async (target) => {
    if (!window.confirm(`Go back to the original ${LABELS[target] || 'image'}? Your uploaded image will be removed.`)) return;
    try {
      await api.resetSiteImage(target);
      setPreview((p) => ({ ...p, [target]: null }));
      toast('Reverted to the original image');
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const setFocus = async (id) => {
    try {
      await api.saveSettings({ heroFocus: id });
      await refresh();
      toast('Hero framing saved');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const saveCopy = async (e) => {
    e.preventDefault();
    setSavingCopy(true);
    try {
      await api.saveSettings(copy);
      setDirty(false);
      toast('Homepage text saved');
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSavingCopy(false);
    }
  };

  const heroSrc = preview.hero || s.heroImage;
  const portraitSrc = preview.portrait || s.portraitImage;
  const logoSrc = preview.logo || s.logoImage;
  const faviconSrc = preview.favicon || s.faviconImage;
  const heroIsCustom = String(s.heroImage).startsWith('/uploads/');
  const portraitIsCustom = String(s.portraitImage).startsWith('/uploads/');
  const logoIsCustom = String(s.logoImage).startsWith('/uploads/');
  const faviconIsCustom = String(s.faviconImage).startsWith('/uploads/');

  return (
    <>
      <div className="studio__top">
        <div>
          <h1>Website</h1>
          <p>The first thing fans see. Upload a new photo and the homepage changes the moment it finishes.</p>
        </div>
        <div className="website__top-actions">
          <Link className="btn btn--ghost btn--sm" to="/studio/media">
            <Icon name="image" size={14} /> Change any picture
          </Link>
          <a className="btn btn--ghost btn--sm" href="/" target="_blank" rel="noreferrer">
            <Icon name="external" size={14} /> See it live
          </a>
        </div>
      </div>

      <div className="panel">
        <div className="panel__head">
          <div>
            <h3>Homepage hero</h3>
            <p>Wide photo, ideally 2000px across. The left side holds your name and intro, so faces look best on the right.</p>
          </div>
          {heroIsCustom ? (
            <button className="btn btn--ghost btn--sm" onClick={() => reset('hero')}>
              <Icon name="close" size={13} /> Use original
            </button>
          ) : (
            <span className="badge-status badge-status--draft">Original photo</span>
          )}
        </div>

        <div className="site-preview">
          <div className="site-preview__hero">
            <img src={heroSrc} alt="" style={{ objectPosition: positionFor(s.heroFocus) }} />
            <div className="site-preview__shade" />
            <div className="site-preview__copy">
              <span className="site-preview__eyebrow">{copy.tagline || s.tagline}</span>
              <span className="site-preview__name">{s.artistName}</span>
              <span className="site-preview__intro">{copy.intro || s.intro}</span>
            </div>
            <span className="site-preview__tag">Homepage preview</span>
          </div>

          <div className="site-preview__side">
            <ImageDrop
              id="hero-upload"
              label={heroIsCustom ? 'Replace hero photo' : 'Upload hero photo'}
              hint="JPG, PNG or WebP · up to 18MB"
              onFile={(file) => upload('hero', file)}
              busy={uploading === 'hero'}
              progress={progress}
            />
            <div className="focus-options">
              <span className="field__hint" style={{ margin: 0 }}>
                Framing
              </span>
              <div className="focus-options__row">
                {FOCUS.map((f) => (
                  <button
                    key={f.id}
                    className={`chip ${(s.heroFocus || 'center') === f.id ? 'is-active' : ''}`}
                    style={
                      (s.heroFocus || 'center') === f.id
                        ? { borderColor: 'var(--gold)', color: 'var(--gold-soft)', background: 'rgba(232,163,61,0.1)' }
                        : {}
                    }
                    onClick={() => setFocus(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="field__hint" style={{ marginTop: 4 }}>
              Changes go live immediately. On phones the hero crops to a taller frame, so check it there too.
            </p>
          </div>
        </div>
      </div>

      <form className="panel" onSubmit={saveCopy}>
        <div className="panel__head">
          <div>
            <h3>Homepage words</h3>
            <p>The text over the hero photo.</p>
          </div>
          {dirty ? <span className="badge-status badge-status--pending">Unsaved</span> : null}
        </div>
        <div className="field">
          <label htmlFor="w-tagline">Eyebrow line</label>
          <input
            id="w-tagline"
            value={copy.tagline}
            maxLength={90}
            onChange={(e) => {
              setCopy({ ...copy, tagline: e.target.value });
              setDirty(true);
            }}
            placeholder="Accra raised. Silence made loud."
          />
        </div>
        <div className="field">
          <label htmlFor="w-intro">Intro</label>
          <textarea
            id="w-intro"
            rows={3}
            value={copy.intro}
            maxLength={260}
            onChange={(e) => {
              setCopy({ ...copy, intro: e.target.value });
              setDirty(true);
            }}
            placeholder="A line or two about the sound."
          />
          <div className="field__hint">{copy.intro.length}/260</div>
        </div>
        <div className="field">
          <label htmlFor="w-announce">Announcement bar</label>
          <input
            id="w-announce"
            value={copy.announcement}
            maxLength={120}
            onChange={(e) => {
              setCopy({ ...copy, announcement: e.target.value });
              setDirty(true);
            }}
            placeholder="New single — out now"
          />
          <div className="field__hint">Shown in the gold strip at the very top. Leave empty to hide it.</div>
        </div>
        <button className="btn btn--gold" disabled={savingCopy}>
          <Icon name="check" size={15} /> {savingCopy ? 'Saving…' : 'Save homepage text'}
        </button>
      </form>

      <div className="panel">
        <div className="panel__head">
          <div>
            <h3>Portrait photo</h3>
            <p>Used on the story section and the About page.</p>
          </div>
          {portraitIsCustom ? (
            <button className="btn btn--ghost btn--sm" onClick={() => reset('portrait')}>
              <Icon name="close" size={13} /> Use original
            </button>
          ) : (
            <span className="badge-status badge-status--draft">Original photo</span>
          )}
        </div>
        <div className="site-preview site-preview--portrait">
          <div className="site-preview__portrait">
            <img src={portraitSrc} alt="" />
          </div>
          <div className="site-preview__side">
            <ImageDrop
              id="portrait-upload"
              label={portraitIsCustom ? 'Replace portrait' : 'Upload portrait'}
              hint="Tall or square image works best"
              onFile={(file) => upload('portrait', file)}
              busy={uploading === 'portrait'}
              progress={progress}
            />
            <p className="field__hint" style={{ marginTop: 4 }}>
              Tip: a photo where you’re looking slightly away from the camera reads best at this size.
            </p>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel__head">
          <div>
            <h3>Logo & browser icon</h3>
            <p>Swap them as often as you like — every page updates immediately, no redeploy.</p>
          </div>
          <span className="badge-status badge-status--live">Live everywhere</span>
        </div>
        <div className="branding-grid">
          <div className="branding-card">
            <span className="field__hint">Logo / brand mark</span>
            <div className="branding-card__preview">
              {logoSrc ? (
                <img src={logoSrc} alt="Current logo" className="branding-card__logo" />
              ) : (
                <span className="branding-card__monogram">{initials(s.artistName) || 'YS'}</span>
              )}
            </div>
            <p className="field__hint">
              {logoIsCustom ? 'Your uploaded logo is shown in the header, footer and studio.' : 'No logo yet — the monogram from your artist name is used.'}
            </p>
            <ImageDrop
              id="logo-upload"
              label={logoIsCustom ? 'Replace logo' : 'Upload logo'}
              hint="PNG with a transparent background works best · up to 18MB"
              onFile={(file) => upload('logo', file)}
              busy={uploading === 'logo'}
              progress={progress}
            />
            {logoIsCustom ? (
              <button className="btn btn--ghost btn--sm" onClick={() => reset('logo')}>
                <Icon name="close" size={13} /> Back to monogram
              </button>
            ) : null}
          </div>

          <div className="branding-card">
            <span className="field__hint">Browser tab icon (favicon)</span>
            <div className="branding-card__preview">
              <img src={faviconSrc || '/favicon.svg'} alt="Current browser icon" className="branding-card__favicon" />
            </div>
            <p className="field__hint">
              {faviconIsCustom ? 'Your uploaded icon appears in every visitor’s browser tab.' : 'The bundled YS icon is in use.'}
            </p>
            <ImageDrop
              id="favicon-upload"
              label={faviconIsCustom ? 'Replace icon' : 'Upload icon'}
              hint="Square PNG or JPG · up to 18MB"
              onFile={(file) => upload('favicon', file)}
              busy={uploading === 'favicon'}
              progress={progress}
            />
            {faviconIsCustom ? (
              <button className="btn btn--ghost btn--sm" onClick={() => reset('favicon')}>
                <Icon name="close" size={13} /> Use original icon
              </button>
            ) : null}
          </div>
        </div>
        <div className="alert alert--info" style={{ marginTop: 18 }}>
          <Icon name="image" size={16} />
          <span>
            Need to change a release cover, video thumbnail or merch photo? The{' '}
            <Link to="/studio/media" className="link-arrow">Media tab</Link> lists every picture on the site in one
            place.
          </span>
        </div>
      </div>
    </>
  );
}
