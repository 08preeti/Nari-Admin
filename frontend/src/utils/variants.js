// Pure product-form logic (no React, no network). Unit-tested in frontend/tests/variants.test.js.
// The server is the source of truth: it re-validates everything below.
import { isHttpUrl } from './formatters.js';

let counter = 0;
export const uid = () => `k${Date.now().toString(36)}${(counter += 1)}`;

export const comboKey = (size, colorName) => `${String(size || '').trim().toLowerCase()}|${String(colorName || '').trim().toLowerCase()}`;
const part = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 6);
export const buildVariantSku = (productSku, size, colorName) =>
  [String(productSku || '').trim().toUpperCase(), colorName ? part(colorName) : null, size ? part(size) : null].filter(Boolean).join('-');

export const blankImage = () => ({ key: uid(), url: '', alt: '' });
export const blankProductForm = () => ({
  _id: null, version: undefined,
  mainCategory: '', category: '', subCategory: '',
  name: '', sku: '', description: '', tags: [],
  images: [blankImage()],
  sizes: [], colors: [], variants: [],
  price: '', salePrice: '',
  lowStockThreshold: 5, simpleStock: '', legacyStock: null, acknowledgeLegacyStockReset: false,
  isFeatured: false, isActive: true,
});

const imagesToForm = (images) => {
  const rows = (images || []).map((i) => ({ key: uid(), url: i.url || '', alt: i.alt || '' }));
  return rows.length > 0 ? rows : [blankImage()];
};
const imagesToPayload = (images) =>
  (images || []).filter((i) => i.url && i.url.trim()).map((i) => ({ url: i.url.trim(), ...(i.alt && i.alt.trim() ? { alt: i.alt.trim() } : {}) }));

export const productToForm = (p) => {
  const colors = (p.colorOptions && p.colorOptions.length > 0
    ? p.colorOptions
    : (p.colors || []).map((name) => ({ name }))
  ).map((c) => ({ key: uid(), name: c.name, hex: c.hex || '#000000', images: imagesToForm(c.images).filter((i) => i.url) }));
  const hasVariants = (p.variants || []).length > 0;
  return {
    _id: p._id, version: p.__v,
    mainCategory: p.mainCategory?._id || p.mainCategory || '',
    category: p.category?._id || p.category || '',
    subCategory: p.subCategory?._id || p.subCategory || '',
    name: p.name || '', sku: p.sku || '', description: p.description || '', tags: p.tags || [],
    images: imagesToForm(p.images),
    sizes: [...(p.sizes || [])], colors,
    variants: (p.variants || []).map((v) => ({
      key: v._id || uid(), _id: v._id, sku: v.sku, size: v.size || '',
      color: v.color && v.color.name ? { name: v.color.name, hex: v.color.hex || '' } : null,
      price: v.price ?? '', salePrice: v.salePrice ?? '', stock: v.stock ?? 0, originalStock: v.stock ?? 0,
      isActive: v.isActive !== false, images: imagesToForm(v.images).filter((i) => i.url),
    })),
    price: p.price ?? '', salePrice: p.salePrice ?? '',
    lowStockThreshold: p.lowStockThreshold ?? 5,
    simpleStock: !hasVariants && typeof p.stock === 'number' ? p.stock : '',
    legacyStock: !hasVariants && typeof p.stock === 'number' ? p.stock : null,
    acknowledgeLegacyStockReset: false,
    isFeatured: !!p.isFeatured, isActive: p.isActive !== false,
  };
};

// ---- variant generation ----
export const missingCombinations = ({ sizes, colors, variants }) => {
  const existing = new Set(variants.map((v) => comboKey(v.size, v.color && v.color.name)));
  const sizeList = sizes.length > 0 ? sizes : [null];
  const colorList = colors.length > 0 ? colors : [null];
  const out = [];
  colorList.forEach((color) => sizeList.forEach((size) => {
    if (size === null && color === null) return;
    if (!existing.has(comboKey(size, color && color.name))) out.push({ size, color });
  }));
  return out;
};

// Appends rows for combinations that do not exist yet. Existing rows are returned untouched.
export const generateVariants = ({ productSku, sizes, colors, variants, price, salePrice }) => {
  const taken = new Set(variants.map((v) => String(v.sku).toUpperCase()));
  const added = missingCombinations({ sizes, colors, variants }).map(({ size, color }) => {
    let sku = buildVariantSku(productSku, size, color && color.name);
    let n = 2;
    while (taken.has(sku)) { sku = `${buildVariantSku(productSku, size, color && color.name)}-${n}`; n += 1; }
    taken.add(sku);
    return {
      key: uid(), sku, size: size || '', color: color ? { name: color.name, hex: color.hex } : null,
      price: price === '' ? '' : price, salePrice: salePrice === '' ? '' : salePrice, stock: 0, isActive: true, images: [],
    };
  });
  return { variants: [...variants, ...added], addedCount: added.length };
};

// Which variants depend on a size / colour that is about to be removed?
export const variantsUsing = (variants, { size, colorName }) =>
  variants.filter((v) => (size !== undefined && String(v.size).toLowerCase() === String(size).toLowerCase())
    || (colorName !== undefined && v.color && String(v.color.name).toLowerCase() === String(colorName).toLowerCase()));
export const stockedVariants = (list) => list.filter((v) => Number(v.stock) > 0);

export const variantStats = (variants) => {
  const active = variants.filter((v) => v.isActive);
  return {
    total: variants.length,
    active: active.length,
    stock: active.reduce((s, v) => s + (Number(v.stock) || 0), 0),
    outOfStock: active.filter((v) => !(Number(v.stock) > 0)).length,
  };
};

export const variantAvailability = (v, threshold = 5) => {
  if (!v.isActive) return 'inactive';
  const s = Number(v.stock) || 0;
  if (s <= 0) return 'out_of_stock';
  return s <= threshold ? 'low_stock' : 'in_stock';
};

// ---- validation (mirrors the server; shown inline) ----
const num = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));
export const SECTIONS = ['basic', 'categories', 'images', 'sizes', 'colors', 'variants', 'pricing', 'inventory', 'status'];

export const validateForm = (f) => {
  const errors = {}; // key -> message
  const section = {}; // section -> count
  const add = (sec, key, msg) => { errors[key] = msg; section[sec] = (section[sec] || 0) + 1; };

  if (!f.name.trim()) add('basic', 'name', 'Product name is required');
  if (!f.sku.trim()) add('basic', 'sku', 'SKU is required');
  ['mainCategory', 'category', 'subCategory'].forEach((k) => { if (!f[k]) add('categories', k, 'Required'); });

  f.images.forEach((img, i) => {
    if (img.url.trim() && !isHttpUrl(img.url)) add('images', `image-${i}`, 'Enter a valid http(s) URL');
  });
  f.colors.forEach((c, i) => {
    if (!c.name.trim()) add('colors', `color-${i}`, 'Color name is required');
    else if (!/^#[0-9A-Fa-f]{6}$/.test(c.hex || '')) add('colors', `color-${i}`, 'Color code must look like #FF0000');
  });

  const price = num(f.price);
  if (Number.isNaN(price) || price < 0) add('pricing', 'price', 'Enter a regular price (0 or more)');
  if (f.salePrice !== '' && f.salePrice !== null) {
    const sp = num(f.salePrice);
    if (Number.isNaN(sp) || sp < 0) add('pricing', 'salePrice', 'Sale price cannot be negative');
    else if (!Number.isNaN(price) && sp > price) add('pricing', 'salePrice', 'Sale price cannot exceed the regular price');
  }

  const seenSku = new Map();
  f.variants.forEach((v) => {
    const sku = String(v.sku).trim().toUpperCase();
    if (!sku) add('variants', `v-${v.key}-sku`, 'SKU required');
    else if (seenSku.has(sku)) { add('variants', `v-${v.key}-sku`, 'Duplicate SKU'); }
    else seenSku.set(sku, true);
    const vp = num(v.price);
    if (Number.isNaN(vp) || vp < 0) add('variants', `v-${v.key}-price`, 'Price required');
    if (v.salePrice !== '' && v.salePrice !== null) {
      const vs = num(v.salePrice);
      if (Number.isNaN(vs) || vs < 0) add('variants', `v-${v.key}-salePrice`, 'Invalid');
      else if (!Number.isNaN(vp) && vs > vp) add('variants', `v-${v.key}-salePrice`, 'Exceeds price');
    }
    const st = Number(v.stock);
    if (!Number.isInteger(st) || st < 0) add('variants', `v-${v.key}-stock`, 'Whole number ≥ 0');
  });

  if (f.variants.length === 0 && f.simpleStock !== '') {
    const st = Number(f.simpleStock);
    if (!Number.isInteger(st) || st < 0) add('inventory', 'simpleStock', 'Stock must be a whole number, 0 or more');
  }
  const th = Number(f.lowStockThreshold);
  if (!Number.isInteger(th) || th < 0) add('inventory', 'lowStockThreshold', 'Whole number, 0 or more');

  if (f.variants.length > 0 && f.legacyStock !== null && f.legacyStock > 0 && !f.acknowledgeLegacyStockReset) {
    const allocated = variantStats(f.variants).stock;
    if (allocated !== f.legacyStock) add('inventory', 'legacyStock', `Legacy stock is ${f.legacyStock}. Split exactly ${f.legacyStock} across the variants (now ${allocated}), or tick the reset box.`);
  }
  return { errors, section, valid: Object.keys(errors).length === 0 };
};

// ---- payload ----
const toNumberOrUndef = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));

export const formToPayload = (f) => {
  const payload = {
    mainCategory: f.mainCategory, category: f.category, subCategory: f.subCategory,
    name: f.name.trim(), sku: f.sku.trim().toUpperCase(), description: f.description.trim(),
    tags: f.tags, images: imagesToPayload(f.images),
    sizes: f.sizes,
    colorOptions: f.colors.map((c) => ({ name: c.name.trim(), hex: c.hex.toUpperCase(), images: imagesToPayload(c.images) })),
    price: Number(f.price),
    salePrice: f.salePrice === '' ? null : Number(f.salePrice),
    lowStockThreshold: Number(f.lowStockThreshold),
    isFeatured: f.isFeatured, isActive: f.isActive,
  };
  if (f.variants.length > 0) {
    payload.variants = f.variants.map((v) => {
      const out = {
        ...(v._id ? { _id: v._id } : {}),
        sku: v.sku.trim().toUpperCase(),
        ...(v.size ? { size: v.size } : {}),
        ...(v.color && v.color.name ? { color: { name: v.color.name, ...(v.color.hex ? { hex: v.color.hex.toUpperCase() } : {}) } } : {}),
        price: Number(v.price),
        salePrice: v.salePrice === '' ? null : Number(v.salePrice),
        isActive: v.isActive,
        images: imagesToPayload(v.images),
      };
      // Existing variants only send stock when the admin actually changed it (so live order deductions are never overwritten)
      if (!v._id || Number(v.stock) !== Number(v.originalStock)) out.stock = Number(v.stock);
      return out;
    });
    if (f.legacyStock !== null && f.legacyStock > 0 && f.acknowledgeLegacyStockReset) payload.acknowledgeLegacyStockReset = true;
  } else if (f.simpleStock !== '') {
    const s = toNumberOrUndef(f.simpleStock);
    if (f.legacyStock === null || s !== f.legacyStock) payload.stock = s;
  }
  if (f._id) payload.version = f.version;
  return payload;
};
