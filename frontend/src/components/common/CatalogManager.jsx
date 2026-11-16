import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  RefreshCw,
  Edit2,
  X,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import PageHead from "./PageHead";
import Pagination from "./Pagination";
import TableState from "./TableState";
import ConfirmDialog from "./ConfirmDialog";
import StatusBadge from "./StatusBadge";
import SafeImage from "./SafeImage";
import CatalogEditor from "../forms/CatalogEditor";
import usePagedList from "../../hooks/usePagedList";
import useDebounce from "../../hooks/useDebounce";
import {
  listRecords,
  createRecord,
  updateRecord,
  setRecordStatus,
  deleteRecord,
} from "../../services/catalogService";
import { money, date } from "../../utils/formatters";
import { assetUrl } from "../../services/api";

// `moduleType` + `heading` turn this into one section of the Main categories page (Readymade / Stitching catalogue).
export default function CatalogManager({
  type,
  config,
  notify,
  moduleType,
  heading,
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState("");
  const dq = useDebounce(q);
  const { items, meta, page, setPage, loading, error, reload } = usePagedList(
    (p) => listRecords(config.endpoint, { ...p, limit: 10 }),
    { q: dq, isActive: active, ...(moduleType ? { moduleType } : {}) },
    [type, moduleType],
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
        (
          await listRecords(ep, {
            limit: 100,
            ...(moduleType && ep === "/main-categories" ? { moduleType } : {}),
          })
        ).data || [],
      ]),
    )
      .then((rows) => setParents(Object.fromEntries(rows)))
      .catch((e) => notify(e.message, "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, items.length]);

  async function save(payload) {
    if (modal.item)
      await updateRecord(config.endpoint, modal.item._id, payload);
    else {
      // New records created inside a catalogue section belong to that module (it cannot be changed later).
      if (moduleType && type === "main-categories") {
        if (payload instanceof FormData)
          payload.append("moduleType", moduleType);
        else payload.moduleType = moduleType;
      }
      await createRecord(config.endpoint, payload);
    }
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
  const showParent = !!config.parentKey; // categories / sub-categories show their parent
  const showOrder = !config.simple; // simple screens (name + image only) have no display order or description
  const cols =
    3 +
    (showParent ? 1 : 0) +
    (type === "sub-categories" ? 1 : 0) +
    (showOrder ? 1 : 0);
  const addLabel = config.addLabel || "Add new";
  // In a Readymade / Stitching section the name is the section itself (e.g. "readymade"), so the Add form opens with it filled in.
  const sectionModal =
    moduleType && type === "main-categories"
      ? {
          title: `Add ${moduleType.charAt(0).toUpperCase()}${moduleType.slice(1)} category`,
          fixed: { name: moduleType },
        }
      : {};
  const addButton = (
    <button className="primary-btn" onClick={() => setModal(sectionModal)}>
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
        <select
          className="filter-select"
          value={active}
          onChange={(e) => setActive(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
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
              {type === "sub-categories" && <th>Price</th>}
              {showOrder && <th>Order</th>}
              <th>Status</th>
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
              emptyText={
                moduleType
                  ? `No ${moduleType} categories yet. Click ${addLabel} to create one.`
                  : "No records found. Add your first record."
              }
              onRetry={reload}
            />
            {!loading &&
              !error &&
              items.map((item) => (
                <tr key={item._id}>
                  <td>
                    <div className="cell-flex">
                      <SafeImage src={assetUrl(item.image?.url)} size={36} />
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
                  {type === "sub-categories" && (
                    <td>{item.price != null ? money(item.price) : "—"}</td>
                  )}
                  {showOrder && <td>{item.displayOrder}</td>}
                  <td>
                    <StatusBadge
                      status={item.isActive ? "Active" : "Inactive"}
                    />
                  </td>
                  <td>{date(item.updatedAt)}</td>
                  <td>
                    <div className="row-actions">
                      <button title="Edit" onClick={() => setModal({ item })}>
                        <Edit2 size={15} />
                      </button>
                      <button
                        title={item.isActive ? "Deactivate" : "Activate"}
                        onClick={() =>
                          setConfirm({
                            title: item.isActive
                              ? "Deactivate record?"
                              : "Activate record?",
                            message: item.isActive
                              ? `"${item.name}" will be hidden from customers.`
                              : `"${item.name}" becomes visible again.`,
                            label: item.isActive ? "Deactivate" : "Activate",
                            run: () =>
                              run(
                                () =>
                                  setRecordStatus(
                                    config.endpoint,
                                    item._id,
                                    !item.isActive,
                                  ),
                                "Status updated",
                              ),
                          })
                        }
                      >
                        {item.isActive ? (
                          <X size={15} />
                        ) : (
                          <CheckCircle2 size={15} />
                        )}
                      </button>
                      <button
                        title="Delete"
                        onClick={() =>
                          setConfirm({
                            danger: true,
                            title: "Delete record?",
                            message: `"${item.name}" will be permanently deleted. Records that still have children or are used by products/designs cannot be deleted.`,
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
