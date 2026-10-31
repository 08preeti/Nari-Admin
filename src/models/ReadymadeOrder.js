const mongoose = require('mongoose');
const { READYMADE_ORDER_STATUSES } = require('../utils/constants');
const { customerSchema, paymentSchema, statusHistorySchema, applyPaymentRules } = require('./common');

const { Schema } = mongoose;

const addressSchema = new Schema(
  {
    line1: { type: String, required: [true, 'Address line 1 is required'], trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: [true, 'City is required'], trim: true },
    state: { type: String, required: [true, 'State is required'], trim: true },
    pincode: { type: String, required: [true, 'Pincode is required'], trim: true },
  },
  { _id: false }
);

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productSnapshot: {
      name: { type: String, required: true },
      sku: { type: String },
      image: { type: String },
    },
    variant: {
      size: String,
      color: String,
    },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const readymadeOrderSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    orderType: { type: String, default: 'readymade', immutable: true },
    customer: { type: customerSchema, required: true },
    address: { type: addressSchema, required: true },
    items: {
      type: [orderItemSchema],
      validate: [(items) => items.length > 0, 'An order needs at least one item'],
    },
    orderTotal: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true, maxlength: 1000 },
    payment: { type: paymentSchema, default: () => ({}) },
    status: { type: String, enum: READYMADE_ORDER_STATUSES, default: 'New', index: true },
    statusHistory: { type: [statusHistorySchema], default: [] },
  },
  { timestamps: true }
);

applyPaymentRules(readymadeOrderSchema);

module.exports = mongoose.model('ReadymadeOrder', readymadeOrderSchema);
