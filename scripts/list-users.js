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
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function listUsers() {
  console.log('='.repeat(100))
  console.log('👥 USUARIOS EN auth.users')
  console.log('='.repeat(100))
  console.log()

  // Listar usuarios de auth
  const { data: { users }, error } = await supabase.auth.admin.listUsers()

  if (error) {
    console.error('❌ Error al listar usuarios:', error.message)
    return
  }

  if (!users || users.length === 0) {
    console.log('⚠️  No hay usuarios registrados en auth.users')
    console.log()
    console.log('💡 Para crear un usuario de prueba, ejecuta:')
    console.log('   node scripts/create-test-user.js')
    return
  }

  console.log(`📊 Total de usuarios: ${users.length}`)
  console.log()

  for (const [index, user] of users.entries()) {
    console.log('-'.repeat(100))
    console.log(`Usuario ${index + 1}:`)
    console.log(`  ID: ${user.id}`)
    console.log(`  Email: ${user.email || 'N/A'}`)
    console.log(`  Email confirmado: ${user.email_confirmed_at ? 'Sí' : 'No'}`)
    console.log(`  Creado: ${user.created_at}`)
    console.log(`  Última vez: ${user.last_sign_in_at || 'Nunca'}`)
    console.log(`  Metadata: ${JSON.stringify(user.user_metadata, null, 2)}`)
    console.log()

    // Buscar profile asociado
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.log(`  ⚠️  Error al buscar profile: ${profileError.message}`)
    } else if (profile) {
      console.log(`  Profile:`)
      console.log(`    Role: ${profile.role}`)
      console.log(`    Company ID: ${profile.company_id || 'N/A'}`)
      console.log(`    Full Name: ${profile.full_name || 'N/A'}`)
      console.log(`    Email: ${profile.email || 'N/A'}`)
      console.log(`    Phone: ${profile.phone || 'N/A'}`)
    } else {
      console.log(`  ⚠️  No hay profile asociado en la tabla profiles`)
      console.log(`     Este usuario NO podrá hacer login correctamente`)
    }
    console.log()
  }

  console.log('='.repeat(100))
  console.log()
  console.log('💡 CREDENCIALES PARA LOGIN:')
  console.log('   Email: (uno de los emails listados arriba)')
  console.log('   Password: (la contraseña que se usó al crear el usuario)')
  console.log()
  console.log('🔧 Si no recuerdas la contraseña, puedes:')
  console.log('   1. Crear un nuevo usuario de prueba: node scripts/create-test-user.js')
  console.log('   2. Resetear la contraseña desde Supabase Dashboard')
  console.log()
}

listUsers().catch(console.error)
