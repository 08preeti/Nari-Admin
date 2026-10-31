const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const hashPassword = (plain) => bcrypt.hash(plain, env.bcryptSaltRounds);
const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

const signToken = (admin) =>
  jwt.sign({ id: admin._id, role: admin.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const verifyToken = (token) => jwt.verify(token, env.jwtSecret);

module.exports = { hashPassword, comparePassword, signToken, verifyToken };
