const ApiError = require('../utils/ApiError');
const { round2 } = require('../utils/pricing');
const { derivePaymentStatus } = require('../models/common');

// Rules (unchanged from before, now enforced together):
//  - totalAmount is only editable on stitching orders (readymade totals come from the order items)
//  - paidAmount is 0..totalAmount
//  - balance = total - paid, status always matches the amounts
// A caller may still send `status`: it must agree with the amounts. Sending only status "Paid"
// means "the remaining balance was paid".
const applyPaymentUpdate = async (order, updates, adminId) => {
  const { status, paidAmount, totalAmount, method, note } = updates;
  const oldPaid = order.payment.paidAmount || 0;

  let total = order.payment.totalAmount || 0;
  if (totalAmount !== undefined) {
    if (order.orderType !== 'stitching') {
      throw new ApiError(400, 'totalAmount can only be set on stitching orders');
    }
    total = round2(totalAmount);
  }

  let paid = oldPaid;
  if (paidAmount !== undefined) paid = round2(paidAmount);
  else if (status === 'Paid') paid = total;

  if (paid > total) {
    throw new ApiError(400, `Paid amount (${paid}) cannot exceed the total amount (${total})`);
  }

  const derived = derivePaymentStatus(total, paid);
  if (status !== undefined && status !== derived) {
    throw new ApiError(400, `Payment status "${status}" does not match the amounts (paid ${paid} of ${total} = "${derived}")`);
  }

  order.payment.totalAmount = total;
  order.payment.paidAmount = paid;
  if (method !== undefined) order.payment.method = method;
  order.payment.lastUpdatedAt = new Date();
  order.payment.lastUpdatedBy = adminId;

  if (paid !== oldPaid) {
    order.payment.history.push({
      amount: round2(paid - oldPaid),
      paidAmountAfter: paid,
      method: order.payment.method,
      note,
      at: new Date(),
      by: adminId,
    });
  }

  await order.save(); // model hook recalculates balance + status
  return order;
};

module.exports = { applyPaymentUpdate };
