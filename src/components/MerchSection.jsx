import { Link } from 'react-router-dom';
import Icon from './Icon';
import { useSite } from '../context/SiteContext';
import { cedis, compact } from '../lib/format';

export default function MerchSection({ limit = 3, onOrder }) {
  const { site } = useSite();
  const products = (site.products || []).slice(0, limit);
  if (!products.length) return null;

  return (
    <section className="section section--line">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="eyebrow">Wear the silence</span>
            <h2>Merch</h2>
          </div>
          <Link to="/merch" className="link-arrow">
            Full store <Icon name="arrow" size={14} />
          </Link>
        </div>
        <div className="merch-grid">
          {products.map((product) => (
            <article key={product.id} className="product-card reveal">
              <div className="product-card__img">
                <img src={product.image} alt={product.title} loading="lazy" />
                {product.sold ? <span className="product-card__sold">{compact(product.sold)} sold</span> : null}
              </div>
              <div className="product-card__body">
                <h3>{product.title}</h3>
                <div className="product-card__foot">
                  <strong>{cedis(product.price)}</strong>
                  <button className="btn btn--ghost btn--sm" onClick={() => onOrder?.(product)}>
                    <Icon name="bag" size={14} /> Order
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
