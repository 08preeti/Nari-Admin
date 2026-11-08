const { isNonEmptyString } = require('./common');

const validateLogin = (body) => {
  const errors = [];
  if (!isNonEmptyString(body.email)) errors.push({ field: 'email', message: 'email is required' });
  if (!isNonEmptyString(body.password)) errors.push({ field: 'password', message: 'password is required' });
  return errors;
};

module.exports = { validateLogin };
