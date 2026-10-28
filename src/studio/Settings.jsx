import { useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { api } from '../lib/api';
import { MIN_SUPPORT_PESEWAS, MAX_SUPPORT_PESEWAS, supportMinimum } from '../lib/support';

const NETWORKS = [
  { id: 'mtn', label: 'MTN MoMo' },
  { id: 'telecel', label: 'Telecel Cash' },
  { id: 'at', label: 'AirtelTigo Money' },
];

export default function Settings({ data, refresh, toast }) {
  const s = data.settings;
  const [form, setForm] = useState({
    artistName: s.artistName || '',
    tagline: s.tagline || '',
    intro: s.intro || '',
    bio: s.bio || '',
    city: s.city || '',
    announcement: s.announcement || '',
    supportNote: s.supportNote || '',
    minSupport: supportMinimum(s.minSupport) / 100,
    goalAmount: Math.round((s.goalAmount || 0) / 100),
    showRaised: s.showRaised !== false,
    contactEmail: s.contactEmail || '',
    momo: { mtn: s.momo?.mtn || '', telecel: s.momo?.telecel || '', at: s.momo?.at || '', name: s.momo?.name || '' },
    socials: {
      instagram: s.socials?.instagram || '',
      tiktok: s.socials?.tiktok || '',
      youtube: s.socials?.youtube || '',
      x: s.socials?.x || '',
      audiomack: s.socials?.audiomack || '',
    },
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm((f) => ({ ...f }));
  }, [data.settings]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.saveSettings({
        artistName: form.artistName,
        tagline: form.tagline,
        intro: form.intro,
        bio: form.bio,
        city: form.city,
        announcement: form.announcement,
        supportNote: form.supportNote,
        minSupport: Math.round(Number(form.minSupport) * 100),
        goalAmount: Math.round(Number(form.goalAmount) * 100),
        showRaised: form.showRaised,
        contactEmail: form.contactEmail,
        momo: form.momo,
        socials: form.socials,
      });
      toast('Settings saved');
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="studio__top">
        <div>
          <h1>Settings</h1>
          <p>Your profile, payout numbers and how support is presented.</p>
        </div>
      </div>

      <form onSubmit={save}>
        <div className="panel">
          <div className="panel__head">
            <div>
              <h3>Artist profile</h3>
              <p>Shown across the public site.</p>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="s-name">Artist name</label>
              <input
                id="s-name"
                value={form.artistName}
                onChange={(e) => setForm({ ...form, artistName: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="s-city">City</label>
              <input id="s-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="s-tagline">Tagline</label>
            <input
              id="s-tagline"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="s-intro">Hero intro</label>
            <textarea
              id="s-intro"
              value={form.intro}
              onChange={(e) => setForm({ ...form, intro: e.target.value })}
              rows={3}
            />
          </div>
          <div className="field">
            <label htmlFor="s-bio">Biography (blank line between paragraphs)</label>
            <textarea
              id="s-bio"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={9}
            />
          </div>
          <div className="alert alert--info" style={{ marginTop: 6 }}>
            <Icon name="image" size={16} />
            <span>
              Hero and portrait photos are uploaded in the <strong>Website</strong> tab, where you can see exactly how
              they’ll look before saving.
            </span>
          </div>
        </div>

        <div className="panel">
          <div className="panel__head">
            <div>
              <h3>Payout numbers</h3>
              <p>Where fans send Mobile Money. Use the format 0XX XXX XXXX.</p>
            </div>
          </div>
          <div className="field-row">
            {NETWORKS.map((n) => (
              <div className="field" key={n.id}>
                <label htmlFor={`momo-${n.id}`}>{n.label}</label>
                <input
                  id={`momo-${n.id}`}
                  value={form.momo[n.id]}
                  onChange={(e) => setForm({ ...form, momo: { ...form.momo, [n.id]: e.target.value } })}
                  placeholder="024 000 0000"
                />
              </div>
            ))}
          </div>
          <div className="field">
            <label htmlFor="momo-name">Account name</label>
            <input
              id="momo-name"
              value={form.momo.name}
              onChange={(e) => setForm({ ...form, momo: { ...form.momo, name: e.target.value } })}
              placeholder="Young Silence Music"
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel__head">
            <div>
              <h3>Support & fundraising</h3>
              <p>What fans see on the support panel.</p>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="s-goal">Goal (GH₵)</label>
              <input
                id="s-goal"
                type="number"
                min="0"
                step="100"
                value={form.goalAmount}
                onChange={(e) => setForm({ ...form, goalAmount: e.target.value })}
              />
              <div className="field__hint">Set 0 to hide the progress bar.</div>
            </div>
            <div className="field">
              <label htmlFor="s-email">Contact email</label>
              <input
                id="s-email"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="s-min-support">Minimum support for all art (GH₵)</label>
            <input
              id="s-min-support"
              type="number"
              min={MIN_SUPPORT_PESEWAS / 100}
              max={MAX_SUPPORT_PESEWAS / 100}
              step="0.01"
              required
              value={form.minSupport}
              onChange={(e) => setForm({ ...form, minSupport: e.target.value })}
            />
            <div className="field__hint">
              One minimum for general support, songs and videos. Fans can give more. Streaming-platform royalties
              and merch prices are separate.
            </div>
          </div>
          <div className="field">
            <label htmlFor="s-note">Support note</label>
            <textarea
              id="s-note"
              value={form.supportNote}
              onChange={(e) => setForm({ ...form, supportNote: e.target.value })}
              rows={3}
            />
          </div>
          <div className="field">
            <label htmlFor="s-announce">Announcement bar</label>
            <input
              id="s-announce"
              value={form.announcement}
              onChange={(e) => setForm({ ...form, announcement: e.target.value })}
              placeholder="Leave empty to hide the bar"
            />
          </div>
          <div className="toggle-row">
            <div>
              <strong>Show amount raised publicly</strong>
              <small>Turn off to keep totals private.</small>
            </div>
            <button
              type="button"
              className={`switch ${form.showRaised ? 'is-on' : ''}`}
              onClick={() => setForm({ ...form, showRaised: !form.showRaised })}
              aria-label="Toggle public totals"
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel__head">
            <div>
              <h3>Social links</h3>
              <p>Shown in the footer.</p>
            </div>
          </div>
          <div className="field-row">
            {['instagram', 'tiktok', 'youtube', 'x', 'audiomack'].map((key) => (
              <div className="field" key={key}>
                <label htmlFor={`soc-${key}`}>{key}</label>
                <input
                  id={`soc-${key}`}
                  value={form.socials[key]}
                  onChange={(e) => setForm({ ...form, socials: { ...form.socials, [key]: e.target.value } })}
                  placeholder="https://"
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn--gold" disabled={busy}>
            <Icon name="check" size={15} />
            {busy ? 'Saving…' : 'Save changes'}
          </button>
          <span className="field__hint" style={{ margin: 0 }}>
            Studio password is set with the <code>ARTIST_PASSWORD</code> environment variable.
          </span>
        </div>
      </form>
    </>
  );
}
