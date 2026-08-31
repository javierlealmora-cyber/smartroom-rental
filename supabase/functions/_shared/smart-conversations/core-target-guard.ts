/**
 * core-target-guard.ts — Target guard DEV para integración Core (Fase 11C2).
 *
 * Verifica que el entorno es inequívocamente DEV antes de activar modo canary/real.
 * Falla cerrado ante cualquier ambigüedad: exit reason, mantener mock, no llamar Core.
 *
 * Entornos DEV válidos: 'sandbox' | 'dev' | 'development'
 *   Los tres son equivalentes. El mapping centralizado vive en DEV_ENVIRONMENTS.
 *   'sandbox' es el nombre canónico preferido en tests y documentación.
 *
 * No imprime URLs, project refs, credenciales ni PII.
 */

export interface TargetGuardResult {
  ok: boolean;
  reason: string;
}

/**
 * Re-export desde environment-model.ts — fuente única canónica para DEV_ENVIRONMENTS.
 * Todos los adapters y guards deben usar isDevelopmentEnvironment o DEV_ENVIRONMENTS de aquí.
 */
export { DEV_ENVIRONMENT_ALIASES as DEV_ENVIRONMENTS } from './environment-model.ts';
import { isDevelopmentEnvironment, DEV_ENVIRONMENT_ALIASES as DEV_ENVIRONMENTS } from './environment-model.ts';

/** Fragmentos de URL que indican entorno PRE o PRO (bloqueados). */
const PRE_PRO_MARKERS = ['production', '.pro.', '-pro.', 'staging', '.pre.', '-pre.', '-staging.'];

/**
 * Verifica que APP_ENVIRONMENT resuelve inequívocamente a DEV.
 * No retorna el valor literal — solo un reason sanitizado.
 */
export function checkDevEnvironment(appEnvironment: string | undefined): TargetGuardResult {
  if (!appEnvironment) return { ok: false, reason: 'APP_ENVIRONMENT_NOT_SET' };
  if (!isDevelopmentEnvironment(appEnvironment)) {
    return { ok: false, reason: 'APP_ENVIRONMENT_NOT_DEV' };
  }
  return { ok: true, reason: 'DEV_CONFIRMED' };
}

/**
 * Verifica que CORE_BASE_URL está configurada y no pertenece a PRE/PRO.
 * No imprime el valor de la URL.
 */
export function checkCoreUrl(coreBaseUrl: string | undefined): TargetGuardResult {
  if (!coreBaseUrl) return { ok: false, reason: 'CORE_BASE_URL_NOT_SET' };
  const low = coreBaseUrl.toLowerCase();
  for (const marker of PRE_PRO_MARKERS) {
    if (low.includes(marker)) return { ok: false, reason: 'CORE_URL_NOT_DEV' };
  }
  return { ok: true, reason: 'CORE_URL_OK' };
}

/**
 * Verifica que CORE_SERVICE_TOKEN está configurado y no es placeholder.
 * No imprime ni valida el valor concreto.
 */
export function checkCoreCredential(token: string | undefined): TargetGuardResult {
  if (!token) return { ok: false, reason: 'CORE_SERVICE_TOKEN_NOT_SET' };
  const low = token.toLowerCase();
  if (low === 'mock' || low.startsWith('placeholder') || low === 'test' || low === 'changeme') {
    return { ok: false, reason: 'CORE_SERVICE_TOKEN_IS_PLACEHOLDER' };
  }
  return { ok: true, reason: 'CORE_CREDENTIAL_OK' };
}

/**
 * Guard principal: ejecuta los tres checks en orden.
 * Falla cerrado ante cualquier fallo individual.
 */
export function runCoreTargetGuard(env: {
  APP_ENVIRONMENT?: string;
  CORE_BASE_URL?: string;
  CORE_SERVICE_TOKEN?: string;
}): TargetGuardResult {
  const envCheck = checkDevEnvironment(env.APP_ENVIRONMENT);
  if (!envCheck.ok) return envCheck;

  const urlCheck = checkCoreUrl(env.CORE_BASE_URL);
  if (!urlCheck.ok) return urlCheck;

  const credCheck = checkCoreCredential(env.CORE_SERVICE_TOKEN);
  if (!credCheck.ok) return credCheck;

  return { ok: true, reason: 'ALL_CHECKS_PASSED' };
}
