import { useEffect, useMemo, useState } from "react";
import Modal from "../common/Modal";
import SafeImage from "../common/SafeImage";
import { assetUrl } from "../../services/api";

const MAX_IMAGE_KB = 250;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const parentLabel = (p) =>
  (p.mainCategory?.name ? `${p.mainCategory.name} › ${p.name}` : p.name) +
  (p.isActive === false ? " (inactive)" : "");

const initial = (config, item) => {
  const v = { isActive: item ? item.isActive !== false : true };
  config.fields.forEach(([key, , kind]) => {
    if (kind === "file")
      v[key] = null; // newly chosen File; the saved image is shown from the record
    else if (kind === "parent") v[key] = item?.[key]?._id || item?.[key] || "";
    else if (kind === "select") v[key] = item?.[key] || "readymade";
    else
      v[key] =
        item?.[key] ?? (kind === "number" && key === "displayOrder" ? 0 : "");
  });
  return v;
};

export default function CatalogEditor({
  config,
  modal,
  parents,
  onClose,
  onSave,
}) {
  const editing = !!modal.item;
  // modal.fixed = values the page decides in advance (e.g. the name of a catalogue section); those inputs are read-only.
  const [values, setValues] = useState(() => ({
    ...initial(config, modal.item),
    ...(modal.fixed || {}),
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const savedImage = modal.item?.image?.url || "";
  const fileKey = config.fields.find((f) => f[2] === "file")?.[0];
  const preview = useMemo(
    () =>
      fileKey && values[fileKey] ? URL.createObjectURL(values[fileKey]) : "",
    [fileKey, values],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const set = (k, v) => setValues((o) => ({ ...o, [k]: v }));

  const errors = useMemo(() => {
    const e = {};
    config.fields.forEach(([k, label, kind]) => {
      const v = values[k];
      if (["name"].includes(k) && !String(v).trim())
        e[k] = `${label} is required`;
      if (kind === "parent" && !v) e[k] = `Select a ${label.toLowerCase()}`;
      if (kind === "file") {
        if (v && !IMAGE_TYPES.includes(v.type))
          e[k] = "Choose a JPG, PNG, WEBP or GIF image";
        else if (v && v.size > MAX_IMAGE_KB * 1024)
          e[k] = `Image size is too large. Maximum allowed size is ${MAX_IMAGE_KB} KB.`;
      }
      if (
        kind === "number" &&
        v !== "" &&
        (Number.isNaN(Number(v)) || Number(v) < 0)
      )
        e[k] = "Must be 0 or more";
    });
    return e;
  }, [values, config]);
  // File errors (type/size) show right away; other fields only after the first submit.
  const shown = submitted
    ? errors
    : Object.fromEntries(
        config.fields
          .filter(([k, , kind]) => kind === "file" && errors[k])
          .map(([k]) => [k, errors[k]]),
      );

  async function submit(ev) {
    ev.preventDefault();
    setSubmitted(true);
    setError("");
    if (Object.keys(errors).length) return;
    const payload = {};
    config.fields.forEach(([k, , kind]) => {
      if (kind === "file") {
        if (values[k]) payload[k] = values[k];
        return;
      }
      if (kind === "number") {
        if (values[k] !== "") payload[k] = Number(values[k]);
      } else
        payload[k] =
          typeof values[k] === "string" ? values[k].trim() : values[k];
    });
    // Files go as multipart form data; everything else as JSON.
    let body = payload;
    if (config.fields.some((f) => f[2] === "file")) {
      body = new FormData();
      Object.entries(payload).forEach(([k, v]) => body.append(k, v));
    }
    setBusy(true);
    try {
      await onSave(body);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      locked
      eyebrow={editing ? "UPDATE RECORD" : "NEW RECORD"}
      title={
        modal.title ||
        `${editing ? "Edit" : "Add"} ${config.title.replace(/ories$/, "ory").replace(/s$/, "")}`
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" className="outline-btn" onClick={onClose}>
            Cancel
          </button>
          <button form="catalog-form" className="primary-btn" disabled={busy}>
            {busy ? "Saving…" : "Save record"}
          </button>
        </>
      }
    >
      <form id="catalog-form" onSubmit={submit}>
        {error && <div className="error banner">{error}</div>}
        <div className="form-grid">
          {config.fields.map(([key, label, kind, extra]) => (
            <div
              className={kind === "textarea" ? "field full-field" : "field"}
              key={key}
            >
              <label>
                {label}
                {["name", "parent"].includes(kind) || key === "name"
                  ? " *"
                  : ""}
              </label>
              {kind === "textarea" ? (
                <textarea
                  rows="3"
                  value={values[key]}
                  onChange={(e) => set(key, e.target.value)}
                />
              ) : kind === "file" ? (
                <input
                  type="file"
                  accept={IMAGE_TYPES.join(",")}
                  className={shown[key] ? "invalid" : ""}
                  onChange={(e) => set(key, e.target.files?.[0] || null)}
                />
              ) : kind === "select" ? (
                <select
                  value={values[key]}
                  disabled={editing}
                  onChange={(e) => set(key, e.target.value)}
                >
                  {extra.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              ) : kind === "parent" ? (
                <select
                  value={values[key]}
                  className={shown[key] ? "invalid" : ""}
                  onChange={(e) => set(key, e.target.value)}
                >
                  <option value="">Select {label.toLowerCase()}</option>
                  {(parents[extra] || []).map((p) => (
                    <option key={p._id} value={p._id}>
                      {parentLabel(p)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={kind === "number" ? "number" : "text"}
                  min={kind === "number" ? "0" : undefined}
                  value={values[key]}
                  readOnly={!!modal.fixed?.[key]}
                  className={
                    shown[key] ? "invalid" : modal.fixed?.[key] ? "locked" : ""
                  }
                  onChange={(e) => set(key, e.target.value)}
                />
              )}
              {modal.fixed?.[key] && (
                <small className="hint">
                  Set by this catalogue, you only need to add the image.
                </small>
              )}
              {kind === "parent" && !(parents[extra] || []).length && (
                <small className="hint">
                  No main category found. Add one in Main category first.
                </small>
              )}
              {kind === "select" && editing && (
                <small className="hint">
                  The module type cannot be changed.
                </small>
              )}
              {kind === "file" && (preview || savedImage) && (
                <SafeImage src={preview || assetUrl(savedImage)} size={64} />
              )}
              {kind === "file" && (
                <small className="hint">
                  {editing && savedImage
                    ? "Choose a new file only if you want to replace the current image. "
                    : ""}
                  JPG, PNG, WEBP or GIF, up to {MAX_IMAGE_KB} KB.
                </small>
              )}
              {shown[key] && (
                <small className="field-error">{shown[key]}</small>
              )}
            </div>
          ))}
        </div>
      </form>
    </Modal>
  );
}