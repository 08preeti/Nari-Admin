const { DEFAULT_LOW_STOCK_THRESHOLD } = require('./constants');

// Effective stock as a Mongo expression: sum of ACTIVE variant stock, or legacy stock if no variants.
const STOCK_EXPR = {
  $cond: [
    { $gt: [{ $size: { $ifNull: ['$variants', []] } }, 0] },
    { $sum: { $map: { input: { $filter: { input: '$variants', as: 'v', cond: '$$v.isActive' } }, as: 'v', in: '$$v.stock' } } },
    { $ifNull: ['$stock', null] },
  ],
};
const THRESHOLD_EXPR = { $ifNull: ['$lowStockThreshold', DEFAULT_LOW_STOCK_THRESHOLD] };

module.exports = { STOCK_EXPR, THRESHOLD_EXPR };
