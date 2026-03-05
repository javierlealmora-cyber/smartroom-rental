#!/usr/bin/env node

import readline from 'readline';

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
const tableName = process.argv[3];

if (!targetEnv || !ENVIRONMENTS[targetEnv] || !tableName) {
  console.log('❌ Error: Debes especificar ambiente y tabla');
  console.log('');
  console.log('Uso: node scripts/backup-data-before-migration.js [env] [tabla]');
  console.log('');
  console.log('Ejemplos:');
  console.log('  npm run backup:data:staging companies');
  console.log('  npm run backup:data:prod profiles');
  process.exit(1);
}

const env = ENVIRONMENTS[targetEnv];

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('💾 Backup de Datos Pre-Migración');
console.log('═══════════════════════════════════════════════════════');
console.log('📍 Ambiente:', env.name);
console.log('📍 Project ID:', env.id);
console.log('📊 Tabla:', tableName);
console.log('');
console.log('🎯 Este script generará:');
console.log('   1. Backup de estructura (CREATE TABLE)');
console.log('   2. Backup de datos (INSERT statements)');
console.log('   3. Script de rollback completo');
console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('📝 Pasos a seguir:');
console.log('');
console.log('1. Exportar datos de la tabla:');
console.log('');
console.log('   -- Conectar a Supabase y ejecutar:');
console.log(`   SELECT * FROM public.${tableName};`);
console.log('');
console.log('2. Generar script de rollback:');
console.log('');
console.log('   a) Copiar estructura de la tabla (pg_dump):');
console.log(`   npx supabase db dump --project-id ${env.id} --schema public --table ${tableName} > backup_${tableName}_structure.sql`);
console.log('');
console.log('   b) Exportar datos en formato SQL:');
console.log(`   npx supabase db dump --project-id ${env.id} --data-only --schema public --table ${tableName} > backup_${tableName}_data.sql`);
console.log('');
console.log('3. Crear migración de rollback que incluya:');
console.log('   - CREATE TABLE (estructura)');
console.log('   - INSERT statements (datos)');
console.log('   - Índices y constraints');
console.log('   - Políticas RLS');
console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('⚠️  IMPORTANTE:');
console.log('   - Ejecuta estos comandos ANTES de aplicar la migración destructiva');
console.log('   - Guarda los archivos de backup en supabase/backups/');
console.log('   - Incluye los INSERT statements en la migración de rollback');
console.log('');
console.log('📁 Archivos generados:');
console.log(`   - supabase/backups/${tableName}_${env.name.toLowerCase()}_structure.sql`);
console.log(`   - supabase/backups/${tableName}_${env.name.toLowerCase()}_data.sql`);
console.log(`   - supabase/migrations/YYYYMMDDHHMMSS_rollback_[descripcion].sql`);
console.log('');
