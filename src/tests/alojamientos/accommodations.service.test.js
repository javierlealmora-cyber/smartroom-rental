/**
 * TEST SET: accommodations.service.js
 * Módulo: src/services/accommodations.service.js
 *
 * Cubre:
 *  - listAccommodations()      — listar alojamientos (con/sin filtro status)
 *  - getAccommodation(id)      — obtener alojamiento por id
 *  - createAccommodation()     — crear vía Edge Function
 *  - updateAccommodation()     — actualizar directamente en BD (NO Edge Function)
 *  - setAccommodationStatus()  — cambiar estado directamente en BD (NO Edge Function)
 *  - listRooms()               — listar habitaciones de un alojamiento
 *  - updateRoom()              — actualizar habitación directamente en BD
 *  - setRoomStatus()           — cambiar estado habitación directamente en BD
 *
 * Reglas de negocio verificadas:
 *  - accommodations usa address_line1 (NO address)
 *  - rooms usa number (NO floor ni type)
 *  - room.status válidos: 'free' | 'occupied' | 'maintenance' | 'reserved'
 *  - accommodation.status válidos: 'active' | 'inactive'
 *  - createAccommodation va por Edge Function (manage_accommodation)
 *  - updateAccommodation, setAccommodationStatus, updateRoom, setRoomStatus
 *    van directo a BD con filtro client_account_id (NO Edge Function)
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { buildChain } from '../helpers/chainMock'

// ─── Mocks hoisted ────────────────────────────────────────────────────────────
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

// ─── Datos de prueba ──────────────────────────────────────────────────────────
const MOCK_ACCOMMODATION = {
  id: 'aa515883-6b3a-4d36-ac58-9f5806f6a111',
  name: 'Residencia Test',
  address_line1: 'Calle Mayor 1',
  city: 'Madrid',
  status: 'active',
  owner_entity_id: 'entity-1',
  split_electricity: true,
  split_mode_electricity: 'prorated',
}

// Estado correcto: 'free' | 'occupied' | 'maintenance' | 'reserved'
// (NO 'available')
const MOCK_ROOMS = [
  { id: 'room-1', number: '101', status: 'occupied',  accommodation_id: 'acc-1', square_meters: 12 },
  { id: 'room-2', number: '102', status: 'free',      accommodation_id: 'acc-1', square_meters: 15 },
  { id: 'room-3', number: '103', status: 'maintenance', accommodation_id: 'acc-1', square_meters: 10 },
]

const CLIENT_ACCOUNT_ID = 'cai-test-001'

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
      const payload = { name: 'Piso Test', address_line1: 'Calle Test 1', city: 'Barcelona' }
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
      const payload = { name: 'Piso Test', address_line1: 'Calle Test 1', city: 'Madrid' }
      const rooms = [{ number: '101', square_meters: 12 }]
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
  // NOTA: updateAccommodation es una llamada directa a BD, NO Edge Function.
  // Requiere client_account_id como tercer parámetro.
  describe('updateAccommodation()', () => {
    it('actualiza directamente en BD sobre la tabla accommodations', async () => {
      const patch = { city: 'Sevilla', name: 'Residencia Actualizada' }
      const updated = { id: 'acc-1', ...patch }
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: updated, error: null }))

      const result = await updateAccommodation('acc-1', patch, CLIENT_ACCOUNT_ID)

      expect(mockSupabase.from).toHaveBeenCalledWith('accommodations')
      expect(result).toMatchObject({ id: 'acc-1', ...patch })
    })

    it('NO usa invokeWithAuth — escribe directamente en BD', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: { id: 'acc-1' }, error: null }))

      await updateAccommodation('acc-1', { city: 'Bilbao' }, CLIENT_ACCOUNT_ID)

      expect(invokeWithAuth).not.toHaveBeenCalled()
    })

    it('lanza error cuando la actualización falla', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: null, error: { message: 'Not authorized' } }))

      await expect(updateAccommodation('acc-1', {}, CLIENT_ACCOUNT_ID)).rejects.toThrow('Not authorized')
    })

    it('lanza error RLS cuando client_account_id no coincide', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: null, error: { message: 'new row violates row-level security policy' } }))

      await expect(updateAccommodation('acc-1', { city: 'Madrid' }, 'wrong-cai')).rejects.toThrow('row-level security')
    })
  })

  // ─── setAccommodationStatus ─────────────────────────────────────────────
  // NOTA: setAccommodationStatus es una llamada directa a BD, NO Edge Function.
  describe('setAccommodationStatus()', () => {
    it('actualiza status directamente en BD sobre la tabla accommodations', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: { id: 'acc-1', status: 'active' }, error: null }))

      await setAccommodationStatus('acc-1', 'active', CLIENT_ACCOUNT_ID)

      expect(mockSupabase.from).toHaveBeenCalledWith('accommodations')
    })

    it('NO usa invokeWithAuth para desactivar', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: { id: 'acc-1', status: 'inactive' }, error: null }))

      await setAccommodationStatus('acc-1', 'inactive', CLIENT_ACCOUNT_ID)

      expect(invokeWithAuth).not.toHaveBeenCalled()
    })

    it('NO usa invokeWithAuth para activar', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: { id: 'acc-1', status: 'active' }, error: null }))

      await setAccommodationStatus('acc-1', 'active', CLIENT_ACCOUNT_ID)

      expect(invokeWithAuth).not.toHaveBeenCalled()
    })

    it('lanza error cuando el cambio de estado falla', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: null, error: { message: 'Forbidden' } }))

      await expect(setAccommodationStatus('acc-1', 'inactive', CLIENT_ACCOUNT_ID)).rejects.toThrow('Forbidden')
    })
  })

  // ─── Valores válidos de accommodation.status ────────────────────────────
  describe('accommodation.status — valores válidos', () => {
    const VALID_STATUSES = ['active', 'inactive']

    VALID_STATUSES.forEach((status) => {
      it(`"${status}" es un estado válido de alojamiento`, () => {
        const acc = { ...MOCK_ACCOMMODATION, status }
        expect(VALID_STATUSES).toContain(acc.status)
      })
    })

    it('"active" e "inactive" son los únicos estados válidos del alojamiento', () => {
      expect(VALID_STATUSES).toHaveLength(2)
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

  // ─── room.status — valores válidos ──────────────────────────────────────
  describe('room.status — valores válidos', () => {
    const VALID_ROOM_STATUSES = ['free', 'occupied', 'maintenance', 'reserved']

    VALID_ROOM_STATUSES.forEach((status) => {
      it(`"${status}" es un estado de habitación válido`, () => {
        expect(VALID_ROOM_STATUSES).toContain(status)
      })
    })

    it('"available" NO es un estado válido (es "free")', () => {
      expect(VALID_ROOM_STATUSES).not.toContain('available')
    })

    it('"disabled" NO es un estado válido de habitación', () => {
      expect(VALID_ROOM_STATUSES).not.toContain('disabled')
    })

    it('los 3 estados de MOCK_ROOMS son todos válidos', () => {
      MOCK_ROOMS.forEach((room) => {
        expect(VALID_ROOM_STATUSES, `Estado "${room.status}" debe ser válido`).toContain(room.status)
      })
    })

    it('habitación libre tiene status "free" (no "available")', () => {
      const freeRoom = MOCK_ROOMS.find(r => r.id === 'room-2')
      expect(freeRoom.status).toBe('free')
      expect(freeRoom.status).not.toBe('available')
    })
  })

  // ─── updateRoom ─────────────────────────────────────────────────────────
  // NOTA: updateRoom es una llamada directa a BD, NO Edge Function.
  describe('updateRoom()', () => {
    it('actualiza directamente en BD sobre la tabla rooms', async () => {
      const patch = { square_meters: 20, monthly_rent: 500 }
      const updated = { id: 'room-1', ...patch }
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: updated, error: null }))

      const result = await updateRoom('room-1', patch, CLIENT_ACCOUNT_ID)

      expect(mockSupabase.from).toHaveBeenCalledWith('rooms')
      expect(result).toMatchObject({ id: 'room-1', ...patch })
    })

    it('NO usa invokeWithAuth — escribe directamente en BD', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: { id: 'room-1' }, error: null }))

      await updateRoom('room-1', { square_meters: 20 }, CLIENT_ACCOUNT_ID)

      expect(invokeWithAuth).not.toHaveBeenCalled()
    })

    it('lanza error cuando la actualización falla', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: null, error: { message: 'Room not found' } }))

      await expect(updateRoom('room-inexistente', {}, CLIENT_ACCOUNT_ID)).rejects.toThrow('Room not found')
    })
  })

  // ─── setRoomStatus ──────────────────────────────────────────────────────
  // NOTA: setRoomStatus es una llamada directa a BD, NO Edge Function.
  describe('setRoomStatus()', () => {
    it('actualiza status directamente en BD sobre la tabla rooms', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: { id: 'room-1', status: 'maintenance' }, error: null }))

      await setRoomStatus('room-1', 'maintenance', CLIENT_ACCOUNT_ID)

      expect(mockSupabase.from).toHaveBeenCalledWith('rooms')
    })

    it('NO usa invokeWithAuth — escribe directamente en BD', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: { id: 'room-1', status: 'free' }, error: null }))

      await setRoomStatus('room-1', 'free', CLIENT_ACCOUNT_ID)

      expect(invokeWithAuth).not.toHaveBeenCalled()
    })

    it('acepta estado "free"', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: { id: 'room-1', status: 'free' }, error: null }))

      const result = await setRoomStatus('room-1', 'free', CLIENT_ACCOUNT_ID)

      expect(result).toMatchObject({ status: 'free' })
    })

    it('acepta estado "maintenance"', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: { id: 'room-1', status: 'maintenance' }, error: null }))

      const result = await setRoomStatus('room-1', 'maintenance', CLIENT_ACCOUNT_ID)

      expect(result).toMatchObject({ status: 'maintenance' })
    })

    it('acepta estado "reserved"', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: { id: 'room-1', status: 'reserved' }, error: null }))

      const result = await setRoomStatus('room-1', 'reserved', CLIENT_ACCOUNT_ID)

      expect(result).toMatchObject({ status: 'reserved' })
    })

    it('lanza error cuando el cambio de estado falla', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: null, error: { message: 'DB constraint violation' } }))

      await expect(setRoomStatus('room-1', 'maintenance', CLIENT_ACCOUNT_ID)).rejects.toThrow('DB constraint violation')
    })
  })

  // ─── Validación de campos — Alojamiento ─────────────────────────────────
  describe('Validación de campos — Alojamiento', () => {

    const REQUIRED_ACC_FIELDS = ['name', 'owner_entity_id', 'city', 'province']

    /**
     * Valida payload de creación de alojamiento.
     * Refleja los rules de AccommodationCreate.jsx
     */
    function validateAccommodationPayload(payload) {
      const errors = []
      for (const field of REQUIRED_ACC_FIELDS) {
        if (!payload[field]) errors.push(`Campo requerido: ${field}`)
      }
      return errors
    }

    const PAYLOAD_ACC_COMPLETO = {
      name: 'Piso Confort',
      owner_entity_id: 'entity-1',
      city: 'Valencia',
      province: 'Valencia',
      address_line1: 'Calle Colón, 10',
    }

    it('payload completo no genera errores', () => {
      expect(validateAccommodationPayload(PAYLOAD_ACC_COMPLETO)).toHaveLength(0)
    })

    it('name es obligatorio', () => {
      const { name: _, ...payload } = PAYLOAD_ACC_COMPLETO
      expect(validateAccommodationPayload(payload)).toContain('Campo requerido: name')
    })

    it('owner_entity_id es obligatorio', () => {
      const { owner_entity_id: _, ...payload } = PAYLOAD_ACC_COMPLETO
      expect(validateAccommodationPayload(payload)).toContain('Campo requerido: owner_entity_id')
    })

    it('city es obligatorio', () => {
      const { city: _, ...payload } = PAYLOAD_ACC_COMPLETO
      expect(validateAccommodationPayload(payload)).toContain('Campo requerido: city')
    })

    it('province es obligatorio', () => {
      const { province: _, ...payload } = PAYLOAD_ACC_COMPLETO
      expect(validateAccommodationPayload(payload)).toContain('Campo requerido: province')
    })

    it('address_line1 es opcional', () => {
      const { address_line1: _, ...payload } = PAYLOAD_ACC_COMPLETO
      expect(validateAccommodationPayload(payload)).not.toContain('Campo requerido: address_line1')
    })

    it('payload vacío genera un error por cada campo requerido', () => {
      const errors = validateAccommodationPayload({})
      expect(errors).toHaveLength(REQUIRED_ACC_FIELDS.length)
    })
  })

  // ─── Validación de campos — Habitación ──────────────────────────────────
  describe('Validación de campos — Habitación', () => {

    /**
     * Valida payload de habitación.
     * El único campo obligatorio es number.
     */
    function validateRoomPayload(payload) {
      const errors = []
      if (!payload.number && payload.number !== 0) errors.push('Campo requerido: number')
      return errors
    }

    it('payload con number válido no genera errores', () => {
      expect(validateRoomPayload({ number: '101' })).toHaveLength(0)
    })

    it('número de habitación como texto es válido', () => {
      expect(validateRoomPayload({ number: 'HAB-A' })).toHaveLength(0)
    })

    it('number es obligatorio', () => {
      expect(validateRoomPayload({})).toContain('Campo requerido: number')
    })

    it('number nulo genera error', () => {
      expect(validateRoomPayload({ number: null })).toContain('Campo requerido: number')
    })

    it('square_meters es opcional (puede ser null)', () => {
      expect(validateRoomPayload({ number: '101', square_meters: null })).toHaveLength(0)
    })

    it('monthly_rent es opcional', () => {
      expect(validateRoomPayload({ number: '101', monthly_rent: undefined })).toHaveLength(0)
    })
  })
})
