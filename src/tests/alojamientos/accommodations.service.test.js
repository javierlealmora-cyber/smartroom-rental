/**
 * TEST SET: accommodations.service.js
 * Módulo: src/services/accommodations.service.js
 *
 * Cubre:
 *  - listAccommodations()      — listar alojamientos (con/sin filtro status)
 *  - getAccommodation(id)      — obtener alojamiento por id
 *  - createAccommodation()     — crear vía Edge Function
 *  - updateAccommodation()     — actualizar vía Edge Function
 *  - setAccommodationStatus()  — cambiar estado vía Edge Function
 *  - listRooms()               — listar habitaciones de un alojamiento
 *  - updateRoom()              — actualizar habitación vía Edge Function
 *  - setRoomStatus()           — cambiar estado habitación vía Edge Function
 *
 * Reglas de negocio verificadas:
 *  - accommodations usa address_line1 (NO address)
 *  - rooms usa number (NO floor ni type)
 *  - Operaciones de escritura van por Edge Function (manage_accommodation)
 *  - Las lecturas van directamente por Supabase client
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { buildChain } from '../helpers/chainMock'

// ─── Mocks hoisted (deben definirse ANTES del hoisting de vi.mock) ────────────
const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }))

vi.mock('../../services/supabaseClient', () => ({
  supabase: mockSupabase,
}))

vi.mock('../../services/supabaseInvoke.services', () => ({
  invokeWithAuth: vi.fn(),
}))

import { invokeWithAuth } from '../../services/supabaseInvoke.services'
import {
  listAccommodations,
  getAccommodation,
  createAccommodation,
  updateAccommodation,
  setAccommodationStatus,
  listRooms,
  updateRoom,
  setRoomStatus,
} from '../../services/accommodations.service'

// ─── Datos de prueba (basados en datos demo del sistema) ─────────────────────
const MOCK_ACCOMMODATION = {
  id: 'aa515883-6b3a-4d36-ac58-9f5806f6a111',
  address_line1: 'Calle Mayor 1',
  city: 'Madrid',
  status: 'active',
  owner_entity_id: 'entity-1',
  split_electricity: true,
  split_mode_electricity: 'prorated',
}

const MOCK_ROOMS = [
  { id: 'room-1', number: 1, status: 'occupied', accommodation_id: 'acc-1', square_meters: 12 },
  { id: 'room-2', number: 2, status: 'available', accommodation_id: 'acc-1', square_meters: 15 },
]

// ─────────────────────────────────────────────────────────────────────────────
describe('accommodations.service.js', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── listAccommodations ─────────────────────────────────────────────────
  describe('listAccommodations()', () => {
    it('retorna array de alojamientos cuando la consulta es exitosa', async () => {
      const mockData = [MOCK_ACCOMMODATION]
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: mockData, error: null }))

      const result = await listAccommodations()

      expect(result).toEqual(mockData)
      expect(mockSupabase.from).toHaveBeenCalledWith('accommodations')
    })

    it('retorna array vacío cuando no hay datos en BD', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: null, error: null }))

      const result = await listAccommodations()

      expect(result).toEqual([])
    })

    it('aplica filtro status cuando se proporciona', async () => {
      const chain = buildChain({ data: [MOCK_ACCOMMODATION], error: null })
      const eqSpy = vi.spyOn(chain, 'eq').mockReturnValue(chain)
      mockSupabase.from.mockReturnValueOnce(chain)

      await listAccommodations({ status: 'active' })

      expect(eqSpy).toHaveBeenCalledWith('status', 'active')
    })

    it('no aplica filtro cuando status no se proporciona', async () => {
      const chain = buildChain({ data: [], error: null })
      const eqSpy = vi.spyOn(chain, 'eq')
      mockSupabase.from.mockReturnValueOnce(chain)

      await listAccommodations()

      expect(eqSpy).not.toHaveBeenCalled()
    })

    it('lanza error cuando la consulta de BD falla', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: null, error: { message: 'Connection error' } }))

      await expect(listAccommodations()).rejects.toThrow('Connection error')
    })
  })

  // ─── getAccommodation ───────────────────────────────────────────────────
  describe('getAccommodation()', () => {
    it('retorna el alojamiento correcto por id', async () => {
      const chain = buildChain({ data: MOCK_ACCOMMODATION, error: null })
      mockSupabase.from.mockReturnValueOnce(chain)

      const result = await getAccommodation('aa515883-6b3a-4d36-ac58-9f5806f6a111')

      expect(result).toEqual(MOCK_ACCOMMODATION)
      expect(mockSupabase.from).toHaveBeenCalledWith('accommodations')
    })

    it('lanza error cuando el alojamiento no existe', async () => {
      const chain = buildChain({ data: null, error: { message: 'No rows found' } })
      mockSupabase.from.mockReturnValueOnce(chain)

      await expect(getAccommodation('id-inexistente')).rejects.toThrow('No rows found')
    })

    it('la respuesta usa address_line1 (no "address")', async () => {
      const chain = buildChain({ data: MOCK_ACCOMMODATION, error: null })
      mockSupabase.from.mockReturnValueOnce(chain)

      const result = await getAccommodation('aa515883-6b3a-4d36-ac58-9f5806f6a111')

      expect(result).toHaveProperty('address_line1')
      expect(result).not.toHaveProperty('address')
    })
  })

  // ─── createAccommodation ────────────────────────────────────────────────
  describe('createAccommodation()', () => {
    it('llama a invokeWithAuth con manage_accommodation y acción "create"', async () => {
      const payload = { address_line1: 'Calle Test 1', city: 'Barcelona' }
      invokeWithAuth.mockResolvedValueOnce({
        ok: true,
        data: { accommodation: { id: 'new-acc', ...payload } },
      })

      const result = await createAccommodation(payload)

      expect(invokeWithAuth).toHaveBeenCalledWith('manage_accommodation', {
        body: { action: 'create', payload: { ...payload, rooms: [] } },
      })
      expect(result).toMatchObject({ id: 'new-acc', ...payload })
    })

    it('incluye habitaciones cuando se proporcionan', async () => {
      const payload = { address_line1: 'Calle Test 1', city: 'Madrid' }
      const rooms = [{ number: 1, square_meters: 12 }]
      invokeWithAuth.mockResolvedValueOnce({
        ok: true,
        data: { accommodation: { id: 'new-acc' } },
      })

      await createAccommodation(payload, rooms)

      expect(invokeWithAuth).toHaveBeenCalledWith('manage_accommodation', {
        body: { action: 'create', payload: { ...payload, rooms } },
      })
    })

    it('lanza error con mensaje cuando invokeWithAuth devuelve ok: false', async () => {
      invokeWithAuth.mockResolvedValueOnce({
        ok: false,
        error: { message: 'Plan limit: max 3 accommodations for Basic plan' },
      })

      await expect(createAccommodation({})).rejects.toThrow('Plan limit: max 3 accommodations for Basic plan')
    })

    it('lanza "Error desconocido" cuando invokeWithAuth no tiene mensaje de error', async () => {
      invokeWithAuth.mockResolvedValueOnce({ ok: false })

      await expect(createAccommodation({})).rejects.toThrow('Error desconocido')
    })
  })

  // ─── updateAccommodation ────────────────────────────────────────────────
  describe('updateAccommodation()', () => {
    it('llama a invokeWithAuth con acción "update" y los campos correctos', async () => {
      const patch = { city: 'Sevilla', address_line1: 'Avenida Nueva 5' }
      invokeWithAuth.mockResolvedValueOnce({ ok: true, data: { id: 'acc-1', ...patch } })

      const result = await updateAccommodation('acc-1', patch)

      expect(invokeWithAuth).toHaveBeenCalledWith('manage_accommodation', {
        body: { action: 'update', payload: { id: 'acc-1', ...patch } },
      })
      expect(result).toMatchObject({ id: 'acc-1', ...patch })
    })

    it('lanza error cuando la actualización falla', async () => {
      invokeWithAuth.mockResolvedValueOnce({ ok: false, error: { message: 'Not authorized' } })

      await expect(updateAccommodation('acc-1', {})).rejects.toThrow('Not authorized')
    })
  })

  // ─── setAccommodationStatus ─────────────────────────────────────────────
  describe('setAccommodationStatus()', () => {
    it('llama a invokeWithAuth con acción "set_status" para activar', async () => {
      invokeWithAuth.mockResolvedValueOnce({ ok: true, data: {} })

      await setAccommodationStatus('acc-1', 'active')

      expect(invokeWithAuth).toHaveBeenCalledWith('manage_accommodation', {
        body: { action: 'set_status', payload: { id: 'acc-1', status: 'active' } },
      })
    })

    it('llama a invokeWithAuth con acción "set_status" para desactivar', async () => {
      invokeWithAuth.mockResolvedValueOnce({ ok: true, data: {} })

      await setAccommodationStatus('acc-1', 'inactive')

      expect(invokeWithAuth).toHaveBeenCalledWith('manage_accommodation', {
        body: { action: 'set_status', payload: { id: 'acc-1', status: 'inactive' } },
      })
    })

    it('lanza error cuando el cambio de estado falla', async () => {
      invokeWithAuth.mockResolvedValueOnce({ ok: false, error: { message: 'Forbidden' } })

      await expect(setAccommodationStatus('acc-1', 'inactive')).rejects.toThrow('Forbidden')
    })
  })

  // ─── listRooms ──────────────────────────────────────────────────────────
  describe('listRooms()', () => {
    it('retorna habitaciones de un alojamiento ordenadas por número', async () => {
      const chain = buildChain({ data: MOCK_ROOMS, error: null })
      const eqSpy = vi.spyOn(chain, 'eq').mockReturnValue(chain)
      mockSupabase.from.mockReturnValueOnce(chain)

      const result = await listRooms('acc-1')

      expect(result).toEqual(MOCK_ROOMS)
      expect(mockSupabase.from).toHaveBeenCalledWith('rooms')
      expect(eqSpy).toHaveBeenCalledWith('accommodation_id', 'acc-1')
    })

    it('retorna array vacío cuando no hay habitaciones', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: null, error: null }))

      const result = await listRooms('acc-sin-rooms')

      expect(result).toEqual([])
    })

    it('las habitaciones usan "number" (no floor, type ni capacity)', async () => {
      const chain = buildChain({ data: MOCK_ROOMS, error: null })
      mockSupabase.from.mockReturnValueOnce(chain)

      const result = await listRooms('acc-1')

      result.forEach((room) => {
        expect(room).toHaveProperty('number')
        expect(room).not.toHaveProperty('floor')
        expect(room).not.toHaveProperty('type')
        expect(room).not.toHaveProperty('capacity')
      })
    })

    it('lanza error cuando la consulta de BD falla', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: null, error: { message: 'DB Error' } }))

      await expect(listRooms('acc-1')).rejects.toThrow('DB Error')
    })
  })

  // ─── updateRoom ─────────────────────────────────────────────────────────
  describe('updateRoom()', () => {
    it('llama a invokeWithAuth con acción "update_room"', async () => {
      const patch = { square_meters: 20 }
      invokeWithAuth.mockResolvedValueOnce({ ok: true, data: { id: 'room-1', ...patch } })

      await updateRoom('room-1', patch)

      expect(invokeWithAuth).toHaveBeenCalledWith('manage_accommodation', {
        body: { action: 'update_room', payload: { id: 'room-1', ...patch } },
      })
    })
  })

  // ─── setRoomStatus ──────────────────────────────────────────────────────
  describe('setRoomStatus()', () => {
    it('llama a invokeWithAuth con acción "set_room_status"', async () => {
      invokeWithAuth.mockResolvedValueOnce({ ok: true, data: {} })

      await setRoomStatus('room-1', 'available')

      expect(invokeWithAuth).toHaveBeenCalledWith('manage_accommodation', {
        body: { action: 'set_room_status', payload: { id: 'room-1', status: 'available' } },
      })
    })
  })
})
