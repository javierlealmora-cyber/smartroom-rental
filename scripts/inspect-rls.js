import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' }
})

async function inspectRLS() {
  console.log('='.repeat(100))
  console.log('🔒 INSPECCIÓN DE POLÍTICAS RLS - SmartRent Systems')
  console.log('='.repeat(100))
  console.log()

  const tables = ['companies', 'profiles']

  for (const tableName of tables) {
    await inspectTableRLS(tableName)
  }
}

async function inspectTableRLS(tableName) {
  console.log('━'.repeat(100))
  console.log(`📋 TABLA: ${tableName.toUpperCase()}`)
  console.log('━'.repeat(100))
  console.log()

  // Consultar políticas existentes
  const policiesQuery = `
    SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE tablename = '${tableName}';
  `

  console.log('  📜 Query para obtener políticas (ejecutar manualmente en SQL Editor):')
  console.log('  ' + '-'.repeat(98))
  console.log(policiesQuery)
  console.log('  ' + '-'.repeat(98))
  console.log()

  // Detectar el problema intentando hacer operaciones con anon key
  await testRLSWithAnonKey(tableName)

  console.log()
}

async function testRLSWithAnonKey(tableName) {
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  const anonClient = createClient(supabaseUrl, anonKey)

  console.log('  🧪 PRUEBA CON ANON KEY:')
  console.log('  ' + '-'.repeat(98))

  try {
    const { data, error, count } = await anonClient
      .from(tableName)
      .select('*', { count: 'exact' })
      .limit(1)

    if (error) {
      if (error.message.includes('stack depth limit exceeded')) {
        console.log(`  ❌ PROBLEMA DETECTADO: Recursión infinita en políticas RLS`)
        console.log(`     Error: ${error.message}`)
        console.log(`     Código: ${error.code}`)
        console.log()
        console.log(`  💡 DIAGNÓSTICO:`)
        console.log(`     Las políticas RLS están llamándose a sí mismas en bucle infinito.`)
        console.log(`     Esto ocurre típicamente cuando una política hace SELECT a la misma tabla`)
        console.log(`     para verificar permisos, creando una recursión.`)
        console.log()
        console.log(`  🔧 SOLUCIÓN REQUERIDA:`)
        console.log(`     1. Eliminar todas las políticas RLS actuales de ${tableName}`)
        console.log(`     2. Rediseñar políticas sin recursión`)
        console.log(`     3. Usar auth.uid() y columnas de la fila actual (no subconsultas)`)
      } else if (error.code === '42501') {
        console.log(`  ✅ RLS funcionando correctamente - Acceso denegado (esperado)`)
        console.log(`     Error: ${error.message}`)
      } else if (error.code === 'PGRST116') {
        console.log(`  ⚠️  Tabla no encontrada en schema cache`)
      } else {
        console.log(`  ⚠️  Error inesperado:`)
        console.log(`     Mensaje: ${error.message}`)
        console.log(`     Código: ${error.code}`)
        console.log(`     Detalles: ${error.details || 'N/A'}`)
        console.log(`     Hint: ${error.hint || 'N/A'}`)
      }
    } else {
      console.log(`  ⚠️  RLS NO configurado correctamente - Se obtuvieron ${count} registros`)
      console.log(`     Las políticas permiten acceso público o no están configuradas`)
      if (data && data.length > 0) {
        console.log(`     Ejemplo de dato accesible: ${JSON.stringify(data[0], null, 2).substring(0, 200)}...`)
      }
    }
  } catch (err) {
    console.log(`  ❌ Error al probar con anon key: ${err.message}`)
  }

  console.log('  ' + '-'.repeat(98))
  console.log()
}

// Generar SQL queries para inspección manual
function generateInspectionQueries() {
  console.log('='.repeat(100))
  console.log('📝 QUERIES SQL PARA INSPECCIÓN MANUAL (Ejecutar en Supabase SQL Editor)')
  console.log('='.repeat(100))
  console.log()

  console.log('-- 1. Verificar si RLS está habilitado en las tablas')
  console.log(`SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('companies', 'profiles')
  AND c.relkind = 'r';`)
  console.log()

  console.log('-- 2. Ver todas las políticas existentes')
  console.log(`SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS command,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename IN ('companies', 'profiles')
ORDER BY tablename, policyname;`)
  console.log()

  console.log('-- 3. Deshabilitar RLS temporalmente (si es necesario para debugging)')
  console.log(`-- CUIDADO: Solo usar en desarrollo
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;`)
  console.log()

  console.log('-- 4. Eliminar todas las políticas existentes (para recrearlas)')
  console.log(`-- Primero obtener nombres de políticas con query #2, luego:
-- DROP POLICY IF EXISTS "nombre_politica" ON companies;
-- DROP POLICY IF EXISTS "nombre_politica" ON profiles;`)
  console.log()
}

async function run() {
  await inspectRLS()
  generateInspectionQueries()
}

run().catch(console.error)
