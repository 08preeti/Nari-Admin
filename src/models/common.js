const mongoose = require('mongoose');
const { PAYMENT_STATUSES } = require('../utils/constants');
const { round2 } = require('../utils/helpers');

const { Schema } = mongoose;

const imageSchema = new Schema(
  {
    url: { type: String, required: [true, 'Image url is required'], trim: true },
    alt: { type: String, trim: true },
  },
  { _id: false }
);

const customerSchema = new Schema(
  {
    name: { type: String, required: [true, 'Customer name is required'], trim: true, maxlength: 100 },
    mobile: { type: String, required: [true, 'Customer mobile is required'], trim: true },
  },
  { _id: false }
);

const paymentSchema = new Schema(
  {
    status: { type: String, enum: PAYMENT_STATUSES, default: 'Pending' },
    totalAmount: { type: Number, min: 0, default: 0 },
    paidAmount: { type: Number, min: 0, default: 0 },
    balance: { type: Number, min: 0, default: 0 },
    method: { type: String, trim: true },
    lastUpdatedAt: { type: Date },
    lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { _id: false }
);

const statusHistorySchema = new Schema(
  {
    status: { type: String, required: true },
    note: { type: String, trim: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { _id: false }
);

const applyPaymentRules = (schema) => {
  schema.pre('validate', function calculateBalance(next) {
    if (this.payment) {
      const total = this.payment.totalAmount || 0;
      const paid = this.payment.paidAmount || 0;
      if (paid > total) {
        this.invalidate('payment.paidAmount', 'paidAmount cannot be greater than totalAmount');
      }
      this.payment.balance = Math.max(round2(total - paid), 0);
    }
    next();
  });
};

module.exports = {
  imageSchema,
  customerSchema,
  paymentSchema,
  statusHistorySchema,
  applyPaymentRules,
};
