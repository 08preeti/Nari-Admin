const {
  isObjectId,
  isNonEmptyString,
  isNonNegativeNumber,
  isNonNegativeInteger,
  checkImages,
} = require('./common');

const checkParents = (body, needs, errors) => {
  ['mainCategory', 'category', 'subCategory'].forEach((key) => {
    if (needs(key) && !isObjectId(body[key])) {
      errors.push({ field: key, message: `${key} must be a valid id` });
    }
  });
};

const checkStringList = (list, field, errors) => {
  if (!Array.isArray(list)) {
    errors.push({ field, message: `${field} must be an array` });
    return;
  }
  const seen = new Set();
  list.forEach((value, i) => {
    if (!isNonEmptyString(value)) {
      errors.push({ field: `${field}[${i}]`, message: `${field} entries must be non-empty text` });
      return;
    }
    const key = value.trim().toLowerCase();
    if (seen.has(key)) errors.push({ field: `${field}[${i}]`, message: `duplicate entry in ${field}` });
    seen.add(key);
  });
};

const validateProduct = (body, { isUpdate = false } = {}) => {
  const errors = [];
  const needs = (key) => !isUpdate || body[key] !== undefined;

  checkParents(body, needs, errors);
  if (needs('name') && !isNonEmptyString(body.name)) {
    errors.push({ field: 'name', message: 'name is required' });
  }
  if (needs('price') && !isNonNegativeNumber(body.price)) {
    errors.push({ field: 'price', message: 'price must be a number, 0 or more' });
  }
  if (body.sku !== undefined && !isNonEmptyString(body.sku)) {
    errors.push({ field: 'sku', message: 'sku must be non-empty text' });
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    errors.push({ field: 'description', message: 'description must be a string' });
  }
  if (body.images !== undefined) checkImages(body.images, errors);
  if (body.sizes !== undefined) checkStringList(body.sizes, 'sizes', errors);
  if (body.colors !== undefined) checkStringList(body.colors, 'colors', errors);
  if (body.stock !== undefined && !isNonNegativeInteger(body.stock)) {
    errors.push({ field: 'stock', message: 'stock must be a whole number, 0 or more' });
  }
  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    errors.push({ field: 'isActive', message: 'isActive must be true or false' });
  }
  return errors;
};

const validateDesign = (body, { isUpdate = false } = {}) => {
  const errors = [];
  const needs = (key) => !isUpdate || body[key] !== undefined;

  checkParents(body, needs, errors);
  if (needs('name') && !isNonEmptyString(body.name)) {
    errors.push({ field: 'name', message: 'name is required' });
  }
  if (needs('referenceCode') && !isNonEmptyString(body.referenceCode)) {
    errors.push({ field: 'referenceCode', message: 'referenceCode is required' });
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    errors.push({ field: 'description', message: 'description must be a string' });
  }
  if (body.images !== undefined) checkImages(body.images, errors);
  if (body.displayOrder !== undefined && !isNonNegativeNumber(body.displayOrder)) {
    errors.push({ field: 'displayOrder', message: 'displayOrder must be a number (0 or more)' });
  }
  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    errors.push({ field: 'isActive', message: 'isActive must be true or false' });
  }
  return errors;
};

module.exports = { validateProduct, validateDesign };
