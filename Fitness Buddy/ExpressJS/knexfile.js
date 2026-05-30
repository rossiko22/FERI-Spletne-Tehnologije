const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// node-pg returns DATE (oid 1082) as a JS Date at local midnight; keep it as the
// raw 'YYYY-MM-DD' string so date filtering and JSON output match the client.
require('pg').types.setTypeParser(1082, (v) => v);

const connection = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  database: process.env.POSTGRES_DB || 'fitnessbuddy',
  user: process.env.POSTGRES_USER || 'fitnessbuddy',
  password: process.env.POSTGRES_PASSWORD || '',
};

const base = {
  client: 'pg',
  connection,
  migrations: { directory: path.join(__dirname, 'migrations') },
  seeds: { directory: path.join(__dirname, 'seeds') },
  pool: { min: 2, max: 10 },
};

module.exports = {
  development: base,
  production: base,
};
