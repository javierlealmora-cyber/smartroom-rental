/**
 * logger-port.ts — Puerto mínimo e inyectable de logging para el handler HTTP provider.
 *
 * Allowlist estricta: solo campos de trazabilidad técnica, código de resultado, métricas.
 *
 * PROHIBIDOS en el log entry:
 *   Authorization, token, body, payload, idempotency_key, title, description,
 *   requester_profile_id, accommodation_id, room_id, stack, errores raw, PII de canal.
 *
 * El handler no usa console.log directamente.
 * Estado: INCIDENT_PROVIDER_LOGGER_PORT_DEFINED
 */

// ─── Log entry allowlisted ────────────────────────────────────────────────────

/**
 * Campos permitidos en el log entry del handler provider.
 * Todo campo es seguro para logs internos; ninguno contiene payload, credenciales ni PII.
 */
export interface IncidentProviderLogEntry {
  /** request_id seguro: UUID del body validado o ID generado server-side. */
  readonly request_id: string;
  /** correlation_id seguro: UUID del body validado o ID generado server-side. */
  readonly correlation_id: string;
  /** Código canónico de resultado: ProviderErrorCode, "SUCCESS" o código HTTP auxiliar. */
  readonly result_code: string;
  /** HTTP status de la respuesta enviada. */
  readonly http_status: number;
  /** Duración de la request en milisegundos. No negativa. */
  readonly duration_ms: number;
  /**
   * true si fue replay idempotente, false si fue primera creación, undefined si error.
   * No se registra la idempotency_key completa en ningún caso.
   */
  readonly idempotent_replay: boolean | undefined;
  /** Versión del contrato si es string segura (solo "1.0" o valor verificado). Opcional. */
  readonly contract_version?: string;
  /**
   * Slot de credencial usado en la autenticación.
   * Metadata interna; no contiene el token ni el hash.
   */
  readonly credential_slot?: "current" | "previous";
  /** Entorno si lo proporciona la dependencia. Opcional. */
  readonly environment?: string;
}

// ─── Puerto inyectable ────────────────────────────────────────────────────────

/**
 * Puerto inyectable del logger del handler provider.
 * Producción: adapter hacia console.log allowlisted, OpenTelemetry, etc.
 * Tests: fake que captura entries para assertions.
 */
export interface IncidentProviderLogger {
  log(entry: IncidentProviderLogEntry): void;
}
