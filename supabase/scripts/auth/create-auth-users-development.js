#!/usr/bin/env node
/**
 * Script para crear usuarios en auth.users de DEVELOPMENT
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
const supabaseUrl = process.env.DEV_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceKey = process.env.DEV_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ Error: Service role key no encontrada')
  console.log('💡 Verifica que .env.local contenga una de estas variables:')
  console.log('   - DEV_SUPABASE_SERVICE_KEY')
  console.log('   - SUPABASE_SERVICE_ROLE_KEY')
  console.log('💡 Obtén el service_role key de: https://supabase.com/dashboard/project/lqwyyyttjamirccdtlvl/settings/api')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Usuarios a crear
// NOTA: Superadmin ya existe, no se incluye aquí
const users = [
  // Admins de cuentas cliente (8 usuarios - 1 por cuenta) con UUIDs fijos
  { 
    id: '10000000-0000-0000-0000-000000000001',
    email: 'admin.basic1@housingspacesolutions.com', 
    password: '@2#H2s060722', 
    role: 'admin',
    full_name: 'Admin Basic 1'
  },
  { 
    id: '10000000-0000-0000-0000-000000000002',
    email: 'admin.basic2@housingspacesolutions.com', 
    password: '@2#H2s060722', 
    role: 'admin',
    full_name: 'Admin Basic 2'
  },
  { 
    id: '10000000-0000-0000-0000-000000000003',
    email: 'admin.investor1@housingspacesolutions.com', 
    password: '@2#H2s060722', 
    role: 'admin',
    full_name: 'Admin Investor 1'
  },
  { 
    id: '10000000-0000-0000-0000-000000000004',
    email: 'admin.investor2@housingspacesolutions.com', 
    password: '@2#H2s060722', 
    role: 'admin',
    full_name: 'Admin Investor 2'
  },
  { 
    id: '10000000-0000-0000-0000-000000000005',
    email: 'admin.business1@housingspacesolutions.com', 
    password: '@2#H2s060722', 
    role: 'admin',
    full_name: 'Admin Business 1'
  },
  { 
    id: '10000000-0000-0000-0000-000000000006',
    email: 'admin.business2@housingspacesolutions.com', 
    password: '@2#H2s060722', 
    role: 'admin',
    full_name: 'Admin Business 2'
  },
  { 
    id: '10000000-0000-0000-0000-000000000007',
    email: 'admin.agency1@housingspacesolutions.com', 
    password: '@2#H2s060722', 
    role: 'admin',
    full_name: 'Admin Agency 1'
  },
  { 
    id: '10000000-0000-0000-0000-000000000008',
    email: 'admin.agency2@housingspacesolutions.com', 
    password: '@2#H2s060722', 
    role: 'admin',
    full_name: 'Admin Agency 2'
  },
  
  // Inquilinos (lodgers) - 12 usuarios con login y UUIDs fijos
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `20000000-0000-0000-0000-${(i + 1).toString(16).padStart(12, '0')}`,
    email: `lodger${i + 1}@example.com`,
    password: '@2#H2s060722',
    role: 'lodger',
    full_name: `Inquilino ${i + 1}`
  }))
]

async function createUsers() {
  console.log('🚀 Creando usuarios en auth.users de DEVELOPMENT...\n')
  
  const results = {
    created: [],
    errors: [],
    existing: []
  }
  
  for (const user of users) {
    try {
      // Intentar crear el usuario con UUID fijo
      const { data, error } = await supabase.auth.admin.createUser({
        id: user.id,
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
  
  if (results.created.length > 0) {
    console.log('\n📋 Usuarios creados por rol:')
    const byRole = results.created.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1
      return acc
    }, {})
    Object.entries(byRole).forEach(([role, count]) => {
      console.log(`  - ${role}: ${count}`)
    })
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errores detallados:')
    results.errors.forEach(err => {
      console.log(`  - ${err.email}: ${err.error}`)
    })
  }
  
  console.log('\n✅ Script completado')
  console.log('📝 Total de usuarios creados por este script: 20 (8 admins + 12 lodgers)')
  console.log('📝 Total de usuarios que deberían existir en la BD: 21 (1 superadmin existente + 20 nuevos)')
  
  // Exit code basado en si hubo errores críticos
  process.exit(results.errors.length > 0 ? 1 : 0)
}

// Ejecutar
createUsers().catch(err => {
  console.error('❌ Error fatal:', err)
  process.exit(1)
})
