/**
 * environment-model.ts — Fuente única canónica de entornos DEV (Fase 11C3).
 *
 * Valor canónico: 'development'
 * Aliases: 'dev' → 'development', 'sandbox' → 'development'
 *
 * TODOS los adapters y guards deben importar de este módulo.
 * No duplicar DEV_ENVIRONMENTS en otros archivos.
 *
 * Semántica: sandbox, dev y development son funcionalmente equivalentes.
 * Se normalizan al valor canónico para comparaciones seguras.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tipo canónico
// ─────────────────────────────────────────────────────────────────────────────

export type CanonicalDevEnvironment = 'development';
export type KnownEnvironment = 'development' | 'staging' | 'production' | 'unknown';

/** Valor canónico que representa cualquier entorno DEV. */
export const CANONICAL_DEV_ENVIRONMENT: CanonicalDevEnvironment = 'development';

// ─────────────────────────────────────────────────────────────────────────────
// Aliases → canónico
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mapping exhaustivo de aliases a valor canónico.
 * Ningún alias de DEV apunta a staging o production.
 */
export const ENV_ALIASES: Readonly<Record<string, KnownEnvironment>> = {
  // Entornos DEV — los tres son equivalentes
  'development':    'development',
  'dev':            'development',
  'sandbox':        'development',
  // Entornos no-DEV
  'staging':        'staging',
  'pre':            'staging',
  'preproduction':  'staging',
  'preview':        'staging',
  'production':     'production',
  'pro':            'production',
  'prod':           'production',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normaliza el nombre de entorno al valor canónico conocido.
 * Valor desconocido → 'unknown' (fail-closed).
 */
export function normalizeEnvironment(env: string | undefined): KnownEnvironment {
  if (!env) return 'unknown';
  const lower = env.toLowerCase().trim();
  return ENV_ALIASES[lower] ?? 'unknown';
}

/**
 * Devuelve true si el entorno normalizado es 'development' (DEV canónico).
 * Acepta 'dev', 'sandbox' y 'development'. Todo lo demás es false.
 */
export function isDevelopmentEnvironment(env: string | undefined): boolean {
  return normalizeEnvironment(env) === 'development';
}

/** Conjunto de strings reconocidos como DEV (para guards tipo Set.has()). */
export const DEV_ENVIRONMENT_ALIASES: ReadonlySet<string> = new Set(['development', 'dev', 'sandbox']);

// ─────────────────────────────────────────────────────────────────────────────
// Guard: modo permitido para entorno
// ─────────────────────────────────────────────────────────────────────────────

type EnvironmentGuardResult = { allowed: boolean; reason?: string };

/**
 * Verifica si el modo de integración está permitido en el entorno dado.
 * - real/canary: solo en DEV (fail-closed fuera de DEV)
 * - mock/shadow/disabled: siempre permitidos
 */
/** Error codes para mode guard. */
export const ENV_GUARD_ERRORS = {
  mode_real_requires_dev_environment:   'mode_real_requires_dev_environment',
  mode_canary_requires_dev_environment: 'mode_canary_requires_dev_environment',
} as const;

export function assertEnvironmentAllowedForMode(
  env: string | undefined,
  mode: string,
): EnvironmentGuardResult {
  if (mode !== 'real' && mode !== 'canary') return { allowed: true };
  if (!isDevelopmentEnvironment(env)) {
    return {
      allowed: false,
      reason: ENV_GUARD_ERRORS[`mode_${mode}_requires_dev_environment` as keyof typeof ENV_GUARD_ERRORS],
    };
  }
  return { allowed: true };
}
