const { normalizeMobile } = require('../utils/helpers');

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const isObjectId = (v) => typeof v === 'string' && OBJECT_ID_REGEX.test(v);
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isValidDate = (v) =>
  (typeof v === 'string' || typeof v === 'number') && !Number.isNaN(new Date(v).getTime());
const isNonNegativeNumber = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isNonNegativeInteger = (v) => Number.isInteger(v) && v >= 0;
const isPositiveInteger = (v) => Number.isInteger(v) && v > 0;
const isValidMobile = (v) => typeof v === 'string' && /^[6-9]\d{9}$/.test(normalizeMobile(v));

const checkImage = (image, field, errors) => {
  if (!isPlainObject(image) || !isNonEmptyString(image.url)) {
    errors.push({ field, message: `${field} must be an object like { "url": "https://..." }` });
  }
};

const checkImages = (images, errors) => {
  if (!Array.isArray(images)) {
    errors.push({ field: 'images', message: 'images must be an array' });
    return;
  }
  images.forEach((img, i) => checkImage(img, `images[${i}]`, errors));
};

module.exports = {
  isObjectId,
  isNonEmptyString,
  isPlainObject,
  isValidDate,
  isNonNegativeNumber,
  isNonNegativeInteger,
  isPositiveInteger,
  isValidMobile,
  checkImage,
  checkImages,
};
