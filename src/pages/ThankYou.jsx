import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import { api } from '../lib/api';
import { useSite } from '../context/SiteContext';
import { cedis } from '../lib/format';

export default function ThankYou() {
  const { site } = useSite();
  const [params] = useSearchParams();
  const reference = params.get('ref');
  const status = params.get('status');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(Boolean(reference));

  useEffect(() => {
    if (!reference) {
      setLoading(false);
      return;
    }
    let alive = true;
    const load = async () => {
      try {
        const data = await api.order(reference);
        if (alive) setOrder(data);
      } catch {
        /* ignore */
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const timer = setInterval(load, 7000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [reference]);

  const paid = order?.status === 'paid';
  const cancelled = status === 'failed';
  const isMerch = order?.kind === 'merch';
  const merchSummary = isMerch
    ? order.items?.map((i) => `${i.title}${i.size ? ` (${i.size})` : ''} ×${i.qty}`).join(', ')
    : '';

  return (
    <section className="thanks">
      <div className="container">
        <div className="thanks__card">
          <div
            className="success-ring"
            style={
              cancelled
                ? { background: 'rgba(207,74,51,0.12)', borderColor: 'rgba(207,74,51,0.4)', color: '#f0a08f' }
                : undefined
            }
          >
            <Icon name={cancelled ? 'close' : paid ? 'check' : 'clock'} size={30} strokeWidth={2} />
          </div>

          {cancelled ? (
            <>
              <span className="eyebrow">Payment incomplete</span>
              <h1>That one didn’t go through</h1>
              <p>
                No money left your account. You can try again with Mobile Money or a card — the music isn’t going
                anywhere.
              </p>
              <div className="thanks__actions">
                <Link to="/support" className="btn btn--gold">
                  Try again
                </Link>
                <Link to="/music" className="btn btn--ghost">
                  Back to the music
                </Link>
              </div>
            </>
          ) : paid ? (
            isMerch ? (
              <>
                <span className="eyebrow">Order confirmed</span>
                <h1>Your merch is on its way</h1>
                <p>
                  {cedis(order.amount)} received for {merchSummary}. We’ll call{' '}
                  {order.phone || 'your number'}
                  {order.location ? ` (${order.location})` : ''} to arrange delivery.
                </p>
                <div className="thanks__actions">
                  <Link to="/merch" className="btn btn--gold">
                    Back to the store
                  </Link>
                  <Link to="/music" className="btn btn--ghost">
                    Listen while you wait
                  </Link>
                </div>
              </>
            ) : (
              <>
                <span className="eyebrow">Medaase · Thank you</span>
                <h1>Your support landed</h1>
                <p>
                  {order.amount ? `${cedis(order.amount)} received` : 'Payment received'}
                  {order.trackTitle ? ` for “${order.trackTitle}”` : ''}. Your name is on the wall
                  {order.supporterName === 'Anonymous supporter' ? ' (privately)' : ''}.
                </p>
                {order.downloadToken ? (
                  <div className="thanks__download">
                    <img
                      src={site?.tracks.find((t) => t.id === order.trackId)?.cover || '/media/covers/placeholder.jpg'}
                      alt=""
                    />
                    <div>
                      <h4>{order.trackTitle}</h4>
                      <p>Your download is ready — keep it forever.</p>
                    </div>
                    <a
                      className="btn btn--gold btn--sm"
                      style={{ marginLeft: 'auto' }}
                      href={`/api/download/${order.downloadToken}`}
                    >
                      <Icon name="download" size={14} /> Download
                    </a>
                  </div>
                ) : null}
                <div className="thanks__actions">
                  <Link to="/music" className="btn btn--gold">
                    Keep listening
                  </Link>
                  <Link to="/support" className="btn btn--ghost">
                    See the wall
                  </Link>
                </div>
              </>
            )
          ) : (
            <>
              <span className="eyebrow">Almost there</span>
              <h1>{loading ? 'Checking your support…' : 'Awaiting confirmation'}</h1>
              <p>
                {reference ? (
                  <>
                    Reference <span className="mono" style={{ color: 'var(--gold)' }}>{reference}</span>.{' '}
                    {isMerch
                      ? `Mobile Money orders are confirmed once the payment shows in the wallet — then we call to arrange delivery of ${merchSummary}.`
                      : 'Mobile Money support is confirmed by the artist once the payment shows in his wallet.'}{' '}
                    This page updates on its own.
                  </>
                ) : (
                  'No payment reference was found. If you paid, message the artist with your MoMo receipt.'
                )}
              </p>
              <div className="thanks__actions">
                <Link to={isMerch ? '/merch' : '/music'} className="btn btn--ghost">
                  {isMerch ? 'Back to the store' : 'Back to the music'}
                </Link>
                <Link to="/support" className="btn btn--ghost">
                  Contact
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
