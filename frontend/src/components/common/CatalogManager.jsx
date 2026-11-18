import { useEffect, useState } from "react";
import { Search, Plus, RefreshCw, Edit2, Trash2 } from "lucide-react";
import PageHead from "./PageHead";
import Pagination from "./Pagination";
import TableState from "./TableState";
import ConfirmDialog from "./ConfirmDialog";
import SafeImage from "./SafeImage";
import CatalogEditor from "../forms/CatalogEditor";
import usePagedList from "../../hooks/usePagedList";
import useDebounce from "../../hooks/useDebounce";
import {
  listRecords,
  createRecord,
  updateRecord,
  deleteRecord,
} from "../../services/catalogService";
import { date } from "../../utils/formatters";
import { assetUrl } from "../../services/api";

export default function CatalogManager({ type, config, notify, heading }) {
  const [q, setQ] = useState("");
  const dq = useDebounce(q);
  const { items, meta, page, setPage, loading, error, reload } = usePagedList(
    (p) => listRecords(config.endpoint, { ...p, limit: 10 }),
    { q: dq },
    [type],
  );
  const [modal, setModal] = useState(null);
  const [parents, setParents] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const endpoints = [
      ...new Set(
        config.fields.filter((f) => f[2] === "parent").map((f) => f[3]),
      ),
    ];
    Promise.all(
      endpoints.map(async (ep) => [
        ep,
        (await listRecords(ep, { limit: 100 })).data || [],
      ]),
    )
      .then((rows) => setParents(Object.fromEntries(rows)))
      .catch((e) => notify(e.message, "error"));
  }, [type, items.length]);

  async function save(payload) {
    if (modal.item)
      await updateRecord(config.endpoint, modal.item._id, payload);
    else await createRecord(config.endpoint, payload);
    notify(`${config.title} saved`);
    setModal(null);
    reload();
  }
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
  const parentName = (i) => i.mainCategory?.name || i.category?.name || "—";
  const hasImage = config.fields.some((f) => f[2] === "file");
  const showParent = !!config.parentKey;
  const showOrder = !config.simple;
  const cols = 2 + (showParent ? 1 : 0) + (showOrder ? 1 : 0);
  const addLabel = config.addLabel || "Add new";
  const addButton = (
    <button className="primary-btn" onClick={() => setModal({})}>
      <Plus size={16} /> {addLabel}
    </button>
  );

  return (
    <>
      {heading ? (
        <div className="page-head">
          <div>
            <h1>{heading}</h1>
          </div>
          {addButton}
        </div>
      ) : (
        <PageHead
          eyebrow="CATALOGUE"
          title={config.title}
          desc={`Create, update and control ${config.title.toLowerCase()} in the store.`}
          action={addButton}
        />
      )}
      <div className="toolbar">
        <div className="searchbox">
          <Search size={16} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${heading ? heading.toLowerCase() : config.title.toLowerCase()}…`}
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
              <th>Name</th>
              {showParent && (
                <th>{type === "categories" ? "Main category" : "Parent"}</th>
              )}
              {showOrder && <th>Order</th>}
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <TableState
              loading={loading}
              error={error}
              empty={items.length === 0}
              colSpan={cols}
              emptyText="No records found. Add your first record."
              onRetry={reload}
            />
            {!loading &&
              !error &&
              items.map((item) => (
                <tr key={item._id}>
                  <td>
                    <div className="cell-flex">
                      {hasImage && (
                        <SafeImage src={assetUrl(item.image?.url)} size={36} />
                      )}
                      <div>
                        <b>{item.name}</b>
                        {showOrder && (
                          <small className="cell-sub">
                            {item.description || "—"}
                          </small>
                        )}
                      </div>
                    </div>
                  </td>
                  {showParent && <td>{parentName(item)}</td>}
                  {showOrder && <td>{item.displayOrder}</td>}
                  <td>{date(item.updatedAt)}</td>
                  <td>
                    <div className="row-actions">
                      <button title="Edit" onClick={() => setModal({ item })}>
                        <Edit2 size={15} />
                      </button>
                      <button
                        title="Delete"
                        onClick={() =>
                          setConfirm({
                            danger: true,
                            title: "Delete record?",
                            message: `"${item.name}" will be permanently deleted${type === "main-categories" ? ", together with all its categories and subcategories" : type === "categories" ? ", together with all its subcategories" : ""}. It cannot be deleted while products or designs still use it.`,
                            label: "Delete",
                            run: () =>
                              run(
                                () => deleteRecord(config.endpoint, item._id),
                                "Record deleted",
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
        <CatalogEditor
          config={config}
          modal={modal}
          parents={parents}
          onClose={() => setModal(null)}
          onSave={save}
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
