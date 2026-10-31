const AdminUser = require('../models/AdminUser');
const { verifyToken } = require('../services/authService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const getToken = (req) => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
};

const authenticate = asyncHandler(async (req, res, next) => {
  const token = getToken(req);
  if (!token) throw new ApiError(401, 'Authentication required');

  const decoded = verifyToken(token);
  const admin = await AdminUser.findById(decoded.id);
  if (!admin || !admin.isActive) throw new ApiError(401, 'Account not found or disabled');

  req.admin = admin;
  next();
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = getToken(req);
  if (!token) return next();

  try {
    const decoded = verifyToken(token);
    const admin = await AdminUser.findById(decoded.id);
    if (admin && admin.isActive) req.admin = admin;
  } catch (err) {
  }
  return next();
});

module.exports = { authenticate, optionalAuth };
