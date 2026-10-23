import { useState } from 'react';
import Icon from '../components/Icon';
import { api } from '../lib/api';
import { compact, longDate } from '../lib/format';

const blank = { title: '', description: '', source: 'file', url: '', featured: false, published: true };

export default function VideoManager({ data, refresh, toast }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [video, setVideo] = useState(null);
  const [thumb, setThumb] = useState(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setForm(blank);
    setVideo(null);
    setThumb(null);
    setProgress(0);
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.source === 'file' && !video) {
      setError('Choose a video file, or switch to “Paste a link”.');
      return;
    }
    const payload = new FormData();
    payload.append('title', form.title);
    payload.append('description', form.description);
    payload.append('source', form.source);
    payload.append('published', String(form.published));
    payload.append('featured', String(form.featured));
    if (form.source === 'url') payload.append('url', form.url);
    if (video) payload.append('video', video);
    if (thumb) payload.append('thumb', thumb);

    setBusy(true);
    setProgress(0);
    try {
      await api.createVideo(payload, setProgress);
      toast('Video published');
      reset();
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    try {
      await api.deleteVideo(item.id);
      toast('Video deleted');
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const toggle = async (item, key) => {
    try {
      await api.updateVideo(item.id, { [key]: !item[key] });
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <div className="studio__top">
        <div>
          <h1>Videos</h1>
          <p>
            {data.videos.length} visuals · {compact(data.stats.views)} views. Upload an MP4 or point to a YouTube/Vimeo
            link.
          </p>
        </div>
        <button className="btn btn--gold" onClick={() => (setShowForm((v) => !v), reset())}>
          <Icon name={showForm ? 'close' : 'plus'} size={16} />
          {showForm ? 'Cancel' : 'Add video'}
        </button>
      </div>

      {showForm ? (
        <form className="panel" onSubmit={submit}>
          <div className="panel__head">
            <div>
              <h3>New video</h3>
              <p>MP4, WebM or MOV up to 800MB, or a link to a hosted video.</p>
            </div>
          </div>

          <div className="field">
            <label htmlFor="v-title">Title *</label>
            <input
              id="v-title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Accra Nights — Official Visual"
            />
          </div>

          <div className="field">
            <label htmlFor="v-desc">Description</label>
            <textarea
              id="v-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Shot across Osu and Jamestown over three nights."
            />
          </div>

          <div className="methods" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <button
              type="button"
              className={`method ${form.source === 'file' ? 'is-active' : ''}`}
              onClick={() => setForm({ ...form, source: 'file' })}
            >
              <strong>Upload a file</strong>
              <span>MP4 / WebM / MOV</span>
            </button>
            <button
              type="button"
              className={`method ${form.source === 'url' ? 'is-active' : ''}`}
              onClick={() => setForm({ ...form, source: 'url' })}
            >
              <strong>Paste a link</strong>
              <span>YouTube, Vimeo, etc.</span>
            </button>
          </div>

          {form.source === 'file' ? (
            <label className="upload-drop">
              <input type="file" accept="video/*" onChange={(e) => setVideo(e.target.files?.[0] || null)} />
              <Icon name="video" size={20} style={{ margin: '0 auto 8px' }} />
              <strong>{video ? 'Video ready' : 'Choose video file *'}</strong>
              {video ? (
                <span className="file-name">
                  {video.name} · {(video.size / 1024 / 1024).toFixed(1)}MB
                </span>
              ) : (
                <span>Drag or click to browse</span>
              )}
            </label>
          ) : (
            <div className="field">
              <label htmlFor="v-url">Video URL</label>
              <input
                id="v-url"
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://www.youtube.com/embed/…"
              />
              <div className="field__hint">Use an embed URL for YouTube (…/embed/ID) so it plays inside the site.</div>
            </div>
          )}

          <label className="upload-drop" style={{ marginTop: 14 }}>
            <input type="file" accept="image/*" onChange={(e) => setThumb(e.target.files?.[0] || null)} />
            <Icon name="image" size={20} style={{ margin: '0 auto 8px' }} />
            <strong>{thumb ? 'Thumbnail ready' : 'Thumbnail'}</strong>
            {thumb ? <span className="file-name">{thumb.name}</span> : <span>Widescreen image (16:9)</span>}
          </label>

          <div className="panel" style={{ margin: '18px 0 0', background: 'var(--panel-2)' }}>
            <div className="toggle-row">
              <div>
                <strong>Publish</strong>
                <small>Visible on the site immediately.</small>
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
                <strong>Feature on homepage</strong>
                <small>Highlighted as the latest visual.</small>
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

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button className="btn btn--gold" disabled={busy}>
              {busy ? 'Uploading…' : 'Publish video'}
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
            <h3>Published videos</h3>
            <p>Newest first.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Video</th>
                <th>Views</th>
                <th>Source</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.videos.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img
                        className="table__cover"
                        style={{ width: 62, height: 36, borderRadius: 6 }}
                        src={item.thumb}
                        alt=""
                      />
                      <div>
                        <strong>
                          {item.title}
                          {item.featured ? (
                            <span className="chip" style={{ fontSize: 9, padding: '1px 7px', marginLeft: 6 }}>
                              Featured
                            </span>
                          ) : null}
                        </strong>
                        <div className="sub">added {longDate(item.createdAt)}</div>
                      </div>
                    </div>
                  </td>
                  <td>{compact(item.views)}</td>
                  <td className="muted">{item.source === 'url' ? 'Link' : 'Upload'}</td>
                  <td>
                    <button
                      className={`badge-status ${item.published ? 'badge-status--paid' : 'badge-status--draft'}`}
                      onClick={() => toggle(item, 'published')}
                    >
                      {item.published ? 'Live' : 'Draft'}
                    </button>
                  </td>
                  <td>
                    <div className="table__actions">
                      <button
                        className="icon-btn icon-btn--sm"
                        onClick={() => toggle(item, 'featured')}
                        title="Feature"
                        style={item.featured ? { borderColor: 'var(--gold)', color: 'var(--gold)' } : {}}
                      >
                        <Icon name="sparkle" size={14} />
                      </button>
                      <button className="icon-btn icon-btn--sm" onClick={() => remove(item)} title="Delete">
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.videos.length ? <div className="empty">No videos yet.</div> : null}
      </div>
    </>
  );
}
