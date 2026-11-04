import { useEffect, useState } from 'react';
import Icon from './Icon';
import { api } from '../lib/api';
import { relativeTime } from '../lib/format';

/**
 * Secure comments section.
 * - Input is clamped to 2000 chars, trimmed, and validated server-side.
 * - Rendered via React text interpolation (auto-escaped) — no dangerouslySetInnerHTML,
 *   so stored XSS is neutralised.
 * - Rate-limited server-side (10/min per IP) and uses parameterized SQL via
 *   POSTGRES_URL_NO_SSL when available.
 */
export default function CommentsSection() {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await api.listComments(100);
      setComments(data.comments || []);
    } catch {
      // silent — comments are secondary content
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) {
      setError('Write a comment first.');
      return;
    }
    if (value.length > 2000) {
      setError('Comment is too long — max 2000 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await api.createComment(value);
      // Optimistically prepend — server returns canonical row
      if (data.comment) {
        setComments((prev) => [data.comment, ...prev].slice(0, 100));
      } else {
        await load();
      }
      setText('');
    } catch (err) {
      setError(err.message || 'Could not post your comment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section section--tight section--line" aria-labelledby="comments-heading">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="eyebrow">Community</span>
            <h2 id="comments-heading">Leave a comment</h2>
            <p className="muted" style={{ marginTop: 8, fontSize: 'calc(13.5px * var(--ys-font-scale))' }}>
              Share your thoughts on the music. Comments are stored securely with parameterized queries and rendered as plain text.
            </p>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 24 }}>
          <form onSubmit={submit} aria-label="Post a comment">
            <div className="field">
              <label htmlFor="comment-input">Your comment</label>
              <textarea
                id="comment-input"
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="write a comment"
                maxLength={2000}
                required
                style={{ resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: 'var(--muted)' }}>
                <span>{text.trim().length}/2000</span>
                <span>{text.trim().length >= 1 && text.trim().length <= 2000 ? 'Ready to post' : 'Keep it between 1 and 2000 characters'}</span>
              </div>
            </div>
            {error ? (
              <div className="alert alert--error" role="alert">
                <Icon name="close" size={15} />
                <span>{error}</span>
              </div>
            ) : null}
            <button className="btn btn--gold btn--block" type="submit" disabled={busy} style={{ marginTop: 12 }}>
              {busy ? 'Posting…' : 'Submit'}
            </button>
          </form>
        </div>

        {loading ? (
          <div className="empty">Loading comments…</div>
        ) : comments.length === 0 ? (
          <div className="empty">No comments yet — be the first to leave one.</div>
        ) : (
          <div className="wall" role="feed" aria-label="Comments">
            {comments.map((item) => (
              <article key={item.id} className="wall-card reveal">
                <div className="wall-card__top">
                  <span className="avatar">
                    <Icon name="message" size={14} />
                  </span>
                  <div>
                    <div className="wall-card__name">Listener</div>
                    <div className="wall-card__meta">{relativeTime(item.createdAt)}</div>
                  </div>
                </div>
                {/* React auto-escapes — no XSS even if comment contains HTML/JS */}
                <p className="wall-card__msg">“{item.comment}”</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
