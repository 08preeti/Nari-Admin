import { useEffect, useState } from "react";
import { listRecords } from "../../services/catalogService";

const label = (x) => (x.isActive === false ? `${x.name} (inactive)` : x.name);
const idOf = (x) => (x && typeof x === "object" ? x._id : x);

export default function CategorySelects({
  value,
  onChange,
  errors = {},
  disabled,
}) {
  const [mains, setMains] = useState([]);
  const [cats, setCats] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    listRecords("/main-categories")
      .then((r) => setMains(r.data || []))
      .catch((e) => setLoadError(e.message));
  }, []);
  useEffect(() => {
    listRecords(
      "/categories",
      value.mainCategory ? { mainCategory: value.mainCategory } : {},
    )
      .then((r) => setCats(r.data || []))
      .catch((e) => setLoadError(e.message));
  }, [value.mainCategory]);
  useEffect(() => {
    listRecords(
      "/sub-categories",
      value.category ? { category: value.category } : {},
    )
      .then((r) => setSubs(r.data || []))
      .catch((e) => setLoadError(e.message));
  }, [value.category]);

  const mainIds = new Set(mains.map((m) => m._id));
  const catOptions = value.mainCategory
    ? cats
    : cats.filter((c) => mainIds.has(idOf(c.mainCategory)));
  const catIds = new Set(catOptions.map((c) => c._id));
  const subOptions = value.category
    ? subs
    : subs.filter((s) => catIds.has(idOf(s.category)));

  const catText = (c) =>
    value.mainCategory || !c.mainCategory?.name
      ? label(c)
      : `${c.mainCategory.name} › ${label(c)}`;
  const subText = (s) =>
    value.category || !s.category?.name
      ? label(s)
      : `${s.category.name} › ${label(s)}`;

  const pickMain = (id) =>
    onChange({ mainCategory: id, category: "", subCategory: "" });
  const pickCategory = (id) => {
    if (!id) return onChange({ ...value, category: "", subCategory: "" });
    const c = cats.find((x) => x._id === id);
    return onChange({
      mainCategory: idOf(c?.mainCategory) || value.mainCategory,
      category: id,
      subCategory: "",
    });
  };
  const pickSub = (id) => {
    if (!id) return onChange({ ...value, subCategory: "" });
    const s = subs.find((x) => x._id === id);
    const categoryId = idOf(s?.category) || value.category;
    const c = cats.find((x) => x._id === categoryId);
    return onChange({
      mainCategory: idOf(c?.mainCategory) || value.mainCategory,
      category: categoryId,
      subCategory: id,
    });
  };

  const field = (key, text, options, text2, onPick) => (
    <div className="field">
      <label>{text}</label>
      <select
        value={value[key]}
        disabled={disabled}
        className={errors[key] ? "invalid" : ""}
        onChange={(e) => onPick(e.target.value)}
      >
        <option value="">Select {text.toLowerCase()}</option>
        {options.map((o) => (
          <option key={o._id} value={o._id}>
            {text2(o)}
          </option>
        ))}
      </select>
      {errors[key] && <small className="field-error">{errors[key]}</small>}
    </div>
  );

  return (
    <div className="form-grid three">
      {loadError && <div className="error full-field">{loadError}</div>}
      {field("mainCategory", "Main category", mains, label, pickMain)}
      {field("category", "Category", catOptions, catText, pickCategory)}
      {field("subCategory", "Subcategory", subOptions, subText, pickSub)}
      {value.mainCategory && cats.length === 0 && (
        <small className="hint full-field">
          This main category has no categories yet. Add some under Categories
          first.
        </small>
      )}
      {value.category && subs.length === 0 && (
        <small className="hint full-field">
          This category has no subcategories yet. Add some under Subcategories
          first.
        </small>
      )}
    </div>
  );
}
