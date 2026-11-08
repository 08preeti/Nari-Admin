const mongoose = require('mongoose');
const { INVENTORY_LOG_TYPES } = require('../utils/constants');

const { Schema } = mongoose;

// Append-only history of stock movements (variant level, or product level for legacy products).
const inventoryLogSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productName: String,
    sku: { type: String, index: true }, // variant SKU; undefined for legacy product-level stock
    type: { type: String, enum: INVENTORY_LOG_TYPES, required: true },
    change: { type: Number, required: true },
    before: Number,
    after: Number,
    reason: { type: String, trim: true, maxlength: 300 },
    orderId: String, // human order id e.g. RDY-000012
    admin: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

inventoryLogSchema.index({ product: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
