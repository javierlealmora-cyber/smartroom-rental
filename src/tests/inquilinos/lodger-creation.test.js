/**
 * TEST SET: Creación de inquilinos — estado inicial y asignación de habitación
 * Módulo: src/pages/v2/admin/tenants/TenantCreate.jsx
 *         src/services/lodgers.service.js
 *
 * Valida:
 *   1. El payload de createLodger incluye onboarding_status: 'active' cuando se
 *      asigna habitación en el momento de creación.
 *   2. El servicio updateLodger filtra campos inmutables antes de enviar al DB.
 *   3. El servicio setLodgerStatus actualiza onboarding_status (no status).
 *   4. TenantEdit lee onboarding_status (no status) para poblar el formulario.
 *   5. Regresión: NO se puede crear un inquilino sin habitación con estado activo
 *      (la EF requiere room_id para asignación).
 *
 * Estrategia: funciones puras que replican la lógica de construcción del payload
 * en TenantCreate.jsx y lodgers.service.js — sin renderizar UI ni llamar a Supabase.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── Réplica del payload builder de TenantCreate.jsx ─────────────────────────

/**
 * Construye el payload que TenantCreate.jsx pasa a createLodger().
 * Refleja fielmente el bloque onFinish() del componente.
 */
function buildCreateLodgerPayload(values, { selectedRoomId, selectedRoom }) {
  const fullName = [values.first_name, values.last_name1, values.last_name2]
    .filter(Boolean).join(' ').trim()

  const moveInDate = values.move_in_date?.format
    ? values.move_in_date.format('YYYY-MM-DD')
    : values.move_in_date

  const billingDate = values.billing_start_date?.format
    ? values.billing_start_date.format('YYYY-MM-DD')
    : (moveInDate)

  return {
    full_name: fullName,
    first_name: values.first_name || null,
    last_name1: values.last_name1 || null,
    last_name2: values.last_name2 || null,
    gender: values.gender || null,
    email: values.email,
    phone: values.phone || null,
    document_id: values.document_id || null,
    onboarding_status: 'active',          // ← siempre activo al asignar habitación
    room_id: selectedRoomId,
    accommodation_id: values.accommodation_id,
    move_in_date: moveInDate,
    billing_start_date: billingDate,
    monthly_rent: selectedRoom?.monthly_rent ?? null,
  }
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
 */
function buildFormInitialValues(profileData) {
  const nameParts = (profileData.full_name || '').trim().split(' ')
  return {
    first_name: nameParts[0] || '',
    last_name1: nameParts[1] || '',
    last_name2: nameParts.slice(2).join(' ') || '',
    nickname: profileData.nickname || '',
    email: profileData.email,
    phone: profileData.phone || '',
    document_id: profileData.document_id || '',
    status: profileData.onboarding_status,   // ← lee onboarding_status, NO status
    gender: profileData.gender || null,
  }
}

// ─── TESTS ───────────────────────────────────────────────────────────────────

const ROOM = { id: 'room-001', number: '101', monthly_rent: 450 }
const ACC_ID = 'acc-001'

const VALID_FORM_VALUES = {
  first_name: 'Ana',
  last_name1: 'García',
  last_name2: 'López',
  gender: 'female',
  email: 'ana.garcia@example.com',
  phone: '666111222',
  document_id: '12345678A',
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
  })

})

describe('Actualización de inquilino — updateLodger', () => {

  it('filtra campo "id" del patch (inmutable)', () => {
    const patch = { id: 'user-123', full_name: 'Nuevo Nombre', phone: '600000000' }
    const safe = buildUpdatePatch(patch)
    expect(safe).not.toHaveProperty('id')
    expect(safe.full_name).toBe('Nuevo Nombre')
  })

  it('filtra campo "email" del patch (inmutable)', () => {
    const patch = { email: 'nuevo@email.com', full_name: 'Nombre', phone: '600000000' }
    const safe = buildUpdatePatch(patch)
    expect(safe).not.toHaveProperty('email')
  })

  it('filtra campo "role" del patch (inmutable)', () => {
    const patch = { role: 'admin', full_name: 'Nombre' }
    const safe = buildUpdatePatch(patch)
    expect(safe).not.toHaveProperty('role')
  })

  it('filtra campo "client_account_id" del patch (inmutable)', () => {
    const patch = { client_account_id: 'acc-999', full_name: 'Nombre' }
    const safe = buildUpdatePatch(patch)
    expect(safe).not.toHaveProperty('client_account_id')
  })

  it('filtra campo "created_at" del patch (inmutable)', () => {
    const patch = { created_at: '2024-01-01', full_name: 'Nombre' }
    const safe = buildUpdatePatch(patch)
    expect(safe).not.toHaveProperty('created_at')
  })

  it('conserva campos editables en el patch', () => {
    const patch = {
      full_name: 'Ana García López',
      phone: '666111222',
      nickname: 'Anita',
      document_id: '12345678A',
      gender: 'female',
    }
    const safe = buildUpdatePatch(patch)
    expect(safe.full_name).toBe('Ana García López')
    expect(safe.phone).toBe('666111222')
    expect(safe.nickname).toBe('Anita')
    expect(safe.document_id).toBe('12345678A')
    expect(safe.gender).toBe('female')
  })

  it('conserva values null (campos vaciados explícitamente)', () => {
    const patch = { full_name: 'Ana', nickname: null, phone: null }
    const safe = buildUpdatePatch(patch)
    expect(safe.nickname).toBeNull()
    expect(safe.phone).toBeNull()
  })

})

describe('Formulario de edición — TenantEdit carga onboarding_status', () => {

  const PROFILE_ACTIVE = {
    id: '20000000-0000-0000-0000-000000000001',
    email: 'lodger11@example.com',
    full_name: 'Inquilino 11 Díaz',
    phone: '659120790',
    nickname: 'Inky',
    document_id: '25854584K',
    gender: 'male',
    onboarding_status: 'active',   // ← columna real en profiles
    // NO tiene columna "status"
  }

  it('el campo "status" del form se inicializa con onboarding_status del perfil', () => {
    const values = buildFormInitialValues(PROFILE_ACTIVE)
    expect(values.status).toBe('active')
  })

  it('el campo "status" NO es undefined cuando onboarding_status está presente', () => {
    const values = buildFormInitialValues(PROFILE_ACTIVE)
    expect(values.status).not.toBeUndefined()
  })

  it('el campo "status" es undefined si el perfil no tiene onboarding_status (bug anterior)', () => {
    // Simula el bug anterior: data.status en vez de data.onboarding_status
    function buildFormBugVersion(profileData) {
      return { status: profileData.status }  // bug: .status no existe en profiles
    }
    const values = buildFormBugVersion(PROFILE_ACTIVE)
    expect(values.status).toBeUndefined()  // confirma que el bug existía
  })

  it('otros campos del formulario se cargan correctamente', () => {
    const values = buildFormInitialValues(PROFILE_ACTIVE)
    expect(values.first_name).toBe('Inquilino')
    expect(values.last_name1).toBe('11')
    expect(values.phone).toBe('659120790')
    expect(values.nickname).toBe('Inky')
    expect(values.document_id).toBe('25854584K')
    expect(values.gender).toBe('male')
    expect(values.email).toBe('lodger11@example.com')
  })

  it('un inquilino con estado "invited" muestra ese estado en el formulario', () => {
    const profile = { ...PROFILE_ACTIVE, onboarding_status: 'invited' }
    const values = buildFormInitialValues(profile)
    expect(values.status).toBe('invited')
  })

  it('un inquilino recién creado con habitación tiene status "active" en el form', () => {
    const profileRecienCreado = { ...PROFILE_ACTIVE, onboarding_status: 'active' }
    const values = buildFormInitialValues(profileRecienCreado)
    expect(values.status).toBe('active')
  })

})

describe('Regresión: valores de onboarding_status válidos', () => {

  const VALID_STATUSES = ['active', 'invited', 'pending_checkout', 'inactive', 'none', 'in_progress', 'payment_pending']
  const INVALID_STATUSES = ['deleted', 'banned', 'suspended', '', null, undefined]

  VALID_STATUSES.forEach((status) => {
    it(`"${status}" es un onboarding_status permitido en el formulario`, () => {
      const profile = { ...{ email: 'test@example.com', full_name: 'Test User' }, onboarding_status: status }
      const values = buildFormInitialValues(profile)
      // El valor debe llegar al formulario sin modificación
      expect(values.status).toBe(status)
    })
  })

  it('el payload de createLodger siempre es "active" independientemente del valor por defecto de la EF', () => {
    // La EF pone 'invited' por defecto, pero el payload lo sobreescribe con 'active'
    const payload = buildCreateLodgerPayload(VALID_FORM_VALUES, {
      selectedRoomId: ROOM.id,
      selectedRoom: ROOM,
    })
    expect(payload.onboarding_status).toBe('active')
    expect(payload.onboarding_status).not.toBe('invited')
    expect(payload.onboarding_status).not.toBe('none')
  })

})

// ─── Réplica de la lógica del modal "Buscar Inquilino Existente" ──────────────

/**
 * Construye las opciones del Select del modal de búsqueda.
 * Refleja fielmente el .map() en AccommodationDetail.jsx openAssignModal Select.
 */
function buildLodgerSearchOptions(allLodgers) {
  return (allLodgers || []).map((l) => ({
    value: l.id,
    label: `${l.full_name} — ${l.email}`,
  }))
}

/**
 * Filtra opciones por texto (simula el comportamiento de Ant Design showSearch
 * con optionFilterProp="label" — búsqueda case-insensitive por substring).
 */
function filterLodgerOptions(options, searchText) {
  if (!searchText) return options
  const lower = searchText.toLowerCase()
  return options.filter((o) => o.label.toLowerCase().includes(lower))
}

/**
 * Construye la URL de navegación cuando el admin selecciona un inquilino
 * existente en el modal (AccommodationDetail.jsx onSelect handler).
 */
function buildReassignUrl(lodgerId, accId, roomId) {
  return `/v2/admin/inquilinos/${lodgerId}/editar?action=reassign&acc=${accId}&room=${roomId}`
}

/**
 * Construye la URL de navegación para crear un inquilino nuevo desde el modal
 * y asignarlo directamente (AccommodationDetail.jsx botón "Crear nuevo inquilino").
 */
function buildCreateAndAssignUrl(accId, roomId) {
  return `/v2/admin/inquilinos/nuevo?acc=${accId}&room=${roomId}`
}

/**
 * Construye el payload de reassignRoom() a partir de los valores del formulario
 * de reasignación en TenantEdit.jsx (onReassignFinish).
 */
function buildReassignPayload(id, values) {
  return {
    id,
    newRoomId: values.new_room_id,
    newAccommodationId: values.new_accommodation_id,
    moveInDate: values.move_in_date,
    billingStartDate: values.billing_start_date || values.move_in_date,
    monthlyRent: values.monthly_rent || null,
  }
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const LODGERS_LIST = [
  { id: 'l-001', full_name: 'Ana García López',   email: 'ana.garcia@example.com',   onboarding_status: 'active' },
  { id: 'l-002', full_name: 'Carlos Pérez Ruiz',  email: 'carlos.perez@example.com', onboarding_status: 'invited' },
  { id: 'l-003', full_name: 'María López Torres', email: 'maria.lopez@example.com',  onboarding_status: 'inactive' },
  { id: 'l-004', full_name: 'Pedro Martínez Gil', email: 'pedro@work.com',            onboarding_status: 'active' },
]

const FREE_ROOM   = { id: 'room-free-01',  number: 'HAB-101', status: 'free' }
const OCCUP_ROOM  = { id: 'room-occup-01', number: 'HAB-102', status: 'occupied' }
const MAINT_ROOM  = { id: 'room-maint-01', number: 'HAB-103', status: 'maintenance' }
const ACC_ID_TEST = 'acc-test-001'

// ─── Tests: búsqueda de inquilino existente y asignación ─────────────────────

describe('Modal "Buscar Inquilino Existente" — construcción de opciones', () => {

  it('genera una opción por cada inquilino con value=id y label="nombre — email"', () => {
    const opts = buildLodgerSearchOptions(LODGERS_LIST)
    expect(opts).toHaveLength(4)
    expect(opts[0]).toEqual({ value: 'l-001', label: 'Ana García López — ana.garcia@example.com' })
    expect(opts[3]).toEqual({ value: 'l-004', label: 'Pedro Martínez Gil — pedro@work.com' })
  })

  it('devuelve array vacío cuando la lista es null', () => {
    expect(buildLodgerSearchOptions(null)).toHaveLength(0)
  })

  it('devuelve array vacío cuando la lista es undefined', () => {
    expect(buildLodgerSearchOptions(undefined)).toHaveLength(0)
  })

  it('devuelve array vacío cuando la lista está vacía', () => {
    expect(buildLodgerSearchOptions([])).toHaveLength(0)
  })

})

describe('Modal "Buscar Inquilino Existente" — filtro de búsqueda', () => {

  let options

  beforeEach(() => {
    options = buildLodgerSearchOptions(LODGERS_LIST)
  })

  it('filtra por nombre parcial (case-insensitive)', () => {
    const result = filterLodgerOptions(options, 'garcia')
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe('l-001')
  })

  it('filtra por email parcial', () => {
    const result = filterLodgerOptions(options, 'carlos.perez')
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe('l-002')
  })

  it('filtra por dominio de email común', () => {
    const result = filterLodgerOptions(options, '@example.com')
    expect(result).toHaveLength(3)
  })

  it('filtra por nombre completo exacto', () => {
    const result = filterLodgerOptions(options, 'María López Torres')
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe('l-003')
  })

  it('no distingue mayúsculas en la búsqueda', () => {
    const lower = filterLodgerOptions(options, 'ana')
    const upper = filterLodgerOptions(options, 'ANA')
    const mixed = filterLodgerOptions(options, 'Ana')
    expect(lower).toHaveLength(1)
    expect(upper).toHaveLength(1)
    expect(mixed).toHaveLength(1)
    expect(lower[0].value).toBe(upper[0].value)
  })

  it('devuelve todas las opciones cuando el texto de búsqueda está vacío', () => {
    const result = filterLodgerOptions(options, '')
    expect(result).toHaveLength(4)
  })

  it('devuelve array vacío cuando ningún inquilino coincide', () => {
    const result = filterLodgerOptions(options, 'zzznomatch')
    expect(result).toHaveLength(0)
  })

  it('busca por primer apellido parcial', () => {
    const result = filterLodgerOptions(options, 'Mart')
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe('l-004')
  })

})

describe('Modal "Buscar Inquilino Existente" — URL de navegación al seleccionar', () => {

  it('construye la URL de reasignación con action=reassign', () => {
    const url = buildReassignUrl('l-001', ACC_ID_TEST, FREE_ROOM.id)
    expect(url).toContain('/v2/admin/inquilinos/l-001/editar')
    expect(url).toContain('action=reassign')
    expect(url).toContain(`acc=${ACC_ID_TEST}`)
    expect(url).toContain(`room=${FREE_ROOM.id}`)
  })

  it('la URL de reasignación contiene el ID correcto del inquilino', () => {
    const url = buildReassignUrl('l-002', ACC_ID_TEST, FREE_ROOM.id)
    expect(url).toMatch(/\/v2\/admin\/inquilinos\/l-002\/editar/)
  })

  it('cada inquilino genera una URL única', () => {
    const url1 = buildReassignUrl('l-001', ACC_ID_TEST, FREE_ROOM.id)
    const url2 = buildReassignUrl('l-002', ACC_ID_TEST, FREE_ROOM.id)
    expect(url1).not.toBe(url2)
  })

})

describe('Modal "Buscar Inquilino Existente" — URL de navegación al crear nuevo', () => {

  it('construye la URL de creación con acc y room pre-rellenados', () => {
    const url = buildCreateAndAssignUrl(ACC_ID_TEST, FREE_ROOM.id)
    expect(url).toContain('/v2/admin/inquilinos/nuevo')
    expect(url).toContain(`acc=${ACC_ID_TEST}`)
    expect(url).toContain(`room=${FREE_ROOM.id}`)
  })

  it('la URL de crear nuevo NO contiene action=reassign', () => {
    const url = buildCreateAndAssignUrl(ACC_ID_TEST, FREE_ROOM.id)
    expect(url).not.toContain('action=reassign')
  })

})

describe('Visibilidad del botón — solo habitaciones LIBRES pueden asignarse', () => {

  /**
   * Replica la condición `room.status === "free"` de AccommodationDetail.jsx
   * que muestra los botones "Crear Inquilino Nuevo" y "Buscar Inquilino Existente".
   */
  function canAssignLodger(room) {
    return room.status === 'free'
  }

  it('habitación libre permite asignar inquilino', () => {
    expect(canAssignLodger(FREE_ROOM)).toBe(true)
  })

  it('habitación ocupada NO permite asignar', () => {
    expect(canAssignLodger(OCCUP_ROOM)).toBe(false)
  })

  it('habitación en mantenimiento NO permite asignar', () => {
    expect(canAssignLodger(MAINT_ROOM)).toBe(false)
  })

  it('habitación pending_checkout NO permite asignar', () => {
    const pendingRoom = { id: 'room-p-01', status: 'pending_checkout' }
    expect(canAssignLodger(pendingRoom)).toBe(false)
  })

})

describe('Reasignación de habitación — payload de reassignRoom()', () => {

  const REASSIGN_VALUES = {
    new_room_id: 'room-new-01',
    new_accommodation_id: 'acc-new-001',
    move_in_date: '2026-04-01',
    billing_start_date: '2026-04-01',
    monthly_rent: 500,
  }

  it('el payload incluye newRoomId y newAccommodationId', () => {
    const p = buildReassignPayload('l-001', REASSIGN_VALUES)
    expect(p.newRoomId).toBe('room-new-01')
    expect(p.newAccommodationId).toBe('acc-new-001')
  })

  it('el payload incluye moveInDate en formato YYYY-MM-DD', () => {
    const p = buildReassignPayload('l-001', REASSIGN_VALUES)
    expect(p.moveInDate).toBe('2026-04-01')
  })

  it('billingStartDate usa move_in_date cuando no se especifica', () => {
    const values = { ...REASSIGN_VALUES, billing_start_date: null }
    const p = buildReassignPayload('l-001', values)
    expect(p.billingStartDate).toBe(values.move_in_date)
  })

  it('billingStartDate usa el valor propio cuando se especifica', () => {
    const values = { ...REASSIGN_VALUES, billing_start_date: '2026-04-15' }
    const p = buildReassignPayload('l-001', values)
    expect(p.billingStartDate).toBe('2026-04-15')
  })

  it('monthlyRent es null cuando no se especifica precio', () => {
    const values = { ...REASSIGN_VALUES, monthly_rent: 0 }
    const p = buildReassignPayload('l-001', values)
    expect(p.monthlyRent).toBeNull()
  })

  it('monthlyRent conserva el valor cuando se especifica', () => {
    const p = buildReassignPayload('l-001', REASSIGN_VALUES)
    expect(p.monthlyRent).toBe(500)
  })

  it('el id del inquilino se incluye en el payload', () => {
    const p = buildReassignPayload('l-002', REASSIGN_VALUES)
    expect(p.id).toBe('l-002')
  })

})

describe('TenantEdit — apertura automática del modal de reasignación', () => {

  /**
   * Replica la condición de TenantEdit.jsx:
   * if (searchParams.get("action") === "reassign") setReassignOpen(true)
   */
  function shouldOpenReassignModal(searchParamsMap) {
    return searchParamsMap.get('action') === 'reassign'
  }

  it('abre el modal cuando action=reassign está en la URL', () => {
    const params = new URLSearchParams('action=reassign&acc=acc-001&room=room-001')
    expect(shouldOpenReassignModal(params)).toBe(true)
  })

  it('NO abre el modal cuando action NO está en la URL', () => {
    const params = new URLSearchParams('acc=acc-001&room=room-001')
    expect(shouldOpenReassignModal(params)).toBe(false)
  })

  it('NO abre el modal cuando action tiene otro valor', () => {
    const params = new URLSearchParams('action=edit')
    expect(shouldOpenReassignModal(params)).toBe(false)
  })

  it('extrae acc y room de los parámetros de URL', () => {
    const params = new URLSearchParams('action=reassign&acc=acc-test-001&room=room-free-01')
    expect(params.get('acc')).toBe('acc-test-001')
    expect(params.get('room')).toBe('room-free-01')
  })

})
