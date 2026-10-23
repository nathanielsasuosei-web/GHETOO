import { useState } from 'react';
import Icon from '../components/Icon';
import { api } from '../lib/api';
import { cedis, compact, longDate } from '../lib/format';

const blank = {
  title: '',
  genre: 'Afro-fusion',
  year: new Date().getFullYear(),
  description: '',
  credits: '',
  minAmount: 5,
  published: true,
  allowStream: true,
  featured: false,
};

export default function Releases({ data, refresh, toast }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [audio, setAudio] = useState(null);
  const [cover, setCover] = useState(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);

  const reset = () => {
    setForm(blank);
    setAudio(null);
    setCover(null);
    setDurationSeconds(0);
    setProgress(0);
    setError('');
  };

  const onAudio = (file) => {
    setAudio(file);
    if (!file) return;
    const url = URL.createObjectURL(file);
    const probe = new Audio();
    probe.preload = 'metadata';
    probe.src = url;
    probe.onloadedmetadata = () => {
      setDurationSeconds(Math.round(probe.duration));
      URL.revokeObjectURL(url);
    };
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!audio) {
      setError('Choose an audio file for this release.');
      return;
    }
    const payload = new FormData();
    Object.entries(form).forEach(([k, v]) => payload.append(k, String(v)));
    payload.append('duration', String(durationSeconds));
    payload.append('minAmount', String(Math.round(Number(form.minAmount) * 100)));
    payload.append('audio', audio);
    if (cover) payload.append('cover', cover);

    setBusy(true);
    setProgress(0);
    try {
      await api.createTrack(payload, setProgress);
      toast('Release published');
      reset();
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (track, key) => {
    try {
      await api.updateTrack(track.id, { [key]: !track[key] });
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const saveAmount = async (track, value) => {
    try {
      await api.updateTrack(track.id, { minAmount: Math.round(Number(value) * 100) });
      setEditing(null);
      await refresh();
      toast('Minimum updated');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const remove = async (track) => {
    if (!window.confirm(`Delete “${track.title}”? The audio file will be removed too. This cannot be undone.`)) return;
    try {
      await api.deleteTrack(track.id);
      toast('Release deleted');
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const replaceCover = async (track, file) => {
    if (!file) return;
    const payload = new FormData();
    payload.append('cover', file);
    try {
      await api.replaceCover(track.id, payload);
      toast('Cover updated');
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <div className="studio__top">
        <div>
          <h1>Music</h1>
          <p>
            {data.tracks.length} releases · {compact(data.stats.plays)} streams. Upload the master, set the minimum you
            want for it, and it appears on the site instantly.
          </p>
        </div>
        <button className="btn btn--gold" onClick={() => (setShowForm((v) => !v), reset())}>
          <Icon name={showForm ? 'close' : 'plus'} size={16} />
          {showForm ? 'Cancel' : 'Upload release'}
        </button>
      </div>

      {showForm ? (
        <form className="panel" onSubmit={submit}>
          <div className="panel__head">
            <div>
              <h3>New release</h3>
              <p>MP3, WAV, M4A, AAC, OGG or FLAC up to 800MB.</p>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="r-title">Title *</label>
              <input
                id="r-title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Accra Nights"
              />
            </div>
            <div className="field">
              <label htmlFor="r-genre">Genre</label>
              <input
                id="r-genre"
                value={form.genre}
                onChange={(e) => setForm({ ...form, genre: e.target.value })}
                placeholder="Afro-fusion"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="r-year">Year</label>
              <input
                id="r-year"
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="r-min">Minimum support (GH₵)</label>
              <input
                id="r-min"
                type="number"
                min="0"
                step="1"
                value={form.minAmount}
                onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
              />
              <div className="field__hint">Fans can always pay more. Set 0 to allow free downloads.</div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="r-desc">Description</label>
            <textarea
              id="r-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What is this song about?"
            />
          </div>

          <div className="field">
            <label htmlFor="r-credits">Credits</label>
            <input
              id="r-credits"
              value={form.credits}
              onChange={(e) => setForm({ ...form, credits: e.target.value })}
              placeholder="Written by… · Produced by… · Mixed by…"
            />
          </div>

          <div className="field-row">
            <label className="upload-drop">
              <input type="file" accept="audio/*" onChange={(e) => onAudio(e.target.files?.[0] || null)} />
              <Icon name="upload" size={20} style={{ margin: '0 auto 8px' }} />
              <strong>{audio ? 'Audio ready' : 'Choose audio file *'}</strong>
              {audio ? (
                <span className="file-name">
                  {audio.name} · {(audio.size / 1024 / 1024).toFixed(1)}MB
                  {durationSeconds ? ` · ${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, '0')}` : ''}
                </span>
              ) : (
                <span>MP3, WAV, M4A, FLAC — drag or click</span>
              )}
            </label>

            <label className="upload-drop">
              <input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] || null)} />
              <Icon name="sparkle" size={20} style={{ margin: '0 auto 8px' }} />
              <strong>{cover ? 'Cover ready' : 'Cover artwork'}</strong>
              {cover ? <span className="file-name">{cover.name}</span> : <span>Square image works best (JPG/PNG)</span>}
            </label>
          </div>

          <div className="panel" style={{ margin: '18px 0 0', background: 'var(--panel-2)' }}>
            <div className="toggle-row">
              <div>
                <strong>Publish immediately</strong>
                <small>Off keeps it hidden as a draft.</small>
              </div>
              <button
                type="button"
                className={`switch ${form.published ? 'is-on' : ''}`}
                onClick={() => setForm({ ...form, published: !form.published })}
                aria-label="Toggle publish"
              />
            </div>
            <div className="toggle-row">
              <div>
                <strong>Allow free streaming</strong>
                <small>Fans can listen before they support.</small>
              </div>
              <button
                type="button"
                className={`switch ${form.allowStream ? 'is-on' : ''}`}
                onClick={() => setForm({ ...form, allowStream: !form.allowStream })}
                aria-label="Toggle streaming"
              />
            </div>
            <div className="toggle-row">
              <div>
                <strong>Feature on the homepage</strong>
                <small>Replaces the current spotlight.</small>
              </div>
              <button
                type="button"
                className={`switch ${form.featured ? 'is-on' : ''}`}
                onClick={() => setForm({ ...form, featured: !form.featured })}
                aria-label="Toggle featured"
              />
            </div>
          </div>

          {error ? (
            <div className="alert alert--error" style={{ marginTop: 16 }}>
              <Icon name="close" size={15} />
              <span>{error}</span>
            </div>
          ) : null}

          {busy ? (
            <div style={{ marginTop: 18 }}>
              <div className="goal__bar">
                <i style={{ width: `${progress}%`, transition: 'width 0.2s' }} />
              </div>
              <div className="field__hint">Uploading… {progress}%</div>
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            <button className="btn btn--gold" disabled={busy}>
              {busy ? 'Uploading…' : 'Publish release'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => (setShowForm(false), reset())}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="panel">
        <div className="panel__head">
          <div>
            <h3>Catalogue</h3>
            <p>Toggle what’s public, change the minimum, or delete.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Release</th>
                <th>Streams</th>
                <th>Downloads</th>
                <th>Minimum</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.tracks.map((track) => (
                <tr key={track.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img className="table__cover" src={track.cover} alt="" />
                      <div style={{ minWidth: 0 }}>
                        <strong>
                          {track.title} {track.featured ? <span className="chip" style={{ fontSize: 9, padding: '1px 7px' }}>Featured</span> : null}
                        </strong>
                        <div className="sub">
                          {track.genre} · {track.year} · added {longDate(track.createdAt)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{compact(track.plays)}</td>
                  <td>{compact(track.downloads)}</td>
                  <td>
                    {editing === track.id ? (
                      <input
                        type="number"
                        min="0"
                        step="1"
                        autoFocus
                        defaultValue={Math.round(track.minAmount / 100)}
                        style={{
                          width: 84,
                          background: '#0a0b0c',
                          border: '1px solid var(--gold)',
                          borderRadius: 6,
                          padding: '4px 8px',
                          color: 'var(--ivory)',
                        }}
                        onBlur={(e) => saveAmount(track, e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveAmount(track, e.target.value)}
                      />
                    ) : (
                      <button onClick={() => setEditing(track.id)} style={{ color: 'var(--ivory)' }}>
                        {cedis(track.minAmount)} <Icon name="edit" size={11} style={{ display: 'inline', opacity: 0.5 }} />
                      </button>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        className={`badge-status ${track.published ? 'badge-status--paid' : 'badge-status--draft'}`}
                        onClick={() => toggle(track, 'published')}
                        title="Toggle published"
                      >
                        {track.published ? 'Live' : 'Draft'}
                      </button>
                      <button
                        className={`badge-status ${track.allowStream ? 'badge-status--live' : 'badge-status--cancelled'}`}
                        onClick={() => toggle(track, 'allowStream')}
                        title="Toggle free streaming"
                      >
                        {track.allowStream ? 'Stream' : 'Paid only'}
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="table__actions">
                      <button
                        className={`icon-btn icon-btn--sm ${track.featured ? 'is-active' : ''}`}
                        onClick={() => toggle(track, 'featured')}
                        title="Feature on homepage"
                        style={track.featured ? { borderColor: 'var(--gold)', color: 'var(--gold)' } : {}}
                      >
                        <Icon name="sparkle" size={14} />
                      </button>
                      <label className="icon-btn icon-btn--sm" htmlFor={`cover-${track.id}`} title="Replace cover">
                        <Icon name="image" size={14} />
                      </label>
                      <input
                        id={`cover-${track.id}`}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) replaceCover(track, file);
                          e.target.value = '';
                        }}
                      />
                      <a className="icon-btn icon-btn--sm" href={`/api/stream/${track.id}`} target="_blank" rel="noreferrer" title="Preview audio">
                        <Icon name="play" size={14} />
                      </a>
                      <button className="icon-btn icon-btn--sm" onClick={() => remove(track)} title="Delete release">
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.tracks.length ? <div className="empty">No releases yet. Upload your first one above.</div> : null}
      </div>
    </>
  );
}
