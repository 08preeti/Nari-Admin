const StitchingOrder = require('../models/StitchingOrder');
const ReadymadeOrder = require('../models/ReadymadeOrder');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { getPagination, paginationMeta, escapeRegex, normalizeMobile, round2 } = require('../utils/helpers');

// Customers are derived from order records (no separate customer collection), keyed by mobile number,
// so a customer who orders both readymade and stitching appears once.
// totalSpending counts non-cancelled orders only.
const basePipeline = () => [
  {
    $project: {
      orderType: 1,
      name: '$customer.name',
      mobile: '$customer.mobile',
      status: 1,
      createdAt: 1,
      total: '$payment.totalAmount',
      paid: '$payment.paidAmount',
    },
  },
  {
    $unionWith: {
      coll: StitchingOrder.collection.name,
      pipeline: [
        {
          $project: {
            orderType: 1,
            name: '$customer.name',
            mobile: '$customer.mobile',
            status: 1,
            createdAt: 1,
            total: '$payment.totalAmount',
            paid: '$payment.paidAmount',
          },
        },
      ],
    },
  },
];

exports.getAll = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';

  const pipeline = basePipeline();
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    pipeline.push({ $match: { $or: [{ name: rx }, { mobile: rx }] } });
  }
  pipeline.push(
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$mobile',
        name: { $first: '$name' },
        orderCount: { $sum: 1 },
        readymadeOrders: { $sum: { $cond: [{ $eq: ['$orderType', 'readymade'] }, 1, 0] } },
        stitchingOrders: { $sum: { $cond: [{ $eq: ['$orderType', 'stitching'] }, 1, 0] } },
        totalSpending: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 0, '$total'] } },
        totalPaid: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 0, '$paid'] } },
        lastOrderDate: { $max: '$createdAt' },
      },
    },
    {
      $facet: {
        items: [{ $sort: { lastOrderDate: -1 } }, { $skip: skip }, { $limit: limit }],
        total: [{ $count: 'n' }],
      },
    }
  );

  const [row] = await ReadymadeOrder.aggregate(pipeline);
  const items = row.items.map((c) => ({
    mobile: c._id,
    name: c.name,
    orderCount: c.orderCount,
    readymadeOrders: c.readymadeOrders,
    stitchingOrders: c.stitchingOrders,
    totalSpending: round2(c.totalSpending),
    totalPaid: round2(c.totalPaid),
    lastOrderDate: c.lastOrderDate,
  }));
  const total = row.total[0] ? row.total[0].n : 0;
  sendSuccess(res, { data: items, meta: paginationMeta(total, page, limit) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const mobile = normalizeMobile(req.params.mobile);
  const fields = 'orderId orderType status createdAt payment.totalAmount payment.paidAmount payment.balance payment.status';
  const [readymade, stitching] = await Promise.all([
    ReadymadeOrder.find({ 'customer.mobile': mobile }).select(`${fields} items.productSnapshot.name items.quantity customer`).lean(),
    StitchingOrder.find({ 'customer.mobile': mobile }).select(`${fields} designSnapshot.name designSnapshot.referenceCode deliveryDate customer`).lean(),
  ]);
  const orders = [...readymade, ...stitching].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (orders.length === 0) throw new ApiError(404, 'No orders found for this mobile number');

  const live = orders.filter((o) => o.status !== 'Cancelled');
  sendSuccess(res, {
    data: {
      mobile,
      name: orders[0].customer.name,
      orderCount: orders.length,
      totalSpending: round2(live.reduce((s, o) => s + (o.payment.totalAmount || 0), 0)),
      totalPaid: round2(live.reduce((s, o) => s + (o.payment.paidAmount || 0), 0)),
      lastOrderDate: orders[0].createdAt,
      orders,
    },
  });
});
