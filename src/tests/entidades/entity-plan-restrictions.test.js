/**
 * TEST SET: Restricciones de Plan — Entidad CRUD
 * Módulos:
 *   src/pages/v2/admin/entities/EntitiesList.jsx   (limitReached, displayEntities)
 *   src/services/plans.service.js                  (formatLimit, getPlanByCode)
 *   src/services/entities.service.js               (createEntity, setEntityStatus)
 *
 * Cubre las restricciones que cada plan impone sobre las entidades:
 *
 *   Plan     max_owners  allows_multi_owner  branding  max_accommodations
 *   ──────   ──────────  ─────────────────── ────────  ──────────────────
 *   basic        1           false           false          3
 *   investor     5           true            true           8
 *   business    10           true            true          -1 (ilimitado)
 *   agency      -1           true            true          -1 (ilimitado)
 *
 * Estrategia: Se testea la lógica de negocio como funciones puras
 * replicando los cálculos de EntitiesList y plans.service.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── Definición de planes (replica plans_catalog seeds) ──────────────────────
const PLANS = {
  basic: {
    code:                'basic',
    max_owners:          1,
    max_accommodations:  3,
    max_rooms:           20,
    max_admin_users:     1,
    allows_multi_owner:  false,
    branding_enabled:    false,
    allows_owner_change: false,
  },
  investor: {
    code:                'investor',
    max_owners:          5,
    max_accommodations:  8,
    max_rooms:           60,
    max_admin_users:     2,
    allows_multi_owner:  true,
    branding_enabled:    true,
    allows_owner_change: false,
  },
  business: {
    code:                'business',
    max_owners:          10,
    max_accommodations:  -1,
    max_rooms:           -1,
    max_admin_users:     3,
    allows_multi_owner:  true,
    branding_enabled:    true,
    allows_owner_change: false,
  },
  agency: {
    code:                'agency',
    max_owners:          -1,
    max_accommodations:  -1,
    max_rooms:           -1,
    max_admin_users:     3,
    allows_multi_owner:  true,
    branding_enabled:    true,
    allows_owner_change: true,
  },
}

// ─── Réplica de la lógica de EntitiesList ─────────────────────────────────────
/**
 * Calcula si el límite de entidades propietarias se ha alcanzado.
 * Replica exactamente: maxOwners != null && maxOwners !== -1 && ownersCount >= maxOwners
 */
function isLimitReached(maxOwners, ownersCount) {
  return maxOwners != null && maxOwners !== -1 && ownersCount >= maxOwners
}

/**
 * Determina qué entidades mostrar.
 * Plan Basic sin owners → muestra la entidad payer como fallback.
 * Replica: if (planCode === 'basic' && hasPayer && !hasOwners) → [payerEntities[0]]
 */
function resolveDisplayEntities(planCode, ownerEntities, payerEntities) {
  const hasOwners = ownerEntities && ownerEntities.length > 0
  const hasPayer  = payerEntities && payerEntities.length > 0
  if (planCode === 'basic' && hasPayer && !hasOwners) {
    return [payerEntities[0]]
  }
  return ownerEntities || []
}

/**
 * Formatea el contador de entidades para la UI.
 * -1 = ilimitado → "Ilimitadas"
 * N  → "actual / N"
 */
function formatOwnerLimit(maxOwners, currentCount) {
  if (maxOwners == null) return ''
  return maxOwners === -1 ? 'Ilimitadas' : `${currentCount} / ${maxOwners}`
}

// ─── Mock del servicio ─────────────────────────────────────────────────────────
const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }))

vi.mock('../../services/supabaseClient', () => ({
  supabase: mockSupabase,
}))

vi.mock('../../services/supabaseInvoke.services', () => ({
  invokeWithAuth: vi.fn(),
}))
import { invokeWithAuth } from '../../services/supabaseInvoke.services'
import { createEntity, setEntityStatus } from '../../services/entities.service'
import { buildChain } from '../helpers/chainMock'

// ─── Fixtures de entidades por plan ──────────────────────────────────────────
const makeOwner = (n) => ({
  id: `owner-${n}`,
  legal_type: 'persona_fisica',
  first_name: `Propietario${n}`,
  last_name1: 'Test',
  status: 'active',
  type: 'owner',
})

const PAYER_BASIC = {
  id: 'payer-basic-1',
  legal_type: 'persona_juridica',
  legal_name: 'Basic Rentals 1 - Payer Entity',
  status: 'active',
  type: 'payer',
}

const OWNER_BASIC = makeOwner(1)

// =============================================================================
describe('Restricciones de plan — Entidad CRUD', () => {
  beforeEach(() => vi.clearAllMocks())

  // ─── PLAN BASIC ─────────────────────────────────────────────────────────────
  describe('Plan BASIC (max_owners: 1)', () => {
    const plan = PLANS.basic

    describe('Límite de entidades', () => {
      it('max_owners es 1', () => {
        expect(plan.max_owners).toBe(1)
      })

      it('NO permite múltiples propietarios (allows_multi_owner: false)', () => {
        expect(plan.allows_multi_owner).toBe(false)
      })

      it('limitReached es FALSE con 0 entidades (puede crear)', () => {
        expect(isLimitReached(plan.max_owners, 0)).toBe(false)
      })

      it('limitReached es TRUE con 1 entidad (límite alcanzado)', () => {
        expect(isLimitReached(plan.max_owners, 1)).toBe(true)
      })

      it('limitReached es TRUE con más de 1 entidad (estado inconsistente)', () => {
        expect(isLimitReached(plan.max_owners, 2)).toBe(true)
      })

      it('label muestra "0 / 1" cuando no hay entidades', () => {
        expect(formatOwnerLimit(plan.max_owners, 0)).toBe('0 / 1')
      })

      it('label muestra "1 / 1" cuando el límite está lleno', () => {
        expect(formatOwnerLimit(plan.max_owners, 1)).toBe('1 / 1')
      })
    })

    describe('Comportamiento especial Basic — payer como fallback', () => {
      it('sin owners y con payer → muestra la entidad payer', () => {
        const display = resolveDisplayEntities('basic', [], [PAYER_BASIC])
        expect(display).toHaveLength(1)
        expect(display[0]).toEqual(PAYER_BASIC)
      })

      it('con owners → muestra los owners (no el payer)', () => {
        const display = resolveDisplayEntities('basic', [OWNER_BASIC], [PAYER_BASIC])
        expect(display).toHaveLength(1)
        expect(display[0]).toEqual(OWNER_BASIC)
      })

      it('sin owners y sin payer → devuelve array vacío', () => {
        const display = resolveDisplayEntities('basic', [], [])
        expect(display).toHaveLength(0)
      })

      it('solo el primer payer se usa como fallback (no todos)', () => {
        const payers = [PAYER_BASIC, { ...PAYER_BASIC, id: 'payer-2' }]
        const display = resolveDisplayEntities('basic', [], payers)
        expect(display).toHaveLength(1)
        expect(display[0].id).toBe('payer-basic-1')
      })
    })

    describe('Características del plan', () => {
      it('branding NO está habilitado en Basic', () => {
        expect(plan.branding_enabled).toBe(false)
      })

      it('max_accommodations es 3', () => {
        expect(plan.max_accommodations).toBe(3)
      })

      it('max_rooms es 20', () => {
        expect(plan.max_rooms).toBe(20)
      })

      it('solo 1 admin user permitido', () => {
        expect(plan.max_admin_users).toBe(1)
      })
    })

    describe('Integración — createEntity en plan Basic', () => {
      it('crea la única entidad permitida (owner #1)', async () => {
        const payload = {
          legal_type: 'persona_fisica',
          first_name: 'Owner', last_name1: 'Basic', last_name2: 'Test',
          gender: 'male', tax_id: '11111111A',
          billing_email: 'owner@basicrentals.com', phone: '+34600000001',
          street: 'Calle Test', street_number: '1',
          zip: '28001', city: 'Madrid', province: 'Madrid', country: 'España',
        }
        invokeWithAuth.mockResolvedValueOnce({ ok: true, data: { id: 'e-basic', ...payload } })
        const result = await createEntity(payload)
        expect(result).toMatchObject({ id: 'e-basic' })
        expect(invokeWithAuth).toHaveBeenCalledWith('manage_entity', {
          body: { action: 'create', payload },
        })
      })

      it('intento de crear 2ª entidad llega al servicio (el bloqueo es en UI)', async () => {
        // La restricción se aplica en EntitiesList (botón disabled).
        // El servicio en sí no valida el límite — lo hace la Edge Function.
        // Este test documenta que el servicio NO hace la validación del límite.
        invokeWithAuth.mockResolvedValueOnce({
          ok: false,
          error: { message: 'Plan limit reached: max_owners exceeded' },
        })
        await expect(createEntity({ legal_type: 'persona_fisica' }))
          .rejects.toThrow('Plan limit reached: max_owners exceeded')
      })
    })
  })

  // ─── PLAN INVESTOR ──────────────────────────────────────────────────────────
  describe('Plan INVESTOR (max_owners: 5)', () => {
    const plan = PLANS.investor

    describe('Límite de entidades', () => {
      it('max_owners es 5', () => {
        expect(plan.max_owners).toBe(5)
      })

      it('permite múltiples propietarios (allows_multi_owner: true)', () => {
        expect(plan.allows_multi_owner).toBe(true)
      })

      it('limitReached es FALSE con 0 entidades', () => {
        expect(isLimitReached(plan.max_owners, 0)).toBe(false)
      })

      it('limitReached es FALSE con 4 entidades (puede añadir 1 más)', () => {
        expect(isLimitReached(plan.max_owners, 4)).toBe(false)
      })

      it('limitReached es TRUE con 5 entidades (límite exacto)', () => {
        expect(isLimitReached(plan.max_owners, 5)).toBe(true)
      })

      it('limitReached es TRUE con 6 entidades (estado inconsistente)', () => {
        expect(isLimitReached(plan.max_owners, 6)).toBe(true)
      })

      it('label progresivo: "3 / 5" con 3 entidades', () => {
        expect(formatOwnerLimit(plan.max_owners, 3)).toBe('3 / 5')
      })

      it('label muestra "5 / 5" en el límite', () => {
        expect(formatOwnerLimit(plan.max_owners, 5)).toBe('5 / 5')
      })
    })

    describe('Comportamiento multi-owner', () => {
      it('NO usa fallback payer — siempre muestra owners', () => {
        const owners = [makeOwner(1), makeOwner(2)]
        const display = resolveDisplayEntities('investor', owners, [PAYER_BASIC])
        expect(display).toHaveLength(2)
        expect(display.every(e => e.type === 'owner')).toBe(true)
      })

      it('sin owners devuelve array vacío (sin fallback para investor)', () => {
        const display = resolveDisplayEntities('investor', [], [PAYER_BASIC])
        expect(display).toHaveLength(0)
      })
    })

    describe('Características del plan', () => {
      it('branding está habilitado', () => {
        expect(plan.branding_enabled).toBe(true)
      })

      it('max_accommodations es 8', () => {
        expect(plan.max_accommodations).toBe(8)
      })

      it('max_rooms es 60', () => {
        expect(plan.max_rooms).toBe(60)
      })
    })

    describe('Integración — createEntity en plan Investor', () => {
      it('crea propietarios 1 a 5 correctamente', async () => {
        for (let i = 1; i <= 5; i++) {
          const payload = {
            legal_type: 'persona_fisica',
            first_name: `Owner${i}`, last_name1: 'Investor', last_name2: 'Test',
            gender: 'male', tax_id: `1234567${i}A`,
            billing_email: `owner${i}@investor.com`, phone: `+3460000000${i}`,
            street: 'Calle Investor', street_number: `${i}`,
            zip: '28001', city: 'Madrid', province: 'Madrid', country: 'España',
          }
          invokeWithAuth.mockResolvedValueOnce({ ok: true, data: { id: `e-inv-${i}`, ...payload } })
          const result = await createEntity(payload)
          expect(result).toMatchObject({ id: `e-inv-${i}` })
        }
