const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const { round2, sellingPrice, hasSale } = require('../utils/pricing');

const colorName = (c) => (c && typeof c === 'object' ? c.name : c);
const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

const findVariant = (product, line) => {
  if (line.variantSku) {
    return product.variants.find((v) => same(v.sku, line.variantSku)) || null;
  }
  const matches = product.variants.filter(
    (v) =>
      (!product.sizes.length || same(v.size, line.size)) &&
      (!product.colorOptions.length || same(v.color && v.color.name, colorName(line.color)))
  );
  return matches[0] || null;
};

const pickImage = (product, variant) => {
  if (variant && variant.images && variant.images.length > 0) return variant.images[0].url;
  if (variant && variant.color && variant.color.name) {
    const opt = product.colorOptions.find((c) => same(c.name, variant.color.name));
    if (opt && opt.images && opt.images.length > 0) return opt.images[0].url;
  }
  return product.images.length > 0 ? product.images[0].url : undefined;
};

// Turns the cart into order lines using ONLY server-side data (current price, stock, SKU).
// Returns the order items (with snapshots), the total and the inventory lines to reserve.
const buildOrderItems = async (cartItems) => {
  const productIds = [...new Set(cartItems.map((l) => l.productId))];
  const products = await Product.find({ _id: { $in: productIds }, isActive: true });
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  // 1) resolve every cart line to a concrete product (+ variant)
  const merged = new Map();
  cartItems.forEach((line) => {
    const product = productMap.get(line.productId);
    if (!product) throw new ApiError(400, 'One of the products is not available');

    let variant = null;
    if (product.variants.length > 0) {
      variant = findVariant(product, line);
      if (!variant) {
        throw new ApiError(400, `Please select a valid size and color for "${product.name}"`);
      }
      if (!variant.isActive) throw new ApiError(409, `"${product.name}" (${variant.sku}) is currently unavailable`);
    } else {
      if (product.sizes.length > 0 && !product.sizes.some((s) => same(s, line.size))) {
        throw new ApiError(400, `Please select a valid size for "${product.name}"`);
      }
      if (product.colors.length > 0 && !product.colors.some((c) => same(c, colorName(line.color)))) {
        throw new ApiError(400, `Please select a valid color for "${product.name}"`);
      }
    }

    const key = variant ? `${product._id}:${variant.sku}` : `${product._id}:${line.size || ''}:${colorName(line.color) || ''}`;
    const existing = merged.get(key);
    if (existing) existing.quantity += line.quantity;
    else merged.set(key, { product, variant, line, quantity: line.quantity });
  });

  // 2) price / stock check / snapshot
  const items = [];
  const reservations = [];
  const legacyUsed = new Map();

  merged.forEach(({ product, variant, line, quantity }) => {
    let regularPrice;
    let salePrice;
    let source = 'none';

    if (variant) {
      if (variant.stock < quantity) {
        throw new ApiError(409, `Not enough stock for "${product.name}" (${variant.sku}): ${variant.stock} left`);
      }
      regularPrice = typeof variant.price === 'number' ? variant.price : product.price;
      salePrice = typeof variant.price === 'number' ? variant.salePrice : product.salePrice;
      source = 'variant';
    } else {
      regularPrice = product.price;
      salePrice = product.salePrice;
      if (typeof product.stock === 'number') {
        const total = (legacyUsed.get(String(product._id)) || 0) + quantity;
        if (total > product.stock) throw new ApiError(409, `Not enough stock for "${product.name}": ${product.stock} left`);
        legacyUsed.set(String(product._id), total);
        source = 'product';
      }
    }

    const unitPrice = sellingPrice(regularPrice, salePrice);
    const item = {
      product: product._id,
      productSnapshot: { name: product.name, sku: product.sku, image: pickImage(product, variant) },
      variant: variant
        ? {
            sku: variant.sku,
            size: variant.size || undefined,
            color: variant.color && variant.color.name ? { name: variant.color.name, hex: variant.color.hex } : undefined,
          }
        : {
            size: product.sizes.length > 0 ? line.size : undefined,
            color: product.colors.length > 0 ? colorName(line.color) : undefined,
          },
      quantity,
      regularPrice,
      salePrice: hasSale(regularPrice, salePrice) ? salePrice : undefined,
      unitPrice,
      lineTotal: round2(unitPrice * quantity),
      stockSource: source,
    };
    items.push(item);
    reservations.push({
      product: product._id,
      productName: product.name,
      sku: variant ? variant.sku : undefined,
      quantity,
      source,
      label: variant ? variant.sku : undefined,
    });
  });

  const orderTotal = round2(items.reduce((sum, item) => sum + item.lineTotal, 0));
  return { items, orderTotal, reservations };
};

module.exports = { buildOrderItems };
