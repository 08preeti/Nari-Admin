const dotenv = require('dotenv');

dotenv.config();

const required = ['MONGODB_URI', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET;

if (nodeEnv === 'production' && (jwtSecret.length < 32 || jwtSecret.startsWith('replace-with'))) {
  console.error('JWT_SECRET must be a random string of at least 32 characters in production.');
  process.exit(1);
}

module.exports = {
  nodeEnv,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  businessTimezone: process.env.BUSINESS_TIMEZONE || 'Asia/Kolkata',
  adminSeed: {
    name: process.env.ADMIN_NAME || 'The Nari Owner',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
};
