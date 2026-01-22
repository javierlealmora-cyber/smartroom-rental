import { supabase } from './supabaseClient'

/**
 * Authentication Service
 *
 * Servicios de autenticación usando Supabase Auth
 * Todos los métodos retornan { data, error } para manejo consistente
 */

/**
 * Login con email y contraseña
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{data, error}>}
 */
export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) return { data: null, error }

    return { data, error: null }
  } catch (err) {
    console.error('[auth.service] signIn error:', err)
    return { data: null, error: err }
  }
}

/**
 * Registro de nuevo usuario (solo crea auth.users, no el profile)
 * NOTA: El profile se crea vía trigger o Edge Function después
 * @param {string} email
 * @param {string} password
 * @param {Object} metadata - Metadata adicional del usuario
 * @returns {Promise<{data, error}>}
 */
export async function signUp(email, password, metadata = {}) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: metadata,
        // emailRedirectTo: window.location.origin + '/auth/confirm',
      },
    })

    if (error) return { data: null, error }

    return { data, error: null }
  } catch (err) {
    console.error('[auth.service] signUp error:', err)
    return { data: null, error: err }
  }
}

/**
 * Logout (cierra sesión)
 * @returns {Promise<{data, error}>}
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) return { data: null, error }

    return { data: true, error: null }
  } catch (err) {
    console.error('[auth.service] signOut error:', err)
    return { data: null, error: err }
  }
}

/**
 * Obtener sesión actual
 * @returns {Promise<{data, error}>}
 */
export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) return { data: null, error }

    return { data: data.session, error: null }
  } catch (err) {
    console.error('[auth.service] getSession error:', err)
    return { data: null, error: err }
  }
}

/**
 * Obtener usuario actual
 * @returns {Promise<{data, error}>}
 */
export async function getUser() {
  try {
    const { data, error } = await supabase.auth.getUser()

    if (error) return { data: null, error }

    return { data: data.user, error: null }
  } catch (err) {
    console.error('[auth.service] getUser error:', err)
    return { data: null, error: err }
  }
}

/**
 * Obtener perfil del usuario actual
 * @param {string} userId - ID del usuario (opcional, usa el actual si no se provee)
 * @returns {Promise<{data, error}>}
 */
export async function getProfile(userId = null) {
  try {
    let uid = userId

    if (!uid) {
      const { data: userData } = await supabase.auth.getUser()
      uid = userData?.user?.id
    }

    if (!uid) {
      return { data: null, error: new Error('No user ID available') }
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, company_id, full_name, email, phone, created_at')
      .eq('id', uid)
      .maybeSingle()

    if (error) return { data: null, error }

    return { data, error: null }
  } catch (err) {
    console.error('[auth.service] getProfile error:', err)
    return { data: null, error: err }
  }
}

/**
 * Actualizar perfil del usuario
 * @param {string} userId
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<{data, error}>}
 */
export async function updateProfile(userId, updates) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) return { data: null, error }

    return { data, error: null }
  } catch (err) {
    console.error('[auth.service] updateProfile error:', err)
    return { data: null, error: err }
  }
}

/**
 * Cambiar contraseña
 * @param {string} newPassword
 * @returns {Promise<{data, error}>}
 */
export async function updatePassword(newPassword) {
  try {
    const { data, error} = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) return { data: null, error }

    return { data, error: null }
  } catch (err) {
    console.error('[auth.service] updatePassword error:', err)
    return { data: null, error: err }
  }
}

/**
 * Solicitar reset de contraseña
 * @param {string} email
 * @returns {Promise<{data, error}>}
 */
export async function resetPasswordRequest(email) {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth/reset-password',
    })

    if (error) return { data: null, error }

    return { data, error: null }
  } catch (err) {
    console.error('[auth.service] resetPasswordRequest error:', err)
    return { data: null, error: err }
  }
}

/**
 * Verificar si el usuario tiene un rol específico
 * @param {string} role - Rol a verificar
 * @param {Object} profile - Perfil del usuario (opcional)
 * @returns {Promise<boolean>}
 */
export async function hasRole(role, profile = null) {
  try {
    let userProfile = profile

    if (!userProfile) {
      const { data } = await getProfile()
      userProfile = data
    }

    if (!userProfile) return false

    return userProfile.role === role
  } catch (err) {
    console.error('[auth.service] hasRole error:', err)
    return false
  }
}

/**
 * Verificar si el usuario tiene alguno de los roles especificados
 * @param {string[]} roles - Array de roles permitidos
 * @param {Object} profile - Perfil del usuario (opcional)
 * @returns {Promise<boolean>}
 */
export async function hasAnyRole(roles, profile = null) {
  try {
    let userProfile = profile

    if (!userProfile) {
      const { data } = await getProfile()
      userProfile = data
    }

    if (!userProfile) return false

    return roles.includes(userProfile.role)
  } catch (err) {
    console.error('[auth.service] hasAnyRole error:', err)
    return false
  }
}

/**
 * Verificar si el usuario pertenece a una empresa específica
 * @param {string} companyId
 * @param {Object} profile - Perfil del usuario (opcional)
 * @returns {Promise<boolean>}
 */
export async function belongsToCompany(companyId, profile = null) {
  try {
    let userProfile = profile

    if (!userProfile) {
      const { data } = await getProfile()
      userProfile = data
    }

    if (!userProfile) return false

    return userProfile.company_id === companyId
  } catch (err) {
    console.error('[auth.service] belongsToCompany error:', err)
    return false
  }
}

// Export default con todos los métodos
export default {
  signIn,
  signUp,
  signOut,
  getSession,
  getUser,
  getProfile,
  updateProfile,
  updatePassword,
  resetPasswordRequest,
  hasRole,
  hasAnyRole,
  belongsToCompany,
}
