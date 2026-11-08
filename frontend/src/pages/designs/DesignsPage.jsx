import { useState } from 'react';
import { Search, Plus, RefreshCw, Edit2, X, CheckCircle2, Trash2 } from 'lucide-react';
import PageHead from '../../components/common/PageHead';
import Pagination from '../../components/common/Pagination';
import TableState from '../../components/common/TableState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StatusBadge from '../../components/common/StatusBadge';
import SafeImage from '../../components/common/SafeImage';
import DesignForm from '../../components/forms/DesignForm';
import usePagedList from '../../hooks/usePagedList';
import useDebounce from '../../hooks/useDebounce';
import { listRecords, getRecord, createRecord, updateRecord, setRecordStatus, deleteRecord } from '../../services/catalogService';
import { date } from '../../utils/formatters';

const EP = '/designs';

export default function DesignsPage({ notify }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState('');
  const dq = useDebounce(q);
  const { items, meta, page, setPage, loading, error, reload } = usePagedList((p) => listRecords(EP, { ...p, limit: 10 }), { q: dq, isActive: active });
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const edit = async (d) => { try { setModal({ item: (await getRecord(EP, d._id)).data }); } catch (e) { notify(e.message, 'error'); } };
  const save = async (payload) => {
    if (modal.item) await updateRecord(EP, modal.item._id, payload); else await createRecord(EP, payload);
    notify('Design saved'); setModal(null); reload();
  };
  const run = async (fn, okMsg) => { setBusy(true); try { await fn(); notify(okMsg); setConfirm(null); reload(); } catch (e) { notify(e.message, 'error'); setConfirm(null); } finally { setBusy(false); } };

  return <>
    <PageHead eyebrow="CATALOGUE" title="Designs" desc="Reference designs customers pick for custom stitching orders." action={<button className="primary-btn" onClick={() => setModal({})}><Plus size={16} /> Add design</button>} />
    <div className="toolbar">
      <div className="searchbox"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or reference code…" /></div>
      <select className="filter-select" value={active} onChange={(e) => setActive(e.target.value)}><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select>
      <button className="outline-btn" onClick={reload}><RefreshCw size={15} /> Refresh</button>
    </div>
    <div className="table-wrap"><table><thead><tr><th>Design</th><th>Reference</th><th>Images</th><th>Order</th><th>Status</th><th>Updated</th><th></th></tr></thead><tbody>
      <TableState loading={loading} error={error} empty={items.length === 0} colSpan={7} emptyText="No designs found." onRetry={reload} />
      {!loading && !error && items.map((d) => <tr key={d._id}>
        <td><div className="cell-flex"><SafeImage src={d.images?.[0]?.url} /><div><b>{d.name}</b><small className="cell-sub">{d.category?.name} › {d.subCategory?.name}</small></div></div></td>
        <td><span className="tag">{d.referenceCode}</span></td><td>{d.images?.length || 0}</td><td>{d.displayOrder}</td>
        <td><StatusBadge status={d.isActive ? 'Active' : 'Inactive'} /></td><td>{date(d.updatedAt)}</td>
        <td><div className="row-actions">
          <button title="Edit" onClick={() => edit(d)}><Edit2 size={15} /></button>
          <button title={d.isActive ? 'Deactivate' : 'Activate'} onClick={() => setConfirm({ title: d.isActive ? 'Deactivate design?' : 'Activate design?', message: d.isActive ? 'It can no longer be selected for new stitching orders.' : 'It will be available for new stitching orders.', label: d.isActive ? 'Deactivate' : 'Activate', run: () => run(() => setRecordStatus(EP, d._id, !d.isActive), 'Design updated') })}>{d.isActive ? <X size={15} /> : <CheckCircle2 size={15} />}</button>
          <button title="Delete" onClick={() => setConfirm({ danger: true, title: 'Delete design?', message: `"${d.name}" will be permanently deleted. Designs used by orders cannot be deleted.`, label: 'Delete', run: () => run(() => deleteRecord(EP, d._id), 'Design deleted') })}><Trash2 size={15} /></button>
        </div></td></tr>)}
    </tbody></table></div>
    <Pagination meta={meta} page={page} onPage={setPage} />
    {modal && <DesignForm design={modal.item} onClose={() => setModal(null)} onSubmit={save} notify={notify} />}
    {confirm && <ConfirmDialog danger={confirm.danger} title={confirm.title} message={confirm.message} confirmLabel={confirm.label} busy={busy} onConfirm={confirm.run} onCancel={() => setConfirm(null)} />}
  </>;
}
