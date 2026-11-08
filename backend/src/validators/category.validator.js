const {
  isObjectId,
  isNonEmptyString,
  isNonNegativeNumber,
  isPlainObject,
  checkImage,
} = require('./common');
const { MODULE_TYPES } = require('../utils/constants');

const buildCatalogValidator = (parentField, withPrice = false) => (body, { isUpdate = false } = {}) => {
  const errors = [];
  const needs = (key) => !isUpdate || body[key] !== undefined;

  if (needs('name') && !isNonEmptyString(body.name)) {
    errors.push({ field: 'name', message: 'name is required' });
  } else if (typeof body.name === 'string' && body.name.trim().length > 100) {
    errors.push({ field: 'name', message: 'name must be 100 characters or fewer' });
  }

  if (parentField && needs(parentField) && !isObjectId(body[parentField])) {
    errors.push({ field: parentField, message: `${parentField} must be a valid id` });
  }

  if (body.description !== undefined && typeof body.description !== 'string') {
    errors.push({ field: 'description', message: 'description must be a string' });
  }
  if (body.image !== undefined) checkImage(body.image, 'image', errors);
  if (withPrice && body.price !== undefined && !isNonNegativeNumber(body.price)) {
    errors.push({ field: 'price', message: 'price must be a number, 0 or more' });
  }
  if (body.displayOrder !== undefined && !isNonNegativeNumber(body.displayOrder)) {
    errors.push({ field: 'displayOrder', message: 'displayOrder must be a number (0 or more)' });
  }
  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    errors.push({ field: 'isActive', message: 'isActive must be true or false' });
  }
  return errors;
};

const buildBulkValidator = (parentField, withPrice = false) => {
  const validateItem = buildCatalogValidator(null, withPrice);
  return (body) => {
    const errors = [];
    if (!isObjectId(body[parentField])) {
      errors.push({ field: parentField, message: `${parentField} must be a valid id` });
    }
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) {
      errors.push({ field: 'items', message: 'items must be an array of 1 to 50 entries' });
      return errors;
    }
    const seen = new Set();
    body.items.forEach((item, i) => {
      if (!isPlainObject(item)) {
        errors.push({ field: `items[${i}]`, message: 'each item must be an object' });
        return;
      }
      validateItem(item).forEach((e) =>
        errors.push({ field: `items[${i}].${e.field}`, message: e.message })
      );
      if (typeof item.name === 'string') {
        const key = item.name.trim().toLowerCase();
        if (seen.has(key)) errors.push({ field: `items[${i}].name`, message: 'duplicate name in this request' });
        seen.add(key);
      }
    });
    return errors;
  };
};

const validateMainCategory = (body, { isUpdate = false } = {}) => {
  const errors = buildCatalogValidator(null)(body, { isUpdate });
  if (isUpdate && body.moduleType !== undefined) {
    errors.push({ field: 'moduleType', message: 'moduleType cannot be changed' });
  }
  if (!isUpdate && !MODULE_TYPES.includes(body.moduleType)) {
    errors.push({ field: 'moduleType', message: `moduleType must be one of: ${MODULE_TYPES.join(', ')}` });
  }
  return errors;
};

const validateStatusToggle = (body) =>
  typeof body.isActive === 'boolean'
    ? []
    : [{ field: 'isActive', message: 'isActive must be true or false' }];

module.exports = {
  validateBulkCategory: buildBulkValidator('mainCategory'),
  validateBulkSubCategory: buildBulkValidator('category', true),
  validateMainCategory,
  validateCategory: buildCatalogValidator('mainCategory'),
  validateSubCategory: buildCatalogValidator('category', true),
  validateStatusToggle,
};
