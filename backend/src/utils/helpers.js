const { round2 } = require('./pricing');

const getPagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const paginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});

const pick = (obj, keys) =>
  keys.reduce((acc, key) => {
    if (obj[key] !== undefined) acc[key] = obj[key];
    return acc;
  }, {});

const visibilityFilter = (req) => (req.admin ? {} : { isActive: true });

const listFilter = (req) => {
  const filter = visibilityFilter(req);
  if (req.admin && typeof req.query.isActive === 'string') {
    filter.isActive = req.query.isActive === 'true';
  }
  return filter;
};

const normalizeMobile = (value) => {
  let m = String(value).replace(/[\s\-()]/g, '');
  if (m.startsWith('+91')) m = m.slice(3);
  else if (m.length === 12 && m.startsWith('91')) m = m.slice(2);
  else if (m.length === 11 && m.startsWith('0')) m = m.slice(1);
  return m;
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Parses YYYY-MM-DD (or any Date-parsable) input. `to` dates are made inclusive of the whole day.
const parseDateRange = (query) => {
  const range = {};
  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  if (from && !Number.isNaN(from.getTime())) range.from = from;
  if (to && !Number.isNaN(to.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(query.to))) to.setUTCHours(23, 59, 59, 999);
    range.to = to;
  }
  return range;
};

const dateRangeFilter = (query, field = 'createdAt') => {
  const { from, to } = parseDateRange(query);
  if (!from && !to) return null;
  const cond = {};
  if (from) cond.$gte = from;
  if (to) cond.$lte = to;
  return { [field]: cond };
};

module.exports = {
  getPagination,
  paginationMeta,
  pick,
  round2,
  visibilityFilter,
  listFilter,
  normalizeMobile,
  escapeRegex,
  parseDateRange,
  dateRangeFilter,
};
