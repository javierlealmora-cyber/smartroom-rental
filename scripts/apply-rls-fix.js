import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { readFileSync } from 'fs'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  console.log('='.repeat(100))
  console.log('🔧 APLICANDO MIGRACIÓN: Arreglar RLS con recursión infinita')
  console.log('='.repeat(100))
  console.log()

  // Leer el archivo de migración
  const migrationPath = './supabase/migrations/20260122_fix_rls_recursion.sql'
  let migrationSQL

  try {
    migrationSQL = readFileSync(migrationPath, 'utf8')
  } catch (error) {
    console.error(`❌ Error al leer el archivo de migración: ${error.message}`)
    process.exit(1)
  }

  console.log('📄 Migración cargada desde:', migrationPath)
  console.log()

  // Dividir en statements individuales (simplificado)
  // Nota: Esto no funciona perfectamente con bloques DO, pero sirve para mostrar progreso
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'))

  console.log(`📊 Total de statements a ejecutar: ${statements.length}`)
  console.log()

  console.log('⚠️  NOTA: Supabase JS Client no soporta ejecución de SQL directamente.')
  console.log('    Debes ejecutar la migración manualmente en el SQL Editor de Supabase.')
  console.log()
  console.log('🔗 URL del SQL Editor: https://supabase.com/dashboard/project/lqwyyyttjamirccdtlvl/sql/new')
  console.log()
  console.log('📋 Copia y pega el contenido de: supabase/migrations/20260122_fix_rls_recursion.sql')
  console.log()
  console.log('='.repeat(100))
  console.log()

  // Mostrar preview de la migración
  console.log('📝 PREVIEW DE LA MIGRACIÓN:')
  console.log('-'.repeat(100))
  console.log(migrationSQL.substring(0, 1500) + '\n... (contenido completo en el archivo)')
  console.log('-'.repeat(100))
}

applyMigration().catch(console.error)
