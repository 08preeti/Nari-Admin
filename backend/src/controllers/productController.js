const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const ReadymadeOrder = require('../models/ReadymadeOrder');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { checkHierarchy } = require('../services/catalogService');
const { assertSkusAvailable } = require('../services/productService');
const { reconcileVariants, checkVariantOptions, hasStockEdits } = require('../services/variantService');
const {
  getPagination,
  paginationMeta,
  pick,
  listFilter,
  visibilityFilter,
  escapeRegex,
} = require('../utils/helpers');

const FIELDS = [
  'mainCategory',
  'category',
  'subCategory',
  'name',
  'sku',
  'description',
  'images',
  'price',
  'salePrice',
  'sizes',
  'colorOptions',
  'lowStockThreshold',
  'tags',
  'isFeatured',
  'isActive',
];

const populateParents = (query) =>
  query
    .populate('mainCategory', 'name moduleType')
    .populate('category', 'name')
    .populate('subCategory', 'name');

const { STOCK_EXPR, THRESHOLD_EXPR } = require('../utils/stockExpr');

const stockStatusFilter = (status) => {
  if (status === 'out_of_stock') return { $expr: { $and: [{ $ne: [STOCK_EXPR, null] }, { $lte: [STOCK_EXPR, 0] }] } };
  if (status === 'low_stock') {
    return { $expr: { $and: [{ $gt: [STOCK_EXPR, 0] }, { $lte: [STOCK_EXPR, THRESHOLD_EXPR] }] } };
  }
  if (status === 'in_stock') {
    return { $expr: { $or: [{ $eq: [STOCK_EXPR, null] }, { $gt: [STOCK_EXPR, THRESHOLD_EXPR] }] } };
  }
  return null;
};

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name: { name: 1 },
  priceAsc: { price: 1 },
  priceDesc: { price: -1 },
};

const publicView = (doc) => {
  const obj = doc.toJSON();
  obj.variants = (obj.variants || []).filter((v) => v.isActive);
  return obj;
};

exports.getAll = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = listFilter(req);
  ['mainCategory', 'category', 'subCategory'].forEach((key) => {
    if (typeof req.query[key] === 'string' && req.query[key]) filter[key] = req.query[key];
  });
  if (req.query.isFeatured === 'true' || req.query.isFeatured === 'false') {
    filter.isFeatured = req.query.isFeatured === 'true';
  }
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const rx = new RegExp(escapeRegex(req.query.q.trim().slice(0, 100)), 'i');
    filter.$or = [{ name: rx }, { sku: rx }, { 'variants.sku': rx }, { tags: rx }];
  }
  const stock = stockStatusFilter(req.query.stockStatus);
  if (stock) Object.assign(filter, stock);

  const sort = SORTS[req.query.sort] || SORTS.newest;
  const [items, total] = await Promise.all([
    populateParents(Product.find(filter).sort(sort).skip(skip).limit(limit)),
    Product.countDocuments(filter),
  ]);

  sendSuccess(res, {
    data: req.admin ? items : items.map(publicView),
    meta: paginationMeta(total, page, limit),
  });
});

exports.getOne = asyncHandler(async (req, res) => {
  const item = await populateParents(Product.findOne({ _id: req.params.id, ...visibilityFilter(req) }));
  if (!item) throw new ApiError(404, 'Product not found');
  sendSuccess(res, { data: req.admin ? item : publicView(item) });
});

const logStockChanges = (product, before, adminId, type, reason) => {
  const logs = [];
  const beforeMap = new Map(before.map((v) => [v.sku, v.stock]));
  product.variants.forEach((v) => {
    const prev = beforeMap.get(v.sku);
    if (prev === undefined && v.stock > 0) {
      logs.push({ product: product._id, productName: product.name, sku: v.sku, type: 'initial', change: v.stock, before: 0, after: v.stock, admin: adminId, reason });
    } else if (prev !== undefined && prev !== v.stock) {
      logs.push({ product: product._id, productName: product.name, sku: v.sku, type, change: v.stock - prev, before: prev, after: v.stock, admin: adminId, reason });
    }
  });
  return logs;
};

// Default each variant's price to the product price so every variant always has an explicit price.
const withPriceDefaults = (variants, productPrice, productSale) =>
  variants.map((v) => (v.price === undefined ? { ...v, price: productPrice, salePrice: v.salePrice ?? productSale } : v));

exports.create = asyncHandler(async (req, res) => {
  const body = req.body;
  const data = pick(body, FIELDS);
  await checkHierarchy(data, 'readymade');

  const variants = body.variants || [];
  const errors = checkVariantOptions(data.sizes, data.colorOptions, variants);
  if (errors.length > 0) throw new ApiError(400, 'Validation failed', errors);

  await assertSkusAvailable({ productSku: data.sku, variantSkus: variants.map((v) => v.sku) });

  if (variants.length > 0) data.variants = withPriceDefaults(variants, data.price, data.salePrice);
  else if (body.stock !== undefined) data.stock = body.stock;

  const item = await Product.create(data);
  await InventoryLog.insertMany(logStockChanges(item, [], req.admin._id, 'initial', 'Product created'));
  if (!item.variants.length && typeof item.stock === 'number' && item.stock > 0) {
    await InventoryLog.create({ product: item._id, productName: item.name, type: 'initial', change: item.stock, before: 0, after: item.stock, admin: req.admin._id, reason: 'Product created' });
  }
  sendSuccess(res, { statusCode: 201, message: 'Product created', data: item });
});

exports.update = asyncHandler(async (req, res) => {
  const body = req.body;
  const item = await Product.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Product not found');

  // The admin form was opened at some version. If an order (or another admin) changed the product
  // since then AND this request would overwrite stock numbers, refuse instead of clobbering live stock.
  // Edits that do not touch stock (name, price, images...) are still allowed.
  const stockEdits = hasStockEdits(
    item.variants.map((v) => v.toObject()),
    body.variants,
    typeof item.stock === 'number' ? item.stock : undefined,
    body.stock
  );
  if (body.version !== undefined && body.version !== item.__v && stockEdits) {
    throw new ApiError(409, 'Stock changed since you opened this product (for example by a new order). Reload it and re-apply your stock edit.');
  }

  const beforeVariants = item.variants.map((v) => ({ sku: v.sku, stock: v.stock }));
  const legacyStock = typeof item.stock === 'number' ? item.stock : null;

  item.set(pick(body, FIELDS));
  if (item.salePrice !== undefined && item.salePrice !== null && item.salePrice > item.price) {
    throw new ApiError(400, 'Validation failed', [{ field: 'salePrice', message: 'sale price cannot exceed the regular price' }]);
  }
  await checkHierarchy(item, 'readymade');

  let variantsChanged = false;
  if (body.variants !== undefined) {
    const { variants, errors } = reconcileVariants(item.variants.map((v) => v.toObject()), body.variants);
    if (errors.length > 0) throw new ApiError(409, 'Variants cannot be saved', errors);
    item.variants = withPriceDefaults(variants, item.price, item.salePrice);
    variantsChanged = true;
  }

  const optionErrors = checkVariantOptions(
    item.sizes,
    item.colorOptions,
    item.variants.map((v) => ({ size: v.size, color: v.color }))
  );
  if (optionErrors.length > 0) throw new ApiError(400, 'Validation failed', optionErrors);

  // Legacy product-level stock must be handed over explicitly: never silently dropped or invented.
  if (item.variants.length > 0 && legacyStock !== null && legacyStock > 0) {
    const allocated = item.variants.filter((v) => v.isActive).reduce((s, v) => s + v.stock, 0);
    if (allocated !== legacyStock && body.acknowledgeLegacyStockReset !== true) {
      throw new ApiError(409, `This product has ${legacyStock} units of legacy stock. Split exactly ${legacyStock} units across the variants (currently ${allocated}), or confirm the reset.`, [
        { field: 'variants', message: `legacy stock ${legacyStock} must be allocated to variants` },
      ]);
    }
  }
  if (item.variants.length === 0 && body.stock !== undefined) item.stock = body.stock;

  await assertSkusAvailable({
    productId: item._id,
    productSku: item.sku,
    variantSkus: item.variants.map((v) => v.sku),
  });

  await item.save();

  const logs = variantsChanged ? logStockChanges(item, beforeVariants, req.admin._id, 'manual-edit', 'Edited in product form') : [];
  if (item.variants.length === 0 && body.stock !== undefined && legacyStock !== item.stock) {
    logs.push({ product: item._id, productName: item.name, type: 'manual-edit', change: (item.stock || 0) - (legacyStock || 0), before: legacyStock || 0, after: item.stock, admin: req.admin._id, reason: 'Edited in product form' });
  }
  await InventoryLog.insertMany(logs);
  sendSuccess(res, { message: 'Product updated', data: item });
});

exports.setStatus = asyncHandler(async (req, res) => {
  const item = await Product.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Product not found');

  item.isActive = req.body.isActive;
  await item.save();
  sendSuccess(res, { message: `Product ${item.isActive ? 'activated' : 'archived'}`, data: item });
});

exports.remove = asyncHandler(async (req, res) => {
  const item = await Product.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Product not found');

  const used = await ReadymadeOrder.exists({ 'items.product': item._id });
  if (used) {
    throw new ApiError(409, 'This product appears in existing orders and cannot be deleted. Archive it instead.');
  }
  await item.deleteOne();
  sendSuccess(res, { message: 'Product deleted', data: { _id: item._id } });
});

// Atomic stock adjustment (delta or absolute) for one variant, or for a legacy product without variants.
exports.adjustStock = asyncHandler(async (req, res) => {
  const { sku, delta, newStock, reason } = req.body;
  const item = await Product.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Product not found');

  const isVariant = item.variants.length > 0;
  let variantSku;
  if (isVariant) {
    variantSku = String(sku || '').trim().toUpperCase();
    if (!item.variants.some((v) => v.sku === variantSku)) throw new ApiError(400, 'Unknown variant SKU for this product');
  } else if (typeof item.stock !== 'number') {
    throw new ApiError(400, 'This product does not track stock. Edit the product to set a quantity.');
  }

  const base = isVariant ? { _id: item._id, 'variants.sku': variantSku } : { _id: item._id, stock: { $type: 'number' } };
  const path = isVariant ? 'variants.$.stock' : 'stock';
  const field = (doc) => (isVariant ? doc.variants.find((v) => v.sku === variantSku).stock : doc.stock);

  let updated;
  if (delta !== undefined) {
    const filter = { ...base };
    if (delta < 0) {
      if (isVariant) filter.variants = { $elemMatch: { sku: variantSku, stock: { $gte: -delta } } };
      else filter.stock = { $gte: -delta };
      delete filter['variants.sku'];
    }
    updated = await Product.findOneAndUpdate(filter, { $inc: { [path]: delta, __v: 1 } }, { new: true });
    if (!updated) throw new ApiError(409, 'Stock cannot go below zero');
  } else {
    updated = await Product.findOneAndUpdate(base, { $set: { [path]: newStock }, $inc: { __v: 1 } }, { new: true });
    if (!updated) throw new ApiError(409, 'Product changed while saving, please retry');
  }

  const after = field(updated);
  const realChange = delta !== undefined ? delta : newStock - field(item);
  await InventoryLog.create({
    product: item._id,
    productName: item.name,
    sku: variantSku,
    type: 'adjustment',
    change: realChange,
    before: after - realChange,
    after,
    reason: reason || 'Manual adjustment',
    admin: req.admin._id,
  });
  sendSuccess(res, { message: 'Stock updated', data: updated, meta: { change: realChange } });
});

exports.getInventoryHistory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { product: req.params.id };
  if (typeof req.query.sku === 'string' && req.query.sku) filter.sku = req.query.sku.toUpperCase();
  const [items, total] = await Promise.all([
    InventoryLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('admin', 'name'),
    InventoryLog.countDocuments(filter),
  ]);
  sendSuccess(res, { data: items, meta: paginationMeta(total, page, limit) });
});

