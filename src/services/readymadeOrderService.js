const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const { round2 } = require('../utils/helpers');

const buildOrderItems = async (cartItems) => {
  const merged = new Map();
  cartItems.forEach((item) => {
    const key = `${item.productId}:${item.size || ''}:${item.color || ''}`;
    const existing = merged.get(key);
    if (existing) existing.quantity += item.quantity;
    else merged.set(key, { ...item });
  });
  const lines = [...merged.values()];

  const productIds = [...new Set(lines.map((line) => line.productId))];
  const products = await Product.find({ _id: { $in: productIds }, isActive: true });
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  const stockUsed = new Map();

  const items = lines.map((line) => {
    const product = productMap.get(line.productId);
    if (!product) throw new ApiError(400, 'One of the products is not available');

    if (product.sizes.length > 0 && !product.sizes.includes(line.size)) {
      throw new ApiError(400, `Please select a valid size for "${product.name}"`);
    }
    if (product.colors.length > 0 && !product.colors.includes(line.color)) {
      throw new ApiError(400, `Please select a valid color for "${product.name}"`);
    }

    if (typeof product.stock === 'number') {
      const totalQuantity = (stockUsed.get(line.productId) || 0) + line.quantity;
      if (totalQuantity > product.stock) {
        throw new ApiError(400, `Not enough stock for "${product.name}"`);
      }
      stockUsed.set(line.productId, totalQuantity);
    }

    return {
      product: product._id,
      productSnapshot: {
        name: product.name,
        sku: product.sku,
        image: product.images.length > 0 ? product.images[0].url : undefined,
      },
      variant: {
        size: product.sizes.length > 0 ? line.size : undefined,
        color: product.colors.length > 0 ? line.color : undefined,
      },
      quantity: line.quantity,
      unitPrice: product.price,
      lineTotal: round2(product.price * line.quantity),
    };
  });

  const orderTotal = round2(items.reduce((sum, item) => sum + item.lineTotal, 0));
  return { items, orderTotal };
};

module.exports = { buildOrderItems };
