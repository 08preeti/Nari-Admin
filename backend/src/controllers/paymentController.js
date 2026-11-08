const StitchingOrder = require('../models/StitchingOrder');
const ReadymadeOrder = require('../models/ReadymadeOrder');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { applyPaymentUpdate } = require('../services/paymentService');
const { getPagination, paginationMeta } = require('../utils/helpers');
const { buildOrderFilter } = require('../utils/orderFilters');
const { PAYMENT_STATUSES } = require('../utils/constants');

const MODELS = { stitching: StitchingOrder, readymade: ReadymadeOrder };

const getModel = (orderType) => {
  const Model = MODELS[orderType];
  if (!Model) throw new ApiError(400, 'orderType must be "stitching" or "readymade"');
  return Model;
};

const LIST_FIELDS = 'orderId orderType customer payment status createdAt';

exports.getAll = asyncHandler(async (req, res) => {
  const Model = getModel(req.params.orderType);
  const { page, limit, skip } = getPagination(req.query);
  // `status` has always meant the PAYMENT status on this endpoint; keep that.
  const filter = buildOrderFilter(
    { ...req.query, paymentStatus: req.query.paymentStatus || req.query.status, status: undefined },
    { paymentStatuses: PAYMENT_STATUSES }
  );
  if (typeof req.query.method === 'string' && req.query.method.trim()) {
    filter['payment.method'] = req.query.method.trim();
  }
  if (req.query.outstanding === 'true') filter['payment.balance'] = { $gt: 0 };

  const [items, total] = await Promise.all([
    Model.find(filter).select(LIST_FIELDS).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Model.countDocuments(filter),
  ]);

  sendSuccess(res, { data: items, meta: paginationMeta(total, page, limit) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const Model = getModel(req.params.orderType);
  const order = await Model.findById(req.params.id).select(LIST_FIELDS);
  if (!order) throw new ApiError(404, 'Order not found');
  sendSuccess(res, { data: order });
});

exports.update = asyncHandler(async (req, res) => {
  const Model = getModel(req.params.orderType);
  const order = await Model.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');

  await applyPaymentUpdate(order, req.body, req.admin._id);
  sendSuccess(res, {
    message: 'Payment updated',
    data: { _id: order._id, orderId: order.orderId, orderType: order.orderType, payment: order.payment },
  });
});
