#!/usr/bin/env node

import readline from 'readline';

// Configuración de ambientes
const ENVIRONMENTS = {
  dev: {
    id: 'lopdwrsmkmtboeczxotj',
    name: 'Development',
    branch: 'develop',
    vercel_project: 'smartroom-rental-dev'
  },
  staging: {
    id: 'lqwyyyttjamirccdtlvl',
    name: 'Staging',
    branch: 'develop',
    vercel_project: 'smartroom-rental-staging'
  },
  prod: {
    id: '[PRODUCTION_PROJECT_ID]',
    name: 'Production',
    branch: 'main',
    vercel_project: 'smartroom-rental'
  }
};

const targetEnv = process.argv[2];
const deploymentId = process.argv[3]; // ID del deployment a revertir

if (!targetEnv || !ENVIRONMENTS[targetEnv]) {
  console.log('❌ Error: Debes especificar un ambiente válido');
  console.log('');
  console.log('Uso: node scripts/rollback-deployment.js [dev|staging|prod] [deployment-id]');
  console.log('');
  console.log('Ejemplos:');
  console.log('  npm run rollback:full:staging dpl_abc123');
  console.log('  npm run rollback:full:prod dpl_xyz789');
  process.exit(1);
}

const env = ENVIRONMENTS[targetEnv];

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('🔄 ROLLBACK COMPLETO (Código + BBDD):', env.name);
console.log('═══════════════════════════════════════════════════════');
console.log('📍 Project ID (BBDD):', env.id);
console.log('🌐 Vercel Project:', env.vercel_project);
console.log('🔀 Branch:', env.branch);
if (deploymentId) {
  console.log('📦 Deployment ID:', deploymentId);
}
console.log('');
console.log('🚨 ADVERTENCIA: Esto revertirá CÓDIGO y BASE DE DATOS');
console.log('');
console.log('📋 Acciones que se realizarán:');
console.log('   1. ❌ Rollback de código (Vercel deployment anterior)');
console.log('   2. ❌ Rollback de BBDD (migración de rollback)');
console.log('   3. ✅ Verificación post-rollback');
console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('¿Confirmas el ROLLBACK COMPLETO? Escribe "ROLLBACK": ', (answer) => {
  if (answer !== 'ROLLBACK') {
    console.log('');
    console.log('❌ Rollback cancelado. Debes escribir exactamente "ROLLBACK"');
    console.log('');
    process.exit(1);
  }
  
  console.log('');
  console.log('✅ Confirmación recibida');
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('PASO 1: Rollback de Código (Vercel)');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  
  if (deploymentId) {
    console.log('📝 Comando para rollback de código:');
    console.log(`   vercel rollback ${deploymentId} --scope smartroom-rental`);
    console.log('');
    console.log('O desde Vercel Dashboard:');
    console.log(`   https://vercel.com/smartroom-rental/${env.vercel_project}/deployments`);
    console.log('   → Click en deployment anterior → "Promote to Production"');
  } else {
    console.log('⚠️  No se proporcionó Deployment ID');
    console.log('');
    console.log('Opciones:');
    console.log('1. Desde Vercel Dashboard:');
    console.log(`   https://vercel.com/smartroom-rental/${env.vercel_project}/deployments`);
    console.log('   → Click en deployment anterior → "Promote to Production"');
    console.log('');
    console.log('2. Desde CLI:');
    console.log('   vercel list --scope smartroom-rental');
    console.log('   vercel rollback [deployment-id] --scope smartroom-rental');
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('PASO 2: Rollback de Base de Datos');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('📝 Ejecuta el rollback de BBDD:');
  console.log(`   npm run rollback:${targetEnv}`);
  console.log('');
  console.log('O manualmente con Supabase MCP:');
  console.log('   - Ejecutar migración: 20260305200002_rollback_remove_companies.sql');
  console.log(`   - Project ID: ${env.id}`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('PASO 3: Verificación Post-Rollback');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('Después de completar el rollback, ejecuta:');
  console.log(`   npm run validate:${targetEnv}`);
  console.log('');
  console.log('Checklist de verificación:');
  console.log('   ✅ Código revertido al deployment anterior');
  console.log('   ✅ BBDD revertida al estado anterior');
  console.log('   ✅ Aplicación funciona correctamente');
  console.log('   ✅ Tests E2E pasan');
  console.log('   ✅ No hay errores en logs');
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  
  rl.close();
});
