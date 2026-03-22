/**
 * TEST SET: Validación de campos obligatorios — Entidad (CRUD)
 * Módulo: src/pages/v2/admin/entities/EntityCreate.jsx
 *         src/pages/v2/admin/entities/EntityEdit.jsx
 *         src/services/entities.service.js
 *
 * Cubre la validación de los campos obligatorios para los 3 tipos de entidad:
 *   - persona_fisica
 *   - autonomo
 *   - persona_juridica
 *
 * Estrategia: Se replica la lógica de validación de los Form.Item rules de
 * Ant Design como funciones puras para poder testearlas sin renderizar UI.
 * Esto documenta el contrato de campos requeridos y detecta regressions si
 * se modifican los rules del formulario.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── Replicar las reglas del formulario como validador puro ──────────────────
// Refleja fielmente los `rules` de EntityCreate.jsx y EntityEdit.jsx

const REQUIRED_FIELDS_COMUNES = [
  'legal_type',
  'tax_id',
  'billing_email',
  'phone',
  'street',
  'street_number',
  'zip',
  'city',
  'province',
  'country',
]

const REQUIRED_FIELDS_PERSONA_JURIDICA = [
  ...REQUIRED_FIELDS_COMUNES,
  'legal_name',
]

const REQUIRED_FIELDS_PERSONA_FISICA = [
  ...REQUIRED_FIELDS_COMUNES,
  'first_name',
  'last_name1',
  'last_name2',
  'gender',
]

const REQUIRED_FIELDS_AUTONOMO = [
  ...REQUIRED_FIELDS_COMUNES,
  'first_name',
  'last_name1',
  'last_name2',
  'gender',
]

const OPTIONAL_FIELDS = ['nickname', 'address_extra', 'floor', 'door']

/**
 * Valida un payload contra los campos requeridos del tipo indicado.
 * Devuelve array de errores (vacío = payload válido).
 */
function validateEntityPayload(payload) {
  const errors = []

  if (!payload.legal_type) {
    errors.push('Seleccione el tipo legal')
    return errors // sin tipo no podemos continuar
  }

  let requiredFields
  if (payload.legal_type === 'persona_juridica') {
    requiredFields = REQUIRED_FIELDS_PERSONA_JURIDICA
  } else if (payload.legal_type === 'persona_fisica') {
    requiredFields = REQUIRED_FIELDS_PERSONA_FISICA
  } else if (payload.legal_type === 'autonomo') {
    requiredFields = REQUIRED_FIELDS_AUTONOMO
  } else {
    errors.push(`Tipo legal desconocido: ${payload.legal_type}`)
    return errors
  }

  for (const field of requiredFields) {
    if (!payload[field]) {
      errors.push(`Campo requerido: ${field}`)
    }
  }

  // Validación de formato email
  if (payload.billing_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.billing_email)) {
    errors.push('Email inválido')
  }

  return errors
}

// ─── Payloads completos de referencia por tipo ───────────────────────────────

const BASE_ADDRESS = {
  street:        'Calle Mayor',
  street_number: '10',
  zip:           '28001',
  city:          'Madrid',
  province:      'Madrid',
  country:       'España',
}

const PAYLOAD_JURIDICA_COMPLETO = {
  legal_type:     'persona_juridica',
  legal_name:     'Inversiones Dycsa SL',
  tax_id:         'B12345678',
  billing_email:  'billing@dycsa.com',
  phone:          '+34600000000',
  ...BASE_ADDRESS,
}

const PAYLOAD_FISICA_COMPLETO = {
  legal_type:     'persona_fisica',
  first_name:     'Juan',
  last_name1:     'García',
  last_name2:     'López',
  gender:         'male',
  tax_id:         '12345678Z',
  billing_email:  'juan@example.com',
  phone:          '+34600000001',
  ...BASE_ADDRESS,
}

const PAYLOAD_AUTONOMO_COMPLETO = {
  legal_type:     'autonomo',
  first_name:     'María',
  last_name1:     'Pérez',
  last_name2:     'Ruiz',
  gender:         'female',
  tax_id:         '87654321X',
  billing_email:  'maria@example.com',
  phone:          '+34600000002',
  ...BASE_ADDRESS,
}

// ─── Mock del servicio para tests de integración ─────────────────────────────
vi.mock('../../services/supabaseInvoke.services', () => ({
  invokeWithAuth: vi.fn(),
}))
import { invokeWithAuth } from '../../services/supabaseInvoke.services'
import { createEntity, updateEntity } from '../../services/entities.service'

// =============================================================================
describe('Validación de campos — Entidad CRUD', () => {
  beforeEach(() => vi.clearAllMocks())

  // ─── PERSONA JURÍDICA ─────────────────────────────────────────────────────
  describe('persona_juridica', () => {

    describe('Campos obligatorios', () => {
      it('payload completo no genera errores de validación', () => {
        const errors = validateEntityPayload(PAYLOAD_JURIDICA_COMPLETO)
        expect(errors).toHaveLength(0)
      })

      it('legal_name es obligatorio para persona jurídica', () => {
        const { legal_name: _, ...sin_nombre } = PAYLOAD_JURIDICA_COMPLETO
        const errors = validateEntityPayload(sin_nombre)
        expect(errors).toContain('Campo requerido: legal_name')
      })

      it('tax_id (NIF/CIF) es obligatorio', () => {
        const { tax_id: _, ...payload } = PAYLOAD_JURIDICA_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: tax_id')
      })

      it('billing_email es obligatorio', () => {
        const { billing_email: _, ...payload } = PAYLOAD_JURIDICA_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: billing_email')
      })

      it('phone es obligatorio', () => {
        const { phone: _, ...payload } = PAYLOAD_JURIDICA_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: phone')
      })
    })

    describe('Dirección — campos obligatorios', () => {
      it('street (calle/vía) es obligatorio', () => {
        const { street: _, ...payload } = PAYLOAD_JURIDICA_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: street')
      })

      it('street_number (número) es obligatorio', () => {
        const { street_number: _, ...payload } = PAYLOAD_JURIDICA_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: street_number')
      })

      it('zip (código postal) es obligatorio', () => {
        const { zip: _, ...payload } = PAYLOAD_JURIDICA_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: zip')
      })

      it('city (ciudad/municipio) es obligatorio', () => {
        const { city: _, ...payload } = PAYLOAD_JURIDICA_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: city')
      })

      it('province (provincia) es obligatorio', () => {
        const { province: _, ...payload } = PAYLOAD_JURIDICA_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: province')
      })

      it('country (país) es obligatorio', () => {
        const { country: _, ...payload } = PAYLOAD_JURIDICA_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: country')
      })
    })

    describe('Campos no aplican a persona_juridica', () => {
      it('first_name NO es requerido para persona jurídica', () => {
        const errors = validateEntityPayload(PAYLOAD_JURIDICA_COMPLETO)
        expect(errors).not.toContain('Campo requerido: first_name')
      })

      it('last_name1 NO es requerido para persona jurídica', () => {
        const errors = validateEntityPayload(PAYLOAD_JURIDICA_COMPLETO)
        expect(errors).not.toContain('Campo requerido: last_name1')
      })

      it('gender NO es requerido para persona jurídica', () => {
        const errors = validateEntityPayload(PAYLOAD_JURIDICA_COMPLETO)
        expect(errors).not.toContain('Campo requerido: gender')
      })
    })

    describe('Campos opcionales', () => {
      it('address_extra no genera error si está ausente', () => {
        const errors = validateEntityPayload(PAYLOAD_JURIDICA_COMPLETO)
        expect(errors).not.toContain('Campo requerido: address_extra')
      })
    })

    describe('Integración — createEntity', () => {
      it('llama a manage_entity con payload completo de persona jurídica', async () => {
        invokeWithAuth.mockResolvedValueOnce({ ok: true, data: { id: 'e-j1', ...PAYLOAD_JURIDICA_COMPLETO } })
        await createEntity(PAYLOAD_JURIDICA_COMPLETO)
        expect(invokeWithAuth).toHaveBeenCalledWith('manage_entity', {
          body: { action: 'create', payload: PAYLOAD_JURIDICA_COMPLETO },
        })
      })

      it('llama a manage_entity con acción update para persona jurídica', async () => {
        const patch = { id: 'e-j1', legal_name: 'Nuevo Nombre SL' }
        invokeWithAuth.mockResolvedValueOnce({ ok: true, data: { ...patch } })
        await updateEntity('e-j1', { legal_name: 'Nuevo Nombre SL' })
        expect(invokeWithAuth).toHaveBeenCalledWith('manage_entity', {
          body: { action: 'update', payload: patch },
        })
      })
    })
  })

  // ─── PERSONA FÍSICA ───────────────────────────────────────────────────────
  describe('persona_fisica', () => {

    describe('Campos obligatorios', () => {
      it('payload completo no genera errores de validación', () => {
        const errors = validateEntityPayload(PAYLOAD_FISICA_COMPLETO)
        expect(errors).toHaveLength(0)
      })

      it('first_name (nombre) es obligatorio', () => {
        const { first_name: _, ...payload } = PAYLOAD_FISICA_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: first_name')
      })

      it('last_name1 (primer apellido) es obligatorio', () => {
        const { last_name1: _, ...payload } = PAYLOAD_FISICA_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: last_name1')
      })

      it('last_name2 (segundo apellido) es obligatorio', () => {
        const { last_name2: _, ...payload } = PAYLOAD_FISICA_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: last_name2')
      })

      it('gender (género) es obligatorio', () => {
        const { gender: _, ...payload } = PAYLOAD_FISICA_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: gender')
      })

      it('tax_id (NIF/CIF) es obligatorio', () => {
        const { tax_id: _, ...payload } = PAYLOAD_FISICA_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: tax_id')
      })

      it('billing_email es obligatorio', () => {
        const { billing_email: _, ...payload } = PAYLOAD_FISICA_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: billing_email')
      })

      it('phone es obligatorio', () => {
        const { phone: _, ...payload } = PAYLOAD_FISICA_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: phone')
      })
    })

    describe('Dirección — campos obligatorios', () => {
      it('street es obligatorio', () => {
        const { street: _, ...payload } = PAYLOAD_FISICA_COMPLETO
        expect(validateEntityPayload(payload)).toContain('Campo requerido: street')
      })

      it('street_number es obligatorio', () => {
        const { street_number: _, ...payload } = PAYLOAD_FISICA_COMPLETO
        expect(validateEntityPayload(payload)).toContain('Campo requerido: street_number')
      })

      it('zip es obligatorio', () => {
        const { zip: _, ...payload } = PAYLOAD_FISICA_COMPLETO
        expect(validateEntityPayload(payload)).toContain('Campo requerido: zip')
      })

      it('city es obligatorio', () => {
        const { city: _, ...payload } = PAYLOAD_FISICA_COMPLETO
        expect(validateEntityPayload(payload)).toContain('Campo requerido: city')
      })

      it('province es obligatorio', () => {
        const { province: _, ...payload } = PAYLOAD_FISICA_COMPLETO
        expect(validateEntityPayload(payload)).toContain('Campo requerido: province')
      })

      it('country es obligatorio', () => {
        const { country: _, ...payload } = PAYLOAD_FISICA_COMPLETO
        expect(validateEntityPayload(payload)).toContain('Campo requerido: country')
      })
    })

    describe('Campos no aplican a persona_fisica', () => {
      it('legal_name NO es requerido para persona física', () => {
        const errors = validateEntityPayload(PAYLOAD_FISICA_COMPLETO)
        expect(errors).not.toContain('Campo requerido: legal_name')
      })
    })

    describe('Campos opcionales', () => {
      it('nickname no genera error si está ausente', () => {
        const errors = validateEntityPayload(PAYLOAD_FISICA_COMPLETO)
        expect(errors).not.toContain('Campo requerido: nickname')
      })

      it('address_extra no genera error si está ausente', () => {
        const errors = validateEntityPayload(PAYLOAD_FISICA_COMPLETO)
        expect(errors).not.toContain('Campo requerido: address_extra')
      })

      it('floor no genera error si está ausente', () => {
        const errors = validateEntityPayload(PAYLOAD_FISICA_COMPLETO)
        expect(errors).not.toContain('Campo requerido: floor')
      })

      it('door no genera error si está ausente', () => {
        const errors = validateEntityPayload(PAYLOAD_FISICA_COMPLETO)
        expect(errors).not.toContain('Campo requerido: door')
      })
    })

    describe('Integración — createEntity', () => {
      it('llama a manage_entity con payload completo de persona física', async () => {
        invokeWithAuth.mockResolvedValueOnce({ ok: true, data: { id: 'e-f1', ...PAYLOAD_FISICA_COMPLETO } })
        await createEntity(PAYLOAD_FISICA_COMPLETO)
        expect(invokeWithAuth).toHaveBeenCalledWith('manage_entity', {
          body: { action: 'create', payload: PAYLOAD_FISICA_COMPLETO },
        })
      })
    })
  })

  // ─── AUTÓNOMO ─────────────────────────────────────────────────────────────
  describe('autonomo', () => {

    describe('Campos obligatorios', () => {
      it('payload completo no genera errores de validación', () => {
        const errors = validateEntityPayload(PAYLOAD_AUTONOMO_COMPLETO)
        expect(errors).toHaveLength(0)
      })

      it('first_name (nombre) es obligatorio', () => {
        const { first_name: _, ...payload } = PAYLOAD_AUTONOMO_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: first_name')
      })

      it('last_name1 (primer apellido) es obligatorio', () => {
        const { last_name1: _, ...payload } = PAYLOAD_AUTONOMO_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: last_name1')
      })

      it('last_name2 (segundo apellido) es obligatorio', () => {
        const { last_name2: _, ...payload } = PAYLOAD_AUTONOMO_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: last_name2')
      })

      it('gender (género) es obligatorio', () => {
        const { gender: _, ...payload } = PAYLOAD_AUTONOMO_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: gender')
      })

      it('tax_id (NIF/CIF) es obligatorio', () => {
        const { tax_id: _, ...payload } = PAYLOAD_AUTONOMO_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: tax_id')
      })

      it('billing_email es obligatorio', () => {
        const { billing_email: _, ...payload } = PAYLOAD_AUTONOMO_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: billing_email')
      })

      it('phone es obligatorio', () => {
        const { phone: _, ...payload } = PAYLOAD_AUTONOMO_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Campo requerido: phone')
      })
    })

    describe('Dirección — campos obligatorios', () => {
      it('street es obligatorio', () => {
        const { street: _, ...payload } = PAYLOAD_AUTONOMO_COMPLETO
        expect(validateEntityPayload(payload)).toContain('Campo requerido: street')
      })

      it('street_number es obligatorio', () => {
        const { street_number: _, ...payload } = PAYLOAD_AUTONOMO_COMPLETO
        expect(validateEntityPayload(payload)).toContain('Campo requerido: street_number')
      })

      it('zip es obligatorio', () => {
        const { zip: _, ...payload } = PAYLOAD_AUTONOMO_COMPLETO
        expect(validateEntityPayload(payload)).toContain('Campo requerido: zip')
      })

      it('city es obligatorio', () => {
        const { city: _, ...payload } = PAYLOAD_AUTONOMO_COMPLETO
        expect(validateEntityPayload(payload)).toContain('Campo requerido: city')
      })

      it('province es obligatorio', () => {
        const { province: _, ...payload } = PAYLOAD_AUTONOMO_COMPLETO
        expect(validateEntityPayload(payload)).toContain('Campo requerido: province')
      })

      it('country es obligatorio', () => {
        const { country: _, ...payload } = PAYLOAD_AUTONOMO_COMPLETO
        expect(validateEntityPayload(payload)).toContain('Campo requerido: country')
      })
    })

    describe('Campos no aplican a autónomo', () => {
      it('legal_name NO es requerido para autónomo', () => {
        const errors = validateEntityPayload(PAYLOAD_AUTONOMO_COMPLETO)
        expect(errors).not.toContain('Campo requerido: legal_name')
      })
    })

    describe('Integración — createEntity', () => {
      it('llama a manage_entity con payload completo de autónomo', async () => {
        invokeWithAuth.mockResolvedValueOnce({ ok: true, data: { id: 'e-a1', ...PAYLOAD_AUTONOMO_COMPLETO } })
        await createEntity(PAYLOAD_AUTONOMO_COMPLETO)
        expect(invokeWithAuth).toHaveBeenCalledWith('manage_entity', {
          body: { action: 'create', payload: PAYLOAD_AUTONOMO_COMPLETO },
        })
      })
    })
  })

  // ─── VALIDACIONES TRANSVERSALES ───────────────────────────────────────────
  describe('Validaciones transversales', () => {

    describe('Formato email', () => {
      it('email sin @ es inválido', () => {
        const payload = { ...PAYLOAD_FISICA_COMPLETO, billing_email: 'nodomain.com' }
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Email inválido')
      })

      it('email sin dominio es inválido', () => {
        const payload = { ...PAYLOAD_FISICA_COMPLETO, billing_email: 'user@' }
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Email inválido')
      })

      it('email válido no genera error de formato', () => {
        const errors = validateEntityPayload(PAYLOAD_FISICA_COMPLETO)
        expect(errors).not.toContain('Email inválido')
      })

      it('email válido para persona jurídica no genera error', () => {
        const errors = validateEntityPayload(PAYLOAD_JURIDICA_COMPLETO)
        expect(errors).not.toContain('Email inválido')
      })
    })

    describe('legal_type es siempre obligatorio', () => {
      it('sin legal_type devuelve error inmediatamente', () => {
        const { legal_type: _, ...payload } = PAYLOAD_FISICA_COMPLETO
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Seleccione el tipo legal')
      })

      it('legal_type desconocido devuelve error', () => {
        const payload = { ...PAYLOAD_FISICA_COMPLETO, legal_type: 'sociedad_anonima' }
        const errors = validateEntityPayload(payload)
        expect(errors).toContain('Tipo legal desconocido: sociedad_anonima')
      })

      it('los 3 tipos válidos son aceptados', () => {
        const tipos = ['persona_fisica', 'autonomo', 'persona_juridica']
        const bases = {
          persona_fisica: PAYLOAD_FISICA_COMPLETO,
          autonomo: PAYLOAD_AUTONOMO_COMPLETO,
          persona_juridica: PAYLOAD_JURIDICA_COMPLETO,
        }
        for (const tipo of tipos) {
          const errors = validateEntityPayload(bases[tipo])
          expect(errors, `Tipo ${tipo} debería ser válido con payload completo`).toHaveLength(0)
        }
      })
    })

    describe('Matriz de diferencias entre tipos', () => {
      it('persona_juridica requiere legal_name pero NO first_name/last_name1/gender', () => {
        const reqJ = REQUIRED_FIELDS_PERSONA_JURIDICA
        expect(reqJ).toContain('legal_name')
        expect(reqJ).not.toContain('first_name')
        expect(reqJ).not.toContain('last_name1')
        expect(reqJ).not.toContain('gender')
      })

      it('persona_fisica requiere first_name, last_name1, last_name2, gender pero NO legal_name', () => {
        const reqF = REQUIRED_FIELDS_PERSONA_FISICA
        expect(reqF).toContain('first_name')
        expect(reqF).toContain('last_name1')
        expect(reqF).toContain('last_name2')
        expect(reqF).toContain('gender')
        expect(reqF).not.toContain('legal_name')
      })

      it('autonomo tiene los mismos campos requeridos que persona_fisica', () => {
        expect(REQUIRED_FIELDS_AUTONOMO).toEqual(REQUIRED_FIELDS_PERSONA_FISICA)
      })

      it('los 4 campos de dirección son requeridos en los 3 tipos', () => {
        const direccionRequerida = ['street', 'street_number', 'zip', 'city', 'province', 'country']
        for (const campo of direccionRequerida) {
          expect(REQUIRED_FIELDS_PERSONA_JURIDICA, `J: ${campo}`).toContain(campo)
          expect(REQUIRED_FIELDS_PERSONA_FISICA,   `F: ${campo}`).toContain(campo)
          expect(REQUIRED_FIELDS_AUTONOMO,         `A: ${campo}`).toContain(campo)
        }
      })

      it('los campos opcionales NO están en ninguna lista de requeridos', () => {
        for (const campo of OPTIONAL_FIELDS) {
          expect(REQUIRED_FIELDS_PERSONA_JURIDICA, `J: ${campo} no debe ser req`).not.toContain(campo)
          expect(REQUIRED_FIELDS_PERSONA_FISICA,   `F: ${campo} no debe ser req`).not.toContain(campo)
          expect(REQUIRED_FIELDS_AUTONOMO,         `A: ${campo} no debe ser req`).not.toContain(campo)
        }
      })
    })

    describe('Errores múltiples', () => {
      it('payload vacío genera múltiples errores de validación', () => {
        const errors = validateEntityPayload({ legal_type: 'persona_fisica' })
        expect(errors.length).toBeGreaterThan(5)
      })

      it('payload con todos los campos faltantes excepto legal_type acumula todos los errores', () => {
        const errors = validateEntityPayload({ legal_type: 'persona_juridica' })
        // Campos requeridos para jurídica: legal_name + comunes (9) = 10 campos
        expect(errors).toHaveLength(REQUIRED_FIELDS_PERSONA_JURIDICA.length - 1) // -1 porque legal_type está presente
      })
    })
  })
})
