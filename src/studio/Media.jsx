import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

function SlotCard({ slot, busy, progress, onFile, onReset }) {
  const hasImage = Boolean(slot.url);
  return (
    <div className={`media-slot ${busy ? 'is-busy' : ''}`}>
      <div className="media-slot__preview">
        {hasImage ? (
          <img src={slot.url} alt="" loading="lazy" />
        ) : (
          <div className="media-slot__blank">
            <Icon name="image" size={20} />
            <span>Monogram in use</span>
          </div>
        )}
        {slot.custom ? <span className="media-slot__badge">Uploaded</span> : <span className="media-slot__badge is-original">Original</span>}
      </div>
      <div className="media-slot__copy">
        <strong>{slot.label}</strong>
        <small>{slot.group}</small>
      </div>
      <label className="media-slot__upload" htmlFor={`media-${slot.kind}-${slot.id}`}>
        <input
          id={`media-${slot.kind}-${slot.id}`}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(slot, file);
            event.target.value = '';
          }}
        />
        {busy ? `Uploading… ${progress}%` : 'Replace image'}
      </label>
      {slot.custom ? (
        <button type="button" className="media-slot__reset" onClick={() => onReset(slot)} disabled={busy}>
          Use original
        </button>
      ) : null}
      {busy ? <span className="upload-progress"><i style={{ width: `${progress}%` }} /></span> : null}
    </div>
  );
}

export default function Media({ refresh }) {
  const { toast } = useToast();
  const [slots, setSlots] = useState(null);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const [progress, setProgress] = useState(0);
  const [group, setGroup] = useState('All');

  const load = useCallback(async () => {
    try {
      const data = await api.mediaSlots();
      setSlots(data.slots || []);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    const list = ['All'];
    for (const slot of slots || []) if (!list.includes(slot.group)) list.push(slot.group);
    return list;
  }, [slots]);

  const visible = (slots || []).filter((slot) => group === 'All' || slot.group === group);

  const replace = async (slot, file) => {
    setBusyKey(slot.key);
    setProgress(0);
    const form = new FormData();
    form.append('kind', slot.kind);
    form.append('id', slot.id);
    form.append('image', file);
    try {
      const result = await api.replaceMedia(form, setProgress);
      if (Array.isArray(result?.slots)) setSlots(result.slots);
      else await load();
      await refresh();
      toast(`${slot.label} updated — the public site changed instantly`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusyKey('');
      setProgress(0);
    }
  };

  const reset = async (slot) => {
    if (!window.confirm(`Go back to the original image for “${slot.label}”? Your upload will be removed.`)) return;
    setBusyKey(slot.key);
    try {
      const result = await api.resetMedia(slot.kind, slot.id);
      if (Array.isArray(result?.slots)) setSlots(result.slots);
      else await load();
      await refresh();
      toast('Original image restored');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusyKey('');
    }
  };

  return (
    <>
      <div className="studio__top">
        <div>
          <h1>Media</h1>
          <p>Every picture on the site, in one place. Replace any of them any time — changes go live immediately.</p>
        </div>
        <div className="website__top-actions">
          <button className="btn btn--ghost btn--sm" onClick={load}>
            <Icon name="bolt" size={14} /> Refresh
          </button>
          <a className="btn btn--ghost btn--sm" href="/" target="_blank" rel="noreferrer">
            <Icon name="external" size={14} /> See it live
          </a>
        </div>
      </div>

      <div className="panel">
        <div className="panel__head">
          <div>
            <h3>All images ({slots?.length ?? 0})</h3>
            <p>Branding, release covers, video thumbnails and merch photos. JPG, PNG, WebP, GIF or AVIF up to 18MB.</p>
          </div>
        </div>
        <div className="media-filters">
          {groups.map((name) => (
            <button
              key={name}
              type="button"
              className={`chip ${group === name ? 'is-active' : ''}`}
              onClick={() => setGroup(name)}
            >
              {name}
            </button>
          ))}
        </div>
        {error ? (
          <div className="alert alert--error"><Icon name="close" size={15} /><span>{error}</span></div>
        ) : null}
        {!slots ? (
          <div className="account-loading"><div className="loader" /></div>
        ) : visible.length ? (
          <div className="media-grid">
            {visible.map((slot) => (
              <SlotCard
                key={slot.key}
                slot={slot}
                busy={busyKey === slot.key}
                progress={progress}
                onFile={replace}
                onReset={reset}
              />
            ))}
          </div>
        ) : (
          <div className="account-empty"><Icon name="image" size={22} /><strong>No images in this group yet.</strong></div>
        )}
      </div>

      <div className="alert alert--info">
        <Icon name="sparkle" size={16} />
        <span>
          The hero photo, framing and homepage words live in <Link to="/studio/website" className="link-arrow">Website</Link>.
          Colours and Liquid Glass live in <Link to="/studio/appearance" className="link-arrow">Appearance</Link>.
        </span>
      </div>
    </>
  );
}
