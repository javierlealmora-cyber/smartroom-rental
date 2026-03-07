#!/usr/bin/env node

const readline = require('readline');

// Configuración de ambientes
const ENVIRONMENTS = {
  dev: {
    id: 'lopdwrsmkmtboeczxotj',
    name: 'Development',
    url: 'https://lopdwrsmkmtboeczxotj.supabase.co',
    warning: '⚠️  Ambiente de desarrollo'
  },
  staging: {
    id: 'lqwyyyttjamirccdtlvl',
    name: 'Staging',
    url: 'https://lqwyyyttjamirccdtlvl.supabase.co',
    warning: '⚠️  ADVERTENCIA: Ambiente de staging (pre-producción)'
  },
  prod: {
    id: '[PRODUCTION_PROJECT_ID]',
    name: 'Production',
    url: 'https://smartroomrentalplatform.com',
    warning: '🚨 PELIGRO: Ambiente de PRODUCCIÓN con datos reales'
  }
};

// Obtener ambiente del argumento
const targetEnv = process.argv[2];

if (!targetEnv || !ENVIRONMENTS[targetEnv]) {
  console.log('❌ Error: Debes especificar un ambiente válido');
  console.log('');
  console.log('Uso: node scripts/apply-migration.js [dev|staging|prod]');
  console.log('');
  console.log('Ambientes disponibles:');
  console.log('  dev      - Development (lopdwrsmkmtboeczxotj)');
  console.log('  staging  - Staging (lqwyyyttjamirccdtlvl)');
  console.log('  prod     - Production ([PRODUCTION_PROJECT_ID])');
  console.log('');
  console.log('Ejemplos:');
  console.log('  npm run migrate:dev');
  console.log('  npm run migrate:staging');
  console.log('  npm run migrate:prod');
  process.exit(1);
}

const env = ENVIRONMENTS[targetEnv];

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('🎯 Aplicar Migraciones en:', env.name);
console.log('═══════════════════════════════════════════════════════');
console.log('📍 Project ID:', env.id);
console.log('🌐 URL:', env.url);
console.log('');
console.log(env.warning);
console.log('');
console.log('⚠️  Esto aplicará migraciones en la base de datos.');
console.log('═══════════════════════════════════════════════════════');
console.log('');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question(`Para confirmar, escribe el Project ID completo: `, (answer) => {
  if (answer !== env.id) {
    console.log('');
    console.log('❌ Project ID incorrecto. Proceso cancelado por seguridad.');
    console.log('   Esperado:', env.id);
    console.log('   Recibido:', answer);
    console.log('');
    process.exit(1);
  }
  
  console.log('');
  console.log('✅ Project ID confirmado correctamente');
  console.log('🚀 Aplicando migraciones en', env.name, '...');
  console.log('');
  console.log('📝 Ejecuta este comando manualmente:');
  console.log(`   npx supabase db push --project-id ${env.id}`);
  console.log('');
  console.log('⚠️  IMPORTANTE: Después de aplicar, ejecuta la validación post-deploy:');
  console.log(`   npm run validate:${targetEnv}`);
  console.log('');
  
  rl.close();
});
