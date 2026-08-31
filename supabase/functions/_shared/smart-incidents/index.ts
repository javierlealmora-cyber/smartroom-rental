/**
 * index.ts — Barrel export del módulo shared de Smart Incidents.
 * Estado: PROVIDER_RUNTIME_CONTRACT_IMPLEMENTED_OFFLINE | AUTH_ADAPTER_IMPLEMENTED_OFFLINE | ENTITLEMENT_DEFINED_OFFLINE
 */

export type {
  IncidentCategory,
  IncidentPriority,
  IncidentSourceChannel,
  IncidentStatus,
  CreateIncidentActorV1,
  IncidentRequestDataV1,
  CreateIncidentRequestV1,
  CreateIncidentResultV1,
  ProviderErrorCode,
  ProviderErrorResponse,
  ProviderSuccessResponse,
  ProviderResponse,
} from './types.ts';

export {
  PROVIDER_ERROR_CODES,
  getHttpStatus,
  isRetryable,
  getSafeMessage,
  buildProviderErrorResponse,
} from './errors.ts';

export type { ValidateRequestResult } from './validator.ts';
export { validateCreateIncidentRequest } from './validator.ts';

export type { FirstCreationContext, ReplayContext } from './response-mapper.ts';
export { buildFirstCreationResponse, buildReplayResponse } from './response-mapper.ts';

export type {
  CreateIncidentSuccess,
  CreateIncidentFailure,
  CreateIncidentDomainResult,
  CreateIncidentProviderUseCase,
  IncidentProviderCallerIdentity,
  IncidentCallerAuthErrorCode,
  IncidentCallerAuthResult,
  IncidentCallerAuthRequest,
  IncidentCallerAuthPort,
} from './port.ts';

export type {
  AppEnvironment,
  CurrentTokenConfig,
  PreviousTokenConfig,
  AuthConfig,
  AuthConfigErrorReason,
  AuthConfigError,
  AuthConfigResult,
  EnvReader,
} from './auth-config.ts';
export {
  validateTokenFormat,
  parseIsoDate,
  loadAuthConfig,
  makeDenoEnvReader,
} from './auth-config.ts';

export { safeTokenEqual } from './constant-time.ts';

export type { AuthErrorCode, AuthResult } from './auth-adapter.ts';
export {
  parseBearerHeader,
  authenticate,
  authorizeForOperation,
  IncidentBearerAuthAdapter,
} from './auth-adapter.ts';

export type { IncidentProviderLogEntry, IncidentProviderLogger } from './logger-port.ts';

export type { CreateIncidentHttpDependencies } from './http-types.ts';

export { createIncidentHttpHandler } from './http-handler.ts';

export type {
  IncidentEntitlementCheckRequest,
  IncidentEntitlementSnapshot,
  IncidentEntitlementPortResult,
  IncidentEntitlementDecision,
  IncidentEntitlementCheckResult,
} from './entitlement-types.ts';

export type { IncidentEntitlementPort } from './entitlement-port.ts';

export {
  evaluateIncidentEntitlement,
  checkIncidentEntitlement,
} from './entitlement-policy.ts';
