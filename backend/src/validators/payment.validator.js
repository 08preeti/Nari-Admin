const { isNonNegativeNumber } = require('./common');
const { PAYMENT_STATUSES } = require('../utils/constants');

const validatePaymentUpdate = (body) => {
  const errors = [];
  const keys = ['status', 'paidAmount', 'totalAmount', 'method'];
  if (!keys.some((k) => body[k] !== undefined)) {
    errors.push({ field: 'body', message: `send at least one of: ${keys.join(', ')}` });
  }
  if (body.status !== undefined && !PAYMENT_STATUSES.includes(body.status)) {
    errors.push({ field: 'status', message: `status must be one of: ${PAYMENT_STATUSES.join(', ')}` });
  }
  if (body.paidAmount !== undefined && !isNonNegativeNumber(body.paidAmount)) {
    errors.push({ field: 'paidAmount', message: 'paidAmount must be a number, 0 or more' });
  }
  if (body.totalAmount !== undefined && !isNonNegativeNumber(body.totalAmount)) {
    errors.push({ field: 'totalAmount', message: 'totalAmount must be a number, 0 or more' });
  }
  if (body.method !== undefined && typeof body.method !== 'string') {
    errors.push({ field: 'method', message: 'method must be a string' });
  }
  if (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 300)) {
    errors.push({ field: 'note', message: 'note must be text of 300 characters or fewer' });
  }
  return errors;
};

module.exports = { validatePaymentUpdate };
