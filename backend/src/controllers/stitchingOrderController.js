const StitchingOrder = require('../models/StitchingOrder');
const Design = require('../models/Design');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { generateOrderId } = require('../services/orderIdService');
const { toBasicFields, applyBasicFields } = require('../services/basicOrderService');
const { getPagination, paginationMeta, pick, normalizeMobile } = require('../utils/helpers');
const { buildOrderFilter } = require('../utils/orderFilters');
const { STITCHING_ORDER_STATUSES, PAYMENT_STATUSES } = require('../utils/constants');

exports.create = asyncHandler(async (req, res) => {
  const body = req.body;

  const design = await Design.findOne({ _id: body.designId, isActive: true })
    .populate('category', 'name')
    .populate('subCategory', 'name');
  if (!design) throw new ApiError(400, 'Selected design is not available');

  const orderId = await generateOrderId('stitching');

  const order = await StitchingOrder.create({
    orderId,
    customer: { name: body.customer.name, mobile: normalizeMobile(body.customer.mobile) },
    design: design._id,
    designSnapshot: {
      designId: design._id,
      name: design.name,
      referenceCode: design.referenceCode,
      description: design.description,
      images: design.images,
      category: { id: design.category._id, name: design.category.name },
      subCategory: { id: design.subCategory._id, name: design.subCategory.name },
    },
    measurements: body.measurements,
    measurementNotes: body.measurementNotes,
    deliveryDate: body.deliveryDate,
    notes: body.notes,
    statusHistory: [{ status: 'New' }],
  });

  sendSuccess(res, {
    statusCode: 201,
    message: 'Stitching order placed successfully',
    data: {
      _id: order._id,
      orderId: order.orderId,
      orderDate: order.orderDate,
      deliveryDate: order.deliveryDate,
      status: order.status,
    },
  });
});

// Admin "Add order" form: basic details only (no design / product lines).
exports.createBasic = asyncHandler(async (req, res) => {
  const f = await toBasicFields(req.body);
  const order = new StitchingOrder({
    orderId: await generateOrderId('stitching'),
    source: 'admin',
    createdAt: f.receivedDate, // so date filters and the dashboard use the received date
    orderDate: f.receivedDate,
    address: f.address,
    statusHistory: [{ status: 'New' }],
  });
  applyBasicFields(order, f, req.admin._id);
  await order.save();
  sendSuccess(res, { statusCode: 201, message: 'Order added', data: order });
});

exports.updateBasic = asyncHandler(async (req, res) => {
  const order = await StitchingOrder.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Stitching order not found');
  if (order.source !== 'admin') throw new ApiError(400, 'Only orders added from the Add order form can be edited here');
  applyBasicFields(order, await toBasicFields(req.body), req.admin._id);
  await order.save();
  sendSuccess(res, { message: 'Order updated', data: order });
});

exports.getAll = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = buildOrderFilter(req.query, {
    statuses: STITCHING_ORDER_STATUSES,
    paymentStatuses: PAYMENT_STATUSES,
  });

  const [items, total] = await Promise.all([
    StitchingOrder.find(filter).select('-statusHistory').sort({ createdAt: -1 }).skip(skip).limit(limit),
    StitchingOrder.countDocuments(filter),
  ]);

  sendSuccess(res, { data: items, meta: paginationMeta(total, page, limit) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const order = await StitchingOrder.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Stitching order not found');
  sendSuccess(res, { data: order });
});

exports.update = asyncHandler(async (req, res) => {
  const order = await StitchingOrder.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Stitching order not found');

  order.set(pick(req.body, ['measurements', 'measurementNotes', 'deliveryDate', 'notes']));
  await order.save();
  sendSuccess(res, { message: 'Stitching order updated', data: order });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const order = await StitchingOrder.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Stitching order not found');

  order.status = req.body.status;
  order.statusHistory.push({ status: req.body.status, note: req.body.note, changedBy: req.admin._id });
  await order.save();
  sendSuccess(res, { message: 'Order status updated', data: order });
});
