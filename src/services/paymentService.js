const ApiError = require('../utils/ApiError');

const applyPaymentUpdate = async (order, updates, adminId) => {
  const { status, paidAmount, totalAmount, method } = updates;

  if (totalAmount !== undefined) {
    if (order.orderType !== 'stitching') {
      throw new ApiError(400, 'totalAmount can only be set on stitching orders');
    }
    order.payment.totalAmount = totalAmount;
  }
  if (paidAmount !== undefined) order.payment.paidAmount = paidAmount;
  if (status !== undefined) order.payment.status = status;
  if (method !== undefined) order.payment.method = method;

  order.payment.lastUpdatedAt = new Date();
  order.payment.lastUpdatedBy = adminId;

  await order.save();
  return order;
};

module.exports = { applyPaymentUpdate };
