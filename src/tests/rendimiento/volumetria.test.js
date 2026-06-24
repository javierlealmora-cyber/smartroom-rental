/**
 * TEST SET: Volumetría
 *
 * Valida que los servicios procesan grandes volúmenes de datos sin errores,
 * pérdida de registros ni degradación catastrófica.
 *
 * Umbrales conservadores para que pasen en CI (máquinas lentas).
 * Lo crítico: que no haya crashes ni datos perdidos.
 *
 * Tests:
 *  V-01 — listAccommodations() con 1.000 registros
 *  V-02 — listAccommodations() con 10.000 registros
 *  V-03 — listEntities() con 5.000 entidades
 *  V-04 — listRooms() con 500 habitaciones
 *  V-05 — isManagerRole() ejecutado 1.000 veces secuenciales
 *  V-06 — buildChain con payload de 50 campos (sin truncar)
 *  V-07 — buildChain con 10.000 items (mock aguanta datasets grandes)
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { buildChain } from '../helpers/chainMock'

// ─── Generadores de datasets de volumen ──────────────────────────────────────

const genAccommodations = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `acc-${i}`,
    address_street: `Calle Test ${i}`,
    address_number: `${i + 1}`,
    address_city: i % 2 === 0 ? 'Madrid' : 'Barcelona',
    status: i % 5 === 0 ? 'inactive' : 'active',
    owner_entity_id: `entity-${i % 10}`,
  }))

const genEntities = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `ent-${i}`,
    legal_name: `Empresa ${i} SL`,
    legal_type:
      i % 3 === 0 ? 'persona_juridica' : i % 3 === 1 ? 'persona_fisica' : 'autonomo',
    status: 'active',
    client_account_id: `tenant-${i % 10}`,
  }))

const genRooms = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `room-${i}`,
    number: i + 1,
    square_meters: 10 + (i % 30),
    status: i % 2 === 0 ? 'available' : 'occupied',
    accommodation_id: 'acc-0',
  }))

// ─── Mocks hoisted ────────────────────────────────────────────────────────────

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }))

vi.mock('../../services/supabaseClient', () => ({
  supabase: mockSupabase,
}))

vi.mock('../../services/supabaseInvoke.services', () => ({
  invokeWithAuth: vi.fn(),
}))

import { listAccommodations, listRooms } from '../../services/accommodations.service'
import { listEntities } from '../../services/entities.service'
import { isManagerRole } from '../../constants/roles'

// ─────────────────────────────────────────────────────────────────────────────

describe('Volumetría', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── V-01 ───────────────────────────────────────────────────────────────────
  it('V-01 — listAccommodations() procesa 1.000 registros correctamente (< 50ms)', async () => {
    const data = genAccommodations(1000)
    mockSupabase.from.mockReturnValue(buildChain({ data, error: null }))

    const t0 = performance.now()
    const result = await listAccommodations()
    const elapsed = performance.now() - t0

    expect(result).toHaveLength(1000)
    expect(result[0]).toHaveProperty('address_street')
    expect(result[0]).not.toHaveProperty('address')
    expect(result[999]).toHaveProperty('id', 'acc-999')
    expect(elapsed).toBeLessThan(50)
  })

  // ─── V-02 ───────────────────────────────────────────────────────────────────
  it('V-02 — listAccommodations() procesa 10.000 registros sin degradación catastrófica (< 200ms)', async () => {
    const data = genAccommodations(10000)
    mockSupabase.from.mockReturnValue(buildChain({ data, error: null }))

    const t0 = performance.now()
    const result = await listAccommodations()
    const elapsed = performance.now() - t0

    expect(result).toHaveLength(10000)
    expect(result[9999]).toHaveProperty('id', 'acc-9999')
    expect(elapsed).toBeLessThan(200)
  })

  // ─── V-03 ───────────────────────────────────────────────────────────────────
  it('V-03 — listEntities() procesa 5.000 entidades y retorna datos correctos (< 100ms)', async () => {
    const data = genEntities(5000)
    mockSupabase.from.mockReturnValue(buildChain({ data, error: null }))

    const t0 = performance.now()
    const result = await listEntities()
    const elapsed = performance.now() - t0

    expect(result).toHaveLength(5000)
    expect(result[0]).toHaveProperty('legal_name')
    expect(result[0]).toHaveProperty('legal_type')
    expect(result[0]).not.toHaveProperty('name') // regla de negocio: no hay columna "name"
    expect(elapsed).toBeLessThan(100)
  })

  // ─── V-04 ───────────────────────────────────────────────────────────────────
  it('V-04 — listRooms() procesa 500 habitaciones: todas con "number", sin "floor" ni "type" (< 50ms)', async () => {
    const data = genRooms(500)
    const chain = buildChain({ data, error: null })
    vi.spyOn(chain, 'eq').mockReturnValue(chain)
    mockSupabase.from.mockReturnValue(chain)

    const t0 = performance.now()
    const result = await listRooms('acc-0')
    const elapsed = performance.now() - t0

    expect(result).toHaveLength(500)
    result.forEach((room) => {
      expect(room).toHaveProperty('number')
      expect(room).not.toHaveProperty('floor')
      expect(room).not.toHaveProperty('type')
      expect(room).not.toHaveProperty('capacity')
    })
    expect(elapsed).toBeLessThan(50)
  })

  // ─── V-05 ───────────────────────────────────────────────────────────────────
  it('V-05 — isManagerRole() ejecutado 1.000 veces secuencialmente (< 20ms total)', () => {
    const roles = ['admin', 'superadmin', 'api', 'agent', 'viewer', 'lodger', null, undefined]

    const t0 = performance.now()
    for (let i = 0; i < 1000; i++) {
      isManagerRole(roles[i % roles.length])
    }
    const elapsed = performance.now() - t0

    // Verificar correctitud en muestra representativa
    expect(isManagerRole('admin')).toBe(true)
    expect(isManagerRole('lodger')).toBe(false)
    expect(isManagerRole(null)).toBe(false)
    expect(elapsed).toBeLessThan(20)
  })

  // ─── V-06 ───────────────────────────────────────────────────────────────────
  it('V-06 — buildChain maneja payloads con 50 campos sin truncar ni perder datos', async () => {
    const bigPayload = Object.fromEntries(
      Array.from({ length: 50 }, (_, i) => [`campo_${i}`, `valor_${i}`])
    )
    bigPayload.id = 'big-payload-id'
    bigPayload.status = 'active'

    const chain = buildChain({ data: bigPayload, error: null })
    const result = await chain

    expect(result.error).toBeNull()
    expect(result.data.id).toBe('big-payload-id')
    expect(result.data.campo_0).toBe('valor_0')
    expect(result.data.campo_49).toBe('valor_49')
    expect(Object.keys(result.data)).toHaveLength(52) // 50 campos dinámicos + id + status
  })

  // ─── V-07 ───────────────────────────────────────────────────────────────────
  it('V-07 — buildChain resuelve correctamente con array de 10.000 items (< 10ms)', async () => {
    const data = genAccommodations(10000)
    const chain = buildChain({ data, error: null })

    const t0 = performance.now()
    const result = await chain
    const elapsed = performance.now() - t0

    expect(result.data).toHaveLength(10000)
    expect(result.data[0]).toHaveProperty('id', 'acc-0')
    expect(result.data[9999]).toHaveProperty('id', 'acc-9999')
    expect(elapsed).toBeLessThan(10)
  })
})
