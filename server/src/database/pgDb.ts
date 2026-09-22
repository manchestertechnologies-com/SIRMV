import { pgPool, getClient } from './postgres';

/**
 * Converts SQLite '?' placeholders to PostgreSQL '$1', '$2', ... placeholders
 */
export function convertSql(sql: string): string {
  let paramIndex = 1;
  // Replace ? with $1, $2, ...
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

/**
 * Execute a query and return all matching rows as an array
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const pgSql = convertSql(sql);
  const result = await pgPool.query(pgSql, params);
  return result.rows as T[];
}

/**
 * Execute a query and return the first matching row or null
 */
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute an INSERT, UPDATE, or DELETE command and return affected row count
 */
export async function execute(sql: string, params: any[] = []): Promise<number> {
  const pgSql = convertSql(sql);
  const result = await pgPool.query(pgSql, params);
  return result.rowCount || 0;
}

/**
 * Run a multi-step operation inside a database transaction
 */
export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export { pgPool };
