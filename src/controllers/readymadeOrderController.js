const ReadymadeOrder = require('../models/ReadymadeOrder');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');
const { generateOrderId } = require('../services/orderIdService');
const { buildOrderItems } = require('../services/readymadeOrderService');
const { getPagination, paginationMeta, normalizeMobile } = require('../utils/helpers');
const { READYMADE_ORDER_STATUSES, PAYMENT_STATUSES } = require('../utils/constants');

exports.create = asyncHandler(async (req, res) => {
  const body = req.body;

  const { items, orderTotal } = await buildOrderItems(body.items);
  const orderId = await generateOrderId('readymade');

  const order = await ReadymadeOrder.create({
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
    statusHistory: [{ status: 'New' }],
  });

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
  const filter = {};
  if (READYMADE_ORDER_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (PAYMENT_STATUSES.includes(req.query.paymentStatus)) filter['payment.status'] = req.query.paymentStatus;

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

  order.status = req.body.status;
  order.statusHistory.push({ status: req.body.status, note: req.body.note, changedBy: req.admin._id });
  await order.save();
  sendSuccess(res, { message: 'Order status updated', data: order });
});
