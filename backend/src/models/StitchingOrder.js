const mongoose = require("mongoose");
const { STITCHING_ORDER_STATUSES } = require("../utils/constants");
const {
  imageSchema,
  customerSchema,
  catalogSchema,
  paymentSchema,
  statusHistorySchema,
  applyPaymentRules,
} = require("./common");

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
  { _id: false },
);

const stitchingOrderSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    orderType: { type: String, default: "stitching", immutable: true },
    customer: { type: customerSchema, required: true },
    design: { type: Schema.Types.ObjectId, ref: "Design" },
    designSnapshot: { type: designSnapshotSchema },
    measurements: { type: Map, of: Number, default: {} },
    measurementNotes: { type: String, trim: true, maxlength: 1000 },
    orderDate: { type: Date, default: Date.now },
    deliveryDate: { type: Date },
    // Orders typed in from the admin "Add order" form ('admin') vs placed from the storefront ('storefront').
    source: {
      type: String,
      enum: ["storefront", "admin"],
      default: "storefront",
      index: true,
    },
    catalog: { type: catalogSchema },
    receivedDate: { type: Date },
    deliveredDate: { type: Date },
    address: { line1: { type: String, trim: true, maxlength: 500 } },
    notes: { type: String, trim: true, maxlength: 1000 },
    payment: { type: paymentSchema, default: () => ({}) },
    status: {
      type: String,
      enum: STITCHING_ORDER_STATUSES,
      default: "New",
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
  },
  { timestamps: true },
);

stitchingOrderSchema.index({ "customer.mobile": 1 });
stitchingOrderSchema.index({ createdAt: -1 });

applyPaymentRules(stitchingOrderSchema);

module.exports = mongoose.model("StitchingOrder", stitchingOrderSchema);
