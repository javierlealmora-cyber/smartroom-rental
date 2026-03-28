#!/usr/bin/env node
/**
 * Script para crear usuarios en auth.users de STAGING
 * Usa Supabase Admin API
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Obtener directorio del proyecto
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..', '..')

// Cargar variables de entorno desde .env.local
dotenv.config({ path: join(projectRoot, '.env.local') })

// Configuración desde variables de entorno
const supabaseUrl = process.env.STAGING_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.STAGING_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Service role key no encontrada')
  console.log('💡 Verifica que .env.local contenga una de estas variables:')
  console.log('   - STAGING_SUPABASE_URL y STAGING_SUPABASE_SERVICE_KEY')
  console.log('   - NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  console.log('💡 Obtén el service_role key de: https://supabase.com/dashboard/project/lopdwrsmkmtboeczxotj/settings/api')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Usuarios a crear
const users = [
  // Superadmin
  { 
    email: 'javierlealmora@housingspacesolutions.com', 
    password: '@2#H2s060722', 
    role: 'superadmin',
    full_name: 'Javier Leal Mora'
  },
  
  // Basic users
  { 
    email: 'basicuser1@housingspacesolutions.com', 
    password: '@2#H2s060722', 
    role: 'admin',
    full_name: 'Basic User 1'
  },
  { 
    email: 'basicuser2@housingspacesolutions.com', 
    password: '@2#H2s060722', 
    role: 'admin',
    full_name: 'Basic User 2'
  },
  
  // Investor users
  { 
    email: 'investorentidad1@housingspacesolutions.com', 
    password: '@2#H2s060722', 
    role: 'admin',
    full_name: 'Investor Entity 1'
  },
  { 
    email: 'investorentidad4@housingspacesolutions.com', 
    password: '@2#H2s060722', 
    role: 'admin',
    full_name: 'Investor Entity 4'
  },
  
  // Business users
  { 
    email: 'businessentidad2@housingspacesolutions.com', 
    password: '@2#H2s060722', 
    role: 'admin',
    full_name: 'Business Entity 2'
  },
  { 
    email: 'businessentidad5@housingspacesolutions.com', 
    password: '@2#H2s060722', 
    role: 'admin',
    full_name: 'Business Entity 5'
  },
  
  // Agency users
  { 
    email: 'agententidad3@housingspacesolutions.com', 
    password: '@2#H2s060722', 
    role: 'admin',
    full_name: 'Agent Entity 3'
  },
  { 
    email: 'agententidad6@housingspacesolutions.com', 
    password: '@2#H2s060722', 
    role: 'admin',
    full_name: 'Agent Entity 6'
  },
  
  // Lodgers (inquilinos) - 80 usuarios con password común
  ...Array.from({ length: 80 }, (_, i) => ({
    email: `inquilino${i + 1}@housingspacesolutions.com`,
    password: 'Test123456!',
    role: 'lodger',
    full_name: `Inquilino ${i + 1}`
  }))
]

async function createUsers() {
  console.log('🚀 Creando usuarios en auth.users de STAGING...\n')
  
  const results = {
    created: [],
    errors: [],
    existing: []
  }
  
  for (const user of users) {
    try {
      // Intentar crear el usuario
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { 
          role: user.role,
          full_name: user.full_name
        }
      })
      
      if (error) {
        // Si el error es que el usuario ya existe, lo marcamos como existente
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          console.log(`⚠️  Usuario ya existe: ${user.email}`)
          results.existing.push(user.email)
        } else {
          console.error(`❌ Error creando ${user.email}:`, error.message)
          results.errors.push({ email: user.email, error: error.message })
        }
      } else {
        console.log(`✅ Usuario creado: ${user.email} (${data.user.id}) - ${user.role}`)
        results.created.push({ email: user.email, id: data.user.id, role: user.role })
      }
    } catch (err) {
      console.error(`❌ Excepción creando ${user.email}:`, err.message)
      results.errors.push({ email: user.email, error: err.message })
    }
  }
  
  // Resumen
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMEN')
  console.log('='.repeat(60))
  console.log(`✅ Usuarios creados: ${results.created.length}`)
  console.log(`⚠️  Usuarios existentes: ${results.existing.length}`)
  console.log(`❌ Errores: ${results.errors.length}`)
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errores detallados:')
    results.errors.forEach(err => {
      console.log(`  - ${err.email}: ${err.error}`)
    })
  }
  
  console.log('\n✅ Script completado')
  
  // Exit code basado en si hubo errores críticos
  process.exit(results.errors.length > 0 ? 1 : 0)
}

// Ejecutar
createUsers().catch(err => {
  console.error('❌ Error fatal:', err)
  process.exit(1)
})
