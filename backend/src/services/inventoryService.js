const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const ReadymadeOrder = require('../models/ReadymadeOrder');
const ApiError = require('../utils/ApiError');

// Stock changes are single conditional MongoDB updates ("take N only if at least N is there"), so they
// are atomic per product document and safe without transactions (works on standalone MongoDB too).
// Every change also bumps __v so a stale admin product form is rejected instead of overwriting stock.

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
  if (line.source === 'variant') {
    const doc = await Product.findOneAndUpdate(
      {
        _id: line.product,
        isActive: true,
        variants: { $elemMatch: { sku: line.sku, isActive: true, stock: { $gte: line.quantity } } },
      },
      { $inc: { 'variants.$.stock': -line.quantity, __v: 1 } },
      { new: true, projection: { variants: 1 } }
    );
    if (!doc) return null;
    const after = doc.variants.find((v) => v.sku === line.sku).stock;
    return { before: after + line.quantity, after };
  }
  const doc = await Product.findOneAndUpdate(
    { _id: line.product, isActive: true, stock: { $gte: line.quantity } },
    { $inc: { stock: -line.quantity, __v: 1 } },
    { new: true, projection: { stock: 1 } }
  );
  if (!doc) return null;
  return { before: doc.stock + line.quantity, after: doc.stock };
};

const giveOne = async (line) => {
  if (line.source === 'variant') {
    const doc = await Product.findOneAndUpdate(
      { _id: line.product, 'variants.sku': line.sku },
      { $inc: { 'variants.$.stock': line.quantity, __v: 1 } },
      { new: true, projection: { variants: 1 } }
    );
    if (!doc) return null;
    const after = doc.variants.find((v) => v.sku === line.sku).stock;
    return { before: after - line.quantity, after };
  }
  const doc = await Product.findOneAndUpdate(
    { _id: line.product, stock: { $type: 'number' } },
    { $inc: { stock: line.quantity, __v: 1 } },
    { new: true, projection: { stock: 1 } }
  );
  if (!doc) return null;
  return { before: doc.stock - line.quantity, after: doc.stock };
};

// lines: [{ product, productName, sku, quantity, source: 'variant'|'product'|'none' }]
// All-or-nothing: if any line cannot be taken, the lines already taken are given back.
// Returns log entries; the caller writes them once the order exists (writeLogs).
const reserve = async (lines, { type = 'order', orderId, admin } = {}) => {
  const taken = [];
  const logs = [];
  for (const line of lines.filter((l) => l.source !== 'none')) {
    const result = await takeOne(line);
    if (!result) {
      await Promise.all(taken.map((t) => giveOne(t)));
      throw new ApiError(409, `Not enough stock for "${line.productName}"${line.label ? ` (${line.label})` : ''}`);
    }
    taken.push(line);
    logs.push(logEntry(line, type, -line.quantity, result.before, result.after, { orderId, admin, reason: `Order ${orderId || ''}`.trim() }));
  }
  return { taken, logs };
};

const release = async (lines, { type = 'order-restore', orderId, admin, reason } = {}) => {
  const logs = [];
  const skipped = [];
  for (const line of lines.filter((l) => l.source !== 'none')) {
    const result = await giveOne(line);
    if (!result) skipped.push(line);
    else logs.push(logEntry(line, type, line.quantity, result.before, result.after, { orderId, admin, reason: reason || `Order ${orderId || ''}`.trim() }));
  }
  return { logs, skipped };
};

const writeLogs = async (logs) => {
  if (logs && logs.length > 0) await InventoryLog.insertMany(logs);
};

// Order line (stored snapshot) -> inventory line
const linesFromOrder = (order) =>
  order.items.map((item) => ({
    product: item.product,
    productName: item.productSnapshot.name,
    sku: item.variant && item.variant.sku,
    quantity: item.quantity,
    source: item.stockSource || 'none',
    label: item.variant && item.variant.sku,
  }));

// Applies the inventory side effects of a status change exactly once.
//   -> Cancelled  : give the stock back, only if this order's stock is currently deducted
//   Cancelled ->  : take the stock again (fails with 409 if it is no longer available)
// The deducted flag is flipped atomically BEFORE stock moves, so repeated or concurrent
// updates can never deduct or restore twice. Orders created before inventory tracking
// have no flag at all and are never touched.
const syncOrderInventory = async (order, newStatus, adminId) => {
  if (newStatus === 'Cancelled') {
    const claimed = await ReadymadeOrder.findOneAndUpdate(
      { _id: order._id, 'inventory.deducted': true },
      { $set: { 'inventory.deducted': false, 'inventory.restoredAt': new Date() } },
      { new: true }
    );
    if (!claimed) return { changed: false };
    const { logs, skipped } = await release(linesFromOrder(claimed), { orderId: claimed.orderId, admin: adminId, reason: `Order ${claimed.orderId} cancelled` });
    await writeLogs(logs);
    return { changed: true, restored: logs.length, skipped: skipped.length };
  }

  const claimed = await ReadymadeOrder.findOneAndUpdate(
    { _id: order._id, 'inventory.deducted': false },
    { $set: { 'inventory.deducted': true, 'inventory.deductedAt': new Date() } },
    { new: true }
  );
  if (!claimed) return { changed: false };
  try {
    const { logs } = await reserve(linesFromOrder(claimed), { type: 'order-reopen', orderId: claimed.orderId, admin: adminId });
    await writeLogs(logs);
    return { changed: true };
  } catch (err) {
    await ReadymadeOrder.updateOne({ _id: order._id }, { $set: { 'inventory.deducted': false } });
    if (err.statusCode === 409) err.message = `Cannot re-open this order: ${err.message}`;
    throw err;
  }
};

module.exports = { reserve, release, writeLogs, syncOrderInventory, linesFromOrder };
