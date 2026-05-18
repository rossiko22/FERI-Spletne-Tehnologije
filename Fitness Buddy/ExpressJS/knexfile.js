require('dotenv').config();

const path = require('path');

const file = process.env.DB_FILE || './fitnessbuddy.sqlite';

module.exports = {
  development: {
    client: 'sqlite3',
    connection: { filename: path.resolve(__dirname, file) },
    useNullAsDefault: true,
    migrations: { directory: path.join(__dirname, 'migrations') },
    seeds: { directory: path.join(__dirname, 'seeds') },
    pool: {
      afterCreate: (conn, done) => conn.run('PRAGMA foreign_keys = ON', done),
    },
  },
  production: {
    client: 'sqlite3',
    connection: { filename: path.resolve(__dirname, file) },
    useNullAsDefault: true,
    migrations: { directory: path.join(__dirname, 'migrations') },
    pool: {
      afterCreate: (conn, done) => conn.run('PRAGMA foreign_keys = ON', done),
    },
  },
};
