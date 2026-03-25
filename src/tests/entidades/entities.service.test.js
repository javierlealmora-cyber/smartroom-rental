/**
 * TEST SET: entities.service.js
 * Módulo: src/services/entities.service.js
 *
 * Cubre:
 *  - listEntities()       — listar entidades (propietarias/fiscales)
 *  - createEntity()       — crear entidad vía Edge Function
 *  - updateEntity()       — actualizar entidad vía Edge Function
 *  - setEntityStatus()    — cambiar estado vía Edge Function
 *
 * Reglas de negocio verificadas:
 *  - entities NO tiene columna "name" directa
 *  - Usar legal_name (persona_juridica) o first_name + last_name1 (fisica/autonomo)
 *  - legal_type: 'persona_juridica' | 'persona_fisica' | 'autonomo'
 *  - Operaciones de escritura van por Edge Function (manage_entity)
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
  listEntities,
  createEntity,
  updateEntity,
  setEntityStatus,
} from '../../services/entities.service'

// ─── Datos de prueba ─────────────────────────────────────────────────────────
const MOCK_ENTITY_JURIDICA = {
  id: 'e-1',
  legal_type: 'persona_juridica',
  legal_name: 'Inversiones Dycsa SL',
  first_name: null,
  last_name1: null,
  status: 'active',
}

const MOCK_ENTITY_FISICA = {
  id: 'e-2',
  legal_type: 'persona_fisica',
  legal_name: null,
  first_name: 'Juan',
  last_name1: 'García',
  last_name2: 'López',
  status: 'active',
}

const MOCK_ENTITY_AUTONOMO = {
  id: 'e-3',
  legal_type: 'autonomo',
  legal_name: null,
  first_name: 'María',
  last_name1: 'Pérez',
  status: 'active',
}

// ─────────────────────────────────────────────────────────────────────────────
describe('entities.service.js', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── listEntities ──────────────────────────────────────────────────────
  describe('listEntities()', () => {
    it('retorna todas las entidades cuando no se filtra por tipo', async () => {
      const mockData = [MOCK_ENTITY_JURIDICA, MOCK_ENTITY_FISICA, MOCK_ENTITY_AUTONOMO]
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: mockData, error: null }))

      const result = await listEntities()

      expect(result).toEqual(mockData)
      expect(mockSupabase.from).toHaveBeenCalledWith('entities')
    })

    it('retorna array vacío cuando no hay entidades', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: null, error: null }))

      const result = await listEntities()

      expect(result).toEqual([])
    })

    it('aplica filtro de tipo cuando se proporciona', async () => {
      const chain = buildChain({ data: [MOCK_ENTITY_JURIDICA], error: null })
      const eqSpy = vi.spyOn(chain, 'eq').mockReturnValue(chain)
      mockSupabase.from.mockReturnValueOnce(chain)

      await listEntities({ type: 'persona_juridica' })

      expect(eqSpy).toHaveBeenCalledWith('type', 'persona_juridica')
    })

    it('no aplica filtro cuando type no se proporciona', async () => {
      const chain = buildChain({ data: [], error: null })
      const eqSpy = vi.spyOn(chain, 'eq')
      mockSupabase.from.mockReturnValueOnce(chain)

      await listEntities()

      expect(eqSpy).not.toHaveBeenCalled()
    })

    it('lanza error cuando la consulta de BD falla', async () => {
      mockSupabase.from.mockReturnValueOnce(
        buildChain({ data: null, error: { message: 'RLS policy violation' } })
      )

      await expect(listEntities()).rejects.toThrow('RLS policy violation')
    })

    it('las entidades NO tienen campo "name" directo', async () => {
      const mockData = [MOCK_ENTITY_JURIDICA, MOCK_ENTITY_FISICA]
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: mockData, error: null }))

      const result = await listEntities()

      result.forEach((entity) => {
        expect(entity).not.toHaveProperty('name')
        // Persona juridica tiene legal_name
        if (entity.legal_type === 'persona_juridica') {
          expect(entity).toHaveProperty('legal_name')
        }
        // Persona fisica tiene first_name + last_name1
        if (entity.legal_type === 'persona_fisica') {
          expect(entity).toHaveProperty('first_name')
          expect(entity).toHaveProperty('last_name1')
        }
      })
    })

    it('soporta los 3 tipos de legal_type válidos', async () => {
      const mockData = [MOCK_ENTITY_JURIDICA, MOCK_ENTITY_FISICA, MOCK_ENTITY_AUTONOMO]
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: mockData, error: null }))

      const result = await listEntities()

      const validTypes = ['persona_juridica', 'persona_fisica', 'autonomo']
      result.forEach((entity) => {
        expect(validTypes).toContain(entity.legal_type)
      })
    })
  })

  // ─── createEntity ──────────────────────────────────────────────────────
  describe('createEntity()', () => {
    it('llama a invokeWithAuth con manage_entity y acción "create" para persona jurídica', async () => {
      const payload = { legal_type: 'persona_juridica', legal_name: 'Nueva Empresa SL' }
      invokeWithAuth.mockResolvedValueOnce({ ok: true, data: { id: 'e-new', ...payload } })

      const result = await createEntity(payload)

      expect(invokeWithAuth).toHaveBeenCalledWith('manage_entity', {
        body: { action: 'create', payload },
      })
      expect(result).toMatchObject({ id: 'e-new', ...payload })
    })

    it('llama a invokeWithAuth para persona física con first_name y last_name1', async () => {
      const payload = {
        legal_type: 'persona_fisica',
        first_name: 'Carlos',
        last_name1: 'Rodríguez',
        last_name2: 'Martín',
      }
      invokeWithAuth.mockResolvedValueOnce({ ok: true, data: { id: 'e-fisica', ...payload } })

      await createEntity(payload)

      expect(invokeWithAuth).toHaveBeenCalledWith('manage_entity', {
        body: { action: 'create', payload },
      })
    })

    it('lanza error con mensaje cuando invokeWithAuth devuelve ok: false', async () => {
      invokeWithAuth.mockResolvedValueOnce({
        ok: false,
        error: { message: 'Entity validation failed' },
      })

      await expect(createEntity({})).rejects.toThrow('Entity validation failed')
    })

    it('lanza "Error desconocido" cuando no hay mensaje de error', async () => {
      invokeWithAuth.mockResolvedValueOnce({ ok: false })

      await expect(createEntity({})).rejects.toThrow('Error desconocido')
    })
  })

  // ─── updateEntity ──────────────────────────────────────────────────────
  // NOTA: updateEntity es una llamada directa a BD, NO Edge Function.
  // Requiere clientAccountId como tercer parámetro.
  describe('updateEntity()', () => {
    it('actualiza directamente en BD sobre la tabla entities', async () => {
      const patch = { legal_name: 'Empresa Actualizada SL' }
      const updated = { id: 'e-1', ...patch }
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: updated, error: null }))

      const result = await updateEntity('e-1', patch, 'cai-001')

      expect(mockSupabase.from).toHaveBeenCalledWith('entities')
      expect(result).toMatchObject({ id: 'e-1', ...patch })
    })

    it('NO usa invokeWithAuth — escribe directamente en BD', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: { id: 'e-1' }, error: null }))

      await updateEntity('e-1', { legal_name: 'Nuevo Nombre SL' }, 'cai-001')

      expect(invokeWithAuth).not.toHaveBeenCalled()
    })

    it('lanza error cuando la actualización falla', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: null, error: { message: 'Entity not found' } }))

      await expect(updateEntity('e-inexistente', {}, 'cai-001')).rejects.toThrow('Entity not found')
    })
  })

  // ─── setEntityStatus ───────────────────────────────────────────────────
  // NOTA: setEntityStatus es una llamada directa a BD, NO Edge Function.
  // Requiere clientAccountId como tercer parámetro.
  describe('setEntityStatus()', () => {
    it('actualiza status directamente en BD sobre la tabla entities', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: { id: 'e-1', status: 'inactive' }, error: null }))

      await setEntityStatus('e-1', 'inactive', 'cai-001')

      expect(mockSupabase.from).toHaveBeenCalledWith('entities')
    })

    it('NO usa invokeWithAuth para desactivar', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: { id: 'e-1', status: 'inactive' }, error: null }))

      await setEntityStatus('e-1', 'inactive', 'cai-001')

      expect(invokeWithAuth).not.toHaveBeenCalled()
    })

    it('NO usa invokeWithAuth para activar', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: { id: 'e-1', status: 'active' }, error: null }))

      await setEntityStatus('e-1', 'active', 'cai-001')

      expect(invokeWithAuth).not.toHaveBeenCalled()
    })

    it('lanza error cuando el cambio de estado falla', async () => {
      mockSupabase.from.mockReturnValueOnce(buildChain({ data: null, error: { message: 'Cannot deactivate entity with active accommodations' } }))

      await expect(setEntityStatus('e-1', 'inactive', 'cai-001')).rejects.toThrow(
        'Cannot deactivate entity with active accommodations'
      )
    })
  })
})
