const mongoose = require("mongoose");
const { READYMADE_ORDER_STATUSES } = require("../utils/constants");
const {
  customerSchema,
  catalogSchema,
  paymentSchema,
  statusHistorySchema,
  applyPaymentRules,
} = require("./common");

const { Schema } = mongoose;

const addressSchema = new Schema(
  {
    line1: {
      type: String,
      required: [true, "Address line 1 is required"],
      trim: true,
    },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
  },
  { _id: false },
);

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productSnapshot: {
      name: { type: String, required: true },
      sku: { type: String },
      image: { type: String },
    },
    variant: {
      sku: String,
      size: String,
      // New orders store { name, hex }. Orders created before variants existed stored a plain string.
      color: { type: Schema.Types.Mixed },
    },
    quantity: { type: Number, required: true, min: 1 },
    regularPrice: { type: Number, min: 0 }, // price at purchase before any sale price
    salePrice: { type: Number, min: 0 }, // sale price at purchase, if one applied
    unitPrice: { type: Number, required: true, min: 0 }, // price actually charged per unit
    lineTotal: { type: Number, required: true, min: 0 },
    // Where stock was taken from: 'variant', 'product' (legacy product-level stock) or 'none' (untracked).
    stockSource: {
      type: String,
      enum: ["variant", "product", "none"],
      default: "none",
    },
  },
  { _id: false },
);

const readymadeOrderSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    orderType: { type: String, default: "readymade", immutable: true },
    customer: { type: customerSchema, required: true },
    address: { type: addressSchema, required: true },
    items: {
      type: [orderItemSchema],
      validate: [
        function hasItems(items) {
          return this.source === "admin" || items.length > 0;
        },
        "An order needs at least one item",
      ],
    },
    orderTotal: { type: Number, required: true, min: 0 },
    // Orders typed in from the admin "Add order" form ("admin") vs placed from the storefront ("storefront").
    source: { type: String, enum: ["storefront", "admin"], default: "storefront", index: true },
    catalog: { type: catalogSchema },
    receivedDate: { type: Date },
    deliveredDate: { type: Date },

    notes: { type: String, trim: true, maxlength: 1000 },
    payment: { type: paymentSchema, default: () => ({}) },
    // Absent on orders created before inventory tracking, so they never touch stock.
    inventory: {
      deducted: { type: Boolean },
      deductedAt: Date,
      restoredAt: Date,
    },
    status: {
      type: String,
      enum: READYMADE_ORDER_STATUSES,
      default: "New",
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
  },
  { timestamps: true },
);

readymadeOrderSchema.index({ "customer.mobile": 1 });
readymadeOrderSchema.index({ createdAt: -1 });

applyPaymentRules(readymadeOrderSchema);

module.exports = mongoose.model("ReadymadeOrder", readymadeOrderSchema);
