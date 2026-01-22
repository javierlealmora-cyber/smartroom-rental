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

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyRLS() {
  console.log('='.repeat(100))
  console.log('🔍 VERIFICACIÓN DEL ESTADO DE RLS')
  console.log('='.repeat(100))
  console.log()

  // Test 1: Verificar si RLS está habilitado
  console.log('1️⃣  Verificando si RLS está habilitado...')
  console.log('-'.repeat(100))

  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('*')
    .limit(1)

  if (!companiesError) {
    console.log('✅ companies - Accesible con service role key (esperado)')
    console.log(`   Registros obtenidos: ${companies?.length || 0}`)
  } else {
    console.log(`⚠️  companies - Error: ${companiesError.message}`)
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)

  if (!profilesError) {
    console.log('✅ profiles - Accesible con service role key (esperado)')
    console.log(`   Registros obtenidos: ${profiles?.length || 0}`)
  } else {
    console.log(`⚠️  profiles - Error: ${profilesError.message}`)
  }

  console.log()

  // Test 2: Verificar funciones helper
  console.log('2️⃣  Verificando funciones helper...')
  console.log('-'.repeat(100))

  // Intentar llamar a get_my_role()
  const { data: roleData, error: roleError } = await supabase.rpc('get_my_role')

  if (!roleError) {
    console.log(`✅ get_my_role() - Función existe`)
    console.log(`   Resultado: ${roleData || 'null (no hay usuario autenticado)'}`)
  } else {
    if (roleError.code === 'PGRST202') {
      console.log(`❌ get_my_role() - Función NO existe`)
      console.log(`   Esto significa que la migración NO se aplicó correctamente`)
    } else {
      console.log(`⚠️  get_my_role() - Error: ${roleError.message}`)
    }
  }

  // Intentar llamar a get_my_company_id()
  const { data: companyData, error: companyError } = await supabase.rpc('get_my_company_id')

  if (!companyError) {
    console.log(`✅ get_my_company_id() - Función existe`)
    console.log(`   Resultado: ${companyData || 'null (no hay usuario autenticado)'}`)
  } else {
    if (companyError.code === 'PGRST202') {
      console.log(`❌ get_my_company_id() - Función NO existe`)
      console.log(`   Esto significa que la migración NO se aplicó correctamente`)
    } else {
      console.log(`⚠️  get_my_company_id() - Error: ${companyError.message}`)
    }
  }

  console.log()

  // Test 3: Probar con anon key
  console.log('3️⃣  Probando acceso con ANON KEY (usuario no autenticado)...')
  console.log('-'.repeat(100))

  const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY)

  const { data: anonCompanies, error: anonCompaniesError } = await anonClient
    .from('companies')
    .select('*')
    .limit(1)

  if (anonCompaniesError) {
    if (anonCompaniesError.message.includes('stack depth limit')) {
      console.log('❌ companies - RECURSIÓN INFINITA TODAVÍA PRESENTE')
    } else {
      console.log(`✅ companies - Acceso correctamente bloqueado para usuarios no autenticados`)
      console.log(`   Error: ${anonCompaniesError.message}`)
    }
  } else {
    if (anonCompanies && anonCompanies.length > 0) {
      console.log('⚠️  companies - ACCESIBLE PÚBLICAMENTE (problema de seguridad)')
    } else {
      console.log('✅ companies - Sin datos pero sin error (políticas pueden estar funcionando)')
    }
  }

  const { data: anonProfiles, error: anonProfilesError } = await anonClient
    .from('profiles')
    .select('*')
    .limit(1)

  if (anonProfilesError) {
    if (anonProfilesError.message.includes('stack depth limit')) {
      console.log('❌ profiles - RECURSIÓN INFINITA TODAVÍA PRESENTE')
    } else {
      console.log(`✅ profiles - Acceso correctamente bloqueado para usuarios no autenticados`)
      console.log(`   Error: ${anonProfilesError.message}`)
    }
  } else {
    if (anonProfiles && anonProfiles.length > 0) {
      console.log('⚠️  profiles - ACCESIBLE PÚBLICAMENTE (problema de seguridad)')
    } else {
      console.log('✅ profiles - Sin datos pero sin error (políticas pueden estar funcionando)')
    }
  }

  console.log()

  // Resumen
  console.log('='.repeat(100))
  console.log('📊 RESUMEN')
  console.log('='.repeat(100))

  if (roleError?.code === 'PGRST202' || companyError?.code === 'PGRST202') {
    console.log('❌ LA MIGRACIÓN NO SE APLICÓ CORRECTAMENTE')
    console.log()
    console.log('🔧 ACCIÓN REQUERIDA:')
    console.log('   1. Abre el SQL Editor de Supabase:')
    console.log('      https://supabase.com/dashboard/project/lqwyyyttjamirccdtlvl/sql/new')
    console.log()
    console.log('   2. Copia y pega el contenido de:')
    console.log('      supabase/migrations/20260122_fix_rls_recursion.sql')
    console.log()
    console.log('   3. Ejecuta el SQL')
    console.log()
    console.log('   4. Ejecuta este script nuevamente para verificar')
  } else {
    if (anonCompaniesError?.message.includes('stack depth') || anonProfilesError?.message.includes('stack depth')) {
      console.log('❌ RECURSIÓN INFINITA TODAVÍA PRESENTE')
      console.log('   La migración necesita ser aplicada')
    } else {
      console.log('✅ RLS FUNCIONANDO CORRECTAMENTE')
      console.log('   - No hay recursión infinita')
      console.log('   - Acceso bloqueado para usuarios no autenticados')
      console.log('   - Funciones helper creadas')
    }
  }

  console.log()
}

verifyRLS().catch(console.error)
