import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('⚠️ Warning: DATABASE_URL is not defined in environment variables.');
}

const poolConfig: PoolConfig = {
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
};

export const pgPool = new Pool(poolConfig);

// Event listeners for pool monitoring
pgPool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err.message);
});

/**
 * Execute a query using the connection pool
 */
export async function query<T = any>(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pgPool.query<T>(text, params);
  const duration = Date.now() - start;
  return { ...res, duration };
}

/**
 * Acquire a dedicated client from the pool (for transactions)
 */
export async function getClient() {
  return await pgPool.connect();
}

/**
 * Test PostgreSQL database connectivity
 */
export async function testConnection(): Promise<{ success: boolean; currentTime?: string; serverVersion?: string; error?: string }> {
  try {
    const res = await pgPool.query('SELECT NOW() as current_time, version() as server_version');
    const row = res.rows[0];
    return {
      success: true,
      currentTime: row?.current_time?.toString(),
      serverVersion: row?.server_version ? row.server_version.split(' ')[0] + ' ' + row.server_version.split(' ')[1] : 'PostgreSQL'
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Unknown database connection error'
    };
  }
}
