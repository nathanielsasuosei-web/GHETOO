import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { useSite } from '../context/SiteContext';
import { api } from '../lib/api';
import { cedis } from '../lib/format';

const NETWORKS = [
  { id: 'mtn', label: 'MTN MoMo', color: '#FFCC00' },
  { id: 'telecel', label: 'Telecel', color: '#E60000' },
  { id: 'at', label: 'AirtelTigo', color: '#0066B3' },
];

function CopyRow({ label, value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="copy-row">
      <div>
        <div style={{ fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted-2)' }}>
          {label}
        </div>
        <code>{value}</code>
      </div>
      <button onClick={copy} aria-label={`Copy ${label}`}>
        <Icon name={copied ? 'check' : 'copy'} size={15} />
      </button>
    </div>
  );
}

export default function MerchModal({ product, onClose }) {
  const { site } = useSite();
  const [step, setStep] = useState('form');
  const [size, setSize] = useState(product?.sizes?.[0] || '');
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState('momo');
  const [provider, setProvider] = useState('mtn');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);
  const [momo, setMomo] = useState(null);

  const total = useMemo(() => (product ? product.price * qty : 0), [product, qty]);
  const momoNumber = site.settings.momo?.[provider] || '';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (step !== 'pending' || !order?.reference) return;
    let alive = true;
    const tick = async () => {
      try {
        const data = await api.order(order.reference);
        if (!alive) return;
        if (data.status === 'paid') {
          setOrder(data);
          setStep('paid');
        }
      } catch {
        /* keep waiting */
      }
    };
    const timer = setInterval(tick, 6000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [step, order?.reference]);

  if (!product) return null;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (product.sizes.length && !size) {
      setError('Pick a size first.');
      return;
    }
    if (name.trim().length < 2) {
      setError('Add the name for the delivery.');
      return;
    }
    if (phone.trim().length < 7) {
      setError('A working phone number is needed for delivery.');
      return;
    }
    if (method === 'card' && !email.trim()) {
      setError('A card receipt needs an email address.');
      return;
    }
    setBusy(true);
    try {
      const result = await api.createMerchOrder({
        items: [{ productId: product.id, size, qty }],
        method,
        provider,
        name,
        phone,
        email,
        location,
      });
      if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
        return;
      }
      setOrder(result.order || null);
      setMomo(result.momo || null);
      setStep(result.status === 'paid' ? 'paid' : 'pending');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={`Order ${product.title}`}>
        {step === 'form' ? (
          <form onSubmit={submit}>
            <div className="modal__head">
              <div>
                <span className="eyebrow">Merch store</span>
                <h3>{product.title}</h3>
                <p>{cedis(product.price)} each · sold {product.sold} times</p>
              </div>
              <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="modal__body">
              <div className="support-mini">
                <img src={product.image} alt="" />
                <div>
                  <h4>{product.title}</h4>
                  <p>{product.description}</p>
                </div>
              </div>

              {product.sizes.length ? (
                <div className="field">
                  <label>Size</label>
                  <div className="size-picker">
                    {product.sizes.map((s) => (
                      <button
                        type="button"
                        key={s}
                        className={size === s ? 'is-active' : ''}
                        onClick={() => setSize(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="field">
                <label>Quantity</label>
                <div className="qty-stepper">
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
                    <Icon name="minus" size={14} />
                  </button>
                  <strong>{qty}</strong>
                  <button type="button" onClick={() => setQty((q) => Math.min(5, q + 1))} aria-label="Increase quantity">
                    <Icon name="plus" size={14} />
                  </button>
                </div>
              </div>

              <div className="methods">
                <button type="button" className={`method ${method === 'momo' ? 'is-active' : ''}`} onClick={() => setMethod('momo')}>
                  <strong>Mobile Money</strong>
                  <span>MTN · Telecel · AirtelTigo</span>
                </button>
                <button type="button" className={`method ${method === 'card' ? 'is-active' : ''}`} onClick={() => setMethod('card')}>
                  <strong>Card</strong>
                  <span>Visa · Mastercard {site.paymentMode === 'sandbox' ? '· sandbox' : ''}</span>
                </button>
              </div>

              {method === 'momo' ? (
                <div className="networks">
                  {NETWORKS.map((n) => (
                    <button
                      type="button"
                      key={n.id}
                      className={`network ${provider === n.id ? 'is-active' : ''}`}
                      onClick={() => setProvider(n.id)}
                    >
                      <i style={{ background: n.color }} />
                      {n.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {method === 'momo' && !momoNumber ? (
                <div className="alert alert--info">
                  <Icon name="wallet" size={16} />
                  <span>This network number hasn’t been added yet. Pick another network or pay with a card.</span>
                </div>
              ) : null}

              <div className="field-row">
                <div className="field">
                  <label htmlFor="m-name">Full name *</label>
                  <input id="m-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ama Boateng" maxLength={80} />
                </div>
                <div className="field">
                  <label htmlFor="m-phone">Phone *</label>
                  <input id="m-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024 000 0000" maxLength={30} />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="m-email">Email (card receipt)</label>
                  <input id="m-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" maxLength={160} />
                </div>
                <div className="field">
                  <label htmlFor="m-location">Delivery location *</label>
                  <input id="m-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="East Legon, Accra" maxLength={200} />
                </div>
              </div>

              <div className="merch-total">
                <span>Total ({qty} item{qty > 1 ? 's' : ''})</span>
                <strong>{cedis(total)}</strong>
              </div>

              {error ? (
                <div className="alert alert--error">
                  <Icon name="close" size={15} />
                  <span>{error}</span>
                </div>
              ) : null}

              <button className="btn btn--gold btn--block btn--lg" type="submit" disabled={busy}>
                {busy ? 'Starting checkout…' : `Checkout · ${cedis(total)}`}
                {!busy ? <Icon name="arrow" size={17} /> : null}
              </button>
              <p className="field__hint" style={{ textAlign: 'center', marginTop: 12 }}>
                Delivery is arranged by phone after payment. Accra orders usually arrive within 3 days.
              </p>
            </div>
          </form>
        ) : null}

        {step === 'pending' ? (
          <>
            <div className="modal__head">
              <div>
                <span className="eyebrow">Almost there</span>
                <h3>Send it on {momo?.label || 'mobile money'}</h3>
              </div>
              <button className="modal__close" onClick={onClose} aria-label="Close">
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="modal__body pay">
              <div className="pay__label mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--muted)' }}>
                AMOUNT TO SEND
              </div>
              <div className="pay__amount">{cedis(order?.amount || total)}</div>
              <div className="pay__caption">
                {order?.items?.map((i) => `${i.title}${i.size ? ` (${i.size})` : ''} ×${i.qty}`).join(', ')}
              </div>

              <div className="pay__steps">
                <div className="pay__step">
                  <b>1</b>
                  <span>
                    Dial <strong style={{ color: 'var(--ivory)' }}>*170#</strong> (or your network’s USSD code) and choose “Send Money”.
                  </span>
                </div>
                <div className="pay__step">
                  <b>2</b>
                  <span>
                    Send <strong style={{ color: 'var(--gold)' }}>{cedis(order?.amount || total)}</strong> to{' '}
                    <strong style={{ color: 'var(--ivory)' }}>{momoNumber || 'the artist’s number'}</strong>.
                  </span>
                </div>
                <div className="pay__step">
                  <b>3</b>
                  <span>
                    Use <strong style={{ color: 'var(--gold)' }}>{order?.reference}</strong> as the reference so the order can be matched.
                  </span>
                </div>
              </div>

              {momoNumber ? <CopyRow label="Send to" value={momoNumber} /> : null}
              <CopyRow label="Reference" value={order?.reference || ''} />

              <div className="alert alert--info" style={{ marginTop: 18, textAlign: 'left' }}>
                <Icon name="clock" size={16} />
                <span>
                  Your order shows as <strong>awaiting confirmation</strong> until the payment is checked in the wallet. Keep this page open — it updates by itself.
                </span>
              </div>

              <div className="pay__status">
                <span className="pulse" /> Waiting for confirmation · {order?.reference}
              </div>

              <div style={{ marginTop: 20 }}>
                <button className="btn btn--ghost btn--block" onClick={onClose}>
                  I’ve sent it — I’ll wait for the call
                </button>
              </div>
            </div>
          </>
        ) : null}

        {step === 'paid' ? (
          <>
            <div className="modal__head">
              <div>
                <span className="eyebrow">Order confirmed</span>
                <h3>That landed. Medaase.</h3>
                <p>Reference {order?.reference}</p>
              </div>
              <button className="modal__close" onClick={onClose} aria-label="Close">
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="modal__body pay__done">
              <div className="success-ring">
                <Icon name="check" size={30} strokeWidth={2} />
              </div>
              <p style={{ color: 'var(--ivory-dim)', fontSize: 14.5, lineHeight: 1.7 }}>
                {cedis(order?.amount || total)} received for {order?.items?.map((i) => `${i.title}${i.size ? ` (${i.size})` : ''} ×${i.qty}`).join(', ')}.
                We’ll call {order?.phone || 'your number'} to arrange delivery.
              </p>
              <div className="thanks__actions" style={{ marginTop: 18 }}>
                <Link to="/merch" className="btn btn--ghost" onClick={onClose}>
                  Keep shopping
                </Link>
                <button className="btn btn--ghost" onClick={onClose}>
                  Close
                </button>
              </div>
              {order?.demo ? (
                <p className="field__hint" style={{ marginTop: 18 }}>
                  Sandbox payment — no money moved. Real card payments switch on when Paystack keys are added.
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
