const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const { initAuthDb } = require('./config/authDb');

const PORT = process.env.PORT || 3000;

// Ensure the Postgres auth schema/demo user is ready before accepting traffic.
initAuthDb()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`[fitnessbuddy] API listening on http://localhost:${PORT}`);
    });

    const shutdown = (signal) => {
      console.log(`\n[fitnessbuddy] ${signal} received, closing server…`);
      server.close(() => process.exit(0));
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  })
  .catch((err) => {
    console.error('[fitnessbuddy] auth DB init failed — is Postgres up? (docker compose up -d)');
    console.error(err.message);
    process.exit(1);
  });
