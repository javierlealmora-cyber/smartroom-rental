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
  console.log('Uso: node scripts/validate-deployment.js [dev|staging|prod]');
  console.log('');
  console.log('Ejemplos:');
  console.log('  npm run validate:dev');
  console.log('  npm run validate:staging');
  console.log('  npm run validate:prod');
  process.exit(1);
}

const env = ENVIRONMENTS[targetEnv];

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('✅ Validación Post-Deploy:', env.name);
console.log('═══════════════════════════════════════════════════════');
console.log('📍 Project ID:', env.id);
console.log('');
console.log('📋 CHECKLIST DE VALIDACIÓN:');
console.log('');
console.log('1. ¿Las migraciones se aplicaron sin errores?');
console.log('2. ¿Las tablas tienen la estructura correcta?');
console.log('3. ¿Las políticas RLS funcionan correctamente?');
console.log('4. ¿Los seeds se aplicaron correctamente?');
console.log('5. ¿La aplicación funciona sin errores?');
console.log('6. ¿Los tests E2E pasan correctamente?');
console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('¿La validación fue exitosa? (SI/NO): ', (answer) => {
  console.log('');
  
  if (answer.toUpperCase() === 'SI') {
    console.log('✅ Deployment APROBADO');
    console.log('');
    console.log('🎉 El deployment en', env.name, 'fue exitoso');
    console.log('');
    console.log('📝 Próximos pasos:');
    if (targetEnv === 'dev') {
      console.log('   → Aplicar en staging: npm run migrate:staging');
    } else if (targetEnv === 'staging') {
      console.log('   → Monitorear por 24-48 horas');
      console.log('   → Aplicar en production: npm run migrate:prod');
    } else {
      console.log('   → Monitorear métricas de producción');
      console.log('   → Cerrar issue relacionado');
    }
    console.log('');
    process.exit(0);
  } else {
    console.log('❌ Deployment RECHAZADO');
    console.log('');
    console.log('🔄 Se requiere ROLLBACK');
    console.log('');
    console.log('📝 Pasos para hacer rollback:');
    console.log('   1. Ejecutar: npm run rollback:' + targetEnv);
    console.log('   2. Verificar que el rollback fue exitoso');
    console.log('   3. Investigar el problema');
    console.log('   4. Corregir la migración');
    console.log('   5. Volver a testear en development');
    console.log('');
    
    rl.question('¿Quieres ejecutar el rollback ahora? (SI/NO): ', (rollbackAnswer) => {
      console.log('');
      if (rollbackAnswer.toUpperCase() === 'SI') {
        console.log('🔄 Iniciando rollback...');
        console.log('');
        console.log('📝 Ejecuta este comando:');
        console.log(`   npm run rollback:${targetEnv}`);
        console.log('');
      } else {
        console.log('⚠️  Recuerda hacer el rollback manualmente lo antes posible');
        console.log('');
      }
      rl.close();
    });
  }
});
