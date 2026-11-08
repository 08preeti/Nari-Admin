const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');

// SKU uniqueness enforced by the server (the DB also has unique indexes as a last line of defence).
// A SKU may not be used by another product, nor by any variant of another product, nor twice here.
const assertSkusAvailable = async ({ productId, productSku, variantSkus = [] }) => {
  const mine = [productSku, ...variantSkus].filter(Boolean);
  const dup = mine.filter((s, i) => mine.indexOf(s) !== i);
  if (dup.length > 0) throw new ApiError(409, `SKU ${dup[0]} is used more than once in this product`);
  if (mine.length === 0) return;

  const filter = { $or: [{ sku: { $in: mine } }, { 'variants.sku': { $in: mine } }] };
  if (productId) filter._id = { $ne: productId };
  const clashes = await Product.find(filter).select('name sku variants.sku').lean();
  if (clashes.length === 0) return;

  const taken = new Set();
  clashes.forEach((p) => {
    if (p.sku) taken.add(p.sku);
    (p.variants || []).forEach((v) => taken.add(v.sku));
  });
  const errors = mine.filter((s) => taken.has(s)).map((s) => ({ field: 'sku', message: `SKU ${s} is already used by another product` }));
  throw new ApiError(409, `SKU already in use: ${errors.map((e) => e.message.split(' ')[1]).join(', ')}`, errors);
};

module.exports = { assertSkusAvailable };
