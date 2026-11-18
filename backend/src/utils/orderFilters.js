const { escapeRegex, normalizeMobile, dateRangeFilter } = require("./helpers");

const buildOrderFilter = (
  query,
  { statuses = [], paymentStatuses = [] } = {},
) => {
  const filter = {};
  if (statuses.includes(query.status)) filter.status = query.status;
  if (paymentStatuses.includes(query.paymentStatus))
    filter["payment.status"] = query.paymentStatus;

  if (typeof query.q === "string" && query.q.trim()) {
    const raw = query.q.trim().slice(0, 100);
    const rx = new RegExp(escapeRegex(raw), "i");
    const clauses = [
      { orderId: rx },
      { "customer.name": rx },
      { "customer.mobile": rx },
    ];
    const digits = normalizeMobile(raw);
    if (/^\d{3,}$/.test(digits) && digits !== raw)
      clauses.push({ "customer.mobile": new RegExp(escapeRegex(digits)) });
    filter.$or = clauses;
  }

  const range = dateRangeFilter(query, "createdAt");
  if (range) Object.assign(filter, range);
  return filter;
};

module.exports = { buildOrderFilter };
