import { Fragment, useState } from 'react';
import Icon from '../components/Icon';
import StreamingFields from './StreamingFields';
import { MUSIC_PLATFORMS, trackPlatformLinks } from '../lib/streaming';
import { supportMinimum } from '../lib/support';
import { api } from '../lib/api';
import { cedis, compact, longDate } from '../lib/format';

const blank = {
  title: '',
  genre: 'Afro-fusion',
  year: new Date().getFullYear(),
  description: '',
  credits: '',
  lyrics: '',
  spotifyUrl: '',
  appleMusicUrl: '',
  youtubeUrl: '',
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
  const [lyricsEdit, setLyricsEdit] = useState(null);
  const [lyricsDraft, setLyricsDraft] = useState('');
  const [linksEdit, setLinksEdit] = useState(null);
  const [linksDraft, setLinksDraft] = useState({});
  const [savingLinks, setSavingLinks] = useState(false);

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
    if (!audio && !MUSIC_PLATFORMS.some(({ key }) => form[key].trim())) {
      setError('Choose an audio file or add a streaming platform link.');
      return;
    }
    const payload = new FormData();
    Object.entries(form).forEach(([k, v]) => payload.append(k, String(v)));
    payload.append('duration', String(durationSeconds));
    if (audio) payload.append('audio', audio);
    if (cover) payload.append('cover', cover);

    setBusy(true);
    setProgress(0);
    try {
      await api.createTrack(payload, setProgress);
      toast(form.published ? 'Release published' : 'Release saved as a draft');
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

  const openLyrics = (track) => {
    setLyricsEdit(track.id);
    setLyricsDraft(track.lyrics || '');
  };

  const saveLyrics = async (track) => {
    try {
      await api.updateTrack(track.id, { lyrics: lyricsDraft });
      setLyricsEdit(null);
      await refresh();
      toast('Lyrics saved');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const openLinks = (track) => {
    if (linksEdit === track.id) {
      setLinksEdit(null);
      return;
    }
    setLinksDraft(Object.fromEntries(MUSIC_PLATFORMS.map(({ key }) => [key, track[key] || ''])));
    setLinksEdit(track.id);
  };

  const saveLinks = async (event, track) => {
    event.preventDefault();
    setSavingLinks(true);
    try {
      await api.updateTrack(track.id, linksDraft);
      await refresh();
      setLinksEdit(null);
      toast('Streaming links saved');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSavingLinks(false);
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
            {data.tracks.length} releases · {compact(data.stats.plays)} on-site plays. Add streaming links to send
            listeners to your released music on Spotify, Apple Music or YouTube.
          </p>
        </div>
        <button className="btn btn--gold" onClick={() => (setShowForm((v) => !v), reset())}>
          <Icon name={showForm ? 'close' : 'plus'} size={16} />
          {showForm ? 'Cancel' : 'Add release'}
        </button>
      </div>

      {showForm ? (
        <form className="panel" onSubmit={submit}>
          <div className="panel__head">
            <div>
              <h3>New release</h3>
              <p>Add a platform link, an audio file, or both. Audio files can be MP3, WAV, M4A, AAC, OGG or FLAC up to 800MB.</p>
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

          <div className="field" style={{ maxWidth: 260 }}>
            <label htmlFor="r-year">Year</label>
            <input
              id="r-year"
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
            />
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

          <div className="field">
            <label htmlFor="r-lyrics">Lyrics</label>
            <textarea
              id="r-lyrics"
              rows={8}
              value={form.lyrics}
              onChange={(e) => setForm({ ...form, lyrics: e.target.value })}
              placeholder={'[Verse 1]\nFirst line of the song…\n\n[Chorus]\nThe hook…'}
            />
            <div className="field__hint">Line breaks are kept. Section tags like [Chorus] show on the public lyrics view.</div>
          </div>

          <StreamingFields
            values={form}
            onChange={(key, value) => setForm({ ...form, [key]: value })}
            prefix="new-release"
          />

          <div className="field-row">
            <label className="upload-drop">
              <input type="file" accept="audio/*" onChange={(e) => onAudio(e.target.files?.[0] || null)} />
              <Icon name="upload" size={20} style={{ margin: '0 auto 8px' }} />
              <strong>{audio ? 'Audio ready' : 'Choose audio file'}</strong>
              {audio ? (
                <span className="file-name">
                  {audio.name} · {(audio.size / 1024 / 1024).toFixed(1)}MB
                  {durationSeconds ? ` · ${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, '0')}` : ''}
                </span>
              ) : (
                <span>Optional if a streaming link is provided; required for downloads.</span>
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
                <strong>Allow on-site streaming</strong>
                <small>Used only when an audio file is uploaded and no streaming links are set.</small>
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
            <p>Add streaming links and choose what’s public. All support starts at {cedis(supportMinimum(data.settings?.minSupport))}.</p>
            <a className="studio-streaming-link" href="/studio/settings">Change the global minimum in Settings <Icon name="arrow" size={12} /></a>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Release</th>
                <th>Site plays</th>
                <th>Downloads</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.tracks.map((track) => (
                <Fragment key={track.id}>
                <tr>
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
                        <button
                          type="button"
                          className="studio-streaming-link"
                          onClick={() => openLinks(track)}
                          aria-expanded={linksEdit === track.id}
                        >
                          <Icon name="external" size={12} />
                          {trackPlatformLinks(track).length ? 'Edit streaming links' : 'Add streaming links'}
                        </button>
                      </div>
                    </div>
                  </td>
                  <td>{compact(track.plays)}</td>
                  <td>{compact(track.downloads)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        className={`badge-status ${track.published ? 'badge-status--paid' : 'badge-status--draft'}`}
                        onClick={() => toggle(track, 'published')}
                        title="Toggle published"
                      >
                        {track.published ? 'Live' : 'Draft'}
                      </button>
                      {track.audio ? (
                        <button
                          className={`badge-status ${track.allowStream ? 'badge-status--live' : 'badge-status--cancelled'}`}
                          onClick={() => toggle(track, 'allowStream')}
                          title="Toggle on-site streaming"
                        >
                          {track.allowStream ? 'Site stream' : 'Site stream off'}
                        </button>
                      ) : (
                        <span className="badge-status badge-status--draft">Platform only</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="table__actions">
                      <button
                        className={`icon-btn icon-btn--sm ${lyricsEdit === track.id ? 'is-active' : ''}`}
                        onClick={() => (lyricsEdit === track.id ? setLyricsEdit(null) : openLyrics(track))}
                        title={track.lyrics ? 'Edit lyrics' : 'Add lyrics'}
                        style={lyricsEdit === track.id ? { borderColor: 'var(--gold)', color: 'var(--gold)' } : {}}
                      >
                        <Icon name="mic" size={14} />
                      </button>
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
                      {track.audio && track.allowStream ? (
                        <a className="icon-btn icon-btn--sm" href={`/api/stream/${track.id}`} target="_blank" rel="noreferrer" title="Preview audio">
                          <Icon name="play" size={14} />
                        </a>
                      ) : null}
                      <button className="icon-btn icon-btn--sm" onClick={() => remove(track)} title="Delete release">
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
                {linksEdit === track.id ? (
                  <tr>
                    <td colSpan={5}>
                      <form className="lyrics-editor" onSubmit={(event) => saveLinks(event, track)}>
                        <div className="lyrics-editor__head">
                          <strong><Icon name="external" size={13} /> Streaming links — {track.title}</strong>
                        </div>
                        <StreamingFields
                          values={linksDraft}
                          onChange={(key, value) => setLinksDraft({ ...linksDraft, [key]: value })}
                          prefix={`edit-${track.id}`}
                        />
                        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                          <button className="btn btn--gold btn--sm" disabled={savingLinks}>
                            <Icon name="check" size={13} /> {savingLinks ? 'Saving…' : 'Save links'}
                          </button>
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setLinksEdit(null)}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : null}
                {lyricsEdit === track.id ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="lyrics-editor">
                        <div className="lyrics-editor__head">
                          <strong>
                            <Icon name="mic" size={13} /> Lyrics — {track.title}
                          </strong>
                          <span className="field__hint">Line breaks and [Section] tags are kept on the public page.</span>
                        </div>
                        <textarea
                          rows={9}
                          value={lyricsDraft}
                          onChange={(e) => setLyricsDraft(e.target.value)}
                          placeholder={'[Verse 1]\nFirst line…\n\n[Chorus]\nThe hook…'}
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                          <button className="btn btn--gold btn--sm" onClick={() => saveLyrics(track)}>
                            <Icon name="check" size={13} /> Save lyrics
                          </button>
                          <button className="btn btn--ghost btn--sm" onClick={() => setLyricsEdit(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {!data.tracks.length ? <div className="empty">No releases yet. Upload your first one above.</div> : null}
      </div>
    </>
  );
}
