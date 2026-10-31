const {
  isObjectId,
  isNonEmptyString,
  isPlainObject,
  isValidDate,
  isPositiveInteger,
  isValidMobile,
} = require('./common');
const {
  STITCHING_ORDER_STATUSES,
  READYMADE_ORDER_STATUSES,
} = require('../utils/constants');

const checkCustomer = (customer, errors) => {
  if (!isPlainObject(customer)) {
    errors.push({ field: 'customer', message: 'customer is required' });
    return;
  }
  if (!isNonEmptyString(customer.name)) {
    errors.push({ field: 'customer.name', message: 'customer name is required' });
  }
  if (!isValidMobile(customer.mobile)) {
    errors.push({ field: 'customer.mobile', message: 'a valid 10-digit mobile number is required' });
  }
};

const checkMeasurements = (measurements, errors, { required }) => {
  if (!isPlainObject(measurements)) {
    errors.push({ field: 'measurements', message: 'measurements must be an object, e.g. { "bust": 36 }' });
    return;
  }
  const entries = Object.entries(measurements);
  if (required && entries.length === 0) {
    errors.push({ field: 'measurements', message: 'at least one measurement is required' });
  }
  entries.forEach(([key, value]) => {
    if (key.includes('.') || key.startsWith('$')) {
      errors.push({ field: `measurements.${key}`, message: 'measurement names cannot contain "." or start with "$"' });
    } else if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      errors.push({ field: `measurements.${key}`, message: 'measurement must be a number greater than 0' });
    }
  });
};

const validateStitchingOrderCreate = (body) => {
  const errors = [];
  checkCustomer(body.customer, errors);

  if (!isObjectId(body.designId)) {
    errors.push({ field: 'designId', message: 'designId must be a valid id' });
  }
  if (!isValidDate(body.deliveryDate)) {
    errors.push({ field: 'deliveryDate', message: 'deliveryDate must be a valid date' });
  }
  checkMeasurements(body.measurements, errors, { required: true });

  ['measurementNotes', 'notes'].forEach((key) => {
    if (body[key] !== undefined && typeof body[key] !== 'string') {
      errors.push({ field: key, message: `${key} must be a string` });
    }
  });
  return errors;
};

const validateStitchingOrderUpdate = (body) => {
  const errors = [];
  if (body.deliveryDate !== undefined && !isValidDate(body.deliveryDate)) {
    errors.push({ field: 'deliveryDate', message: 'deliveryDate must be a valid date' });
  }
  if (body.measurements !== undefined) checkMeasurements(body.measurements, errors, { required: false });
  ['measurementNotes', 'notes'].forEach((key) => {
    if (body[key] !== undefined && typeof body[key] !== 'string') {
      errors.push({ field: key, message: `${key} must be a string` });
    }
  });
  return errors;
};

const validateReadymadeOrderCreate = (body) => {
  const errors = [];
  checkCustomer(body.customer, errors);

  const a = body.address;
  if (!isPlainObject(a)) {
    errors.push({ field: 'address', message: 'address is required' });
  } else {
    if (!isNonEmptyString(a.line1)) errors.push({ field: 'address.line1', message: 'address line 1 is required' });
    if (!isNonEmptyString(a.city)) errors.push({ field: 'address.city', message: 'city is required' });
    if (!isNonEmptyString(a.state)) errors.push({ field: 'address.state', message: 'state is required' });
    if (typeof a.pincode !== 'string' || !/^\d{6}$/.test(a.pincode.trim())) {
      errors.push({ field: 'address.pincode', message: 'pincode must be 6 digits' });
    }
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    errors.push({ field: 'items', message: 'items must be a non-empty array' });
  } else {
    body.items.forEach((item, i) => {
      if (!isPlainObject(item)) {
        errors.push({ field: `items[${i}]`, message: 'each item must be an object' });
        return;
      }
      if (!isObjectId(item.productId)) {
        errors.push({ field: `items[${i}].productId`, message: 'productId must be a valid id' });
      }
      ['size', 'color'].forEach((key) => {
        if (item[key] !== undefined && typeof item[key] !== 'string') {
          errors.push({ field: `items[${i}].${key}`, message: `${key} must be a string` });
        }
      });
      if (!isPositiveInteger(item.quantity)) {
        errors.push({ field: `items[${i}].quantity`, message: 'quantity must be a whole number, 1 or more' });
      }
    });
  }

  ['notes', 'paymentMethod'].forEach((key) => {
    if (body[key] !== undefined && typeof body[key] !== 'string') {
      errors.push({ field: key, message: `${key} must be a string` });
    }
  });
  return errors;
};

const buildStatusValidator = (allowed) => (body) => {
  const errors = [];
  if (!allowed.includes(body.status)) {
    errors.push({ field: 'status', message: `status must be one of: ${allowed.join(', ')}` });
  }
  if (body.note !== undefined && typeof body.note !== 'string') {
    errors.push({ field: 'note', message: 'note must be a string' });
  }
  return errors;
};

module.exports = {
  validateStitchingOrderCreate,
  validateStitchingOrderUpdate,
  validateReadymadeOrderCreate,
  validateStitchingStatus: buildStatusValidator(STITCHING_ORDER_STATUSES),
  validateReadymadeStatus: buildStatusValidator(READYMADE_ORDER_STATUSES),
};
