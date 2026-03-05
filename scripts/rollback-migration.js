#!/usr/bin/env node

const readline = require('readline');

// Configuración de ambientes
const ENVIRONMENTS = {
  dev: {
    id: 'lopdwrsmkmtboeczxotj',
    name: 'Development',
  },
  staging: {
    id: 'lqwyyyttjamirccdtlvl',
    name: 'Staging',
  },
  prod: {
    id: '[PRODUCTION_PROJECT_ID]',
    name: 'Production',
  }
};

const targetEnv = process.argv[2];

if (!targetEnv || !ENVIRONMENTS[targetEnv]) {
  console.log('❌ Error: Debes especificar un ambiente válido');
  console.log('');
  console.log('Uso: node scripts/rollback-migration.js [dev|staging|prod]');
  console.log('');
  console.log('Ejemplos:');
  console.log('  npm run rollback:dev');
  console.log('  npm run rollback:staging');
  console.log('  npm run rollback:prod');
  process.exit(1);
}

const env = ENVIRONMENTS[targetEnv];

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('🔄 ROLLBACK de Migraciones:', env.name);
console.log('═══════════════════════════════════════════════════════');
console.log('📍 Project ID:', env.id);
console.log('');
console.log('🚨 ADVERTENCIA: Esto revertirá las migraciones aplicadas');
console.log('');
console.log('📋 Migración de rollback:');
console.log('   20260305200002_rollback_remove_companies.sql');
console.log('');
console.log('🔄 Acciones que se realizarán:');
console.log('   1. Recrear tabla companies');
console.log('   2. Recrear columna company_id en profiles');
console.log('   3. Recrear columna company_id en client_accounts');
console.log('   4. Recrear índices y políticas RLS');
console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Para confirmar el ROLLBACK, escribe el Project ID: ', (answer) => {
  if (answer !== env.id) {
    console.log('');
    console.log('❌ Project ID incorrecto. Rollback cancelado.');
    console.log('');
    process.exit(1);
  }
  
  console.log('');
  console.log('✅ Project ID confirmado');
  console.log('🔄 Ejecutando rollback...');
  console.log('');
  console.log('📝 Ejecuta este comando manualmente:');
  console.log('');
  console.log('   Opción 1: Aplicar migración de rollback');
  console.log(`   npx supabase db push --project-id ${env.id}`);
  console.log('');
  console.log('   Opción 2: Restaurar desde backup');
  console.log('   psql [DATABASE_URL] < backup_YYYYMMDD_HHMMSS.sql');
  console.log('');
  console.log('⚠️  Después del rollback, ejecuta validación:');
  console.log(`   npm run validate:${targetEnv}`);
  console.log('');
  
  rl.close();
});
