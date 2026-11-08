const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors;

  if (err.name === 'ValidationError' && err.errors && !Array.isArray(err.errors)) {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'VersionError') {
    statusCode = 409;
    message = 'This record was changed by someone else (or by a new order) while you were editing. Reload and try again.';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const fields = Object.keys(err.keyValue || {}).join(', ') || 'value';
    message = `Duplicate value: ${fields} already exists`;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired, please log in again';
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Request body is not valid JSON';
  }

  if (statusCode >= 500) {
    console.error(env.nodeEnv === 'production' ? err.message : err.stack);
    if (env.nodeEnv === 'production') message = 'Internal server error';
  }

  const body = { success: false, message };
  if (errors) body.errors = errors;
  if (env.nodeEnv !== 'production' && statusCode >= 500) body.stack = err.stack;

  res.status(statusCode).json(body);
};

module.exports = errorHandler;
