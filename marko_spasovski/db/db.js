import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, '../fitness_buddy.db'));

// enable foreign keys
db.pragma('foreign_keys = ON');

export default db;