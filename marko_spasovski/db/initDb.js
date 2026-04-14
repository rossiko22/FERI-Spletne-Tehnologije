import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

// fix __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// load schema
const createTables = fs.readFileSync(
    path.join(__dirname, '../sql/create_tables.sql'),
    'utf-8'
);

db.exec(createTables);

// check data AFTER tables exist
const seedCheck = db.prepare('SELECT COUNT(*) as count FROM users').get();

if (seedCheck.count === 0) {
    const seedSql = fs.readFileSync(
        path.join(__dirname, '../sql/seed_data.sql'),
        'utf-8'
    );
    db.exec(seedSql);
    console.log('DB initialized with seed data');
}