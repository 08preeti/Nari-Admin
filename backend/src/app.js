const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');

// In production only the origins listed in CORS_ORIGINS may call the API from a browser.
// In development an empty list allows any origin for convenience.
const corsOrigin = env.corsOrigins.length > 0 ? env.corsOrigins : env.nodeEnv === 'production' ? false : true;
if (env.nodeEnv === 'production' && env.corsOrigins.length === 0) {
  console.warn('CORS_ORIGINS is empty: browser cross-origin requests are blocked in production.');
}
app.use(cors({ origin: corsOrigin }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(express.json({ limit: '1mb' }));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
