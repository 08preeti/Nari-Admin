const {
  isObjectId,
  isNonEmptyString,
  isNonNegativeNumber,
  isNonNegativeInteger,
  isPlainObject,
  isHexColor,
  checkImages,
} = require('./common');
const { normalizeProductBody, comboKey } = require('../services/variantService');
const { checkPricePair } = require('../utils/pricing');

const checkParents = (body, needs, errors) => {
  ['mainCategory', 'category', 'subCategory'].forEach((key) => {
    if (needs(key) && !isObjectId(body[key])) {
      errors.push({ field: key, message: `${key} must be a valid id` });
    }
  });
};

const pushAll = (errors, field, messages) => messages.forEach((message) => errors.push({ field, message }));

const checkSizes = (sizes, errors) => {
  if (!Array.isArray(sizes)) return errors.push({ field: 'sizes', message: 'sizes must be an array' });
  if (sizes.length > 30) errors.push({ field: 'sizes', message: 'at most 30 sizes are allowed' });
  return sizes.forEach((s, i) => {
    if (!isNonEmptyString(s) || s.length > 20) {
      errors.push({ field: `sizes[${i}]`, message: 'a size must be text of 1 to 20 characters' });
    }
  });
};

const checkColorOptions = (colors, errors) => {
  if (!Array.isArray(colors)) return errors.push({ field: 'colorOptions', message: 'colorOptions must be an array' });
  if (colors.length > 30) errors.push({ field: 'colorOptions', message: 'at most 30 colors are allowed' });
  return colors.forEach((c, i) => {
    const f = `colorOptions[${i}]`;
    if (!isPlainObject(c) || !isNonEmptyString(c.name) || c.name.length > 40) {
      errors.push({ field: `${f}.name`, message: 'color name is required (40 characters max)' });
      return;
    }
    if (c.hex !== undefined && !isHexColor(c.hex)) {
      errors.push({ field: `${f}.hex`, message: 'color code must look like #FF0000' });
    }
    if (c.images !== undefined) checkImages(c.images, errors, `${f}.images`, 10);
  });
};

const checkVariants = (variants, errors) => {
  if (!Array.isArray(variants)) return errors.push({ field: 'variants', message: 'variants must be an array' });
  if (variants.length > 300) errors.push({ field: 'variants', message: 'at most 300 variants are allowed' });
  const skus = new Set();
  const combos = new Set();
  return variants.forEach((v, i) => {
    const f = `variants[${i}]`;
    if (!isPlainObject(v)) {
      errors.push({ field: f, message: 'each variant must be an object' });
      return;
    }
    if (!isNonEmptyString(v.sku) || v.sku.length > 80) {
      errors.push({ field: `${f}.sku`, message: 'variant SKU is required (80 characters max)' });
    } else if (skus.has(v.sku)) {
      errors.push({ field: `${f}.sku`, message: `duplicate SKU ${v.sku} in this product` });
    } else skus.add(v.sku);

    if (v.size !== undefined && (typeof v.size !== 'string' || v.size.length > 20)) {
      errors.push({ field: `${f}.size`, message: 'size must be text (20 characters max)' });
    }
    if (v.color !== undefined) {
      if (!isPlainObject(v.color) || !isNonEmptyString(v.color.name)) {
        errors.push({ field: `${f}.color`, message: 'color must be { "name": "...", "hex": "#RRGGBB" }' });
      } else if (v.color.hex !== undefined && !isHexColor(v.color.hex)) {
        errors.push({ field: `${f}.color.hex`, message: 'color code must look like #FF0000' });
      }
    }
    const combo = comboKey(v.size, v.color && v.color.name);
    if (combos.has(combo) && combo !== '|') errors.push({ field: f, message: 'duplicate size/color combination' });
    combos.add(combo);

    if (v.price !== undefined) pushAll(errors, `${f}.price`, checkPricePair(v.price, v.salePrice, 'variant'));
    else if (v.salePrice !== undefined) {
      errors.push({ field: `${f}.salePrice`, message: 'set the variant price before its sale price' });
    }
    if (v.stock !== undefined && !isNonNegativeInteger(v.stock)) {
      errors.push({ field: `${f}.stock`, message: 'stock must be a whole number, 0 or more' });
    }
    if (v.isActive !== undefined && typeof v.isActive !== 'boolean') {
      errors.push({ field: `${f}.isActive`, message: 'isActive must be true or false' });
    }
    if (v.images !== undefined) checkImages(v.images, errors, `${f}.images`, 10);
  });
};

// NOTE: normalises `body` in place (trim, de-duplicate, drop blank image rows) before validating.
const validateProduct = (body, { isUpdate = false } = {}) => {
  normalizeProductBody(body);
  const errors = [];
  const needs = (key) => !isUpdate || body[key] !== undefined;

  checkParents(body, needs, errors);
  if (needs('name') && !isNonEmptyString(body.name)) {
    errors.push({ field: 'name', message: 'name is required' });
  } else if (typeof body.name === 'string' && body.name.length > 150) {
    errors.push({ field: 'name', message: 'name must be 150 characters or fewer' });
  }
  if (!isUpdate && !isNonEmptyString(body.sku)) {
    errors.push({ field: 'sku', message: 'sku is required' });
  } else if (body.sku !== undefined && (!isNonEmptyString(body.sku) || body.sku.length > 60)) {
    errors.push({ field: 'sku', message: 'sku must be non-empty text (60 characters max)' });
  }
  if (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 3000)) {
    errors.push({ field: 'description', message: 'description must be text of 3000 characters or fewer' });
  }

  if (needs('price') && !isNonNegativeNumber(body.price)) {
    errors.push({ field: 'price', message: 'price must be a number, 0 or more' });
  } else if (body.salePrice !== undefined && body.salePrice !== null) {
    // On updates that send only salePrice, the controller re-checks it against the stored price.
    pushAll(errors, 'salePrice', checkPricePair(body.price, body.salePrice, 'product'));
  }

  if (body.images !== undefined) checkImages(body.images, errors);
  if (body.sizes !== undefined) checkSizes(body.sizes, errors);
  if (body.colorOptions !== undefined) checkColorOptions(body.colorOptions, errors);
  if (body.variants !== undefined) checkVariants(body.variants, errors);

  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || body.tags.length > 20 || body.tags.some((t) => !isNonEmptyString(t) || t.length > 30)) {
      errors.push({ field: 'tags', message: 'tags must be up to 20 short texts (30 characters each)' });
    }
  }
  if (body.stock !== undefined && !isNonNegativeInteger(body.stock)) {
    errors.push({ field: 'stock', message: 'stock must be a whole number, 0 or more' });
  }
  if (body.stock !== undefined && Array.isArray(body.variants) && body.variants.length > 0) {
    errors.push({ field: 'stock', message: 'stock is managed per variant when a product has variants' });
  }
  if (body.lowStockThreshold !== undefined && !isNonNegativeInteger(body.lowStockThreshold)) {
    errors.push({ field: 'lowStockThreshold', message: 'lowStockThreshold must be a whole number, 0 or more' });
  }
  ['isActive', 'isFeatured', 'acknowledgeLegacyStockReset'].forEach((key) => {
    if (body[key] !== undefined && typeof body[key] !== 'boolean') {
      errors.push({ field: key, message: `${key} must be true or false` });
    }
  });
  if (body.version !== undefined && !isNonNegativeInteger(body.version)) {
    errors.push({ field: 'version', message: 'version must be a whole number' });
  }
  return errors;
};

const validateStockAdjustment = (body) => {
  const errors = [];
  if (body.sku !== undefined && !isNonEmptyString(body.sku)) errors.push({ field: 'sku', message: 'sku must be text' });
  const hasDelta = body.delta !== undefined;
  const hasSet = body.newStock !== undefined;
  if (hasDelta === hasSet) errors.push({ field: 'body', message: 'send exactly one of: delta, newStock' });
  if (hasDelta && (!Number.isInteger(body.delta) || body.delta === 0)) {
    errors.push({ field: 'delta', message: 'delta must be a non-zero whole number (negative to remove stock)' });
  }
  if (hasSet && !isNonNegativeInteger(body.newStock)) {
    errors.push({ field: 'newStock', message: 'newStock must be a whole number, 0 or more' });
  }
  if (body.reason !== undefined && (typeof body.reason !== 'string' || body.reason.length > 300)) {
    errors.push({ field: 'reason', message: 'reason must be text of 300 characters or fewer' });
  }
  return errors;
};

const validateDesign = (body, { isUpdate = false } = {}) => {
  if (Array.isArray(body.images)) {
    const { normalizeImages } = require('../services/variantService');
    body.images = normalizeImages(body.images);
  }
  if (typeof body.referenceCode === 'string') body.referenceCode = body.referenceCode.trim().toUpperCase();
  if (typeof body.name === 'string') body.name = body.name.trim();

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

module.exports = { validateProduct, validateDesign, validateStockAdjustment };
