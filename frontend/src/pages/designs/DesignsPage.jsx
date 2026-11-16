import { useState } from "react";
import { Search, Plus, RefreshCw, Edit2, Trash2 } from "lucide-react";
import PageHead from "../../components/common/PageHead";
import Pagination from "../../components/common/Pagination";
import TableState from "../../components/common/TableState";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import SafeImage from "../../components/common/SafeImage";
import DesignForm from "../../components/forms/DesignForm";
import usePagedList from "../../hooks/usePagedList";
import useDebounce from "../../hooks/useDebounce";
import {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
} from "../../services/catalogService";
import { date } from "../../utils/formatters";

const EP = "/designs";

export default function DesignsPage({ notify }) {
  const [q, setQ] = useState("");
  const dq = useDebounce(q);
  const { items, meta, page, setPage, loading, error, reload } = usePagedList(
    (p) => listRecords(EP, { ...p, limit: 10 }),
    { q: dq },
  );
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const edit = async (d) => {
    try {
      setModal({ item: (await getRecord(EP, d._id)).data });
    } catch (e) {
      notify(e.message, "error");
    }
  };
  const save = async (payload) => {
    if (modal.item) await updateRecord(EP, modal.item._id, payload);
    else await createRecord(EP, payload);
    notify("Design saved");
    setModal(null);
    reload();
  };
  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn();
      notify(okMsg);
      setConfirm(null);
      reload();
    } catch (e) {
      notify(e.message, "error");
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead
        eyebrow="CATALOGUE"
        title="Designs"
        desc="Reference designs customers pick for custom stitching orders."
        action={
          <button className="primary-btn" onClick={() => setModal({})}>
            <Plus size={16} /> Add design
          </button>
        }
      />
      <div className="toolbar">
        <div className="searchbox">
          <Search size={16} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or reference code…"
          />
        </div>
        <button className="outline-btn" onClick={reload}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Design</th>
              <th>Reference</th>
              <th>Images</th>
              <th>Order</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <TableState
              loading={loading}
              error={error}
              empty={items.length === 0}
              colSpan={6}
              emptyText="No designs found."
              onRetry={reload}
            />
            {!loading &&
              !error &&
              items.map((d) => (
                <tr key={d._id}>
                  <td>
                    <div className="cell-flex">
                      <SafeImage src={d.images?.[0]?.url} />
                      <div>
                        <b>{d.name}</b>
                        <small className="cell-sub">
                          {d.category?.name} › {d.subCategory?.name}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="tag">{d.referenceCode}</span>
                  </td>
                  <td>{d.images?.length || 0}</td>
                  <td>{d.displayOrder}</td>
                  <td>{date(d.updatedAt)}</td>
                  <td>
                    <div className="row-actions">
                      <button title="Edit" onClick={() => edit(d)}>
                        <Edit2 size={15} />
                      </button>
                      <button
                        title="Delete"
                        onClick={() =>
                          setConfirm({
                            danger: true,
                            title: "Delete design?",
                            message: `"${d.name}" will be permanently deleted. Designs used by orders cannot be deleted.`,
                            label: "Delete",
                            run: () =>
                              run(
                                () => deleteRecord(EP, d._id),
                                "Design deleted",
                              ),
                          })
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Pagination meta={meta} page={page} onPage={setPage} />
      {modal && (
        <DesignForm
          design={modal.item}
          onClose={() => setModal(null)}
          onSubmit={save}
          notify={notify}
        />
      )}
      {confirm && (
        <ConfirmDialog
          danger={confirm.danger}
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.label}
          busy={busy}
          onConfirm={confirm.run}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}
