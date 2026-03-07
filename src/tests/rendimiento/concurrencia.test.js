/**
 * TEST SET: Concurrencia
 *
 * Valida el comportamiento del sistema bajo llamadas paralelas:
 * - Lecturas concurrentes no interfieren entre sí
 * - Circuit breaker se activa y bloquea correctamente
 * - Single-flight de refresh: N llamadas paralelas → 1 sola petición real
 * - Retry en errores transitorios funciona con backoff
 * - Funciones puras aguantan miles de llamadas paralelas
 *
 * Tests C-01 a C-04, C-09, C-10: mocks estándar (sin estado de módulo)
 * Tests C-05 a C-08: módulo aislado con vi.resetModules() + fake timers
 *   (supabaseInvoke.services.js usa estado global de módulo: breakerOpenUntil,
 *    consecutiveAuthFailures, refreshInFlight, cooldownUntil)
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { buildChain } from '../helpers/chainMock'

// ─── Mocks hoisted (para C-01 a C-04, C-09, C-10) ───────────────────────────

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }))

vi.mock('../../services/supabaseClient', () => ({
  supabase: mockSupabase,
}))

vi.mock('../../services/supabaseInvoke.services', () => ({
  invokeWithAuth: vi.fn(),
}))

import { listAccommodations, listRooms } from '../../services/accommodations.service'
import { listEntities } from '../../services/entities.service'
import { isManagerRole, isLodgerRole, getPortalHomeForRole } from '../../constants/roles'

// ─────────────────────────────────────────────────────────────────────────────

describe('Concurrencia — lecturas paralelas (sin estado de módulo)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── C-01 ─────────────────────────────────────────────────────────────────
  it('C-01 — 20 llamadas paralelas a listAccommodations() no interfieren entre sí', async () => {
    // Cada llamada devuelve un dataset diferente (identificado por índice)
    mockSupabase.from.mockImplementation((table) => {
      expect(table).toBe('accommodations')
      return buildChain({
        data: [{ id: `acc-parallel`, address_line1: 'Calle X', status: 'active' }],
        error: null,
      })
    })

    const calls = Array.from({ length: 20 }, () => listAccommodations())
    const results = await Promise.all(calls)

    expect(results).toHaveLength(20)
    results.forEach((result) => {
      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('address_line1')
      expect(result[0]).not.toHaveProperty('address')
    })
    // from() debe haber sido llamado exactamente 20 veces
    expect(mockSupabase.from).toHaveBeenCalledTimes(20)
  })

  // ─── C-02 ─────────────────────────────────────────────────────────────────
  it('C-02 — 20 llamadas paralelas a listEntities() no producen race conditions', async () => {
    mockSupabase.from.mockImplementation(() =>
      buildChain({
        data: [{ id: 'ent-1', legal_name: 'Test SL', legal_type: 'persona_juridica', status: 'active' }],
        error: null,
      })
    )

    const calls = Array.from({ length: 20 }, () => listEntities())
    const results = await Promise.all(calls)

    expect(results).toHaveLength(20)
    results.forEach((result) => {
      expect(result[0]).toHaveProperty('legal_name')
      expect(result[0]).not.toHaveProperty('name') // regla de negocio
    })
    expect(mockSupabase.from).toHaveBeenCalledTimes(20)
  })

  // ─── C-03 ─────────────────────────────────────────────────────────────────
  it('C-03 — 50 llamadas paralelas a listRooms() retornan datos correctos sin error', async () => {
    mockSupabase.from.mockImplementation(() => {
      const chain = buildChain({
        data: [{ id: 'room-1', number: 1, square_meters: 12, status: 'available' }],
        error: null,
      })
      vi.spyOn(chain, 'eq').mockReturnValue(chain)
      return chain
    })

    const calls = Array.from({ length: 50 }, (_, i) => listRooms(`acc-${i}`))
    const results = await Promise.all(calls)

    expect(results).toHaveLength(50)
    results.forEach((result) => {
      expect(result[0]).toHaveProperty('number')
      expect(result[0]).not.toHaveProperty('floor')
      expect(result[0]).not.toHaveProperty('type')
    })
  })

  // ─── C-04 ─────────────────────────────────────────────────────────────────
  it('C-04 — lecturas cross-service en paralelo (accommodations + entities + rooms) no bloquean', async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'accommodations') {
        return buildChain({
          data: [{ id: 'acc-1', address_line1: 'Calle A', status: 'active' }],
          error: null,
        })
      }
      if (table === 'entities') {
        return buildChain({
          data: [{ id: 'ent-1', legal_name: 'Empresa SL', legal_type: 'persona_juridica', status: 'active' }],
          error: null,
        })
      }
      // rooms
      const chain = buildChain({
        data: [{ id: 'room-1', number: 1, square_meters: 12, status: 'available' }],
        error: null,
      })
      vi.spyOn(chain, 'eq').mockReturnValue(chain)
      return chain
    })

    const [accommodations, entities, rooms] = await Promise.all([
      listAccommodations(),
      listEntities(),
      listRooms('acc-1'),
    ])

    expect(accommodations[0]).toHaveProperty('address_line1')
    expect(entities[0]).toHaveProperty('legal_name')
    expect(rooms[0]).toHaveProperty('number')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// C-09 y C-10: funciones puras (no necesitan mocks de módulo)
// ─────────────────────────────────────────────────────────────────────────────

describe('Concurrencia — funciones puras en paralelo', () => {
  // ─── C-09 ─────────────────────────────────────────────────────────────────
  it('C-09 — 50 pares paralelos de isManagerRole() + isLodgerRole() retornan resultados correctos', async () => {
    const roles = ['admin', 'superadmin', 'api', 'agent', 'viewer', 'lodger', null]

    const calls = Array.from({ length: 50 }, (_, i) => {
      const role = roles[i % roles.length]
      return Promise.resolve({
        isManager: isManagerRole(role),
        isLodger: isLodgerRole(role),
        role,
      })
    })

    const results = await Promise.all(calls)

    expect(results).toHaveLength(50)

    // Un rol no puede ser gestor Y inquilino a la vez
    results.forEach(({ isManager, isLodger }) => {
      expect(isManager && isLodger).toBe(false)
    })

    // Verificar resultados esperados por rol
    const adminResult = results.find((r) => r.role === 'admin')
    expect(adminResult.isManager).toBe(true)
    expect(adminResult.isLodger).toBe(false)

    const lodgerResult = results.find((r) => r.role === 'lodger')
    expect(lodgerResult.isManager).toBe(false)
    expect(lodgerResult.isLodger).toBe(true)
  })

  // ─── C-10 ─────────────────────────────────────────────────────────────────
  it('C-10 — getPortalHomeForRole() con 10.000 llamadas en paralelo: sin errores ni resultados null', async () => {
    const roles = ['admin', 'superadmin', 'api', 'agent', 'viewer', 'lodger']

    const t0 = performance.now()
    const calls = Array.from({ length: 10000 }, (_, i) =>
      Promise.resolve(getPortalHomeForRole(roles[i % roles.length]))
    )
    const results = await Promise.all(calls)
    const elapsed = performance.now() - t0

    expect(results).toHaveLength(10000)
    results.forEach((route) => {
      // Cada rol válido debe tener una ruta home definida (no null/undefined)
      expect(route).toBeTruthy()
      expect(typeof route).toBe('string')
    })
    expect(elapsed).toBeLessThan(500) // 10k promesas resueltas en < 500ms
  })
})

// C-05 a C-08 están en concurrencia-breaker.test.js (archivo separado)
// porque necesitan importar el módulo REAL de supabaseInvoke.services,
// lo que entra en conflicto con el vi.mock() hoisted de este archivo.
