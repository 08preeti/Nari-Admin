const mongoose = require('mongoose');
const env = require('../config/env');
const connectDB = require('../config/db');
const AdminUser = require('../models/AdminUser');
const { hashPassword } = require('../services/authService');

const run = async () => {
  const { name, email, password } = env.adminSeed;

  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file first.');
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
  }

  await connectDB();

  const existing = await AdminUser.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log('Admin already exists. Nothing to do.');
    return;
  }

  await AdminUser.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: 'owner',
  });
  console.log(`Admin created: ${email.toLowerCase()}`);
};

run()
  .catch((err) => {
    console.error(`Seed failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
