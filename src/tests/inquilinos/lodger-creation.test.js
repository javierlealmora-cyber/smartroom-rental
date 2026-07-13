/**
 * TEST SET: Creación de inquilinos — estado inicial y asignación de habitación
 * Módulo: src/pages/v2/admin/tenants/TenantCreate.jsx
 *         src/pages/v2/admin/tenants/TenantEdit.jsx
 *         src/services/lodgers.service.js
 *
 * Valida:
 *   1. El payload de createLodger incluye onboarding_status: 'active' cuando se
 *      asigna habitación; 'invited' cuando no hay habitación.
 *   2. El payload incluye todos los campos de nombre y dirección.
 *   3. El servicio updateLodger filtra campos inmutables antes de enviar al DB.
 *   4. TenantEdit lee onboarding_status y lee campos de nombre individuales
 *      (first_name / last_name1 / last_name2) directamente del perfil —
 *      ya NO los extrae dividiendo full_name.
 *   5. TenantEdit incluye los campos de dirección en el formulario.
 *
 * Estrategia: funciones puras que replican la lógica de construcción del payload
 * en TenantCreate.jsx y lodgers.service.js — sin renderizar UI ni llamar a Supabase.
 */
import { describe, it, expect, beforeEach } from 'vitest'

// ─── Réplica del payload builder de TenantCreate.jsx ─────────────────────────

/**
 * Construye el payload que TenantCreate.jsx pasa a createLodger().
 * Refleja fielmente el bloque onFinish() del componente.
 *
 * Incluye: nombre (3 partes), nickname, género, contacto, documento,
 * dirección completa (6 campos), y datos de habitación si selectedRoomId
 * está presente.
 */
function buildCreateLodgerPayload(values, { selectedRoomId, selectedRoom }) {
  const fullName = [values.first_name, values.last_name1, values.last_name2]
    .filter(Boolean).join(' ').trim()

  const payload = {
    full_name: fullName,
    first_name: values.first_name || null,
    last_name1: values.last_name1 || null,
    last_name2: values.last_name2 || null,
    nickname: values.nickname || null,
    gender: values.gender || null,
    email: values.email,
    phone: values.phone || null,
    document_id: values.document_id || null,
    address_street: values.address_street || null,
    address_floor: values.address_floor || null,
    address_postal_code: values.address_postal_code || null,
    address_city: values.address_city || null,
    address_province: values.address_province || null,
    address_country: values.address_country || null,
    // Con habitación → active; sin habitación → invited
    onboarding_status: selectedRoomId ? 'active' : 'invited',
  }

  if (selectedRoomId) {
    const moveInDate = values.move_in_date?.format
      ? values.move_in_date.format('YYYY-MM-DD')
      : values.move_in_date
    const billingDate = values.billing_start_date?.format
      ? values.billing_start_date.format('YYYY-MM-DD')
      : moveInDate

    payload.room_id = selectedRoomId
    payload.accommodation_id = values.accommodation_id
    payload.move_in_date = moveInDate
    payload.billing_start_date = billingDate
    payload.monthly_rent = selectedRoom?.monthly_rent ?? null
  }

  return payload
}

// ─── Réplica de la lógica de updateLodger (lodgers.service.js) ───────────────

/**
 * Filtra campos inmutables del patch antes de enviar a profiles.
 * Refleja fielmente updateLodger() en lodgers.service.js.
 */
function buildUpdatePatch(patch) {
  const { id: _id, email: _email, role: _role, client_account_id: _cai, created_at: _cat, ...safePatch } = patch
  return safePatch
}

// ─── Réplica de la lógica de TenantEdit (carga del formulario) ───────────────

/**
 * Construye los valores iniciales del formulario de edición.
 * Refleja fielmente form.setFieldsValue() en TenantEdit.jsx.
 *
 * IMPORTANTE: Lee first_name / last_name1 / last_name2 directamente del perfil
 * — NO los extrae dividiendo full_name. Incluye los 6 campos de dirección.
 */
function buildFormInitialValues(profileData) {
  return {
    first_name: profileData.first_name || '',
    last_name1: profileData.last_name1 || '',
    last_name2: profileData.last_name2 || '',
    nickname: profileData.nickname || '',
    email: profileData.email,
    phone: profileData.phone || '',
    document_id: profileData.document_id || '',
    status: profileData.onboarding_status,   // ← lee onboarding_status, NO status
    gender: profileData.gender || null,
    address_street: profileData.address_street || '',
    address_floor: profileData.address_floor || '',
    address_postal_code: profileData.address_postal_code || '',
    address_city: profileData.address_city || '',
    address_province: profileData.address_province || '',
    address_country: profileData.address_country || '',
  }
}

// ─── TESTS ───────────────────────────────────────────────────────────────────

const ROOM = { id: 'room-001', number: '101', monthly_rent: 450 }
const ACC_ID = 'acc-001'

const VALID_FORM_VALUES = {
  first_name: 'Ana',
  last_name1: 'García',
  last_name2: 'López',
  nickname: 'Anita',
  gender: 'female',
  email: 'ana.garcia@example.com',
  phone: '666111222',
  document_id: '12345678A',
  address_street: 'Calle Mayor, 5',
  address_floor: '2º A',
  address_postal_code: '28001',
  address_city: 'Madrid',
  address_province: 'Madrid',
  address_country: 'España',
  accommodation_id: ACC_ID,
  move_in_date: '2026-03-17',
  billing_start_date: null,
}

describe('Creación de inquilino — estado inicial', () => {

  describe('onboarding_status al crear con habitación', () => {
    it('el payload incluye onboarding_status: "active"', () => {
      const payload = buildCreateLodgerPayload(VALID_FORM_VALUES, {
        selectedRoomId: ROOM.id,
        selectedRoom: ROOM,
      })
      expect(payload.onboarding_status).toBe('active')
    })

    it('el payload incluye room_id y accommodation_id correctos', () => {
      const payload = buildCreateLodgerPayload(VALID_FORM_VALUES, {
        selectedRoomId: ROOM.id,
        selectedRoom: ROOM,
      })
      expect(payload.room_id).toBe(ROOM.id)
      expect(payload.accommodation_id).toBe(ACC_ID)
    })

    it('el payload construye full_name concatenando los tres campos de nombre', () => {
      const payload = buildCreateLodgerPayload(VALID_FORM_VALUES, {
        selectedRoomId: ROOM.id,
        selectedRoom: ROOM,
      })
      expect(payload.full_name).toBe('Ana García López')
    })

    it('el payload omite last_name2 vacío en full_name', () => {
      const values = { ...VALID_FORM_VALUES, last_name2: '' }
      const payload = buildCreateLodgerPayload(values, {
        selectedRoomId: ROOM.id,
        selectedRoom: ROOM,
      })
      expect(payload.full_name).toBe('Ana García')
    })

    it('monthly_rent toma el valor de la habitación seleccionada', () => {
      const payload = buildCreateLodgerPayload(VALID_FORM_VALUES, {
        selectedRoomId: ROOM.id,
        selectedRoom: ROOM,
      })
      expect(payload.monthly_rent).toBe(450)
    })

    it('monthly_rent es null si la habitación no tiene precio', () => {
      const roomSinRenta = { id: 'room-002', number: '102', monthly_rent: null }
      const payload = buildCreateLodgerPayload(VALID_FORM_VALUES, {
        selectedRoomId: roomSinRenta.id,
        selectedRoom: roomSinRenta,
      })
      expect(payload.monthly_rent).toBeNull()
    })

    it('billing_start_date usa move_in_date cuando no se especifica', () => {
      const values = { ...VALID_FORM_VALUES, billing_start_date: null }
      const payload = buildCreateLodgerPayload(values, {
        selectedRoomId: ROOM.id,
        selectedRoom: ROOM,
      })
      expect(payload.billing_start_date).toBe(payload.move_in_date)
    })

    it('campos opcionales son null cuando no se rellenan', () => {
      const values = { ...VALID_FORM_VALUES, phone: '', document_id: '', gender: '' }
      const payload = buildCreateLodgerPayload(values, {
        selectedRoomId: ROOM.id,
        selectedRoom: ROOM,
      })
      expect(payload.phone).toBeNull()
      expect(payload.document_id).toBeNull()
      expect(payload.gender).toBeNull()
    })

    it('nickname se incluye en el payload', () => {
      const payload = buildCreateLodgerPayload(VALID_FORM_VALUES, {
        selectedRoomId: ROOM.id,
        selectedRoom: ROOM,
      })
      expect(payload.nickname).toBe('Anita')
    })

    it('nickname vacío es null en el payload', () => {
      const values = { ...VALID_FORM_VALUES, nickname: '' }
      const payload = buildCreateLodgerPayload(values, {
        selectedRoomId: ROOM.id,
        selectedRoom: ROOM,
      })
      expect(payload.nickname).toBeNull()
    })
  })

  describe('onboarding_status al crear SIN habitación', () => {
    it('el payload incluye onboarding_status: "invited" cuando no hay habitación', () => {
      const payload = buildCreateLodgerPayload(VALID_FORM_VALUES, {
        selectedRoomId: null,
        selectedRoom: null,
      })
      expect(payload.onboarding_status).toBe('invited')
    })

    it('el payload NO incluye room_id cuando no hay habitación', () => {
      const payload = buildCreateLodgerPayload(VALID_FORM_VALUES, {
        selectedRoomId: null,
        selectedRoom: null,
      })
      expect(payload.room_id).toBeUndefined()
    })

    it('el payload NO incluye move_in_date cuando no hay habitación', () => {
      const payload = buildCreateLodgerPayload(VALID_FORM_VALUES, {
        selectedRoomId: null,
        selectedRoom: null,
      })
      expect(payload.move_in_date).toBeUndefined()
    })
  })

  describe('Dirección en el payload de creación', () => {
    it('address_street se incluye en el payload', () => {
      const payload = buildCreateLodgerPayload(VALID_FORM_VALUES, {
        selectedRoomId: ROOM.id,
        selectedRoom: ROOM,
      })
      expect(payload.address_street).toBe('Calle Mayor, 5')
    })

    it('address_city se incluye en el payload', () => {
      const payload = buildCreateLodgerPayload(VALID_FORM_VALUES, {
        selectedRoomId: ROOM.id,
        selectedRoom: ROOM,
      })
      expect(payload.address_city).toBe('Madrid')
    })

    it('address_postal_code se incluye en el payload', () => {
      const payload = buildCreateLodgerPayload(VALID_FORM_VALUES, {
        selectedRoomId: ROOM.id,
        selectedRoom: ROOM,
      })
      expect(payload.address_postal_code).toBe('28001')
    })

    it('address_province se incluye en el payload', () => {
      const payload = buildCreateLodgerPayload(VALID_FORM_VALUES, {
        selectedRoomId: ROOM.id,
        selectedRoom: ROOM,
      })
      expect(payload.address_province).toBe('Madrid')
    })

    it('address_country se incluye en el payload', () => {
      const payload = buildCreateLodgerPayload(VALID_FORM_VALUES, {
        selectedRoomId: ROOM.id,
        selectedRoom: ROOM,
      })
      expect(payload.address_country).toBe('España')
    })

    it('address_floor (piso/puerta) se incluye en el payload', () => {
      const payload = buildCreateLodgerPayload(VALID_FORM_VALUES, {
        selectedRoomId: ROOM.id,
        selectedRoom: ROOM,
      })
      expect(payload.address_floor).toBe('2º A')
    })

    it('campos de dirección vacíos son null en el payload', () => {
      const values = {
        ...VALID_FORM_VALUES,
        address_street: '',
        address_city: '',
        address_postal_code: '',
        address_province: '',
        address_country: '',
        address_floor: '',
      }
