import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { useSite } from '../context/SiteContext';
import { useSupport } from '../context/SupportContext';
import { api } from '../lib/api';
import { cedis } from '../lib/format';
import { MAX_SUPPORT_PESEWAS, supportMinimum, supportPresets } from '../lib/support';

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

export default function SupportModal() {
  const { open, track: presetTrack, video: presetVideo, amount: presetAmount, closeSupport } = useSupport();
  const { site } = useSite();
  const tracks = site?.tracks || [];
  const videos = site?.videos || [];
  const [step, setStep] = useState('form');
  const [trackId, setTrackId] = useState('');
  const [videoId, setVideoId] = useState('');
  const [amountInput, setAmountInput] = useState('1');
  const [method, setMethod] = useState('momo');
  const [provider, setProvider] = useState('mtn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);
  const [momo, setMomo] = useState(null);
  const dialogRef = useRef(null);

  const selectedTrack = useMemo(
    () => tracks.find((t) => t.id === trackId) || null,
    [tracks, trackId]
  );
  const selectedVideo = useMemo(
    () => videos.find((v) => v.id === videoId) || null,
    [videos, videoId]
  );
  const floor = supportMinimum(site?.minSupport);

  useEffect(() => {
    if (!open) return;
    setStep('form');
    setError('');
    setOrder(null);
    setMomo(null);
    setBusy(false);
    setTrackId(presetTrack?.id || '');
    setVideoId(presetVideo?.id || '');
    const requested = Number.isSafeInteger(presetAmount) ? presetAmount : floor;
    setAmountInput(String(Math.min(MAX_SUPPORT_PESEWAS, Math.max(floor, requested)) / 100));
    setMessage('');
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && closeSupport();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, presetTrack?.id, presetVideo?.id, presetAmount, floor, closeSupport]);

  // poll while waiting for a manual MoMo confirmation
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

  if (!open || !site) return null;

  const presets = supportPresets(floor);
  const numericAmount = Number(amountInput);
  const amount = amountInput.trim() && Number.isFinite(numericAmount) ? Math.round(numericAmount * 100) : NaN;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!Number.isSafeInteger(amount) || Math.abs(numericAmount * 100 - amount) > 0.000001 || amount < floor) {
      setError(`Enter an amount of at least ${cedis(floor)}, with up to two decimal places.`);
      return;
    }
    if (amount > MAX_SUPPORT_PESEWAS) {
      setError(`The maximum for one payment is ${cedis(MAX_SUPPORT_PESEWAS)}.`);
      return;
    }
    if (!anonymous && name.trim().length < 2) {
      setError('Add the name you want shown on the supporter wall, or choose to stay anonymous.');
      return;
    }
    if (method === 'card' && !email.trim()) {
      setError('A card receipt needs an email address.');
      return;
    }
    setBusy(true);
    try {
      const result = await api.createOrder({
        trackId: selectedTrack?.id || null,
        videoId: selectedVideo?.id || null,
        amount,
        method,
        provider,
        name,
        email,
        message,
        anonymous,
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

  const momoNumber = site.settings.momo?.[provider] || '';

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closeSupport()}>
      <div className="modal" ref={dialogRef} role="dialog" aria-modal="true" aria-label="Support Young Silence">
        {step === 'form' ? (
          <form onSubmit={submit}>
            <div className="modal__head">
              <div>
                <span className="eyebrow">Support the artist</span>
                <h3>{selectedVideo ? 'Support this video' : selectedTrack ? (selectedTrack.hasDownload ? 'Buy this record' : 'Support this release') : 'Fund the next release'}</h3>
                <p>Support from {cedis(floor)}. You can choose to give more.</p>
              </div>
              <button type="button" className="modal__close" onClick={closeSupport} aria-label="Close">
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="modal__body">
              {selectedTrack || selectedVideo ? (
                <div className="support-mini">
                  <img src={selectedTrack?.cover || selectedVideo?.thumb} alt="" />
                  <div>
                    <h4>{selectedTrack?.title || selectedVideo?.title}</h4>
                    <p>
                      {selectedTrack ? `${selectedTrack.genre} · ${selectedTrack.year}` : 'Video'} · from {cedis(floor)}
                    </p>
                    {selectedVideo || !selectedTrack.hasDownload ? <p>Support only — no download is included.</p> : null}
                  </div>
                  <button
                    type="button"
                    className="support-mini__change"
                    onClick={() => { setTrackId(''); setVideoId(''); }}
                    aria-label="Choose different art to support"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="field">
                  <label htmlFor="support-track">What are you supporting?</label>
                  <select
                    id="support-track"
                    value=""
                    onChange={(e) => {
                      const value = e.target.value;
                      setTrackId(value.startsWith('track:') ? value.slice(6) : '');
                      setVideoId(value.startsWith('video:') ? value.slice(6) : '');
                    }}
                  >
                    <option value="">General support — studio, videos, the next drop</option>
                    {tracks.length ? (
                      <optgroup label="Songs">
                        {tracks.map((t) => <option key={t.id} value={`track:${t.id}`}>{t.title}</option>)}
                      </optgroup>
                    ) : null}
                    {videos.length ? (
                      <optgroup label="Videos">
                        {videos.map((v) => <option key={v.id} value={`video:${v.id}`}>{v.title}</option>)}
                      </optgroup>
                    ) : null}
                  </select>
                </div>
              )}

              <div className="amounts">
                {presets.map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={amount === value ? 'is-active' : ''}
                    onClick={() => setAmountInput(String(value / 100))}
                  >
                    {cedis(value, { withSymbol: false })}
                  </button>
                ))}
              </div>

              <div className="field amount-input">
                <label htmlFor="support-amount">Your amount (GH₵)</label>
                <span>GH₵</span>
                <input
                  id="support-amount"
                  type="number"
                  min={floor / 100}
                  max={MAX_SUPPORT_PESEWAS / 100}
                  step="0.01"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  inputMode="decimal"
                  required
                />
                <div className="field__hint">
                  Artist-set minimum {cedis(floor)} · maximum per payment {cedis(MAX_SUPPORT_PESEWAS)}.
                </div>
              </div>

              <div className="methods">
                <button
                  type="button"
                  className={`method ${method === 'momo' ? 'is-active' : ''}`}
                  onClick={() => setMethod('momo')}
                >
                  <strong>Mobile Money</strong>
                  <span>MTN · Telecel · AirtelTigo</span>
                </button>
                <button
                  type="button"
                  className={`method ${method === 'card' ? 'is-active' : ''}`}
                  onClick={() => setMethod('card')}
                >
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

              {method === 'momo' && !site.settings.momo?.[provider] ? (
                <div className="alert alert--info">
                  <Icon name="wallet" size={16} />
                  <span>
                    This network number hasn’t been added yet. Pick another network or support with a card.
                  </span>
                </div>
              ) : null}

              <div className="field-row">
                <div className="field">
                  <label htmlFor="support-name">Name on the wall</label>
                  <input
                    id="support-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ama Boateng"
                    maxLength={80}
                    disabled={anonymous}
                  />
                </div>
                <div className="field">
                  <label htmlFor="support-email">Email (receipt)</label>
                  <input
                    id="support-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    maxLength={160}
                  />
                </div>
              </div>

              <label className="check">
                <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
                Show me as “Anonymous supporter”
              </label>

              <div className="field">
                <label htmlFor="support-message">Leave a message (optional)</label>
                <textarea
                  id="support-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What does this music mean to you?"
                  maxLength={280}
                />
                <div className="field__hint">{message.length}/280 · Messages appear on the supporter wall.</div>
              </div>

              {error ? (
                <div className="alert alert--error">
                  <Icon name="close" size={15} />
                  <span>{error}</span>
                </div>
              ) : null}

              <button className="btn btn--gold btn--block btn--lg" type="submit" disabled={busy}>
                {busy ? 'Starting checkout…' : `Support with ${cedis(amount)}`}
                {!busy ? <Icon name="arrow" size={17} /> : null}
              </button>
              <p className="field__hint" style={{ textAlign: 'center', marginTop: 12 }}>
                Secure checkout · Your details are only used for this support.
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
              <button className="modal__close" onClick={closeSupport} aria-label="Close">
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="modal__body pay">
              <div className="pay__label mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--muted)' }}>
                AMOUNT TO SEND
              </div>
              <div className="pay__amount">{cedis(order?.amount || amount)}</div>
              <div className="pay__caption">
                to {site.settings.momo?.name || site.settings.artistName} · reference {order?.reference}
              </div>

              <div className="pay__steps">
                <div className="pay__step">
                  <b>1</b>
                  <span>
                    Dial <strong style={{ color: 'var(--ivory)' }}>*170#</strong> (or your network’s USSD code) and
                    choose “Send Money”.
                  </span>
                </div>
                <div className="pay__step">
                  <b>2</b>
                  <span>
                    Send <strong style={{ color: 'var(--gold)' }}>{cedis(order?.amount || amount)}</strong> to{' '}
                    <strong style={{ color: 'var(--ivory)' }}>{momoNumber || 'the artist’s number'}</strong>.
                  </span>
                </div>
                <div className="pay__step">
                  <b>3</b>
                  <span>
                    Use <strong style={{ color: 'var(--gold)' }}>{order?.reference}</strong> as the reference/narration
                    so the artist can match your payment.
                  </span>
                </div>
              </div>

              {momoNumber ? <CopyRow label="Send to" value={momoNumber} /> : null}
              <CopyRow label="Reference" value={order?.reference || ''} />

              <div className="alert alert--info" style={{ marginTop: 18, textAlign: 'left' }}>
                <Icon name="clock" size={16} />
                <span>
                  Your support shows as <strong>awaiting confirmation</strong> until Young Silence checks his MoMo
                  wallet. Keep this page open — it updates by itself.
                </span>
              </div>

              <div className="pay__status">
                <span className="pulse" /> Waiting for confirmation · {order?.reference}
              </div>

              <div style={{ marginTop: 20 }}>
                <button className="btn btn--ghost btn--block" onClick={closeSupport}>
                  I’ve sent it — I’ll check my email
                </button>
              </div>
              <p className="field__hint" style={{ marginTop: 12 }}>
                Screenshot your MoMo receipt. If anything goes wrong, message the artist with your reference.
              </p>
            </div>
          </>
        ) : null}

        {step === 'paid' ? (
          <>
            <div className="modal__head">
              <div>
                <span className="eyebrow">Thank you</span>
                <h3>That landed. Medaase.</h3>
                <p>Reference {order?.reference}</p>
              </div>
              <button className="modal__close" onClick={closeSupport} aria-label="Close">
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="modal__body pay__done">
              <div className="success-ring">
                <Icon name="check" size={30} strokeWidth={2} />
              </div>
              <p style={{ color: 'var(--ivory-dim)', fontSize: 14.5, lineHeight: 1.7 }}>
                {cedis(order?.amount || amount)} received
                {order?.trackTitle ? ` for “${order.trackTitle}”` : ' as general support'}. Every cedi goes into the
                music.
              </p>

              {order?.downloadToken ? (
                <a
                  className="btn btn--gold btn--block btn--lg"
                  style={{ marginTop: 22 }}
                  href={`/api/download/${order.downloadToken}`}
                >
                  <Icon name="download" size={17} />
                  Download the record
                </a>
              ) : null}

              <div className="thanks__actions" style={{ marginTop: 14 }}>
                <Link to="/music" className="btn btn--ghost" onClick={closeSupport}>
                  Back to the music
                </Link>
                <button className="btn btn--ghost" onClick={closeSupport}>
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
