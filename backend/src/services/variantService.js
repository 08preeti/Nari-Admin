// Pure (database-free) helpers for sizes, colours and variants. Unit-tested in tests/variants.test.js.
const { STANDARD_SIZES } = require('../utils/constants');

const comboKey = (size, colorName) => `${(size || '').trim().toLowerCase()}|${(colorName || '').trim().toLowerCase()}`;

const canonicalSize = (value) => {
  const trimmed = String(value || '').trim().replace(/\s+/g, ' ');
  const standard = STANDARD_SIZES.find((s) => s.toLowerCase() === trimmed.toLowerCase());
  return standard || trimmed;
};

const dedupeBy = (list, keyFn) => {
  const seen = new Set();
  return list.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const normalizeImages = (images) => {
  if (!Array.isArray(images)) return images;
  return images
    .filter((img) => !(img && typeof img === 'object' && (typeof img.url !== 'string' || img.url.trim() === '')))
    .map((img) => {
      if (!img || typeof img !== 'object') return img;
      const out = { url: img.url.trim() };
      if (typeof img.alt === 'string' && img.alt.trim()) out.alt = img.alt.trim();
      return out;
    });
};

const normalizeSizes = (sizes) => {
  if (!Array.isArray(sizes)) return sizes;
  const cleaned = sizes.filter((s) => typeof s !== 'string' || s.trim() !== '').map((s) => (typeof s === 'string' ? canonicalSize(s) : s));
  return dedupeBy(cleaned, (s) => String(s).toLowerCase());
};

const normalizeColor = (color) => {
  if (typeof color === 'string') return { name: color.trim() };
  if (!color || typeof color !== 'object') return color;
  const out = { name: typeof color.name === 'string' ? color.name.trim() : color.name };
  if (typeof color.hex === 'string' && color.hex.trim()) out.hex = color.hex.trim().toUpperCase();
  if (color.images !== undefined) out.images = normalizeImages(color.images);
  return out;
};

const normalizeColorOptions = (colors) => {
  if (!Array.isArray(colors)) return colors;
  const cleaned = colors
    .map(normalizeColor)
    .filter((c) => !(c && typeof c === 'object' && (c.name === '' || c.name === undefined)));
  return dedupeBy(cleaned, (c) => (c && c.name ? String(c.name).toLowerCase() : Math.random()));
};

const normalizePrice = (value) => {
  if (value === '' || value === null) return undefined;
  return value;
};

const normalizeVariant = (v) => {
  if (!v || typeof v !== 'object') return v;
  const out = { ...v };
  if (typeof out.sku === 'string') out.sku = out.sku.trim().toUpperCase();
  if (typeof out.size === 'string') out.size = canonicalSize(out.size);
  if (out.color !== undefined) out.color = normalizeColor(out.color);
  out.price = normalizePrice(out.price);
  out.salePrice = normalizePrice(out.salePrice);
  if (out.salePrice === 0) out.salePrice = undefined;
  if (out.images !== undefined) out.images = normalizeImages(out.images);
  return out;
};

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return tags;
  const cleaned = tags.filter((t) => typeof t !== 'string' || t.trim() !== '').map((t) => (typeof t === 'string' ? t.trim().toLowerCase() : t));
  return dedupeBy(cleaned, (t) => String(t));
};

// Mutates and returns body: trims, de-duplicates, drops blank image rows, maps legacy `colors` strings.
const normalizeProductBody = (body) => {
  if (typeof body.name === 'string') body.name = body.name.trim();
  if (typeof body.sku === 'string') body.sku = body.sku.trim().toUpperCase();
  if (body.images !== undefined) body.images = normalizeImages(body.images);
  if (body.sizes !== undefined) body.sizes = normalizeSizes(body.sizes);
  if (body.colorOptions !== undefined) body.colorOptions = normalizeColorOptions(body.colorOptions);
  else if (Array.isArray(body.colors)) body.colorOptions = normalizeColorOptions(body.colors);
  delete body.colors; // derived from colorOptions by the model
  if (body.tags !== undefined) body.tags = normalizeTags(body.tags);
  if (body.salePrice === '' || body.salePrice === null || body.salePrice === 0) body.salePrice = null;
  if (body.stock === null || body.stock === '') delete body.stock;
  if (Array.isArray(body.variants)) body.variants = body.variants.map(normalizeVariant);
  return body;
};

// ---- Combination generation (server twin of the admin UI generator) ----
const buildVariantSku = (productSku, size, colorName) => {
  const part = (s) =>
    String(s || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '')
      .slice(0, 6);
  return [productSku, colorName ? part(colorName) : null, size ? part(size) : null].filter(Boolean).join('-');
};

// Returns the combinations that do NOT exist yet. Never touches existing variants.
const missingCombinations = ({ sizes = [], colorOptions = [], variants = [] }) => {
  const existing = new Set(variants.map((v) => comboKey(v.size, v.color && v.color.name)));
  const sizeList = sizes.length > 0 ? sizes : [null];
  const colorList = colorOptions.length > 0 ? colorOptions : [null];
  const out = [];
  colorList.forEach((color) => {
    sizeList.forEach((size) => {
      if (size === null && color === null) return;
      if (!existing.has(comboKey(size, color && color.name))) out.push({ size, color });
    });
  });
  return out;
};

// ---- Reconciling an incoming variant list with what is stored ----
// Existing variants are matched by _id, then by SKU. A stored variant that is missing from the incoming
// list can only be dropped when it holds no stock; otherwise an error is returned (disable it instead).
const reconcileVariants = (existing, incoming) => {
  const errors = [];
  const byId = new Map(existing.filter((v) => v._id).map((v) => [String(v._id), v]));
  const bySku = new Map(existing.map((v) => [String(v.sku).toUpperCase(), v]));
  const matched = new Set();

  const variants = incoming.map((inc, index) => {
    const match = (inc._id && byId.get(String(inc._id))) || bySku.get(String(inc.sku).toUpperCase());
    if (match && matched.has(match)) {
      errors.push({ field: `variants[${index}]`, message: 'variant appears twice in the request' });
      return inc;
    }
    if (match) {
      matched.add(match);
      return { ...inc, _id: match._id, stock: inc.stock !== undefined ? inc.stock : match.stock };
    }
    const { _id, ...rest } = inc; // unknown ids are never trusted
    return { ...rest, stock: inc.stock !== undefined ? inc.stock : 0 };
  });

  existing.forEach((old) => {
    if (!matched.has(old) && (old.stock || 0) > 0) {
      errors.push({
        field: 'variants',
        message: `Variant ${old.sku} still has ${old.stock} in stock and cannot be removed. Set it inactive instead.`,
      });
    }
  });
  return { variants, errors };
};

// True when the request would overwrite stock numbers that differ from what is stored now.
const hasStockEdits = (existing, incoming, currentLegacyStock, incomingLegacyStock) => {
  if (incomingLegacyStock !== undefined && incomingLegacyStock !== currentLegacyStock) return true;
  if (!Array.isArray(incoming)) return false;
  const byId = new Map(existing.filter((v) => v._id).map((v) => [String(v._id), v]));
  const bySku = new Map(existing.map((v) => [String(v.sku).toUpperCase(), v]));
  return incoming.some((inc) => {
    const match = (inc._id && byId.get(String(inc._id))) || bySku.get(String(inc.sku).toUpperCase());
    return match && inc.stock !== undefined && inc.stock !== match.stock;
  });
};

module.exports = {
  hasStockEdits,
  comboKey,
  canonicalSize,
  normalizeImages,
  normalizeSizes,
  normalizeColorOptions,
  normalizeVariant,
  normalizeProductBody,
  buildVariantSku,
  missingCombinations,
  reconcileVariants,
};

// Variants must only use sizes / colours the product actually offers, and must always have the
// dimension(s) the product defines. Returns [{field,message}].
const checkVariantOptions = (sizes, colorOptions, variants) => {
  const errors = [];
  const sizeSet = new Set((sizes || []).map((s) => String(s).toLowerCase()));
  const colorSet = new Set((colorOptions || []).map((c) => String(c.name).toLowerCase()));
  (variants || []).forEach((v, i) => {
    const size = v.size ? String(v.size).toLowerCase() : '';
    const color = v.color && v.color.name ? String(v.color.name).toLowerCase() : '';
    if (sizeSet.size > 0 && !size) errors.push({ field: `variants[${i}].size`, message: 'size is required' });
    if (sizeSet.size === 0 && size) errors.push({ field: `variants[${i}].size`, message: 'product has no sizes selected' });
    if (size && sizeSet.size > 0 && !sizeSet.has(size)) {
      errors.push({ field: `variants[${i}].size`, message: `size "${v.size}" is not one of the product sizes` });
    }
    if (colorSet.size > 0 && !color) errors.push({ field: `variants[${i}].color`, message: 'color is required' });
    if (colorSet.size === 0 && color) errors.push({ field: `variants[${i}].color`, message: 'product has no colors selected' });
    if (color && colorSet.size > 0 && !colorSet.has(color)) {
      errors.push({ field: `variants[${i}].color`, message: `color "${v.color.name}" is not one of the product colors` });
    }
    if (!size && !color) errors.push({ field: `variants[${i}]`, message: 'a variant needs a size and/or a color' });
  });
  return errors;
};

module.exports.checkVariantOptions = checkVariantOptions;
