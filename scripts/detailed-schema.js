import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Error: Missing environment variables')
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and VITE_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const tables = ['companies', 'profiles', 'apartments', 'rooms', 'tenants', 'invoices']

async function getDetailedSchema() {
  console.log('='.repeat(100))
  console.log('📊 ESQUEMA DETALLADO DE LA BASE DE DATOS - SmartRent Systems (DEV)')
  console.log('='.repeat(100))
  console.log()

  for (const tableName of tables) {
    await analyzeTable(tableName)
  }

  console.log()
  console.log('='.repeat(100))
  console.log('🔒 VERIFICANDO POLÍTICAS RLS')
  console.log('='.repeat(100))
  await checkRLS()
}

async function analyzeTable(tableName) {
  console.log()
  console.log('━'.repeat(100))
  console.log(`📋 TABLA: ${tableName.toUpperCase()}`)
  console.log('━'.repeat(100))

  // Obtener datos de ejemplo
  const { data: records, error: selectError, count } = await supabase
    .from(tableName)
    .select('*', { count: 'exact' })
    .limit(3)

  if (selectError) {
    console.log(`  ❌ Error: ${selectError.message}`)
    return
  }

  console.log(`  📊 Total de registros: ${count}`)
  console.log()

  if (!records || records.length === 0) {
    console.log('  ⚠️  Tabla vacía - no se pueden inferir detalles de columnas')
    console.log('  📝 Se necesita migración o definición de esquema')
    return
  }

  // Analizar estructura basada en el primer registro
  const sample = records[0]
  const columns = Object.keys(sample)

  console.log('  📝 COLUMNAS:')
  console.log('  ' + '-'.repeat(98))
  console.log(`  ${'Columna'.padEnd(30)} | ${'Tipo detectado'.padEnd(20)} | ${'Ejemplo'.padEnd(40)}`)
  console.log('  ' + '-'.repeat(98))

  columns.forEach(col => {
    const value = sample[col]
    const type = detectType(value)
    const example = formatExample(value)
    console.log(`  ${col.padEnd(30)} | ${type.padEnd(20)} | ${example.padEnd(40)}`)
  })

  console.log()
  console.log('  📄 DATOS DE EJEMPLO:')
  console.log('  ' + '-'.repeat(98))

  records.forEach((record, index) => {
    console.log(`  Registro ${index + 1}:`)
    Object.entries(record).forEach(([key, value]) => {
      console.log(`    ${key}: ${formatValue(value)}`)
    })
    if (index < records.length - 1) console.log()
  })
}

function detectType(value) {
  if (value === null) return 'NULL (tipo desconocido)'
  if (typeof value === 'string') {
    if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) return 'timestamp/datetime'
    if (value.match(/^\d{4}-\d{2}-\d{2}$/)) return 'date'
    if (value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) return 'uuid'
    if (value.startsWith('http')) return 'text/url'
    if (value.startsWith('#') && value.length === 7) return 'text/color'
    return 'text/varchar'
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer/bigint' : 'numeric/float'
  }
  if (typeof value === 'boolean') return 'boolean'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'jsonb/json'
  return 'unknown'
}

function formatExample(value) {
  if (value === null) return 'NULL'
  if (typeof value === 'string') {
    return value.length > 37 ? value.substring(0, 34) + '...' : value
  }
  if (typeof value === 'object') return JSON.stringify(value).substring(0, 37) + '...'
  return String(value)
}

function formatValue(value) {
  if (value === null) return 'null'
  if (typeof value === 'string' && value.length > 80) return value.substring(0, 77) + '...'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

async function checkRLS() {
  console.log()
  console.log('  Intentando verificar si RLS está habilitado en las tablas...')
  console.log()

  // Como no podemos consultar pg_tables directamente, vamos a intentar
  // hacer operaciones que fallarían si RLS estuviera habilitado

  for (const tableName of tables) {
    try {
      // Intentar consultar con anon key (sin service role)
      const anonClient = createClient(supabaseUrl, supabaseAnonKey)

      const { data, error } = await anonClient.from(tableName).select('*').limit(1)

      if (error && error.code === '42501') {
        console.log(`  ✅ ${tableName.padEnd(20)} - RLS habilitado (acceso denegado con anon key)`)
      } else if (error) {
        console.log(`  ⚠️  ${tableName.padEnd(20)} - Error: ${error.message}`)
      } else if (data) {
        console.log(`  ❌ ${tableName.padEnd(20)} - RLS NO configurado o políticas permisivas`)
      }
    } catch (err) {
      console.log(`  ⚠️  ${tableName.padEnd(20)} - Error al verificar: ${err.message}`)
    }
  }
}

getDetailedSchema().catch(console.error)
