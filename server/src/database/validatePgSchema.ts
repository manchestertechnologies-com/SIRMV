import { pgPool } from './postgres';
import fs from 'fs';
import path from 'path';

async function validateSchema() {
  console.log('🔄 Validating PostgreSQL schema against Neon PostgreSQL 18...');
  
  try {
    const schemaPath = path.join(__dirname, 'postgres-schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema creation
    await pgPool.query(sql);
    console.log('✅ Schema executed successfully on Neon database.');

    // Fetch all created tables in public schema
    const tablesRes = await pgPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tablesRes.rows.map((r: any) => r.table_name);
    console.log(`\n📊 Verified ${tables.length} Tables in PostgreSQL:`);
    tables.forEach((t: string, idx: number) => {
      console.log(`   ${(idx + 1).toString().padStart(2, ' ')}. ${t}`);
    });

    // Fetch all indexes
    const indexesRes = await pgPool.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname;
    `);

    console.log(`\n⚡ Verified ${indexesRes.rows.length} Custom Performance Indexes:`);
    indexesRes.rows.forEach((idxRow: any, idx: number) => {
      console.log(`   ${(idx + 1).toString().padStart(2, ' ')}. ${idxRow.indexname} ON ${idxRow.tablename}`);
    });

    // Fetch foreign key count
    const fkRes = await pgPool.query(`
      SELECT count(*) as count
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';
    `);

    console.log(`\n🔗 Verified ${fkRes.rows[0].count} Foreign Key Constraints Active.\n`);

    console.log('🎉 PostgreSQL schema validation COMPLETED with ZERO errors!');
  } catch (err: any) {
    console.error('❌ Schema validation failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pgPool.end();
  }
}

validateSchema();
