const mongoose = require('mongoose');
const { imageSchema } = require('./common');
const { DEFAULT_LOW_STOCK_THRESHOLD } = require('../utils/constants');
const { sellingPrice, discountPercent } = require('../utils/pricing');

const { Schema } = mongoose;

const HEX = /^#[0-9A-Fa-f]{6}$/;

const colorOptionSchema = new Schema(
  {
    name: { type: String, required: [true, 'Color name is required'], trim: true, maxlength: 40 },
    hex: { type: String, trim: true, uppercase: true, match: [HEX, 'Color code must look like #FF0000'] },
    images: { type: [imageSchema], default: [] },
  },
  { _id: false }
);

const variantSchema = new Schema(
  {
  sku: { type: String, required: [true, 'Variant SKU is required'], uppercase: true, trim: true, maxlength: 80 },
  size: { type: String, trim: true, maxlength: 20 },
  color: {
    name: { type: String, trim: true, maxlength: 40 },
    hex: { type: String, trim: true, uppercase: true },
  },
  price: { type: Number, required: [true, 'Variant price is required'], min: [0, 'Price cannot be negative'] },
  salePrice: { type: Number, min: [0, 'Sale price cannot be negative'] },
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative'],
    validate: { validator: Number.isInteger, message: 'Stock must be a whole number' },
  },
  isActive: { type: Boolean, default: true },
  images: { type: [imageSchema], default: [] },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true }, id: false }
);

variantSchema.virtual('sellingPrice').get(function sp() {
  return sellingPrice(this.price, this.salePrice);
});
variantSchema.virtual('discountPercent').get(function dp() {
  return discountPercent(this.price, this.salePrice);
});

const productSchema = new Schema(
  {
    mainCategory: { type: Schema.Types.ObjectId, ref: 'MainCategory', required: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    subCategory: { type: Schema.Types.ObjectId, ref: 'SubCategory', required: true, index: true },
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 150 },
    sku: { type: String, unique: true, sparse: true, uppercase: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 3000 },
    images: { type: [imageSchema], default: [] },
    // Regular price. For products with variants it is the default price used when a variant has none.
    price: { type: Number, required: [true, 'Price is required'], min: [0, 'Price cannot be negative'] },
    salePrice: { type: Number, min: [0, 'Sale price cannot be negative'] },
    sizes: { type: [{ type: String, trim: true }], default: [] },
    // Legacy list of colour NAMES. Kept in sync with colorOptions so older readers keep working.
    colors: { type: [{ type: String, trim: true }], default: [] },
    colorOptions: { type: [colorOptionSchema], default: [] },
    variants: { type: [variantSchema], default: [] },
    // LEGACY product-level stock. Only used while the product has no variants.
    // undefined = stock not tracked (unlimited), exactly like before variants existed.
    stock: { type: Number, min: [0, 'Stock cannot be negative'] },
    lowStockThreshold: { type: Number, min: 0, default: DEFAULT_LOW_STOCK_THRESHOLD },
    tags: { type: [{ type: String, trim: true, lowercase: true, maxlength: 30 }], default: [] },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    // Saves fail with a VersionError if the product changed (e.g. an order deducted stock)
    // since it was loaded. Prevents a stale admin form from overwriting live stock.
    optimisticConcurrency: true,
    toJSON: { virtuals: true, versionKey: '__v' },
    toObject: { virtuals: true },
    id: false,
  }
);

// Unique variant SKU across products. Partial so products without variants don't collide.
productSchema.index(
  { 'variants.sku': 1 },
  { unique: true, partialFilterExpression: { 'variants.sku': { $type: 'string' } } }
);
productSchema.index({ name: 1 });
productSchema.index({ isActive: 1, isFeatured: 1 });

productSchema.virtual('hasVariants').get(function hv() {
  return this.variants && this.variants.length > 0;
});
productSchema.virtual('activeVariantCount').get(function avc() {
  return (this.variants || []).filter((v) => v.isActive).length;
});
// Single source of truth for stock: active variants if the product has variants, else legacy stock.
productSchema.virtual('totalStock').get(function ts() {
  if (this.variants && this.variants.length > 0) {
    return this.variants.filter((v) => v.isActive).reduce((sum, v) => sum + (v.stock || 0), 0);
  }
  return typeof this.stock === 'number' ? this.stock : null; // null = not tracked
});
productSchema.virtual('stockStatus').get(function ss() {
  const total = this.totalStock;
  if (total === null) return 'in_stock';
  if (total <= 0) return 'out_of_stock';
  const threshold = typeof this.lowStockThreshold === 'number' ? this.lowStockThreshold : DEFAULT_LOW_STOCK_THRESHOLD;
  return total <= threshold ? 'low_stock' : 'in_stock';
});
productSchema.virtual('sellingPrice').get(function sp() {
  return sellingPrice(this.price, this.salePrice);
});
productSchema.virtual('discountPercent').get(function dp() {
  return discountPercent(this.price, this.salePrice);
});

productSchema.pre('validate', function productRules(next) {
  if (typeof this.salePrice === 'number' && this.salePrice > this.price) {
    this.invalidate('salePrice', 'Sale price cannot exceed the regular price');
  }
  if (this.salePrice === 0 || this.salePrice === null) this.salePrice = undefined;

  const seenSku = new Set();
  const seenCombo = new Set();
  (this.variants || []).forEach((v, i) => {
    if (typeof v.salePrice === 'number' && v.salePrice > v.price) {
      this.invalidate(`variants.${i}.salePrice`, 'Variant sale price cannot exceed its regular price');
    }
    if (v.salePrice === 0 || v.salePrice === null) v.salePrice = undefined;
    if (seenSku.has(v.sku)) this.invalidate(`variants.${i}.sku`, `Duplicate variant SKU ${v.sku}`);
    seenSku.add(v.sku);
    const combo = `${(v.size || '').toLowerCase()}|${((v.color && v.color.name) || '').toLowerCase()}`;
    if (seenCombo.has(combo)) this.invalidate(`variants.${i}`, 'Duplicate size/color combination');
    seenCombo.add(combo);
  });
  next();
});

productSchema.pre('save', function syncDerived(next) {
  // Never keep conflicting product-level and variant-level stock.
  if (this.variants && this.variants.length > 0 && this.stock !== undefined) this.stock = undefined;
  if (this.isModified('colorOptions') && this.colorOptions.length > 0) {
    this.colors = this.colorOptions.map((c) => c.name);
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
