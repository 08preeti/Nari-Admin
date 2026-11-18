const ApiError = require("../utils/ApiError");

const rateLimit = ({ windowMs, max, keyFn }) => {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    hits.forEach((v, k) => v.resetAt <= now && hits.delete(k));
  }, windowMs).unref();

  return (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      return next(
        new ApiError(429, "Too many attempts. Please try again later."),
      );
    }
    return next();
  };
};

module.exports = rateLimit;
