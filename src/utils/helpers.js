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

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

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

module.exports = {
  getPagination,
  paginationMeta,
  pick,
  round2,
  visibilityFilter,
  listFilter,
  normalizeMobile,
};
