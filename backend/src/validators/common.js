const { normalizeMobile } = require('../utils/helpers');

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

const isObjectId = (v) => typeof v === 'string' && OBJECT_ID_REGEX.test(v);
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isValidDate = (v) =>
  (typeof v === 'string' || typeof v === 'number') && !Number.isNaN(new Date(v).getTime());
const isNonNegativeNumber = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isNonNegativeInteger = (v) => Number.isInteger(v) && v >= 0;
const isPositiveInteger = (v) => Number.isInteger(v) && v > 0;
const isValidMobile = (v) => typeof v === 'string' && /^[6-9]\d{9}$/.test(normalizeMobile(v));
const isHexColor = (v) => typeof v === 'string' && HEX_REGEX.test(v);

const isHttpUrl = (value) => {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

const checkImage = (image, field, errors) => {
  if (!isPlainObject(image) || !isNonEmptyString(image.url)) {
    errors.push({ field, message: `${field} must be an object like { "url": "https://..." }` });
  } else if (!isHttpUrl(image.url)) {
    errors.push({ field: `${field}.url`, message: 'image url must be a valid http(s) URL' });
  } else if (image.alt !== undefined && (typeof image.alt !== 'string' || image.alt.length > 200)) {
    errors.push({ field: `${field}.alt`, message: 'alt text must be text of 200 characters or fewer' });
  }
};

const checkImages = (images, errors, field = 'images', max = 20) => {
  if (!Array.isArray(images)) {
    errors.push({ field, message: `${field} must be an array` });
    return;
  }
  if (images.length > max) errors.push({ field, message: `${field} can hold at most ${max} images` });
  images.forEach((img, i) => checkImage(img, `${field}[${i}]`, errors));
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
  isHexColor,
  isHttpUrl,
  checkImage,
  checkImages,
};
