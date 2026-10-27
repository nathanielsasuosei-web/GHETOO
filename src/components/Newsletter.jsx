import { useState } from 'react';
import Icon from './Icon';
import { api } from '../lib/api';

export default function Newsletter({ compact = false }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [already, setAlready] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.subscribe(email);
      setAlready(Boolean(res.already));
      setDone(true);
      setEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className={`newsletter newsletter--done ${compact ? 'newsletter--compact' : ''}`}>
        <span className="success-ring success-ring--sm">
          <Icon name="check" size={16} strokeWidth={2} />
        </span>
        <p>
          {already ? 'You’re already on the list — see you in the inbox.' : 'You’re in. New music and shows land in your inbox first.'}
        </p>
      </div>
    );
  }

  return (
    <form className={`newsletter ${compact ? 'newsletter--compact' : ''}`} onSubmit={submit}>
      {!compact ? (
        <div className="newsletter__copy">
          <h4>
            <Icon name="send" size={15} /> Join the list
          </h4>
          <p>New drops, show announcements and nothing else. No spam, ever.</p>
        </div>
      ) : null}
      <div className="newsletter__form">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-label="Email address"
          maxLength={160}
        />
        <button className="btn btn--gold btn--sm" type="submit" disabled={busy}>
          {busy ? 'Joining…' : compact ? 'Join' : 'Subscribe'}
        </button>
      </div>
      {error ? (
        <p className="newsletter__error">
          <Icon name="close" size={12} /> {error}
        </p>
      ) : null}
    </form>
  );
}
