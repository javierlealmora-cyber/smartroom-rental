/**
 * TEST SET: Concurrencia — Circuit Breaker y Single-Flight (C-05 a C-08)
 *
 * Archivo separado porque estos tests necesitan importar el módulo REAL
 * de supabaseInvoke.services.js, lo que es incompatible con un vi.mock()
 * hoisted en el mismo archivo.
 *
 * Técnica: vi.resetModules() + vi.doMock() + dynamic import → estado limpio
 * por cada test. vi.useFakeTimers() para controlar sleeps internos del servicio.
 *
 * Estado global del módulo que se resetea entre tests:
 *   - breakerOpenUntil     (circuit breaker)
 *   - consecutiveAuthFailures
 *   - cooldownUntil
 *   - refreshInFlight      (single-flight de refresh)
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('Concurrencia — Circuit Breaker y Single-Flight (módulo aislado)', () => {
  let invokeWithAuth
  let mockAuth
  let mockFunctions

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.resetModules()

    // Mocks frescos en cada test — estado limpio
    mockAuth = {
      getSession: vi.fn(),
      refreshSession: vi.fn(),
      signOut: vi.fn().mockResolvedValue({}),
    }
    mockFunctions = {
      invoke: vi.fn(),
    }

    // vi.doMock (no-hoisted): registra el mock ANTES del import dinámico
    vi.doMock('../../services/supabaseClient', () => ({
      supabase: { auth: mockAuth, functions: mockFunctions },
    }))

    // Import dinámico → carga el módulo REAL con el supabaseClient mockeado
    const mod = await import('../../services/supabaseInvoke.services')
    invokeWithAuth = mod.invokeWithAuth
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
  })

  // ─── C-05 ─────────────────────────────────────────────────────────────────
  it('C-05 — sin sesión disponible: circuit breaker abre en la primera llamada', async () => {
    // getSession devuelve null → getSessionSafe() agota 3 intentos (0+150+450ms)
    mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null })

    const call1 = invokeWithAuth('my-fn')
    // Adjuntar .rejects ANTES de avanzar timers (evita PromiseRejectionHandledWarning)
    const expectReject = expect(call1).rejects.toThrow(/Sesión no disponible/)
    // Avanzar timers para los sleep(150) y sleep(450) de getSessionSafe
    await vi.runAllTimersAsync()
    await expectReject

    // Segunda llamada: breaker ya abierto → falla inmediatamente sin tocar red
    await expect(invokeWithAuth('my-fn')).rejects.toThrow('CIRCUIT_OPEN')
  })

  // ─── C-06 ─────────────────────────────────────────────────────────────────
  it('C-06 — con breaker abierto, N llamadas paralelas fallan sin tocar la red', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null })

    // Abrir el breaker (adjuntar .rejects antes de avanzar timers)
    const call1 = invokeWithAuth('my-fn')
    const expectReject = expect(call1).rejects.toThrow(/Sesión no disponible/)
    await vi.runAllTimersAsync()
    await expectReject

    // 5 llamadas paralelas: todas deben fallar con CIRCUIT_OPEN
    const results = await Promise.all(
      Array.from({ length: 5 }, () => invokeWithAuth('my-fn').catch((e) => e.message))
    )

    results.forEach((msg) => expect(msg).toBe('CIRCUIT_OPEN'))

    // functions.invoke nunca fue alcanzada
    expect(mockFunctions.invoke).not.toHaveBeenCalled()
  })

  // ─── C-07 ─────────────────────────────────────────────────────────────────
  it('C-07 — single-flight: 10 refreshes paralelos → solo 1 llamada real a refreshSession', async () => {
    // Sesión válida inicial (no expirada, no requiere refresh preventivo)
    const validSession = {
      access_token: 'initial-token',
      expires_at: Math.floor(Date.now() / 1000) + 9999,
    }
    mockAuth.getSession.mockResolvedValue({ data: { session: validSession }, error: null })

    // refreshSession con delay por timer → las 10 llamadas se acumulan esperando
    // la misma promise (single-flight) antes de que resuelva
    const refreshedSession = {
      access_token: 'refreshed-token',
      expires_at: Math.floor(Date.now() / 1000) + 9999,
    }
    mockAuth.refreshSession.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: { session: refreshedSession }, error: null }), 100)
        )
    )

    // functions.invoke: siempre 401 → fuerza el path de refresh en todas las llamadas
    mockFunctions.invoke.mockResolvedValue({
      data: null,
      error: { status: 401, message: 'Unauthorized' },
    })

    // 10 llamadas en paralelo: todas reciben 401 y llaman a refreshSessionSingleFlight()
    // Solo la primera crea la promise; las otras 9 reciben la misma (dedup)
    const calls = Array.from({ length: 10 }, () =>
      invokeWithAuth('my-fn', { baseRetryDelayMs: 0, maxTransientRetries: 0 }).catch(
        (e) => ({ error: e.message })
      )
    )

    // Avanzar timers: refresh(100ms) + sleeps de retry (800ms)
    await vi.runAllTimersAsync()
    const results = await Promise.all(calls)

    // ASERCIÓN PRINCIPAL: refreshSession llamado solo 1 vez
    expect(mockAuth.refreshSession).toHaveBeenCalledTimes(1)
    // Todas las llamadas resolvieron (con error, pero sin colgarse)
    expect(results).toHaveLength(10)
  })

  // ─── C-08 ─────────────────────────────────────────────────────────────────
  it('C-08 — retry transitorio: 2 errores 5xx + éxito en el 3er intento → 3 llamadas totales', async () => {
    const validSession = {
      access_token: 'valid-token',
      expires_at: Math.floor(Date.now() / 1000) + 9999,
    }
    mockAuth.getSession.mockResolvedValue({ data: { session: validSession }, error: null })

    const successData = { ok: true, result: 'operación completada' }

    // 1º: 500, 2º: 503, 3º: éxito
    mockFunctions.invoke
      .mockResolvedValueOnce({ data: null, error: { status: 500, message: 'Internal Server Error' } })
      .mockResolvedValueOnce({ data: null, error: { status: 503, message: 'Service Unavailable' } })
      .mockResolvedValueOnce({ data: successData, error: null })

    // baseRetryDelayMs: 0 → sleep(0) entre reintentos (se avanza con runAllTimersAsync)
    const callPromise = invokeWithAuth('my-fn', {
      baseRetryDelayMs: 0,
      maxTransientRetries: 2,
      maxUnauthorizedRetries: 0,
    })

    await vi.runAllTimersAsync()
    const result = await callPromise

    expect(result).toEqual(successData)
    // Exactamente 3 llamadas: 2 fallidas + 1 exitosa
    expect(mockFunctions.invoke).toHaveBeenCalledTimes(3)
  })
})
