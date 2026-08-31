/**
 * http-types.ts — Tipos del handler HTTP offline e inyectable del provider de Smart Incidents.
 *
 * Define exclusivamente las dependencias del handler. Sin adapters de producción.
 * Estado: HTTP_HANDLER_TYPES_DEFINED
 */

import type { IncidentCallerAuthPort, CreateIncidentProviderUseCase } from './port.ts';
import type { IncidentProviderLogger } from './logger-port.ts';

// ─── Dependencias del handler ─────────────────────────────────────────────────

/**
 * Dependencias inyectables del handler HTTP provider.
 *
 * Ninguna dependencia lee Deno.env directamente.
 * Los adapters de producción se construyen fuera del handler e inyectan aquí.
 * Los fakes de test implementan las mismas interfaces.
 *
 * El handler es completamente testeable offline mediante Request estándar,
 * dependencias falsas y Response HTTP reales.
 */
export interface CreateIncidentHttpDependencies {
  /**
   * Puerto de autenticación y autorización del caller (implementado en SI-P3B2A).
   * Se invoca con authorizationHeader del header y operation: "create_incident".
   * Garantía: ok: true nunca se devuelve sin haber verificado la operación.
   */
  readonly callerAuth: IncidentCallerAuthPort;
  /**
   * Puerto del caso de uso de creación de incidencia (implementado en SI-P4+).
   * En SI-P3B2B1: se recibe un fake en tests; la producción inyectará la implementación real.
   */
  readonly useCase: CreateIncidentProviderUseCase;
  /**
   * Reloj inyectable. Devuelve el instante de referencia.
   * Llamado dos veces: al inicio para medir duración, y en doFinish para calcular elapsed.
   */
  readonly now: () => Date;
  /**
   * Generador de IDs de trazabilidad seguros.
   * Produce UUIDs v4 (o equivalente) para request_id y correlation_id de fallback.
   * Nunca se usa como ID contractual en requests válidas.
   */
  readonly generateTraceId: () => string;
  /** Puerto de logging allowlisted. Sin console.log directo en el handler. */
  readonly logger: IncidentProviderLogger;
}
