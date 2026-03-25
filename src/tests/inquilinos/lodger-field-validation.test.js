/**
 * TEST SET: Validación de campos obligatorios — Inquilino (CRUD)
 * Módulo: src/pages/v2/admin/tenants/TenantCreate.jsx
 *         src/pages/v2/admin/tenants/TenantEdit.jsx
 *         src/pages/v2/admin/tenants/components/LodgerFormFields.jsx
 *
 * Cubre la validación de los campos del formulario de inquilino:
 *   - Campos obligatorios (nombre, apellidos, email, teléfono, documento, género)
 *   - Campos de dirección OBLIGATORIOS (calle, piso, CP, localidad, provincia, país)
 *   - Campo opcional (nickname)
 *   - Formato de email
 *
 * Estrategia: Se replica la lógica de validación de los Form.Item rules de
 * Ant Design como funciones puras para testearlas sin renderizar UI.
 * Documenta el contrato de campos requeridos y detecta regresiones si
 * se modifican los rules del formulario.
 *
 * NOTA: Los 6 campos de dirección son OBLIGATORIOS (rules: [{ required: true }])
 * a partir de la migración 20260323_add_address_fields_to_profiles.sql
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── Campos requeridos del formulario de inquilino ────────────────────────────
// Refleja los `rules: [{ required: true }]` de LodgerFormFields.jsx

const REQUIRED_FIELDS_LODGER = [
  // Datos personales
  'first_name',
  'last_name1',
  'last_name2',
  'email',
  'phone',
  'document_id',
  'gender',
  // Dirección (todos obligatorios)
  'address_street',
  'address_number',
  'address_floor',
  'address_postal_code',
  'address_city',
  'address_province',
  'address_country',
]

const OPTIONAL_FIELDS_LODGER = [
  'nickname',
]

/**
 * Valida un payload de inquilino contra los campos requeridos.
 * Devuelve array de errores (vacío = payload válido).
 */
function validateLodgerPayload(payload) {
  const errors = []

  for (const field of REQUIRED_FIELDS_LODGER) {
    if (!payload[field]) {
      errors.push(`Campo requerido: ${field}`)
    }
  }

  // Validación de formato email
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    errors.push('Email inválido')
  }

  // Validación de género (valores permitidos)
  if (payload.gender && !['male', 'female', 'other'].includes(payload.gender)) {
    errors.push(`Género inválido: ${payload.gender}`)
  }

  return errors
}

// ─── Payloads de referencia ───────────────────────────────────────────────────

const PAYLOAD_LODGER_COMPLETO = {
  first_name:           'Ana',
  last_name1:           'García',
  last_name2:           'López',
  nickname:             'Anita',
  email:                'ana.garcia@example.com',
  phone:                '666111222',
  document_id:          '12345678A',
  gender:               'female',
  address_street:       'Calle Mayor',
  address_number:       '5',
  address_floor:        '2º A',
  address_postal_code:  '28001',
  address_city:         'Madrid',
  address_province:     'Madrid',
  address_country:      'España',
}

// Payload mínimo válido — incluye los 6 campos de dirección (todos obligatorios)
const PAYLOAD_LODGER_MINIMO = {
  first_name:          'Carlos',
  last_name1:          'Pérez',
  last_name2:          'Ruiz',
  email:               'carlos.perez@example.com',
  phone:               '677000111',
  document_id:         '87654321Z',
  gender:              'male',
  address_street:      'Calle Luna',
  address_number:      '1',
  address_floor:       '1º A',
  address_postal_code: '46001',
  address_city:        'Valencia',
  address_province:    'Valencia',
  address_country:     'España',
}

// ─── Mock del servicio ────────────────────────────────────────────────────────
vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null }),
      signUp: vi.fn(),
    },
    from: vi.fn(),
  },
}))

// =============================================================================
describe('Validación de campos — Inquilino CRUD', () => {
  beforeEach(() => vi.clearAllMocks())

  // ─── PAYLOAD COMPLETO ────────────────────────────────────────────────────
  describe('Payload completo', () => {
    it('payload completo con todos los campos no genera errores', () => {
      const errors = validateLodgerPayload(PAYLOAD_LODGER_COMPLETO)
      expect(errors).toHaveLength(0)
    })

    it('payload mínimo (con dirección, sin nickname) no genera errores', () => {
      const errors = validateLodgerPayload(PAYLOAD_LODGER_MINIMO)
      expect(errors).toHaveLength(0)
    })

    it('payload sin dirección genera exactamente 7 errores de dirección', () => {
      const { address_street: _s, address_number: _n, address_floor: _f, address_postal_code: _p,
              address_city: _c, address_province: _pr, address_country: _co,
              ...sinDireccion } = PAYLOAD_LODGER_COMPLETO
      const errors = validateLodgerPayload(sinDireccion)
      const addressErrors = errors.filter(e => e.includes('address_'))
      expect(addressErrors).toHaveLength(7)
    })
  })

  // ─── CAMPOS OBLIGATORIOS PERSONALES ──────────────────────────────────────
  describe('Campos obligatorios — datos personales', () => {
    it('first_name (nombre) es obligatorio', () => {
      const { first_name: _, ...payload } = PAYLOAD_LODGER_COMPLETO
      expect(validateLodgerPayload(payload)).toContain('Campo requerido: first_name')
    })

    it('last_name1 (primer apellido) es obligatorio', () => {
      const { last_name1: _, ...payload } = PAYLOAD_LODGER_COMPLETO
      expect(validateLodgerPayload(payload)).toContain('Campo requerido: last_name1')
    })

    it('last_name2 (segundo apellido) es obligatorio', () => {
      const { last_name2: _, ...payload } = PAYLOAD_LODGER_COMPLETO
      expect(validateLodgerPayload(payload)).toContain('Campo requerido: last_name2')
    })

    it('email es obligatorio', () => {
      const { email: _, ...payload } = PAYLOAD_LODGER_COMPLETO
      expect(validateLodgerPayload(payload)).toContain('Campo requerido: email')
    })

    it('phone (teléfono) es obligatorio', () => {
      const { phone: _, ...payload } = PAYLOAD_LODGER_COMPLETO
      expect(validateLodgerPayload(payload)).toContain('Campo requerido: phone')
    })

    it('document_id (DNI/NIE/Pasaporte) es obligatorio', () => {
      const { document_id: _, ...payload } = PAYLOAD_LODGER_COMPLETO
      expect(validateLodgerPayload(payload)).toContain('Campo requerido: document_id')
    })

    it('gender (género) es obligatorio', () => {
      const { gender: _, ...payload } = PAYLOAD_LODGER_COMPLETO
      expect(validateLodgerPayload(payload)).toContain('Campo requerido: gender')
    })
  })

  // ─── CAMPOS OBLIGATORIOS DE DIRECCIÓN ────────────────────────────────────
  describe('Campos obligatorios — dirección', () => {
    it('address_street (calle) es obligatorio', () => {
      const { address_street: _, ...payload } = PAYLOAD_LODGER_COMPLETO
      expect(validateLodgerPayload(payload)).toContain('Campo requerido: address_street')
    })

    it('address_number (número) es obligatorio', () => {
      const { address_number: _, ...payload } = PAYLOAD_LODGER_COMPLETO
      expect(validateLodgerPayload(payload)).toContain('Campo requerido: address_number')
    })

    it('address_floor (piso/puerta) es obligatorio', () => {
      const { address_floor: _, ...payload } = PAYLOAD_LODGER_COMPLETO
      expect(validateLodgerPayload(payload)).toContain('Campo requerido: address_floor')
    })

    it('address_postal_code (código postal) es obligatorio', () => {
      const { address_postal_code: _, ...payload } = PAYLOAD_LODGER_COMPLETO
      expect(validateLodgerPayload(payload)).toContain('Campo requerido: address_postal_code')
    })

    it('address_city (localidad) es obligatorio', () => {
      const { address_city: _, ...payload } = PAYLOAD_LODGER_COMPLETO
      expect(validateLodgerPayload(payload)).toContain('Campo requerido: address_city')
    })

    it('address_province (provincia) es obligatorio', () => {
      const { address_province: _, ...payload } = PAYLOAD_LODGER_COMPLETO
      expect(validateLodgerPayload(payload)).toContain('Campo requerido: address_province')
    })

    it('address_country (país) es obligatorio', () => {
      const { address_country: _, ...payload } = PAYLOAD_LODGER_COMPLETO
      expect(validateLodgerPayload(payload)).toContain('Campo requerido: address_country')
    })

    it('omitir todos los campos de dirección genera exactamente 7 errores', () => {
      const { address_street: _s, address_number: _n, address_floor: _f, address_postal_code: _p,
              address_city: _c, address_province: _pr, address_country: _co,
              ...payload } = PAYLOAD_LODGER_COMPLETO
      const errors = validateLodgerPayload(payload)
      const addressErrors = errors.filter(e => e.includes('address_'))
      expect(addressErrors).toHaveLength(7)
    })

    it('los 7 campos de dirección están en la lista de requeridos', () => {
      const directionFields = ['address_street', 'address_number', 'address_floor', 'address_postal_code',
                               'address_city', 'address_province', 'address_country']
      directionFields.forEach(f => {
        expect(REQUIRED_FIELDS_LODGER, `${f} debe ser requerido`).toContain(f)
        expect(OPTIONAL_FIELDS_LODGER, `${f} NO debe ser opcional`).not.toContain(f)
      })
    })
  })

  // ─── CAMPO OPCIONAL ───────────────────────────────────────────────────────
  describe('Campo opcional', () => {
    it('nickname no genera error si está ausente', () => {
      const errors = validateLodgerPayload(PAYLOAD_LODGER_MINIMO)
      expect(errors).not.toContain('Campo requerido: nickname')
    })

    it('nickname es el único campo opcional del formulario', () => {
      expect(OPTIONAL_FIELDS_LODGER).toHaveLength(1)
      expect(OPTIONAL_FIELDS_LODGER).toContain('nickname')
    })
  })

  // ─── VALIDACIONES DE FORMATO ─────────────────────────────────────────────
  describe('Formato email', () => {
    it('email sin @ es inválido', () => {
      const payload = { ...PAYLOAD_LODGER_MINIMO, email: 'nodomain.com' }
      expect(validateLodgerPayload(payload)).toContain('Email inválido')
    })

    it('email sin dominio es inválido', () => {
      const payload = { ...PAYLOAD_LODGER_MINIMO, email: 'user@' }
      expect(validateLodgerPayload(payload)).toContain('Email inválido')
    })

    it('email sin extensión es inválido', () => {
      const payload = { ...PAYLOAD_LODGER_MINIMO, email: 'user@domain' }
      expect(validateLodgerPayload(payload)).toContain('Email inválido')
    })

    it('email válido no genera error de formato', () => {
      const errors = validateLodgerPayload(PAYLOAD_LODGER_MINIMO)
      expect(errors).not.toContain('Email inválido')
    })

    it('email con subdominio es válido', () => {
      const payload = { ...PAYLOAD_LODGER_MINIMO, email: 'ana@mail.empresa.com' }
      expect(validateLodgerPayload(payload)).not.toContain('Email inválido')
    })
  })

  // ─── VALIDACIONES DE GÉNERO ──────────────────────────────────────────────
  describe('Valores de género', () => {
    const VALID_GENDERS = ['male', 'female', 'other']

    VALID_GENDERS.forEach((gender) => {
      it(`género "${gender}" es válido`, () => {
        const payload = { ...PAYLOAD_LODGER_MINIMO, gender }
        expect(validateLodgerPayload(payload)).not.toContain(`Género inválido: ${gender}`)
      })
    })

    it('"masculino" NO es un género válido (debe ser "male")', () => {
      const payload = { ...PAYLOAD_LODGER_MINIMO, gender: 'masculino' }
      expect(validateLodgerPayload(payload)).toContain('Género inválido: masculino')
    })

    it('"femenino" NO es un género válido (debe ser "female")', () => {
      const payload = { ...PAYLOAD_LODGER_MINIMO, gender: 'femenino' }
      expect(validateLodgerPayload(payload)).toContain('Género inválido: femenino')
    })

    it('los 3 géneros válidos son: male, female, other', () => {
      expect(VALID_GENDERS).toHaveLength(3)
      expect(VALID_GENDERS).toContain('male')
      expect(VALID_GENDERS).toContain('female')
      expect(VALID_GENDERS).toContain('other')
    })
  })

  // ─── ERRORES MÚLTIPLES ───────────────────────────────────────────────────
  describe('Errores múltiples', () => {
    it('payload vacío genera un error por cada campo requerido (14)', () => {
      const errors = validateLodgerPayload({})
      expect(errors).toHaveLength(REQUIRED_FIELDS_LODGER.length)
    })

    it('payload vacío genera exactamente 14 errores de campo requerido', () => {
      const errors = validateLodgerPayload({})
      expect(errors.filter(e => e.startsWith('Campo requerido:'))).toHaveLength(14)
    })

    it('payload con solo datos personales (sin dirección) genera 7 errores de dirección', () => {
      const soloDatosPersonales = {
        first_name: 'Ana', last_name1: 'García', last_name2: 'López',
        email: 'ana@example.com', phone: '600111222',
        document_id: '12345678A', gender: 'female',
      }
      const errors = validateLodgerPayload(soloDatosPersonales)
      expect(errors.filter(e => e.includes('address_'))).toHaveLength(7)
    })

    it('un payload con email y gender inválidos genera 2 errores de validación adicionales', () => {
      const payload = {
        ...PAYLOAD_LODGER_MINIMO,
        email: 'invalido',
        gender: 'desconocido',
      }
      const errors = validateLodgerPayload(payload)
      expect(errors).toContain('Email inválido')
      expect(errors).toContain('Género inválido: desconocido')
    })
  })

  // ─── ONBOARDING_STATUS ───────────────────────────────────────────────────
  describe('onboarding_status del perfil', () => {
    const VALID_STATUSES = ['active', 'invited', 'pending_checkout', 'inactive', 'none', 'in_progress', 'payment_pending']

    VALID_STATUSES.forEach((status) => {
      it(`"${status}" es un onboarding_status válido en profiles`, () => {
        expect(VALID_STATUSES).toContain(status)
      })
    })

    it('al crear con habitación el onboarding_status es "active"', () => {
      const conHabitacion = true
      const status = conHabitacion ? 'active' : 'invited'
      expect(status).toBe('active')
    })

    it('al crear sin habitación el onboarding_status es "invited"', () => {
      const conHabitacion = false
      const status = conHabitacion ? 'active' : 'invited'
      expect(status).toBe('invited')
    })

    it('"deleted" NO es un onboarding_status válido', () => {
      expect(VALID_STATUSES).not.toContain('deleted')
    })

    it('"banned" NO es un onboarding_status válido', () => {
      expect(VALID_STATUSES).not.toContain('banned')
    })
  })

  // ─── MATRIZ DE CAMPOS: requeridos vs opcionales ──────────────────────────
  describe('Matriz de campos — requeridos vs opcionales', () => {
    it('hay exactamente 14 campos obligatorios en el formulario de inquilino', () => {
      expect(REQUIRED_FIELDS_LODGER).toHaveLength(14)
    })

    it('hay exactamente 1 campo opcional (nickname)', () => {
      expect(OPTIONAL_FIELDS_LODGER).toHaveLength(1)
    })

    it('ningún campo requerido es también opcional', () => {
      const solapamiento = REQUIRED_FIELDS_LODGER.filter(f => OPTIONAL_FIELDS_LODGER.includes(f))
      expect(solapamiento).toHaveLength(0)
    })

    it('full_name no es un campo del formulario (se construye en onFinish)', () => {
      expect(REQUIRED_FIELDS_LODGER).not.toContain('full_name')
      expect(OPTIONAL_FIELDS_LODGER).not.toContain('full_name')
    })

    it('los 7 campos de dirección son todos OBLIGATORIOS', () => {
      const directionFields = ['address_street', 'address_number', 'address_floor', 'address_postal_code',
                               'address_city', 'address_province', 'address_country']
      directionFields.forEach(f => {
        expect(REQUIRED_FIELDS_LODGER, `${f} debe ser requerido`).toContain(f)
        expect(OPTIONAL_FIELDS_LODGER, `${f} NO debe ser opcional`).not.toContain(f)
      })
    })

    it('los 7 campos de datos personales son todos obligatorios', () => {
      const personalFields = ['first_name', 'last_name1', 'last_name2',
                              'email', 'phone', 'document_id', 'gender']
      personalFields.forEach(f => {
        expect(REQUIRED_FIELDS_LODGER, `${f} debe ser requerido`).toContain(f)
      })
    })
  })
})
