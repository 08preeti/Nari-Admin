const env = require('./src/config/env');
const connectDB = require('./src/config/db');
const app = require('./src/app');

const start = async () => {
  try {
    await connectDB();
    const server = app.listen(env.port, () => {
      console.log(`The Nari API running on port ${env.port} (${env.nodeEnv})`);
    });

    process.on('unhandledRejection', (err) => {
      console.error('Unhandled rejection:', err && err.message);
      server.close(() => process.exit(1));
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

start();
