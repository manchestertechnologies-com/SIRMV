import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '..', '..', 'sirmv.sqlite');

// Initialize database
export const db = new Database(DB_PATH);

// Enable foreign keys and WAL mode for high concurrency
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

export function initDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
  runMigrations();
  console.log('Database initialized with schema successfully.');
}

// Additive, idempotent column migrations. ALTER TABLE ADD COLUMN can't live in
// schema.sql (it isn't safe to re-run), so new columns on existing tables are
// added here instead, guarded against already having been applied.
function runMigrations() {
  const addColumnIfMissing = (table: string, column: string, definition: string) => {
    const existingColumns = (db.prepare(`PRAGMA table_info(${table})`).all() as any[]).map((c) => c.name);
    if (!existingColumns.includes(column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  };

  addColumnIfMissing('student_profiles', 'category', 'TEXT');
  addColumnIfMissing('student_profiles', 'sslc_result', 'TEXT');
  addColumnIfMissing('student_profiles', 'residence_status', `TEXT DEFAULT 'NON_RESIDENT'`);
  addColumnIfMissing('student_profiles', 'admission_type', `TEXT DEFAULT '1ST_PU'`);
  addColumnIfMissing('student_profiles', 'is_active', `INTEGER DEFAULT 1`);
}
