const Product = require('../models/Product');
const StitchingOrder = require('../models/StitchingOrder');
const ReadymadeOrder = require('../models/ReadymadeOrder');
const env = require('../config/env');
const { round2 } = require('../utils/pricing');
const { parseDateRange } = require('../utils/helpers');
const { STOCK_EXPR, THRESHOLD_EXPR } = require('../utils/stockExpr');

// ---- Metric definitions (kept in one place so every number means the same thing) ----
//  * Cancelled orders never count as sales, revenue, outstanding or completed.
//  * Completed = status "Delivered".  Pending = neither Delivered nor Cancelled.
//  * Collected revenue = SUM(payment.paidAmount)  -> money actually received.
//  * Booked sales      = SUM(payment.totalAmount) -> value of all non-cancelled orders.
//  * Outstanding       = SUM(payment.balance)     -> booked - collected. A partially paid order
//                        contributes its paid part to revenue and only the rest to outstanding,
//                        so nothing is counted twice.
//  * Order metrics follow the optional from/to date range (order created date).
//    Product / stock cards are always a live snapshot.

const productStats = async () => {
  const [row] = await Product.aggregate([
    { $addFields: { eff: STOCK_EXPR, thr: THRESHOLD_EXPR, vs: { $ifNull: ['$variants', []] } } },
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        activeProducts: { $sum: { $cond: ['$isActive', 1, 0] } },
        totalVariants: { $sum: { $size: '$vs' } },
        activeVariants: { $sum: { $size: { $filter: { input: '$vs', as: 'v', cond: '$$v.isActive' } } } },
        totalStock: { $sum: { $cond: ['$isActive', { $ifNull: ['$eff', 0] }, 0] } },
        lowStockProducts: {
          $sum: { $cond: [{ $and: ['$isActive', { $gt: ['$eff', 0] }, { $lte: ['$eff', '$thr'] }] }, 1, 0] },
        },
        outOfStockProducts: {
          $sum: { $cond: [{ $and: ['$isActive', { $ne: ['$eff', null] }, { $lte: ['$eff', 0] }] }, 1, 0] },
        },
        outOfStockVariants: {
          $sum: {
            $cond: [
              '$isActive',
              { $size: { $filter: { input: '$vs', as: 'v', cond: { $and: ['$$v.isActive', { $lte: ['$$v.stock', 0] }] } } } },
              0,
            ],
          },
        },
      },
    },
    { $project: { _id: 0 } },
  ]);
  return (
    row || {
      totalProducts: 0,
      activeProducts: 0,
      totalVariants: 0,
      activeVariants: 0,
      totalStock: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      outOfStockVariants: 0,
    }
  );
};

const dayMs = 86400000;
const chooseGranularity = (from, to) => {
  if (!from) return 'month';
  const span = ((to || new Date()).getTime() - from.getTime()) / dayMs;
  return span <= 92 ? 'day' : 'month';
};

const orderMatch = (range) => {
  const match = {};
  if (range.from || range.to) {
    match.createdAt = {};
    if (range.from) match.createdAt.$gte = range.from;
    if (range.to) match.createdAt.$lte = range.to;
  }
  return match;
};

const orderStats = async (Model, range, format) => {
  const match = orderMatch(range);
  const [row] = await Model.aggregate([
    { $match: match },
    {
      $facet: {
        counts: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
              completed: { $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] } },
              pending: { $sum: { $cond: [{ $in: ['$status', ['Delivered', 'Cancelled']] }, 0, 1] } },
            },
          },
        ],
        money: [
          { $match: { status: { $ne: 'Cancelled' } } },
          {
            $group: {
              _id: null,
              collected: { $sum: '$payment.paidAmount' },
              booked: { $sum: '$payment.totalAmount' },
              outstanding: { $sum: '$payment.balance' },
            },
          },
        ],
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        trend: [
          { $match: { status: { $ne: 'Cancelled' } } },
          {
            $group: {
              _id: { $dateToString: { format, date: '$createdAt', timezone: env.businessTimezone } },
              revenue: { $sum: '$payment.paidAmount' },
              booked: { $sum: '$payment.totalAmount' },
              orders: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);
  const counts = (row.counts[0]) || { total: 0, cancelled: 0, completed: 0, pending: 0 };
  const money = (row.money[0]) || { collected: 0, booked: 0, outstanding: 0 };
  return {
    counts: { total: counts.total, cancelled: counts.cancelled, completed: counts.completed, pending: counts.pending },
    money: { collected: round2(money.collected), booked: round2(money.booked), outstanding: round2(money.outstanding) },
    byStatus: row.byStatus,
    trend: row.trend,
  };
};

const recentOrders = async (range, limit = 8) => {
  const match = orderMatch(range);
  const fields = 'orderId orderType customer.name status payment.totalAmount payment.paidAmount payment.status createdAt';
  const [a, b] = await Promise.all([
    ReadymadeOrder.find(match).select(fields).sort({ createdAt: -1 }).limit(limit).lean(),
    StitchingOrder.find(match).select(fields).sort({ createdAt: -1 }).limit(limit).lean(),
  ]);
  return [...a, ...b].sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt)).slice(0, limit);
};

const buildSummary = async (query) => {
  const range = parseDateRange(query);
  const granularity = chooseGranularity(range.from, range.to);
  const format = granularity === 'day' ? '%Y-%m-%d' : '%Y-%m';

  const [products, readymade, stitching, recent] = await Promise.all([
    productStats(),
    orderStats(ReadymadeOrder, range, format),
    orderStats(StitchingOrder, range, format),
    recentOrders(range),
  ]);

  const trendMap = new Map();
  const addTrend = (rows, key) =>
    rows.forEach((r) => {
      const point = trendMap.get(r._id) || { date: r._id, readymade: 0, stitching: 0, total: 0 };
      point[key] = round2(point[key] + r.revenue);
      point.total = round2(point.readymade + point.stitching);
      trendMap.set(r._id, point);
    });
  addTrend(readymade.trend, 'readymade');
  addTrend(stitching.trend, 'stitching');
  const trends = [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  const statusMap = new Map();
  [...readymade.byStatus, ...stitching.byStatus].forEach((r) => statusMap.set(r._id, (statusMap.get(r._id) || 0) + r.count));
  const statusDistribution = [...statusMap.entries()].map(([status, count]) => ({ status, count }));

  const orders = {
    total: readymade.counts.total + stitching.counts.total,
    pending: readymade.counts.pending + stitching.counts.pending,
    completed: readymade.counts.completed + stitching.counts.completed,
    cancelled: readymade.counts.cancelled + stitching.counts.cancelled,
    byType: { readymade: readymade.counts, stitching: stitching.counts },
  };
  const revenue = {
    collected: round2(readymade.money.collected + stitching.money.collected),
    booked: round2(readymade.money.booked + stitching.money.booked),
    outstanding: round2(readymade.money.outstanding + stitching.money.outstanding),
    byType: { readymade: readymade.money, stitching: stitching.money },
  };

  return {
    range: { from: range.from || null, to: range.to || null, granularity, timezone: env.businessTimezone },
    products,
    orders,
    revenue,
    trends,
    statusDistribution,
    recentOrders: recent,
    // ---- kept for existing clients ----
    completedStitchingOrders: stitching.counts.completed,
    pendingOrders: {
      stitching: stitching.counts.pending,
      readymade: readymade.counts.pending,
      total: orders.pending,
    },
    totalRevenue: {
      stitching: stitching.money.collected,
      readymade: readymade.money.collected,
      total: revenue.collected,
    },
  };
};

module.exports = { buildSummary, productStats, chooseGranularity };
