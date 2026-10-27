import { useState } from 'react';
import Icon from '../components/Icon';
import { api } from '../lib/api';
import { longDate } from '../lib/format';

const blank = {
  title: '',
  venue: '',
  city: '',
  date: '',
  priceNote: '',
  ticketUrl: '',
  description: '',
  published: true,
};

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Events({ data, refresh, toast }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setForm(blank);
    setEditing(null);
    setError('');
  };

  const startEdit = (event) => {
    setEditing(event.id);
    setForm({
      title: event.title,
      venue: event.venue,
      city: event.city,
      date: toLocalInput(event.date),
      priceNote: event.priceNote || '',
      ticketUrl: event.ticketUrl || '',
      description: event.description || '',
      published: event.published !== false,
    });
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.date) {
      setError('Pick the date and time of the show.');
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await api.updateEvent(editing, form);
        toast('Event updated');
      } else {
        await api.createEvent(form);
        toast('Event added');
      }
      reset();
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (event) => {
    try {
      await api.updateEvent(event.id, { published: event.published === false });
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const remove = async (event) => {
    if (!window.confirm(`Delete “${event.title}”?`)) return;
    try {
      await api.deleteEvent(event.id);
      toast('Event deleted');
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const now = Date.now();

  return (
    <>
      <div className="studio__top">
        <div>
          <h1>Events</h1>
          <p>{data.events.length} shows on the site. Add dates, venues and ticket links — they appear on /events instantly.</p>
        </div>
        <button className="btn btn--gold" onClick={() => (setShowForm((v) => !v), reset())}>
          <Icon name={showForm ? 'close' : 'plus'} size={16} />
          {showForm ? 'Cancel' : 'Add event'}
        </button>
      </div>

      {showForm ? (
        <form className="panel" onSubmit={submit}>
          <div className="panel__head">
            <div>
              <h3>{editing ? 'Edit event' : 'New event'}</h3>
              <p>Date and time use your local timezone.</p>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="e-title">Event title *</label>
              <input id="e-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Silence Made Loud — Accra Live" />
            </div>
            <div className="field">
              <label htmlFor="e-date">Date & time *</label>
              <input id="e-date" type="datetime-local" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="e-venue">Venue *</label>
              <input id="e-venue" required value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="+233 Jazz Bar" />
            </div>
            <div className="field">
              <label htmlFor="e-city">City *</label>
              <input id="e-city" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Accra" />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="e-price">Price note</label>
              <input id="e-price" value={form.priceNote} onChange={(e) => setForm({ ...form, priceNote: e.target.value })} placeholder="GH₵ 80 advance · GH₵ 120 gate" />
            </div>
            <div className="field">
              <label htmlFor="e-ticket">Ticket URL</label>
              <input id="e-ticket" type="url" value={form.ticketUrl} onChange={(e) => setForm({ ...form, ticketUrl: e.target.value })} placeholder="https://tickets…" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="e-desc">Description</label>
            <textarea id="e-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What should fans know about this show?" />
          </div>

          <div className="toggle-row">
            <div>
              <strong>Published</strong>
              <small>Off keeps it hidden as a draft.</small>
            </div>
            <button type="button" className={`switch ${form.published ? 'is-on' : ''}`} onClick={() => setForm({ ...form, published: !form.published })} aria-label="Toggle published" />
          </div>

          {error ? (
            <div className="alert alert--error" style={{ marginTop: 16 }}>
              <Icon name="close" size={15} />
              <span>{error}</span>
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button className="btn btn--gold" disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Add event'}
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
            <h3>All shows</h3>
            <p>Upcoming first, then the archive.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Show</th>
                <th>When</th>
                <th>Tickets</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.events.map((event) => {
                const past = new Date(event.date).getTime() < now;
                return (
                  <tr key={event.id}>
                    <td>
                      <strong>{event.title}</strong>
                      <div className="sub">
                        {event.venue} · {event.city}
                        {event.priceNote ? ` · ${event.priceNote}` : ''}
                      </div>
                    </td>
                    <td className="muted">{longDate(event.date)}</td>
                    <td>
                      {event.ticketUrl ? (
                        <a href={event.ticketUrl} target="_blank" rel="noreferrer" className="link-arrow" style={{ fontSize: 11 }}>
                          Link <Icon name="external" size={11} />
                        </a>
                      ) : (
                        <span className="muted">At the gate</span>
                      )}
                    </td>
                    <td>
                      <button
                        className={`badge-status ${event.published === false ? 'badge-status--draft' : past ? 'badge-status--cancelled' : 'badge-status--paid'}`}
                        onClick={() => toggle(event)}
                        title="Toggle published"
                      >
                        {event.published === false ? 'Draft' : past ? 'Past' : 'Live'}
                      </button>
                    </td>
                    <td>
                      <div className="table__actions">
                        <button className="icon-btn icon-btn--sm" onClick={() => startEdit(event)} title="Edit">
                          <Icon name="edit" size={14} />
                        </button>
                        <button className="icon-btn icon-btn--sm" onClick={() => remove(event)} title="Delete">
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!data.events.length ? <div className="empty">No events yet. Add your first show above.</div> : null}
      </div>
    </>
  );
}
