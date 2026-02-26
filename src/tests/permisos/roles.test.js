/**
 * TEST SET: roles.js
 * Módulo: src/constants/roles.js
 *
 * Cubre:
 *  - Constantes MANAGER_ROLES y LODGER_ROLES
 *  - isManagerRole() — detecta roles de manager
 *  - isLodgerRole()  — detecta rol de inquilino
 *  - getPortalHomeForRole() — ruta de redirección post-login
 */
import { describe, it, expect } from 'vitest'
import {
  MANAGER_ROLES,
  LODGER_ROLES,
  isManagerRole,
  isLodgerRole,
  getPortalHomeForRole,
} from '../../constants/roles'

// ─────────────────────────────────────────────────────────────────────────────
describe('roles.js — Constantes', () => {
  it('MANAGER_ROLES contiene los 5 roles de manager', () => {
    expect(MANAGER_ROLES).toEqual(['superadmin', 'admin', 'api', 'agent', 'viewer'])
  })

  it('LODGER_ROLES contiene solo "lodger"', () => {
    expect(LODGER_ROLES).toEqual(['lodger'])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('isManagerRole()', () => {
  it.each(['superadmin', 'admin', 'api', 'agent', 'viewer'])(
    'devuelve true para el rol "%s"',
    (role) => {
      expect(isManagerRole(role)).toBe(true)
    }
  )

  it.each(['lodger', 'student', 'unknown', '', null, undefined])(
    'devuelve false para "%s"',
    (role) => {
      expect(isManagerRole(role)).toBe(false)
    }
  )
})

// ─────────────────────────────────────────────────────────────────────────────
describe('isLodgerRole()', () => {
  it('devuelve true para "lodger"', () => {
    expect(isLodgerRole('lodger')).toBe(true)
  })

  it.each(['admin', 'superadmin', 'api', 'viewer', 'agent', '', null, undefined])(
    'devuelve false para "%s"',
    (role) => {
      expect(isLodgerRole(role)).toBe(false)
    }
  )
})

// ─────────────────────────────────────────────────────────────────────────────
describe('getPortalHomeForRole()', () => {
  it('superadmin → /v2/superadmin', () => {
    expect(getPortalHomeForRole('superadmin')).toBe('/v2/superadmin')
  })

  it('lodger → /v2/lodger/dashboard', () => {
    expect(getPortalHomeForRole('lodger')).toBe('/v2/lodger/dashboard')
  })

  it.each(['admin', 'api', 'agent', 'viewer'])(
    'manager "%s" → /v2/admin',
    (role) => {
      expect(getPortalHomeForRole(role)).toBe('/v2/admin')
    }
  )

  it('rol desconocido → /v2/admin (fallback)', () => {
    expect(getPortalHomeForRole('unknown_role')).toBe('/v2/admin')
  })
})
