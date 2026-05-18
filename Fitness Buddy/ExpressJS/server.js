require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`[fitnessbuddy] API listening on http://localhost:${PORT}`);
});

const shutdown = (signal) => {
  console.log(`\n[fitnessbuddy] ${signal} received, closing server…`);
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
