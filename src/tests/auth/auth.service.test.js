/**
 * TEST SET: auth.service.js
 * Módulo: src/services/auth.service.js
 *
 * Cubre:
 *  - signIn()            — login con email/password
 *  - signOut()           — logout
 *  - getSession()        — sesión activa
 *  - getUser()           — usuario actual
 *  - getProfile()        — perfil de BD (tabla profiles)
 *  - updateProfile()     — actualizar perfil
 *  - updatePassword()    — cambiar contraseña
 *  - hasRole()           — verificar rol exacto
 *  - hasAnyRole()        — verificar rol en lista
 *  - belongsToCompany()  — verificar pertenencia a empresa
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { buildChain } from '../helpers/chainMock'

// ─── Mock del cliente Supabase ────────────────────────────────────────────────
// vi.hoisted() ejecuta ANTES de que vi.mock() sea procesado, evitando el
// "Cannot access before initialization" que ocurre por el hoisting de vi.mock
const mockSupabase = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
    updateUser: vi.fn(),
    resetPasswordForEmail: vi.fn(),
  },
  from: vi.fn(),
}))

vi.mock('../../services/supabaseClient', () => ({
  supabase: mockSupabase,
}))

import {
  signIn,
  signOut,
  getSession,
  getUser,
  getProfile,
  updateProfile,
  updatePassword,
  hasRole,
  hasAnyRole,
  belongsToCompany,
} from '../../services/auth.service'

// ─────────────────────────────────────────────────────────────────────────────
describe('auth.service.js', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── signIn ──────────────────────────────────────────────────────────────
  describe('signIn()', () => {
    it('retorna { data, error: null } cuando el login es exitoso', async () => {
      const mockData = { user: { id: 'u-1', email: 'admin@test.com' }, session: { access_token: 'token' } }
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({ data: mockData, error: null })

      const result = await signIn('admin@test.com', 'Password123!')

      expect(result.data).toEqual(mockData)
      expect(result.error).toBeNull()
    })

    it('retorna { data: null, error } cuando las credenciales son incorrectas', async () => {
      const mockError = { message: 'Invalid login credentials' }
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({ data: null, error: mockError })

      const result = await signIn('bad@test.com', 'wrongpassword')

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })

    it('trimea espacios del email antes de enviar', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: null })

      await signIn('  admin@test.com  ', 'password')

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'admin@test.com',
        password: 'password',
      })
    })

    it('retorna { data: null, error } cuando ocurre una excepción de red', async () => {
      mockSupabase.auth.signInWithPassword.mockRejectedValueOnce(new Error('Network error'))

      const result = await signIn('admin@test.com', 'password')

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toBe('Network error')
    })
  })

  // ─── signOut ─────────────────────────────────────────────────────────────
  describe('signOut()', () => {
    it('retorna { data: true, error: null } cuando el logout es exitoso', async () => {
      mockSupabase.auth.signOut.mockResolvedValueOnce({ error: null })

      const result = await signOut()

      expect(result.data).toBe(true)
      expect(result.error).toBeNull()
    })

    it('retorna { data: null, error } cuando falla el logout', async () => {
      const mockError = { message: 'Logout failed' }
      mockSupabase.auth.signOut.mockResolvedValueOnce({ error: mockError })

      const result = await signOut()

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  // ─── getSession ───────────────────────────────────────────────────────────
  describe('getSession()', () => {
    it('retorna { data: session } cuando hay sesión activa', async () => {
      const mockSession = { access_token: 'token-abc', user: { id: 'u-1' } }
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      })

      const result = await getSession()

      expect(result.data).toEqual(mockSession)
      expect(result.error).toBeNull()
    })

    it('retorna { data: null } cuando no hay sesión activa', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      })

      const result = await getSession()

      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })

    it('retorna { data: null, error } cuando Supabase falla', async () => {
      const mockError = { message: 'Session fetch failed' }
      mockSupabase.auth.getSession.mockResolvedValueOnce({ data: {}, error: mockError })

      const result = await getSession()

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  // ─── getUser ──────────────────────────────────────────────────────────────
  describe('getUser()', () => {
    it('retorna { data: user } cuando el usuario existe', async () => {
      const mockUser = { id: 'u-1', email: 'admin@test.com' }
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null })

      const result = await getUser()

      expect(result.data).toEqual(mockUser)
      expect(result.error).toBeNull()
    })

    it('retorna { data: null, error } cuando Supabase falla', async () => {
      const mockError = { message: 'Unauthorized' }
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: mockError })

      const result = await getUser()

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  // ─── getProfile ───────────────────────────────────────────────────────────
  describe('getProfile()', () => {
    it('retorna el perfil cuando se proporciona userId directamente', async () => {
      const mockProfile = { id: 'u-1', role: 'admin', company_id: 'comp-1', full_name: 'Juan García' }
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: mockProfile, error: null }))

      const result = await getProfile('u-1')

      expect(result.data).toEqual(mockProfile)
      expect(result.error).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    })

    it('obtiene el userId de auth.getUser() cuando no se proporciona', async () => {
      const mockProfile = { id: 'auto-u', role: 'lodger', company_id: 'comp-2' }
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'auto-u' } }, error: null })
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: mockProfile, error: null }))

      const result = await getProfile()

      expect(result.data).toEqual(mockProfile)
    })

    it('retorna error "No user ID available" cuando getUser devuelve null', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null })

      const result = await getProfile()

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toBe('No user ID available')
    })

    it('retorna { data: null, error } cuando la query de BD falla', async () => {
      const dbError = { message: 'RLS denied' }
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: null, error: dbError }))

      const result = await getProfile('u-1')

      expect(result.data).toBeNull()
      expect(result.error).toEqual(dbError)
    })
  })

  // ─── updateProfile ────────────────────────────────────────────────────────
  describe('updateProfile()', () => {
    it('retorna { data, error: null } cuando la actualización es exitosa', async () => {
      const mockUpdated = { id: 'u-1', full_name: 'Nombre Actualizado', role: 'admin' }
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: mockUpdated, error: null }))

      const result = await updateProfile('u-1', { full_name: 'Nombre Actualizado' })

      expect(result.data).toEqual(mockUpdated)
      expect(result.error).toBeNull()
    })

    it('retorna { data: null, error } cuando la actualización falla', async () => {
      const dbError = { message: 'Update failed' }
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: null, error: dbError }))

      const result = await updateProfile('u-1', { full_name: 'Test' })

      expect(result.data).toBeNull()
      expect(result.error).toEqual(dbError)
    })
  })

  // ─── updatePassword ───────────────────────────────────────────────────────
  describe('updatePassword()', () => {
    it('llama a auth.updateUser con la nueva contraseña', async () => {
      const mockData = { user: { id: 'u-1' } }
      mockSupabase.auth.updateUser.mockResolvedValueOnce({ data: mockData, error: null })

      const result = await updatePassword('NuevaPassword123!')

      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ password: 'NuevaPassword123!' })
      expect(result.data).toEqual(mockData)
      expect(result.error).toBeNull()
    })

    it('retorna { data: null, error } cuando falla el cambio de contraseña', async () => {
      const mockError = { message: 'Password too weak' }
      mockSupabase.auth.updateUser.mockResolvedValueOnce({ data: null, error: mockError })

      const result = await updatePassword('weak')

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  // ─── hasRole ──────────────────────────────────────────────────────────────
  describe('hasRole()', () => {
    it('retorna true cuando el perfil tiene el rol especificado', async () => {
      const profile = { id: 'u-1', role: 'admin' }
      const result = await hasRole('admin', profile)
      expect(result).toBe(true)
    })

    it('retorna false cuando el perfil tiene un rol diferente', async () => {
      const profile = { id: 'u-1', role: 'lodger' }
      const result = await hasRole('admin', profile)
      expect(result).toBe(false)
    })

    it('retorna false cuando no hay perfil y getUser devuelve null', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null })
      const result = await hasRole('admin')
      expect(result).toBe(false)
    })

    it('verifica rol superadmin correctamente', async () => {
      const profile = { id: 'u-1', role: 'superadmin' }
      const result = await hasRole('superadmin', profile)
      expect(result).toBe(true)
    })
  })

  // ─── hasAnyRole ───────────────────────────────────────────────────────────
  describe('hasAnyRole()', () => {
    it('retorna true cuando el rol del perfil está en el array permitido', async () => {
      const profile = { id: 'u-1', role: 'admin' }
      const result = await hasAnyRole(['admin', 'superadmin', 'api'], profile)
      expect(result).toBe(true)
    })

    it('retorna false cuando el rol no está en el array', async () => {
      const profile = { id: 'u-1', role: 'lodger' }
      const result = await hasAnyRole(['admin', 'superadmin'], profile)
      expect(result).toBe(false)
    })

    it('retorna false con array vacío de roles', async () => {
      const profile = { id: 'u-1', role: 'admin' }
      const result = await hasAnyRole([], profile)
      expect(result).toBe(false)
    })

    it('retorna false cuando el perfil es null y no hay sesión', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null })
      const result = await hasAnyRole(['admin', 'superadmin'])
      expect(result).toBe(false)
    })
  })

  // ─── belongsToCompany ─────────────────────────────────────────────────────
  describe('belongsToCompany()', () => {
    it('retorna true cuando el client_account_id del perfil coincide', async () => {
      const profile = { id: 'u-1', client_account_id: 'comp-abc-123' }
      const result = await belongsToCompany('comp-abc-123', profile)
      expect(result).toBe(true)
    })

    it('retorna false cuando el client_account_id no coincide', async () => {
      const profile = { id: 'u-1', client_account_id: 'comp-abc-123' }
      const result = await belongsToCompany('comp-xyz-999', profile)
      expect(result).toBe(false)
    })

    it('retorna false cuando el perfil no tiene client_account_id', async () => {
      const profile = { id: 'u-1', role: 'lodger' }
      const result = await belongsToCompany('comp-abc-123', profile)
      expect(result).toBe(false)
    })
  })
})
