import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log('🔄 Running RepoPulse PostgreSQL database migrations...');
  const pool = new pg.Pool({
    connectionString: env.DATABASE_URL_AUTH || env.DATABASE_URL,
  });

  try {
    const migrationPath = path.resolve(__dirname, 'migrations.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(sql);
    console.log('✅ PostgreSQL migrations completed successfully. All 9 tables and RLS policies are up to date.');
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
