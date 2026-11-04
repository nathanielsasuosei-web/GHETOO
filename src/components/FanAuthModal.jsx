import { useEffect, useState } from 'react';
import Icon from './Icon';
import { useFan } from '../context/FanContext';
import { useToast } from '../context/ToastContext';

const emptyForm = { name: '', email: '', password: '', confirm: '' };

export default function FanAuthModal() {
  const { authOpen, authMode, setAuthMode, closeAuth, register, login } = useFan();
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isRegister = authMode === 'register';

  useEffect(() => {
    if (!authOpen) return undefined;
    setForm(emptyForm);
    setError('');
    setBusy(false);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => event.key === 'Escape' && closeAuth();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [authOpen, authMode, closeAuth]);

  if (!authOpen) return null;

  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (isRegister) {
      if (form.name.trim().length < 2) return setError('Add the name you want us to use.');
      if (form.password !== form.confirm) return setError('The two passwords do not match.');
    }
    setBusy(true);
    try {
      if (isRegister) {
        await register({ name: form.name, email: form.email, password: form.password });
        toast('Account created — welcome to the inner circle');
      } else {
        await login({ email: form.email, password: form.password });
        toast('Welcome back');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop fan-auth-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeAuth()}>
      <div className="modal fan-auth" role="dialog" aria-modal="true" aria-label={isRegister ? 'Create a fan account' : 'Sign in as a fan'}>
        <div className="modal__head">
          <div>
            <span className="eyebrow">
              <Icon name="droplets" size={13} /> Fan account
            </span>
            <h3>{isRegister ? 'Join the inner circle.' : 'Welcome back.'}</h3>
            <p>
              {isRegister
                ? 'Save your checkout details and keep your support and download links together.'
                : 'Your support history and saved checkout details are waiting.'}
            </p>
          </div>
          <button type="button" className="modal__close" onClick={closeAuth} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="modal__body">
          <div className="fan-auth__tabs" role="tablist" aria-label="Fan account options">
            <button
              type="button"
              role="tab"
              aria-selected={isRegister}
              className={isRegister ? 'is-active' : ''}
              onClick={() => setAuthMode('register')}
            >
              Create account
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isRegister}
              className={!isRegister ? 'is-active' : ''}
              onClick={() => setAuthMode('login')}
            >
              Sign in
            </button>
          </div>

          <form onSubmit={submit} className="fan-auth__form">
            {isRegister ? (
              <div className="field">
                <label htmlFor="fan-name">Your name</label>
                <input
                  id="fan-name"
                  value={form.name}
                  onChange={change('name')}
                  autoComplete="name"
                  maxLength={80}
                  placeholder="Ama Boateng"
                  required
                />
              </div>
            ) : null}

            <div className="field">
              <label htmlFor="fan-email">Email</label>
              <input
                id="fan-email"
                type="email"
                value={form.email}
                onChange={change('email')}
                autoComplete="email"
                maxLength={160}
                placeholder="you@email.com"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="fan-password">Password</label>
              <input
                id="fan-password"
                type="password"
                value={form.password}
                onChange={change('password')}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                minLength={isRegister ? 8 : undefined}
                maxLength={128}
                placeholder="At least 8 characters"
                required
              />
            </div>

            {isRegister ? (
              <div className="field">
                <label htmlFor="fan-confirm">Confirm password</label>
                <input
                  id="fan-confirm"
                  type="password"
                  value={form.confirm}
                  onChange={change('confirm')}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  placeholder="Type it once more"
                  required
                />
                <div className="field__hint">Passwords are salted and hashed. No card details are stored here.</div>
              </div>
            ) : null}

            {error ? (
              <div className="alert alert--error">
                <Icon name="close" size={15} />
                <span>{error}</span>
              </div>
            ) : null}

            <button className="btn btn--gold btn--block btn--lg" disabled={busy}>
              <Icon name={isRegister ? 'sparkle' : 'lock'} size={16} />
              {busy ? 'One moment…' : isRegister ? 'Create my account' : 'Sign in'}
            </button>
          </form>

          <p className="field__hint fan-auth__foot">
            {isRegister ? 'Already have an account?' : 'New here?'}{' '}
            <button type="button" onClick={() => setAuthMode(isRegister ? 'login' : 'register')}>
              {isRegister ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
