import { useState } from 'react';
import Icon from '../components/Icon';
import MerchModal from '../components/MerchModal';
import useReveal from '../hooks/useReveal';
import { useSite } from '../context/SiteContext';
import { cedis, compact } from '../lib/format';

export default function Merch() {
  const { site } = useSite();
  const products = site.products || [];
  const [active, setActive] = useState(null);
  useReveal(products);

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Official merch · {products.length} pieces</span>
          <h1>Merch store</h1>
          <p>
            Wear the silence. Every piece is printed in Accra in small runs, and every cedi goes back into the next
            record and the next show. Mobile Money or card — delivery arranged by phone.
          </p>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          {products.length ? (
            <div className="merch-grid">
              {products.map((product) => (
                <article key={product.id} className="product-card reveal">
                  <div className="product-card__img">
                    <img src={product.image} alt={product.title} loading="lazy" />
                    {product.sold ? <span className="product-card__sold">{compact(product.sold)} sold</span> : null}
                  </div>
                  <div className="product-card__body">
                    <h3>{product.title}</h3>
                    <p>{product.description}</p>
                    {product.sizes.length ? (
                      <div className="product-card__sizes">
                        {product.sizes.map((s) => (
                          <span key={s} className="chip">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="product-card__sizes">
                        <span className="chip">One size</span>
                      </div>
                    )}
                    <div className="product-card__foot">
                      <strong>{cedis(product.price)}</strong>
                      <button className="btn btn--gold btn--sm" onClick={() => setActive(product)}>
                        <Icon name="bag" size={14} /> Order
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">The store is being restocked. Check back soon — or join the list in the footer.</div>
          )}

          <div className="alert alert--info" style={{ marginTop: 34 }}>
            <Icon name="wallet" size={16} />
            <span>
              Orders are confirmed manually for Mobile Money, so allow a little time. Need a bulk order for a crew or
              event? Email <strong>{site.settings.contactEmail}</strong>.
            </span>
          </div>
        </div>
      </section>

      {active ? <MerchModal product={active} onClose={() => setActive(null)} /> : null}
    </>
  );
}
