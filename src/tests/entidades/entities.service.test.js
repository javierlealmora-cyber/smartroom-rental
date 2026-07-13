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
