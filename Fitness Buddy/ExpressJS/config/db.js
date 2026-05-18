// Knex + Objection.js bootstrap.
// All Objection models import `BaseModel` from here so they share the same
// connection pool. BaseModel adds automatic created_at/updated_at handling
// so individual models don't have to.

const Knex = require('knex');
const { Model } = require('objection');

const knexConfig = require('../knexfile');
const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';

const knex = Knex(knexConfig[env]);
Model.knex(knex);

/**
 * Project-wide model base class. Sets created_at on insert, updated_at on
 * every save. Override `$beforeInsert` / `$beforeUpdate` in a subclass only
 * if you need to customise — call `super.$beforeInsert(qc)` first.
 */
class BaseModel extends Model {
  $beforeInsert() {
    const now = new Date().toISOString();
    this.created_at = this.created_at || now;
    this.updated_at = now;
  }

  $beforeUpdate() {
    this.updated_at = new Date().toISOString();
  }
}

module.exports = { knex, Model, BaseModel };
