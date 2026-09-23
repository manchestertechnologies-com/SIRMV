import { testConnection, pgPool } from './postgres';

async function runConnectionCheck() {
  console.log('🔄 Testing connection to Neon PostgreSQL database...');
  
  const result = await testConnection();

  if (result.success) {
    console.log('✅ Neon PostgreSQL connection successful!');
    console.log(`🕒 Database Server Time: ${result.currentTime}`);
    console.log(`📦 Database Version: ${result.serverVersion}`);
  } else {
    console.error('❌ Connection to Neon PostgreSQL failed:');
    console.error(`   Error: ${result.error}`);
  }

  // Gracefully close pool after check
  await pgPool.end();
  process.exit(result.success ? 0 : 1);
}

runConnectionCheck();
