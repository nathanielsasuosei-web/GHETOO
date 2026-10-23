import { useState } from 'react';
import Icon from '../components/Icon';
import { api } from '../lib/api';
import { relativeTime, longDate } from '../lib/format';

export default function Messages({ data, refresh, toast }) {
  const [openId, setOpenId] = useState(null);

  const open = async (msg) => {
    setOpenId(openId === msg.id ? null : msg.id);
    if (!msg.read) {
      try {
        await api.readMessage(msg.id);
        await refresh();
      } catch (err) {
        toast(err.message, 'error');
      }
    }
  };

  return (
    <>
      <div className="studio__top">
        <div>
          <h1>Messages</h1>
          <p>Bookings, press and notes from the contact form.</p>
        </div>
        <span className="badge-status badge-status--pending">
          {data.messages.filter((m) => !m.read).length} unread
        </span>
      </div>

      <div className="panel">
        {data.messages.length ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {data.messages.map((msg) => (
              <article
                key={msg.id}
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  padding: 16,
                  background: msg.read ? 'transparent' : 'rgba(232,163,61,0.04)',
                  cursor: 'pointer',
                }}
                onClick={() => open(msg)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {!msg.read ? <span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)' }} /> : null}
                      <strong style={{ fontSize: 13.5 }}>{msg.subject}</strong>
                    </div>
                    <div className="sub" style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
                      {msg.name} · {msg.email} · {relativeTime(msg.createdAt)}
                    </div>
                  </div>
                  <a
                    className="btn btn--ghost btn--sm"
                    href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Icon name="mail" size={13} /> Reply
                  </a>
                </div>
                <p
                  style={{
                    marginTop: 12,
                    fontSize: 13.5,
                    color: 'var(--ivory-dim)',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-line',
                    display: openId === msg.id ? 'block' : '-webkit-box',
                    WebkitLineClamp: openId === msg.id ? 'unset' : 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {msg.body}
                </p>
                <div className="sub" style={{ fontSize: 10.5, color: 'var(--muted-2)', marginTop: 10 }}>
                  {longDate(msg.createdAt)}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty">No messages yet. The contact form on the Support page lands here.</div>
        )}
      </div>
    </>
  );
}
