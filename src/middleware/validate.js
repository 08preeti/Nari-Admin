const ApiError = require('../utils/ApiError');

const validate = (validatorFn, options = {}) => (req, res, next) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const errors = validatorFn(body, options);
  if (errors.length > 0) {
    return next(new ApiError(400, 'Validation failed', errors));
  }
  return next();
};

module.exports = validate;
