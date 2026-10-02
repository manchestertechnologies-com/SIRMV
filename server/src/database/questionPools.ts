import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from server/.env and root .env
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

export type SubjectKey = 'MATH' | 'PHYSICS' | 'CHEMISTRY' | 'BIOLOGY';
export type ClassKey = '11' | '12';

interface PoolConfigMap {
  [key: string]: { url: string | undefined; name: string };
}

const dbConfigs: PoolConfigMap = {
  MATH_11: {
    url: process.env.DB_MATH_11_URL || 'postgresql://postgres.lhnwhbhnexxifuuqnzho:SubClass11Maths@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
    name: 'Mathematics Class 11'
  },
  MATH_12: {
    url: process.env.DB_MATH_12_URL || 'postgresql://postgres.lukbqotnuxoznnrsdqvz:SubClass12Maths@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
    name: 'Mathematics Class 12'
  },
  CHEM_11: {
    url: process.env.DB_CHEM_11_URL || 'postgresql://postgres.tloqcflffxrrlbxyphtb:SubClass11Chemistry@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
    name: 'Chemistry Class 11'
  },
  CHEM_12: {
    url: process.env.DB_CHEM_12_URL || 'postgresql://postgres.dptruxcqfapmcmbxyobx:SubClass12Chemistry@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
    name: 'Chemistry Class 12'
  },
  BIO_11: {
    url: process.env.DB_BIO_11_URL || 'postgresql://postgres.tcoaxdpzvzssnkclpvkt:SubClass11Biology@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres',
    name: 'Biology Class 11'
  },
  BIO_12: {
    url: process.env.DB_BIO_12_URL || 'postgresql://postgres.zxxvxddkncoluvidbtpf:SubClass12Biology@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres',
    name: 'Biology Class 12'
  },
  PHY_11: {
    url: process.env.DB_PHY_11_URL || 'postgresql://postgres.pfnlbyjsjxttdachegne:SubClass11Physics@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres',
    name: 'Physics Class 11'
  },
  PHY_12: {
    url: process.env.DB_PHY_12_URL || 'postgresql://postgres.fnbgbtvnqmccpvgpphua:SubClass12Physics@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
    name: 'Physics Class 12'
  }
};

const pools: Map<string, Pool> = new Map();

function initPool(key: string, url: string): Pool {
  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  pool.on('error', (err) => {
    console.error(`PostgreSQL Pool Error [${key}]:`, err.message);
  });

  return pool;
}

export function getPoolKey(subject: string, klass: string | number): string {
  const s = subject.toUpperCase();
  const k = klass.toString();
  const c = k.includes('12') || k.includes('II') || k.includes('2') ? '12' : '11';

  if (s.includes('MATH')) return `MATH_${c}`;
  if (s.includes('CHEM')) return `CHEM_${c}`;
  if (s.includes('BIO')) return `BIO_${c}`;
  if (s.includes('PHY')) return `PHY_${c}`;

  return `PHY_${c}`;
}

export function getQuestionPool(subject: string, klass: string | number): { pool: Pool; poolKey: string; name: string } {
  const key = getPoolKey(subject, klass);
  const cfg = dbConfigs[key];

  if (!cfg || !cfg.url) {
    throw new Error(`Database connection string for ${key} is not configured.`);
  }

  if (!pools.has(key)) {
    pools.set(key, initPool(key, cfg.url));
  }

  return {
    pool: pools.get(key)!,
    poolKey: key,
    name: cfg.name
  };
}

export async function queryQuestionPool<T = any>(
  subject: string,
  klass: string | number,
  sql: string,
  params: any[] = []
): Promise<{ rows: T[]; rowCount: number; poolKey: string }> {
  const { pool, poolKey } = getQuestionPool(subject, klass);
  const result = await pool.query(sql, params);
  return {
    rows: result.rows as T[],
    rowCount: result.rowCount || 0,
    poolKey
  };
}

export async function getAllPoolHealth(): Promise<Record<string, { status: string; count?: number; error?: string }>> {
  const results: Record<string, { status: string; count?: number; error?: string }> = {};

  for (const [key, cfg] of Object.entries(dbConfigs)) {
    try {
      if (!pools.has(key)) {
        pools.set(key, initPool(key, cfg.url!));
      }
      const p = pools.get(key)!;
      const res = await p.query('SELECT count(*) as total FROM questions');
      results[key] = {
        status: 'CONNECTED',
        count: parseInt(res.rows[0]?.total || '0', 10)
      };
    } catch (e: any) {
      results[key] = {
        status: 'ERROR',
        error: e.message
      };
    }
  }

  return results;
}
