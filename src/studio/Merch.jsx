import { useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { api } from '../lib/api';
import { cedis, longDate, relativeTime } from '../lib/format';

const blank = { title: '', description: '', price: 20, sizes: 'S, M, L, XL', published: true };
const METHOD_LABEL = { mtn: 'MTN MoMo', telecel: 'Telecel Cash', at: 'AirtelTigo', card: 'Card' };

export default function Merch({ data, refresh, toast }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [image, setImage] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [view, setView] = useState('products');
  const [query, setQuery] = useState('');

  const reset = () => {
    setForm(blank);
    setImage(null);
    setEditing(null);
    setProgress(0);
    setError('');
  };

  const startEdit = (product) => {
    setEditing(product.id);
    setForm({
      title: product.title,
      description: product.description || '',
      price: Math.round(product.price / 100),
      sizes: (product.sizes || []).join(', '),
      published: product.published !== false,
    });
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (editing) {
        await api.updateProduct(editing, {
          title: form.title,
          description: form.description,
          price: Math.round(Number(form.price) * 100),
          sizes: form.sizes,
          published: form.published,
        });
        toast('Product updated');
      } else {
        if (!image) {
          setError('Add a product photo.');
          setBusy(false);
          return;
        }
        const payload = new FormData();
        Object.entries(form).forEach(([k, v]) => payload.append(k, String(v)));
        payload.append('price', String(Math.round(Number(form.price) * 100)));
        payload.append('product', image);
        await api.createProduct(payload, setProgress);
        toast('Product added to the store');
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

  const toggle = async (product) => {
    try {
      await api.updateProduct(product.id, { published: product.published === false });
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const remove = async (product) => {
    if (!window.confirm(`Delete “${product.title}” from the store?`)) return;
    try {
      await api.deleteProduct(product.id);
      toast('Product deleted');
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const replaceImage = async (product, file) => {
    if (!file) return;
    const payload = new FormData();
    payload.append('product', file);
    try {
      await api.replaceProductImage(product.id, payload);
      toast('Photo updated');
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const setOrderStatus = async (order, status) => {
    try {
      await api.updateMerchOrder(order.id, status);
      toast(status === 'paid' ? `Confirmed — ${cedis(order.amount)} from ${order.supporterName}` : status === 'cancelled' ? 'Order cancelled' : 'Moved back to pending');
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const deleteOrder = async (order) => {
    if (!window.confirm(`Delete merch order ${order.reference}?`)) return;
    try {
      await api.deleteMerchOrder(order.id);
      toast('Order deleted');
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.merchOrders.filter((o) => {
      if (!q) return true;
      return (
        o.reference.toLowerCase().includes(q) ||
        o.supporterName.toLowerCase().includes(q) ||
        (o.email || '').toLowerCase().includes(q) ||
        (o.phone || '').toLowerCase().includes(q) ||
        o.items.some((i) => i.title.toLowerCase().includes(q))
      );
    });
  }, [data.merchOrders, query]);

  const pendingMerch = data.merchOrders.filter((o) => o.status === 'pending').length;

  return (
    <>
      <div className="studio__top">
        <div>
          <h1>Merch</h1>
          <p>{data.products.length} products · {data.merchStats.orders} confirmed orders · {cedis(data.merchStats.revenue)} sold. Confirm MoMo orders once the money lands.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn ${view === 'products' ? 'btn--gold' : 'btn--ghost'} btn--sm`} onClick={() => setView('products')}>
            <Icon name="bag" size={14} /> Products
          </button>
          <button className={`btn ${view === 'orders' ? 'btn--gold' : 'btn--ghost'} btn--sm`} onClick={() => setView('orders')}>
            <Icon name="wallet" size={14} /> Orders{pendingMerch ? ` (${pendingMerch})` : ''}
          </button>
        </div>
      </div>

      {view === 'products' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button className="btn btn--gold" onClick={() => (setShowForm((v) => !v), reset())}>
              <Icon name={showForm ? 'close' : 'plus'} size={16} />
              {showForm ? 'Cancel' : 'Add product'}
            </button>
          </div>

          {showForm ? (
            <form className="panel" onSubmit={submit}>
              <div className="panel__head">
                <div>
                  <h3>{editing ? 'Edit product' : 'New product'}</h3>
                  <p>Prices are in cedis. Leave sizes empty for one-size items.</p>
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="p-title">Product name *</label>
                  <input id="p-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="YS Signature Tee" />
                </div>
                <div className="field">
                  <label htmlFor="p-price">Price (GH₵) *</label>
                  <input id="p-price" type="number" min="1" step="1" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
              </div>

              <div className="field">
                <label htmlFor="p-sizes">Sizes (comma separated)</label>
                <input id="p-sizes" value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} placeholder="S, M, L, XL — or blank for one size" />
              </div>

              <div className="field">
                <label htmlFor="p-desc">Description</label>
                <textarea id="p-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Fabric, fit, the story behind the piece…" />
              </div>

              {!editing ? (
                <label className="upload-drop">
                  <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} />
                  <Icon name="image" size={20} style={{ margin: '0 auto 8px' }} />
                  <strong>{image ? 'Photo ready' : 'Product photo *'}</strong>
                  {image ? <span className="file-name">{image.name}</span> : <span>Square image works best (JPG/PNG)</span>}
                </label>
              ) : null}

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

              {busy && !editing && image ? (
                <div style={{ marginTop: 18 }}>
                  <div className="goal__bar">
                    <i style={{ width: `${progress}%`, transition: 'width 0.2s' }} />
                  </div>
                  <div className="field__hint">Uploading… {progress}%</div>
                </div>
              ) : null}

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button className="btn btn--gold" disabled={busy}>
                  {busy ? 'Saving…' : editing ? 'Save changes' : 'Add product'}
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
                <h3>Catalogue</h3>
                <p>Toggle what’s public, swap photos or delete.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Sizes</th>
                    <th>Sold</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <img className="table__cover" src={product.image} alt="" />
                          <div style={{ minWidth: 0 }}>
                            <strong>{product.title}</strong>
                            <div className="sub">{product.description?.slice(0, 60) || 'No description'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{cedis(product.price)}</strong>
                      </td>
                      <td className="muted">{product.sizes?.length ? product.sizes.join(' · ') : 'One size'}</td>
                      <td>{product.sold || 0}</td>
                      <td>
                        <button
                          className={`badge-status ${product.published === false ? 'badge-status--draft' : 'badge-status--paid'}`}
                          onClick={() => toggle(product)}
                        >
                          {product.published === false ? 'Draft' : 'Live'}
                        </button>
                      </td>
                      <td>
                        <div className="table__actions">
                          <button className="icon-btn icon-btn--sm" onClick={() => startEdit(product)} title="Edit">
                            <Icon name="edit" size={14} />
                          </button>
                          <label className="icon-btn icon-btn--sm" htmlFor={`pimg-${product.id}`} title="Replace photo">
                            <Icon name="image" size={14} />
                          </label>
                          <input
                            id={`pimg-${product.id}`}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) replaceImage(product, file);
                              e.target.value = '';
                            }}
                          />
                          <button className="icon-btn icon-btn--sm" onClick={() => remove(product)} title="Delete">
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.products.length ? <div className="empty">No products yet. Add your first piece above.</div> : null}
          </div>
        </>
      ) : (
        <div className="panel">
          <div className="panel__head">
            <div>
              <h3>Merch orders</h3>
              <p>Confirm Mobile Money once it lands. Card orders confirm themselves.</p>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reference, name, phone…"
              style={{ background: '#0a0b0c', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '9px 12px', fontSize: 12.5, minWidth: 240 }}
            />
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>When</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <strong>{o.supporterName}</strong>
                      <div className="sub mono" style={{ color: 'var(--gold)' }}>{o.reference}</div>
                      <div className="sub">{o.phone}{o.email ? ` · ${o.email}` : ''}</div>
                      {o.location ? <div className="sub">→ {o.location}</div> : null}
                    </td>
                    <td>
                      {o.items.map((i, idx) => (
                        <div key={idx} className="sub" style={{ color: 'var(--ivory-dim)' }}>
                          {i.title}
                          {i.size ? ` (${i.size})` : ''} ×{i.qty}
                        </div>
                      ))}
                    </td>
                    <td>
                      <strong>{cedis(o.amount)}</strong>
                    </td>
                    <td className="muted">{METHOD_LABEL[o.provider] || o.method}</td>
                    <td>
                      <span className={`badge-status badge-status--${o.status}`}>{o.status}</span>
                      {o.demo ? <div className="sub" style={{ fontSize: 10 }}>sandbox</div> : null}
                    </td>
                    <td className="muted" title={longDate(o.createdAt)}>
                      {relativeTime(o.createdAt)}
                    </td>
                    <td>
                      <div className="table__actions">
                        {o.status !== 'paid' ? (
                          <button className="btn btn--gold btn--sm" onClick={() => setOrderStatus(o, 'paid')}>
                            <Icon name="check" size={12} /> Confirm
                          </button>
                        ) : (
                          <button className="btn btn--ghost btn--sm" onClick={() => setOrderStatus(o, 'pending')}>
                            Undo
                          </button>
                        )}
                        {o.status === 'pending' ? (
                          <button className="btn btn--ghost btn--sm" onClick={() => setOrderStatus(o, 'cancelled')}>
                            Cancel
                          </button>
                        ) : null}
                        <button className="icon-btn icon-btn--sm" onClick={() => deleteOrder(o)} title="Delete">
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filteredOrders.length ? <div className="empty">No merch orders match this view.</div> : null}
        </div>
      )}
    </>
  );
}
