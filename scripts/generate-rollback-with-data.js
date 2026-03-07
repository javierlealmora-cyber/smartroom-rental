#!/usr/bin/env node

/**
 * Generador de Scripts de Rollback con Datos
 * 
 * Este script genera migraciones de rollback que incluyen:
 * 1. Estructura de tablas (CREATE TABLE)
 * 2. Datos existentes (INSERT statements)
 * 3. Índices y constraints
 * 4. Políticas RLS
 * 
 * Uso:
 *   node scripts/generate-rollback-with-data.js [env] [tabla]
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const ENVIRONMENTS = {
  dev: {
    id: 'lopdwrsmkmtboeczxotj',
    url: 'https://lopdwrsmkmtboeczxotj.supabase.co',
  },
  staging: {
    id: 'lqwyyyttjamirccdtlvl',
    url: 'https://lqwyyyttjamirccdtlvl.supabase.co',
  }
};

const targetEnv = process.argv[2];
const tableName = process.argv[3];

if (!targetEnv || !ENVIRONMENTS[targetEnv] || !tableName) {
  console.log('❌ Error: Debes especificar ambiente y tabla');
  console.log('');
  console.log('Uso: node scripts/generate-rollback-with-data.js [env] [tabla]');
  console.log('');
  console.log('Ejemplos:');
  console.log('  node scripts/generate-rollback-with-data.js staging companies');
  console.log('');
  console.log('⚠️  IMPORTANTE: Necesitas SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

const env = ENVIRONMENTS[targetEnv];

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('🔄 Generador de Rollback con Datos');
console.log('═══════════════════════════════════════════════════════');
console.log('📍 Ambiente:', targetEnv);
console.log('📊 Tabla:', tableName);
console.log('');

// Verificar que existe SUPABASE_SERVICE_ROLE_KEY
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('❌ Error: Falta SUPABASE_SERVICE_ROLE_KEY en .env');
  console.log('');
  console.log('Agrega a tu .env:');
  console.log(`SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key`);
  console.log('');
  console.log('Obtén el key desde:');
  console.log(`https://supabase.com/dashboard/project/${env.id}/settings/api`);
  process.exit(1);
}

const supabase = createClient(env.url, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function generateRollbackScript() {
  try {
    console.log('📊 Leyendo datos de la tabla...');
    
    // Leer todos los datos de la tabla
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) {
      console.log('❌ Error al leer datos:', error.message);
      process.exit(1);
    }
    
    console.log(`✅ ${data.length} registros encontrados`);
    console.log('');
    
    // Generar timestamp para el archivo
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '');
    const fileName = `${timestamp}_rollback_${tableName}_with_data.sql`;
    const filePath = path.join(process.cwd(), 'supabase', 'migrations', fileName);
    
    // Generar contenido del script
    let sqlContent = `-- ============================================================================
-- ROLLBACK MIGRATION: Restaurar tabla ${tableName} con datos
-- Fecha: ${new Date().toISOString().split('T')[0]}
-- Ambiente: ${targetEnv}
-- Registros: ${data.length}
-- ============================================================================

-- ============================================================================
-- PASO 1: Recrear tabla ${tableName}
-- ============================================================================
-- NOTA: Aquí debes pegar la estructura de la tabla desde pg_dump
-- Ejecuta: npx supabase db dump --project-id ${env.id} --schema public --table ${tableName}

-- Ejemplo (ajusta según tu tabla):
-- CREATE TABLE IF NOT EXISTS public.${tableName} (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   ... (columnas de tu tabla)
-- );

-- ============================================================================
-- PASO 2: Insertar datos existentes
-- ============================================================================
`;

    if (data.length > 0) {
      // Obtener nombres de columnas
      const columns = Object.keys(data[0]);
      
      sqlContent += `-- Insertar ${data.length} registros\n`;
      
      // Generar INSERT statements
      data.forEach((row, index) => {
        const values = columns.map(col => {
          const value = row[col];
          if (value === null) return 'NULL';
          if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
          if (typeof value === 'boolean') return value ? 'true' : 'false';
          if (value instanceof Date) return `'${value.toISOString()}'`;
          if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
          return value;
        }).join(', ');
        
        sqlContent += `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES (${values});\n`;
        
        // Agregar separador cada 10 registros para legibilidad
        if ((index + 1) % 10 === 0) {
          sqlContent += '\n';
        }
      });
    } else {
      sqlContent += `-- No hay datos para insertar\n`;
    }
    
    sqlContent += `
-- ============================================================================
-- PASO 3: Recrear índices
-- ============================================================================
-- NOTA: Aquí debes pegar los índices desde pg_dump
-- Ejemplo:
-- CREATE INDEX IF NOT EXISTS idx_${tableName}_column ON public.${tableName}(column);

-- ============================================================================
-- PASO 4: Recrear constraints
-- ============================================================================
-- NOTA: Aquí debes pegar los constraints desde pg_dump

-- ============================================================================
-- PASO 5: Habilitar RLS y recrear políticas
-- ============================================================================
ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;

-- NOTA: Aquí debes pegar las políticas RLS

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${tableName}') THEN
    RAISE EXCEPTION 'ERROR: La tabla ${tableName} no fue creada';
  END IF;
  
  IF (SELECT COUNT(*) FROM public.${tableName}) != ${data.length} THEN
    RAISE WARNING 'ADVERTENCIA: Se esperaban ${data.length} registros';
  END IF;
  
  RAISE NOTICE 'OK: Rollback de ${tableName} completado (% registros)', (SELECT COUNT(*) FROM public.${tableName});
END $$;
`;
    
    // Crear directorio si no existe
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    // Escribir archivo
    fs.writeFileSync(filePath, sqlContent);
    
    console.log('✅ Script de rollback generado:');
    console.log(`   ${filePath}`);
    console.log('');
    console.log('📋 Próximos pasos:');
    console.log('');
    console.log('1. Edita el archivo y agrega:');
    console.log('   - Estructura de la tabla (CREATE TABLE)');
    console.log('   - Índices (CREATE INDEX)');
    console.log('   - Constraints (ALTER TABLE)');
    console.log('   - Políticas RLS (CREATE POLICY)');
    console.log('');
    console.log('2. Obtén la estructura ejecutando:');
    console.log(`   npx supabase db dump --project-id ${env.id} --schema public --table ${tableName}`);
    console.log('');
    console.log('3. Los INSERT statements ya están incluidos en el archivo');
    console.log('');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    process.exit(1);
  }
}

generateRollbackScript();
