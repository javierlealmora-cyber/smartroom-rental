import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables')
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSchema() {
  console.log('='.repeat(80))
  console.log('ESQUEMA DE LA BASE DE DATOS - SmartRent Systems (DEV)')
  console.log('='.repeat(80))
  console.log()

  // Listar todas las tablas
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name')

  if (tablesError) {
    console.error('Error obteniendo tablas:', tablesError)

    // Intentar con RPC o query directa
    const { data: tablesRpc, error: rpcError } = await supabase.rpc('exec_sql', {
      sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    })

    if (rpcError) {
      console.error('Error con RPC:', rpcError)
      // Intentar consultar tablas conocidas directamente
      await checkKnownTables()
      return
    }

    console.log('Tablas encontradas (vía RPC):', tablesRpc)
    return
  }

  console.log('📋 TABLAS ENCONTRADAS:')
  console.log('-'.repeat(80))

  if (!tables || tables.length === 0) {
    console.log('No se encontraron tablas en el esquema public')
    await checkKnownTables()
    return
  }

  for (const table of tables) {
    console.log(`  - ${table.table_name}`)
  }

  console.log()
  console.log('📊 DETALLES DE CADA TABLA:')
  console.log('-'.repeat(80))

  for (const table of tables) {
    await getTableDetails(table.table_name)
  }
}

async function checkKnownTables() {
  console.log()
  console.log('🔍 Verificando tablas conocidas directamente...')
  console.log('-'.repeat(80))

  const knownTables = ['companies', 'profiles', 'apartments', 'rooms', 'tenants', 'invoices']

  for (const tableName of knownTables) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      if (!error) {
        console.log(`  ✅ ${tableName} - ${count} registros`)

        // Obtener estructura de la tabla
        const { data: sample } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)
          .single()

        if (sample) {
          console.log(`     Columnas: ${Object.keys(sample).join(', ')}`)
        }
      } else if (error.code === 'PGRST116' || error.code === '42P01') {
        console.log(`  ❌ ${tableName} - No existe`)
      } else {
        console.log(`  ⚠️  ${tableName} - Error: ${error.message}`)
      }
    } catch (err) {
      console.log(`  ⚠️  ${tableName} - Error: ${err.message}`)
    }
  }
}

async function getTableDetails(tableName) {
  console.log()
  console.log(`📄 Tabla: ${tableName}`)
  console.log('-'.repeat(40))

  // Obtener columnas
  const { data: columns, error: columnsError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable, column_default')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .order('ordinal_position')

  if (columnsError) {
    // Intentar obtener un registro de ejemplo
    const { data: sample, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
      .single()

    if (!sampleError && sample) {
      console.log('  Columnas (detectadas):')
      Object.keys(sample).forEach(col => {
        console.log(`    - ${col}`)
      })
    } else {
      console.log(`  ⚠️  No se pudo obtener estructura: ${columnsError?.message || sampleError?.message}`)
    }
  } else if (columns && columns.length > 0) {
    console.log('  Columnas:')
    columns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : ''
      console.log(`    - ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`)
    })
  }

  // Contar registros
  const { count, error: countError } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true })

  if (!countError) {
    console.log(`  Registros: ${count}`)
  }
}

checkSchema().catch(console.error)
