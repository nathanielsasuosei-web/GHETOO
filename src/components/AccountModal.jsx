import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { useFan } from '../context/FanContext';
import { useToast } from '../context/ToastContext';

const EMPTY = { name: '', email: '', phone: '', password: '', confirm: '' };

const BENEFITS = [
  { icon: 'wallet', text: 'Your support and merch receipts in one place' },
  { icon: 'download', text: 'Download links you can come back to' },
  { icon: 'bolt', text: 'Faster checkout — your details are remembered' },
];

export default function AccountModal() {
  const { authOpen, authMode, setAuthMode, closeAuth, signUp, signIn } = useFan();
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authOpen) return undefined;
    setForm(EMPTY);
    setError('');
    document.body.style.overflow = 'hidden';
    const onKey = (event) => event.key === 'Escape' && closeAuth();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [authOpen, authMode, closeAuth]);

  if (!authOpen) return null;

  const isSignup = authMode === 'signup';
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (isSignup && form.password !== form.confirm) {
      setError('Those passwords don’t match.');
      return;
    }
    if (isSignup && form.name.trim().length < 2) {
      setError('Add the name you want us to call you.');
      return;
    }
    setBusy(true);
    try {
      const payload = isSignup
        ? { name: form.name, email: form.email, phone: form.phone, password: form.password }
        : { email: form.email, password: form.password };
      const fan = isSignup ? await signUp(payload) : await signIn(payload);
      toast(isSignup ? `Welcome, ${fan.name.split(/\s+/)[0]} — your account is ready.` : `Welcome back, ${fan.name.split(/\s+/)[0]}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop account-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closeAuth()}>
      <div className="modal account-modal" role="dialog" aria-modal="true" aria-label={isSignup ? 'Create a fan account' : 'Sign in'}>
        <div className="modal__head">
          <div>
            <span className="eyebrow">Fan account</span>
            <h3>{isSignup ? 'Join the circle.' : 'Welcome back.'}</h3>
            <p>{isSignup ? 'Free, forever. No label, no gatekeepers.' : 'Sign in to see your support, downloads and receipts.'}</p>
          </div>
          <button type="button" className="modal__close" onClick={closeAuth} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="modal__body account-modal__body">
          <div className="account-tabs" role="tablist" aria-label="Account options">
            <button
              type="button"
              role="tab"
              aria-selected={!isSignup}
              className={!isSignup ? 'is-active' : ''}
              onClick={() => { setAuthMode('signin'); setError(''); }}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isSignup}
              className={isSignup ? 'is-active' : ''}
              onClick={() => { setAuthMode('signup'); setError(''); }}
            >
              Create account
            </button>
          </div>

          <form onSubmit={submit} className="account-form">
            {isSignup ? (
              <div className="field">
                <label htmlFor="fan-name">Your name</label>
                <input id="fan-name" value={form.name} onChange={update('name')} placeholder="Ama Boateng" maxLength={80} autoComplete="name" required />
              </div>
            ) : null}
            <div className="field">
              <label htmlFor="fan-email">Email</label>
              <input id="fan-email" type="email" value={form.email} onChange={update('email')} placeholder="you@email.com" maxLength={160} autoComplete="email" required />
            </div>
            {isSignup ? (
              <div className="field">
                <label htmlFor="fan-phone">Phone (optional)</label>
                <input id="fan-phone" value={form.phone} onChange={update('phone')} placeholder="024 000 0000" maxLength={30} autoComplete="tel" />
              </div>
            ) : null}
            <div className="field-row">
              <div className="field">
                <label htmlFor="fan-password">Password</label>
                <input
                  id="fan-password"
                  type="password"
                  value={form.password}
                  onChange={update('password')}
                  placeholder={isSignup ? 'At least 8 characters' : '••••••••'}
                  minLength={8}
                  maxLength={128}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  required
                />
              </div>
              {isSignup ? (
                <div className="field">
                  <label htmlFor="fan-confirm">Confirm password</label>
                  <input id="fan-confirm" type="password" value={form.confirm} onChange={update('confirm')} placeholder="Repeat it" autoComplete="new-password" required />
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="alert alert--error">
                <Icon name="close" size={15} />
                <span>{error}</span>
              </div>
            ) : null}

            <button className="btn btn--gold btn--block btn--lg" type="submit" disabled={busy}>
              {busy ? 'One moment…' : isSignup ? 'Create my account' : 'Sign in'}
              {!busy ? <Icon name="arrow" size={17} /> : null}
            </button>
          </form>

          <div className="account-benefits">
            {BENEFITS.map((item) => (
              <span key={item.icon}>
                <Icon name={item.icon} size={14} /> {item.text}
              </span>
            ))}
          </div>
          <p className="field__hint" style={{ textAlign: 'center', marginTop: 16 }}>
            <Icon name="lock" size={12} /> Your password is hashed and never shown.{' '}
            <Link to="/account" onClick={closeAuth} className="link-arrow">See your account page →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
