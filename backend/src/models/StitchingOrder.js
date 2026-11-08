const mongoose = require('mongoose');
const { STITCHING_ORDER_STATUSES } = require('../utils/constants');
const {
  imageSchema,
  customerSchema,
  paymentSchema,
  statusHistorySchema,
  applyPaymentRules,
} = require('./common');

const { Schema } = mongoose;

const designSnapshotSchema = new Schema(
  {
    designId: { type: Schema.Types.ObjectId },
    name: String,
    referenceCode: String,
    description: String,
    images: [imageSchema],
    category: { id: Schema.Types.ObjectId, name: String },
    subCategory: { id: Schema.Types.ObjectId, name: String },
  },
  { _id: false }
);

const stitchingOrderSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    orderType: { type: String, default: 'stitching', immutable: true },
    customer: { type: customerSchema, required: true },
    design: { type: Schema.Types.ObjectId, ref: 'Design', required: true },
    designSnapshot: { type: designSnapshotSchema, required: true },
    measurements: { type: Map, of: Number, default: {} },
    measurementNotes: { type: String, trim: true, maxlength: 1000 },
    orderDate: { type: Date, default: Date.now },
    deliveryDate: { type: Date, required: [true, 'Delivery date is required'] },
    notes: { type: String, trim: true, maxlength: 1000 },
    payment: { type: paymentSchema, default: () => ({}) },
    status: { type: String, enum: STITCHING_ORDER_STATUSES, default: 'New', index: true },
    statusHistory: { type: [statusHistorySchema], default: [] },
  },
  { timestamps: true }
);

stitchingOrderSchema.index({ 'customer.mobile': 1 });
stitchingOrderSchema.index({ createdAt: -1 });

applyPaymentRules(stitchingOrderSchema);

module.exports = mongoose.model('StitchingOrder', stitchingOrderSchema);
