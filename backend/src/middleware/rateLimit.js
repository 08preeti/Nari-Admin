const ApiError = require('../utils/ApiError');

// Tiny in-memory limiter (no extra dependency). Per process: fine for a single-instance admin API;
// put a shared limiter (e.g. at the reverse proxy) in front if you scale to several instances.
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
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return next(new ApiError(429, 'Too many attempts. Please try again later.'));
    }
    return next();
  };
};

module.exports = rateLimit;
