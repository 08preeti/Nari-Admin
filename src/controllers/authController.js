const AdminUser = require('../models/AdminUser');
const { comparePassword, signToken } = require('../services/authService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const publicAdmin = (admin) => ({
  _id: admin._id,
  name: admin.name,
  email: admin.email,
  role: admin.role,
  lastLogin: admin.lastLogin,
});

exports.login = asyncHandler(async (req, res) => {
  const email = req.body.email.trim().toLowerCase();

  const admin = await AdminUser.findOne({ email }).select('+passwordHash');
  const passwordOk = admin ? await comparePassword(req.body.password, admin.passwordHash) : false;

  if (!admin || !passwordOk || !admin.isActive) {
    throw new ApiError(401, 'Invalid email or password');
  }

  admin.lastLogin = new Date();
  await admin.save({ validateBeforeSave: false });

  sendSuccess(res, {
    message: 'Login successful',
    data: { token: signToken(admin), admin: publicAdmin(admin) },
  });
});

exports.getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: publicAdmin(req.admin) });
});
