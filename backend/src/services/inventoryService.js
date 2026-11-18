const Product = require("../models/Product");
const InventoryLog = require("../models/InventoryLog");
const ReadymadeOrder = require("../models/ReadymadeOrder");
const ApiError = require("../utils/ApiError");

const logEntry = (line, type, change, before, after, extra = {}) => ({
  product: line.product,
  productName: line.productName,
  sku: line.sku || undefined,
  type,
  change,
  before,
  after,
  ...extra,
});

const takeOne = async (line) => {
  if (line.source === "variant") {
    const doc = await Product.findOneAndUpdate(
      {
        _id: line.product,
        isActive: true,
        variants: {
          $elemMatch: {
            sku: line.sku,
            isActive: true,
            stock: { $gte: line.quantity },
          },
        },
      },
      { $inc: { "variants.$.stock": -line.quantity, __v: 1 } },
      { new: true, projection: { variants: 1 } },
    );
    if (!doc) return null;
    const after = doc.variants.find((v) => v.sku === line.sku).stock;
    return { before: after + line.quantity, after };
  }
  const doc = await Product.findOneAndUpdate(
    { _id: line.product, isActive: true, stock: { $gte: line.quantity } },
    { $inc: { stock: -line.quantity, __v: 1 } },
    { new: true, projection: { stock: 1 } },
  );
  if (!doc) return null;
  return { before: doc.stock + line.quantity, after: doc.stock };
};

const giveOne = async (line) => {
  if (line.source === "variant") {
    const doc = await Product.findOneAndUpdate(
      { _id: line.product, "variants.sku": line.sku },
      { $inc: { "variants.$.stock": line.quantity, __v: 1 } },
      { new: true, projection: { variants: 1 } },
    );
    if (!doc) return null;
    const after = doc.variants.find((v) => v.sku === line.sku).stock;
    return { before: after - line.quantity, after };
  }
  const doc = await Product.findOneAndUpdate(
    { _id: line.product, stock: { $type: "number" } },
    { $inc: { stock: line.quantity, __v: 1 } },
    { new: true, projection: { stock: 1 } },
  );
  if (!doc) return null;
  return { before: doc.stock - line.quantity, after: doc.stock };
};

const reserve = async (lines, { type = "order", orderId, admin } = {}) => {
  const taken = [];
  const logs = [];
  for (const line of lines.filter((l) => l.source !== "none")) {
    const result = await takeOne(line);
    if (!result) {
      await Promise.all(taken.map((t) => giveOne(t)));
      throw new ApiError(
        409,
        `Not enough stock for "${line.productName}"${line.label ? ` (${line.label})` : ""}`,
      );
    }
    taken.push(line);
    logs.push(
      logEntry(line, type, -line.quantity, result.before, result.after, {
        orderId,
        admin,
        reason: `Order ${orderId || ""}`.trim(),
      }),
    );
  }
  return { taken, logs };
};

const release = async (
  lines,
  { type = "order-restore", orderId, admin, reason } = {},
) => {
  const logs = [];
  const skipped = [];
  for (const line of lines.filter((l) => l.source !== "none")) {
    const result = await giveOne(line);
    if (!result) skipped.push(line);
    else
      logs.push(
        logEntry(line, type, line.quantity, result.before, result.after, {
          orderId,
          admin,
          reason: reason || `Order ${orderId || ""}`.trim(),
        }),
      );
  }
  return { logs, skipped };
};

const writeLogs = async (logs) => {
  if (logs && logs.length > 0) await InventoryLog.insertMany(logs);
};

const linesFromOrder = (order) =>
  order.items.map((item) => ({
    product: item.product,
    productName: item.productSnapshot.name,
    sku: item.variant && item.variant.sku,
    quantity: item.quantity,
    source: item.stockSource || "none",
    label: item.variant && item.variant.sku,
  }));

const syncOrderInventory = async (order, newStatus, adminId) => {
  if (newStatus === "Cancelled") {
    const claimed = await ReadymadeOrder.findOneAndUpdate(
      { _id: order._id, "inventory.deducted": true },
      {
        $set: {
          "inventory.deducted": false,
          "inventory.restoredAt": new Date(),
        },
      },
      { new: true },
    );
    if (!claimed) return { changed: false };
    const { logs, skipped } = await release(linesFromOrder(claimed), {
      orderId: claimed.orderId,
      admin: adminId,
      reason: `Order ${claimed.orderId} cancelled`,
    });
    await writeLogs(logs);
    return { changed: true, restored: logs.length, skipped: skipped.length };
  }

  const claimed = await ReadymadeOrder.findOneAndUpdate(
    { _id: order._id, "inventory.deducted": false },
    {
      $set: { "inventory.deducted": true, "inventory.deductedAt": new Date() },
    },
    { new: true },
  );
  if (!claimed) return { changed: false };
  try {
    const { logs } = await reserve(linesFromOrder(claimed), {
      type: "order-reopen",
      orderId: claimed.orderId,
      admin: adminId,
    });
    await writeLogs(logs);
    return { changed: true };
  } catch (err) {
    await ReadymadeOrder.updateOne(
      { _id: order._id },
      { $set: { "inventory.deducted": false } },
    );
    if (err.statusCode === 409)
      err.message = `Cannot re-open this order: ${err.message}`;
    throw err;
  }
};

module.exports = {
  reserve,
  release,
  writeLogs,
  syncOrderInventory,
  linesFromOrder,
};
