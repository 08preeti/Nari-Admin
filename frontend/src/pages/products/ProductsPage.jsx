import { useState } from 'react';
import { Search, Plus, RefreshCw, Edit2, X, CheckCircle2, Trash2, Boxes, Star } from 'lucide-react';
import PageHead from '../../components/common/PageHead';
import Pagination from '../../components/common/Pagination';
import TableState from '../../components/common/TableState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StatusBadge from '../../components/common/StatusBadge';
import SafeImage from '../../components/common/SafeImage';
import Modal from '../../components/common/Modal';
import ProductForm from '../../components/forms/ProductForm';
import usePagedList from '../../hooks/usePagedList';
import useDebounce from '../../hooks/useDebounce';
import { listRecords, getRecord, createRecord, updateRecord, setRecordStatus, deleteRecord, adjustStock } from '../../services/catalogService';
import { money } from '../../utils/formatters';
import { sellingPrice, hasSale } from '../../utils/pricing';
import { STOCK_STATUS_LABELS, STOCK_STATUS_TONES } from '../../utils/constants';

const EP = '/products';

function StockModal({ product, onClose, onDone, notify }) {
  const hasV = product.variants?.length > 0;
  const [sku, setSku] = useState(hasV ? product.variants[0].sku : '');
  const [mode, setMode] = useState('delta');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const current = hasV ? product.variants.find((v) => v.sku === sku)?.stock : product.stock;
  async function save() {
    const n = Number(amount);
    if (amount === '' || !Number.isInteger(n)) return notify('Enter a whole number', 'error');
    setBusy(true);
    try { await adjustStock(product._id, { ...(hasV ? { sku } : {}), ...(mode === 'delta' ? { delta: n } : { newStock: n }), reason: reason || undefined }); notify('Stock updated'); onDone(); }
    catch (e) { notify(e.message, 'error'); } finally { setBusy(false); }
  }
  return <Modal title={`Adjust stock · ${product.name}`} onClose={onClose} footer={<><button className="outline-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Apply'}</button></>}>
    <div className="form-grid">
      {hasV && <div className="field full-field"><label>Variant</label><select value={sku} onChange={(e) => setSku(e.target.value)}>{product.variants.map((v) => <option key={v._id} value={v.sku}>{v.sku} · {v.color?.name || ''} {v.size || ''} (stock {v.stock})</option>)}</select></div>}
      <div className="field"><label>Method</label><select value={mode} onChange={(e) => setMode(e.target.value)}><option value="delta">Add / remove units</option><option value="set">Set exact quantity</option></select></div>
      <div className="field"><label>{mode === 'delta' ? 'Units (negative removes)' : 'New quantity'}</label><input type="number" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      <div className="field full-field"><label>Reason</label><input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="Restock, damaged, stock count…" /></div>
      <small className="hint full-field">Current stock: {current ?? '—'}. Stock can never go below zero.</small>
    </div>
  </Modal>;
}

export default function ProductsPage({ notify }) {
  const [q, setQ] = useState(''); const [active, setActive] = useState(''); const [stock, setStock] = useState(''); const [sort, setSort] = useState('newest');
  const dq = useDebounce(q);
  const { items, meta, page, setPage, loading, error, reload } = usePagedList((p) => listRecords(EP, { ...p, limit: 10 }), { q: dq, isActive: active, stockStatus: stock, sort });
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [stockFor, setStockFor] = useState(null);
  const [busy, setBusy] = useState(false);

  const open = async (p) => { try { setModal({ item: p ? (await getRecord(EP, p._id)).data : undefined }); } catch (e) { notify(e.message, 'error'); } };
  const save = async (payload) => {
    if (modal.item) await updateRecord(EP, modal.item._id, payload); else await createRecord(EP, payload);
    notify('Product saved'); setModal(null); reload();
  };
  const run = async (fn, okMsg) => { setBusy(true); try { await fn(); notify(okMsg); setConfirm(null); reload(); } catch (e) { notify(e.message, 'error'); setConfirm(null); } finally { setBusy(false); } };

  return <>
    <PageHead eyebrow="CATALOGUE" title="Products" desc="Readymade products with sizes, colors, variants, pricing and stock." action={<button className="primary-btn" onClick={() => open()}><Plus size={16} /> Add product</button>} />
    <div className="toolbar wrap">
      <div className="searchbox"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, SKU, variant SKU, tag…" /></div>
      <select className="filter-select" value={active} onChange={(e) => setActive(e.target.value)}><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select>
      <select className="filter-select" value={stock} onChange={(e) => setStock(e.target.value)}><option value="">All stock levels</option><option value="in_stock">In stock</option><option value="low_stock">Low stock</option><option value="out_of_stock">Out of stock</option></select>
      <select className="filter-select" value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="name">Name A–Z</option><option value="priceAsc">Price low–high</option><option value="priceDesc">Price high–low</option></select>
      <button className="outline-btn" onClick={reload}><RefreshCw size={15} /> Refresh</button>
    </div>
    <div className="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Price</th><th>Variants</th><th>Stock</th><th>Status</th><th></th></tr></thead><tbody>
      <TableState loading={loading} error={error} empty={items.length === 0} colSpan={7} emptyText="No products found. Add your first product." onRetry={reload} />
      {!loading && !error && items.map((p) => {
        const activeVariants = p.variants?.filter((v) => v.isActive).length || 0;
        return <tr key={p._id}>
          <td><div className="cell-flex"><SafeImage src={p.images?.[0]?.url} /><div><b>{p.name} {p.isFeatured && <Star size={11} className="star" />}</b><small className="cell-sub">{p.category?.name} › {p.subCategory?.name}</small></div></div></td>
          <td><span className="tag">{p.sku || '—'}</span></td>
          <td>{money(sellingPrice(p.price, p.salePrice))}{hasSale(p.price, p.salePrice) && <small className="cell-sub"><s>{money(p.price)}</s> · {p.discountPercent}% off</small>}</td>
          <td>{p.variants?.length ? `${activeVariants} active / ${p.variants.length}` : <small className="hint">Simple</small>}</td>
          <td>{p.totalStock === null ? <small className="hint">Not tracked</small> : <>{p.totalStock} <StatusBadge label={STOCK_STATUS_LABELS[p.stockStatus]} tone={STOCK_STATUS_TONES[p.stockStatus]} /></>}</td>
          <td><StatusBadge status={p.isActive ? 'Active' : 'Inactive'} /></td>
          <td><div className="row-actions">
            <button title="Edit" onClick={() => open(p)}><Edit2 size={15} /></button>
            <button title="Adjust stock" disabled={!p.variants?.length && p.totalStock === null} onClick={() => setStockFor(p)}><Boxes size={15} /></button>
            <button title={p.isActive ? 'Deactivate' : 'Activate'} onClick={() => setConfirm({ title: p.isActive ? 'Deactivate product?' : 'Activate product?', message: p.isActive ? 'Customers will no longer see or order this product.' : 'The product becomes visible and orderable.', label: p.isActive ? 'Deactivate' : 'Activate', run: () => run(() => setRecordStatus(EP, p._id, !p.isActive), 'Product updated') })}>{p.isActive ? <X size={15} /> : <CheckCircle2 size={15} />}</button>
            <button title="Delete" onClick={() => setConfirm({ danger: true, title: 'Delete product?', message: `"${p.name}" and its variants will be permanently deleted. Products that appear in orders cannot be deleted: deactivate them instead.`, label: 'Delete', run: () => run(() => deleteRecord(EP, p._id), 'Product deleted') })}><Trash2 size={15} /></button>
          </div></td></tr>;
      })}
    </tbody></table></div>
    <Pagination meta={meta} page={page} onPage={setPage} />
    {modal && <ProductForm product={modal.item} onClose={() => setModal(null)} onSubmit={save} notify={notify} />}
    {stockFor && <StockModal product={stockFor} notify={notify} onClose={() => setStockFor(null)} onDone={() => { setStockFor(null); reload(); }} />}
    {confirm && <ConfirmDialog danger={confirm.danger} title={confirm.title} message={confirm.message} confirmLabel={confirm.label} busy={busy} onConfirm={confirm.run} onCancel={() => setConfirm(null)} />}
  </>;
}
