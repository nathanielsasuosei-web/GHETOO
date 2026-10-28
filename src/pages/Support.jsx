import { useState } from 'react';
import Icon from '../components/Icon';
import SupportPanel from '../components/SupportPanel';
import Wall from '../components/Wall';
import useReveal from '../hooks/useReveal';
import { useSite } from '../context/SiteContext';
import { api } from '../lib/api';
import { cedis } from '../lib/format';

export default function Support() {
  const { site } = useSite();
  const [form, setForm] = useState({ name: '', email: '', subject: '', body: '' });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useReveal(site);

  const settings = site.settings;
  const stats = site.stats;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.message(form);
      setSent(true);
      setForm({ name: '', email: '', subject: '', body: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Fund the art</span>
          <h1>Support</h1>
          <p>
            {stats.supporters} people have put {cedis(stats.raised)} into this music. No label, no sponsors — just
            listeners who decided the songs were worth something.
          </p>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <SupportPanel variant="page" />
        </div>
      </section>

      <section className="section section--tight section--line">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Where it goes</span>
              <h2>Every cedi, accounted for</h2>
            </div>
          </div>
          <div className="stat-grid">
            <div className="stat-card stat-card--gold">
              <span>
                <Icon name="wallet" size={13} /> Raised so far
              </span>
              <strong>{cedis(stats.raised)}</strong>
              <em>from {stats.supporters} supporters</em>
            </div>
            <div className="stat-card">
              <span>
                <Icon name="headphone" size={13} /> On-site plays
              </span>
              <strong>{stats.plays.toLocaleString()}</strong>
              <em>across {stats.tracks} releases</em>
            </div>
            <div className="stat-card">
              <span>
                <Icon name="download" size={13} /> Paid downloads
              </span>
              <strong>{stats.downloads.toLocaleString()}</strong>
              <em>music kept, not rented</em>
            </div>
            <div className="stat-card">
              <span>
                <Icon name="video" size={13} /> On-site video opens
              </span>
              <strong>{stats.views.toLocaleString()}</strong>
              <em>{stats.videos} visuals online</em>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 24 }}>
            <div className="panel__head">
              <div>
                <h3>The honest breakdown</h3>
                <p>How support from the last cycle was spent.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Where</th>
                    <th>What for</th>
                    <th style={{ textAlign: 'right' }}>Share</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Studio & mixing</strong>
                    </td>
                    <td className="muted">Recording time in Accra, mixing and mastering</td>
                    <td style={{ textAlign: 'right' }}>40%</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Videos</strong>
                    </td>
                    <td className="muted">Camera, crew, locations, editing</td>
                    <td style={{ textAlign: 'right' }}>30%</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Promotion</strong>
                    </td>
                    <td className="muted">Radio plugs, data, playlisting, artwork</td>
                    <td style={{ textAlign: 'right' }}>20%</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Life</strong>
                    </td>
                    <td className="muted">Rent, food and keeping the artist in the room</td>
                    <td style={{ textAlign: 'right' }}>10%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">The wall</span>
              <h2>Notes from supporters</h2>
            </div>
          </div>
          <Wall items={site.wall} />
        </div>
      </section>

      <section className="section section--tight section--line">
        <div className="container">
          <div className="about">
            <div className="reveal">
              <span className="eyebrow">Get in touch</span>
              <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px,4vw,48px)', margin: '14px 0 16px' }}>
                Bookings, press, or just to talk
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: 14.5, lineHeight: 1.75, maxWidth: '46ch' }}>
                For shows, features and interviews, send a message. For anything about a payment, include your
                reference (it looks like <span className="mono">YS-XXXXXX</span>).
              </p>
              <div style={{ marginTop: 24, display: 'grid', gap: 12 }}>
                <a href={`mailto:${settings.contactEmail}`} className="chip" style={{ width: 'fit-content' }}>
                  <Icon name="mail" size={14} /> {settings.contactEmail}
                </a>
                <span className="chip" style={{ width: 'fit-content' }}>
                  <Icon name="wallet" size={14} /> MoMo: {settings.momo?.mtn || '—'} ({settings.momo?.name})
                </span>
              </div>
            </div>

            <div className="panel reveal" style={{ margin: 0 }}>
              {sent ? (
                <div className="pay__done">
                  <div className="success-ring">
                    <Icon name="check" size={28} strokeWidth={2} />
                  </div>
                  <h3 style={{ fontFamily: 'var(--serif)', fontSize: 26, marginBottom: 8 }}>Message sent</h3>
                  <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>
                    It landed in the studio inbox. Expect a reply within a couple of days.
                  </p>
                  <button className="btn btn--ghost" style={{ marginTop: 18 }} onClick={() => setSent(false)}>
                    Send another
                  </button>
                </div>
              ) : (
                <form onSubmit={submit}>
                  <div className="field-row">
                    <div className="field">
                      <label htmlFor="c-name">Your name</label>
                      <input
                        id="c-name"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Nana Ama"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="c-email">Email</label>
                      <input
                        id="c-email"
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="you@email.com"
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="c-subject">Subject</label>
                    <input
                      id="c-subject"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="Booking for December / question about my support"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="c-body">Message</label>
                    <textarea
                      id="c-body"
                      required
                      rows={5}
                      value={form.body}
                      onChange={(e) => setForm({ ...form, body: e.target.value })}
                      placeholder="Write it here…"
                    />
                  </div>
                  {error ? (
                    <div className="alert alert--error">
                      <Icon name="close" size={15} />
                      <span>{error}</span>
                    </div>
                  ) : null}
                  <button className="btn btn--gold btn--block" disabled={busy}>
                    {busy ? 'Sending…' : 'Send message'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
