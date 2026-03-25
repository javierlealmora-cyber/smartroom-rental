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
        expect(invokeWithAuth).toHaveBeenCalledTimes(5)
      })

      it('la 6ª entidad es rechazada por la Edge Function', async () => {
        invokeWithAuth.mockResolvedValueOnce({
          ok: false,
          error: { message: 'Plan limit reached: max_owners exceeded' },
        })
        await expect(createEntity({ legal_type: 'persona_fisica' }))
          .rejects.toThrow('Plan limit reached: max_owners exceeded')
      })
    })
  })

  // ─── PLAN BUSINESS ──────────────────────────────────────────────────────────
  describe('Plan BUSINESS (max_owners: 10)', () => {
    const plan = PLANS.business

    describe('Límite de entidades', () => {
      it('max_owners es 10', () => {
        expect(plan.max_owners).toBe(10)
      })

      it('permite múltiples propietarios (allows_multi_owner: true)', () => {
        expect(plan.allows_multi_owner).toBe(true)
      })

      it('limitReached es FALSE con 9 entidades (puede añadir 1 más)', () => {
        expect(isLimitReached(plan.max_owners, 9)).toBe(false)
      })

      it('limitReached es TRUE con 10 entidades (límite exacto)', () => {
        expect(isLimitReached(plan.max_owners, 10)).toBe(true)
      })

      it('label "9 / 10" con 9 propietarios', () => {
        expect(formatOwnerLimit(plan.max_owners, 9)).toBe('9 / 10')
      })
    })

    describe('Límites ilimitados en Business', () => {
      it('max_accommodations es -1 (ilimitado)', () => {
        expect(plan.max_accommodations).toBe(-1)
      })

      it('max_rooms es -1 (ilimitado)', () => {
        expect(plan.max_rooms).toBe(-1)
      })

      it('un plan con max_accommodations = -1 no llega a limitReached', () => {
        expect(isLimitReached(-1, 9999)).toBe(false)
      })

      it('un plan con max_rooms = -1 no llega a limitReached', () => {
        expect(isLimitReached(-1, 9999)).toBe(false)
      })

      it('formatOwnerLimit con -1 devuelve "Ilimitadas"', () => {
        expect(formatOwnerLimit(-1, 50)).toBe('Ilimitadas')
      })
    })

    describe('Integración — createEntity en plan Business', () => {
      it('crea la 10ª entidad correctamente', async () => {
        const payload = {
          legal_type: 'persona_juridica',
          legal_name: 'Business Owner 10 SL',
          tax_id: 'B99999999',
          billing_email: 'owner10@business.com', phone: '+34600000010',
          street: 'Gran Vía', street_number: '100',
          zip: '28013', city: 'Madrid', province: 'Madrid', country: 'España',
        }
        invokeWithAuth.mockResolvedValueOnce({ ok: true, data: { id: 'e-biz-10', ...payload } })
        const result = await createEntity(payload)
        expect(result).toMatchObject({ id: 'e-biz-10' })
      })

      it('la 11ª entidad es rechazada por la Edge Function', async () => {
        invokeWithAuth.mockResolvedValueOnce({
          ok: false,
          error: { message: 'Plan limit reached: max_owners exceeded' },
        })
        await expect(createEntity({ legal_type: 'persona_juridica', legal_name: 'Over Limit SL' }))
          .rejects.toThrow('Plan limit reached: max_owners exceeded')
      })

      it('puede cambiar estado de entidad directamente en BD (NO usa invokeWithAuth)', async () => {
        mockSupabase.from.mockReturnValueOnce(buildChain({ data: { id: 'e-biz-1', status: 'inactive' }, error: null }))
        await setEntityStatus('e-biz-1', 'inactive', 'cai-001')
        expect(mockSupabase.from).toHaveBeenCalledWith('entities')
        expect(invokeWithAuth).not.toHaveBeenCalled()
      })
    })
  })

  // ─── PLAN AGENCY (referencia, sin límites) ──────────────────────────────────
  describe('Plan AGENCY (max_owners: -1, sin límites)', () => {
    const plan = PLANS.agency

    it('max_owners es -1 (ilimitado)', () => {
      expect(plan.max_owners).toBe(-1)
    })

    it('limitReached NUNCA es true con max_owners = -1', () => {
      [0, 1, 100, 9999].forEach(count => {
        expect(isLimitReached(plan.max_owners, count)).toBe(false)
      })
    })

    it('label "Ilimitadas" con cualquier cantidad', () => {
      expect(formatOwnerLimit(plan.max_owners, 500)).toBe('Ilimitadas')
    })

    it('permite cambio de propietario (allows_owner_change: true)', () => {
      expect(plan.allows_owner_change).toBe(true)
    })
  })

  // ─── COMPARATIVA ENTRE PLANES ────────────────────────────────────────────────
  describe('Comparativa entre planes', () => {
    it('Basic es el más restrictivo en max_owners', () => {
      const { basic, investor, business } = PLANS
      expect(basic.max_owners).toBeLessThan(investor.max_owners)
      expect(investor.max_owners).toBeLessThan(business.max_owners)
    })

    it('solo Basic no permite multi-owner', () => {
      expect(PLANS.basic.allows_multi_owner).toBe(false)
      expect(PLANS.investor.allows_multi_owner).toBe(true)
      expect(PLANS.business.allows_multi_owner).toBe(true)
      expect(PLANS.agency.allows_multi_owner).toBe(true)
    })

    it('solo Basic no tiene branding', () => {
      expect(PLANS.basic.branding_enabled).toBe(false)
      expect(PLANS.investor.branding_enabled).toBe(true)
      expect(PLANS.business.branding_enabled).toBe(true)
      expect(PLANS.agency.branding_enabled).toBe(true)
    })

    it('Business y Agency tienen alojamientos ilimitados (-1)', () => {
      expect(PLANS.basic.max_accommodations).toBe(3)
      expect(PLANS.investor.max_accommodations).toBe(8)
      expect(PLANS.business.max_accommodations).toBe(-1)
      expect(PLANS.agency.max_accommodations).toBe(-1)
    })

    it('isLimitReached con null (plan no cargado) no bloquea', () => {
      // Si el plan aún no cargó, maxOwners = null → no debe bloquear
      expect(isLimitReached(null, 0)).toBe(false)
      expect(isLimitReached(null, 5)).toBe(false)
    })

    it('la secuencia de límites sigue orden ascendente Basic→Investor→Business', () => {
      const limits = [PLANS.basic, PLANS.investor, PLANS.business]
        .map(p => p.max_owners)
      for (let i = 0; i < limits.length - 1; i++) {
        expect(limits[i]).toBeLessThan(limits[i + 1])
      }
    })
  })

  // ─── EDGE CASES ──────────────────────────────────────────────────────────────
  describe('Edge cases', () => {
    it('resolveDisplayEntities con arrays undefined no falla', () => {
      expect(() => resolveDisplayEntities('basic', undefined, undefined)).not.toThrow()
      expect(resolveDisplayEntities('basic', undefined, undefined)).toEqual([])
    })

    it('resolveDisplayEntities para plan desconocido devuelve owners', () => {
      const owners = [makeOwner(1)]
      const display = resolveDisplayEntities('premium', owners, [PAYER_BASIC])
      expect(display).toEqual(owners)
    })

    it('formatOwnerLimit con maxOwners undefined devuelve string vacío', () => {
      expect(formatOwnerLimit(undefined, 3)).toBe('')
    })

    it('isLimitReached con ownersCount exactamente igual al límite retorna true (no menor que)', () => {
      expect(isLimitReached(5, 5)).toBe(true)   // igual = bloqueado
      expect(isLimitReached(5, 4)).toBe(false)   // uno menos = aún puede
    })
  })
})
