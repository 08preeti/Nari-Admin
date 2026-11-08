const ReadymadeOrder = require('../models/ReadymadeOrder');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');
const { generateOrderId } = require('../services/orderIdService');
const { buildOrderItems } = require('../services/readymadeOrderService');
const inventory = require('../services/inventoryService');
const { getPagination, paginationMeta, normalizeMobile } = require('../utils/helpers');
const { buildOrderFilter } = require('../utils/orderFilters');
const { READYMADE_ORDER_STATUSES, PAYMENT_STATUSES } = require('../utils/constants');

// Public (storefront) endpoint. Price, SKU and stock come from the database, never from the request.
exports.create = asyncHandler(async (req, res) => {
  const body = req.body;

  const { items, orderTotal, reservations } = await buildOrderItems(body.items);
  const orderId = await generateOrderId('readymade');

  // Take the stock first (atomic + all-or-nothing). If two customers race for the last unit, exactly
  // one reservation succeeds and the other gets a 409.
  const { logs } = await inventory.reserve(reservations, { orderId });

  let order;
  try {
    order = await ReadymadeOrder.create({
      orderId,
      customer: { name: body.customer.name, mobile: normalizeMobile(body.customer.mobile) },
      address: {
        line1: body.address.line1,
        line2: body.address.line2,
        city: body.address.city,
        state: body.address.state,
        pincode: body.address.pincode.trim(),
      },
      items,
      orderTotal,
      notes: body.notes,
      payment: { status: 'Pending', totalAmount: orderTotal, paidAmount: 0, method: body.paymentMethod },
      inventory: { deducted: true, deductedAt: new Date() },
      statusHistory: [{ status: 'New' }],
    });
  } catch (err) {
    await inventory.release(reservations, { orderId, reason: `Order ${orderId} failed to save` });
    throw err;
  }
  await inventory.writeLogs(logs);

  sendSuccess(res, {
    statusCode: 201,
    message: 'Readymade order placed successfully',
    data: {
      _id: order._id,
      orderId: order.orderId,
      orderTotal: order.orderTotal,
      status: order.status,
    },
  });
});

exports.getAll = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = buildOrderFilter(req.query, {
    statuses: READYMADE_ORDER_STATUSES,
    paymentStatuses: PAYMENT_STATUSES,
  });

  const [items, total] = await Promise.all([
    ReadymadeOrder.find(filter).select('-statusHistory').sort({ createdAt: -1 }).skip(skip).limit(limit),
    ReadymadeOrder.countDocuments(filter),
  ]);

  sendSuccess(res, { data: items, meta: paginationMeta(total, page, limit) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const order = await ReadymadeOrder.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Readymade order not found');
  sendSuccess(res, { data: order });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const order = await ReadymadeOrder.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Readymade order not found');

  const newStatus = req.body.status;
  // Stock first: if re-opening a cancelled order fails for lack of stock, the status stays unchanged.
  await inventory.syncOrderInventory(order, newStatus, req.admin._id);

  if (order.status !== newStatus || req.body.note) {
    order.status = newStatus;
    order.statusHistory.push({ status: newStatus, note: req.body.note, changedBy: req.admin._id });
    await order.save();
  }
  const fresh = await ReadymadeOrder.findById(order._id);
  sendSuccess(res, { message: 'Order status updated', data: fresh });
});
