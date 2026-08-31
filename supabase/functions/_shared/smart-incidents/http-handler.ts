/**
 * http-handler.ts — Handler HTTP puro e inyectable del provider de Smart Incidents.
 *
 * Implementa los 14 pasos obligatorios de SI-P3B2B1 en orden estricto.
 * No crea Deno.serve. No lee Deno.env. Sin persistencia. Sin entitlement.
 *
 * Endpoint backend-to-backend exclusivamente.
 * BROWSER_INVOCATION_PROHIBITED — CORS_NOT_AN_AUTHORIZATION_BOUNDARY.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * DECISIÓN DE OPTIONS:
 *   El patrón de EFs existentes en el repo (response.ts / optionsResponse) usa
 *   Access-Control-Allow-Origin: "*" (CORS wildcard). Este provider es
 *   backend-to-backend. CORS no es una frontera de autorización (§10 de la spec).
 *   OPTIONS → 405, Allow: POST. No se añade Access-Control-Allow-Origin.
 *
 * DECISIÓN DE REPLAY HTTP STATUS:
 *   HTTP 201 Created indica que un nuevo recurso fue creado.
 *   Un replay idempotente no crea un recurso; devuelve la respuesta estable original.
 *   Replay → HTTP 200 OK. Primera creación → HTTP 201 Created.
 *   El contrato (§5.2) indica HTTP 201 para primera creación. El status de replay
 *   no está cerrado en el contrato. Se registra aquí como decisión documentada.
 *
 * DECISIÓN DE BODY SUCCESS:
 *   ProviderSuccessResponse introduce un wrapper { ok: true, data: ... } que NO existe
 *   en el contrato provider wire format. El body de éxito es directamente
 *   CreateIncidentResultV1. ProviderSuccessResponse es un tipo auxiliar no wire.
 *   El handler devuelve el resultado del mapper sin wrapper adicional.
 *
 * DECISIÓN DE CONTENT-TYPE:
 *   Se usa comparación estricta del media type (primer segmento antes de ";", trimmed,
 *   case-insensitive) contra "application/json". Evita falsos positivos como
 *   "application/json-malicious", "text/plain; description=application/json",
 *   "multipart/form-data; name=application/json", "application/ld+json".
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Estado: INCIDENT_PROVIDER_HTTP_HANDLER_IMPLEMENTED_OFFLINE
 */

import type { ProviderErrorCode, CreateIncidentRequestV1 } from './types.ts';
import type { CreateIncidentHttpDependencies } from './http-types.ts';
import type { IncidentProviderLogEntry } from './logger-port.ts';
import type { IncidentCallerAuthResult, CreateIncidentDomainResult } from './port.ts';
import {
  buildProviderErrorResponse,
  getHttpStatus,
} from './errors.ts';
import { validateCreateIncidentRequest } from './validator.ts';
import { buildFirstCreationResponse, buildReplayResponse } from './response-mapper.ts';

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Límite máximo de body en bytes. §7 de la spec de SI-P3B2B1. */
const MAX_BODY_BYTES = 65_536;

/** Regex UUID v4-compatible para validación de IDs de trazabilidad. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Helpers internos ─────────────────────────────────────────────────────────

function isValidUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

/**
 * Genera un UUID de trazabilidad seguro.
 *
 * Flujo:
 *   1. Invoca generateTraceId().
 *   2. Si devuelve string con formato UUID válido → lo usa directamente.
 *   3. En cualquier otro caso (excepción, string no-UUID, vacío) →
 *      usa crypto.randomUUID() como fallback criptográfico.
 *
 * Garantías:
 *   - Nunca devuelve el UUID cero.
 *   - La excepción original no se propaga al caller ni aparece en logs.
 *   - Dos llamadas independientes producen valores distintos.
 */
function generateSafeTraceId(generateTraceId: () => string): string {
  try {
    const generated = generateTraceId();
    if (isValidUuid(generated)) {
      return generated;
    }
  } catch {
    // Fallback criptográfico — excepción no se propaga.
  }
  return crypto.randomUUID();
}

/**
 * Verifica que el media type del header Content-Type sea exactamente application/json.
 *
 * Algoritmo:
 *   1. null → rechaza.
 *   2. Separa por ";", toma el primer segmento.
 *   3. Aplica trim().
 *   4. Compara case-insensitively con "application/json".
 *
 * Acepta: "application/json", "Application/JSON", "application/json; charset=utf-8"
 * Rechaza: null, "", "text/plain", "application/json-malicious", "application/ld+json",
 *          "text/plain; description=application/json",
 *          "multipart/form-data; name=application/json", "application/*"
 */
function isJsonContentType(headerValue: string | null): boolean {
  if (headerValue === null) return false;
  const mediaType = headerValue.split(';')[0].trim().toLowerCase();
  return mediaType === 'application/json';
}

/**
 * Construye una Response de error en el formato ProviderErrorResponse.
 * No expone stack, SQL, tokens, payload ni PII.
 */
function buildErrResponse(
  code: ProviderErrorCode,
  requestId: string,
  correlationId: string,
  field?: string,
): Response {
  const body = buildProviderErrorResponse(code, requestId, correlationId, field);
  return new Response(JSON.stringify(body), {
    status: getHttpStatus(code),
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── Handler principal ────────────────────────────────────────────────────────

/**
 * Handler HTTP puro e inyectable para la creación de incidencias provider.
 *
 * @param request  - Objeto Request estándar (Web Fetch API). No modificado.
 * @param deps     - Dependencias inyectadas: auth, use case, clock, tracer, logger.
 * @returns        - Promise<Response> — respuesta HTTP completa.
 */
export async function createIncidentHttpHandler(
  request: Request,
  deps: CreateIncidentHttpDependencies,
): Promise<Response> {
  // ── Inicialización de trazabilidad ─────────────────────────────────────────
  // now() puede fallar; se usa Date.now() como fallback de reloj.
  let startMs = Date.now();
  try {
    startMs = deps.now().getTime();
  } catch {
    // now() falló — continuar con Date.now() como fallback.
  }

  // generateSafeTraceId valida el output y usa crypto.randomUUID() como fallback.
  // Dos llamadas independientes aseguran valores distintos para cada ID.
  // El fallo de generateTraceId nunca produce INTERNAL_ERROR; el handler continúa.
  let traceRequestId = generateSafeTraceId(deps.generateTraceId);
  let traceCorrelationId = generateSafeTraceId(deps.generateTraceId);

  // Slot de credencial: se establece tras auth exitosa. Metadata interna para logging.
  let traceCredentialSlot: 'current' | 'previous' | undefined;

  /**
   * Logging seguro: absorbe silenciosamente excepciones del logger.
   * El fallo del logger no altera la respuesta ni provoca un segundo intento.
   * No se usa console.log como compensación.
   */
  const safeLog = (entry: IncidentProviderLogEntry): void => {
    try {
      deps.logger.log(entry);
    } catch {
      // LOGGER_FAILURE_ABSORBED_SILENTLY — respuesta principal no se modifica.
    }
  };

  /**
   * Cierre de la request: registra log allowlisted y devuelve la respuesta.
   * Llamado exactamente una vez por request, en el punto de retorno final.
   */
  const doFinish = (
    resp: Response,
    resultCode: string,
    idempotentReplay?: boolean,
  ): Response => {
    let duration_ms = 0;
    try {
      duration_ms = Math.max(0, deps.now().getTime() - startMs);
    } catch {
      // now() falló en doFinish — duration_ms permanece 0.
    }
    const entry: IncidentProviderLogEntry = {
      request_id: traceRequestId,
      correlation_id: traceCorrelationId,
      result_code: resultCode,
      http_status: resp.status,
      duration_ms,
      idempotent_replay: idempotentReplay,
      credential_slot: traceCredentialSlot,
    };
    safeLog(entry);
    return resp;
  };

  // ── Wrapper global de excepciones inesperadas ──────────────────────────────
  // Captura cualquier excepción no controlada que escape los try-catch internos.
  // Producida INTERNAL_ERROR sin detalles internos.
  try {

    // ── Paso 1: Método HTTP ──────────────────────────────────────────────────
    // Solo POST. OPTIONS → 405 (backend-to-backend; ver decisión de OPTIONS arriba).
    if (request.method !== 'POST') {
      const body405 = {
        ok: false as const,
        error_code: 'VALIDATION_ERROR' as ProviderErrorCode,
        http_status: 405,
        retryable: false,
        message: 'Method not allowed; only POST is accepted',
        request_id: traceRequestId,
        correlation_id: traceCorrelationId,
      };
      return doFinish(
        new Response(JSON.stringify(body405), {
          status: 405,
          headers: { 'Content-Type': 'application/json', 'Allow': 'POST' },
        }),
        'VALIDATION_ERROR',
      );
    }

    // ── Paso 2: Content-Type ─────────────────────────────────────────────────
    // Media type extraído del primer segmento, trimmed, case-insensitive.
    // Rechaza falsos positivos como "application/json-malicious" o
    // "text/plain; description=application/json".
    if (!isJsonContentType(request.headers.get('Content-Type'))) {
      return doFinish(
        buildErrResponse('VALIDATION_ERROR', traceRequestId, traceCorrelationId),
        'VALIDATION_ERROR',
      );
    }

    // ── Paso 3: Content-Length preliminar ───────────────────────────────────
    // Rechazar antes de leer si Content-Length válido supera el límite.
    // No confiar exclusivamente en Content-Length (paso 4 mide bytes reales).
    const clHeader = request.headers.get('Content-Length');
    if (clHeader !== null) {
      const clNum = parseInt(clHeader, 10);
      if (!isNaN(clNum) && clNum > MAX_BODY_BYTES) {
        return doFinish(
          buildErrResponse('VALIDATION_ERROR', traceRequestId, traceCorrelationId),
          'VALIDATION_ERROR',
        );
      }
    }

    // ── Paso 4: Lectura y medición real del body ─────────────────────────────
    let bodyText: string;
    try {
      bodyText = await request.text();
    } catch {
      return doFinish(
        buildErrResponse('INTERNAL_ERROR', traceRequestId, traceCorrelationId),
        'INTERNAL_ERROR',
      );
    }

    // Medir bytes reales — no incluir el body en errores ni logs.
    // Detecta Content-Length falsamente pequeño con body real demasiado grande.
    const bodyBytes = new TextEncoder().encode(bodyText).length;
    if (bodyBytes > MAX_BODY_BYTES) {
      return doFinish(
        buildErrResponse('VALIDATION_ERROR', traceRequestId, traceCorrelationId),
        'VALIDATION_ERROR',
      );
    }

    // ── Paso 5: Parse JSON ───────────────────────────────────────────────────
    // Casos inválidos: vacío, truncado, JSON inválido, primitivo, array, null.
    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      return doFinish(
        buildErrResponse('VALIDATION_ERROR', traceRequestId, traceCorrelationId),
        'VALIDATION_ERROR',
      );
    }
    // JSON válido pero no objeto: null, array, string, number, boolean.
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return doFinish(
        buildErrResponse('VALIDATION_ERROR', traceRequestId, traceCorrelationId),
        'VALIDATION_ERROR',
      );
    }

    // ── Paso 6: Extracción segura de IDs de trazabilidad ────────────────────
    // Se usan solo si cumplen formato UUID válido; de lo contrario, fallback.
    // No sustituyen los IDs contractuales en requests válidas (paso 9).
    const parsedObj = parsed as Record<string, unknown>;
    if (isValidUuid(parsedObj['request_id'])) {
      traceRequestId = parsedObj['request_id'] as string;
    }
    if (isValidUuid(parsedObj['correlation_id'])) {
      traceCorrelationId = parsedObj['correlation_id'] as string;
    }

    // ── Paso 7: Autenticación y autorización (atómica) ──────────────────────
    // La operación es siempre "create_incident".
    // callerAuth.authenticateAndAuthorize garantiza que ok: true nunca se devuelve
    // sin haber verificado la operación (SI-P3B2A).
    let authResult: IncidentCallerAuthResult;
    try {
      authResult = await deps.callerAuth.authenticateAndAuthorize({
        authorizationHeader: request.headers.get('Authorization'),
        operation: 'create_incident',
      });
    } catch {
      // callerAuth lanzó excepción inesperada — INTERNAL_ERROR sin detalles.
      return doFinish(
        buildErrResponse('INTERNAL_ERROR', traceRequestId, traceCorrelationId),
        'INTERNAL_ERROR',
      );
    }

    // ── Paso 8: Mapping de resultado de auth ────────────────────────────────
    if (!authResult.ok) {
      const code = authResult.error_code;
      const authBody = buildProviderErrorResponse(code, traceRequestId, traceCorrelationId);
      const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      // WWW-Authenticate mínimo para 401, sin detalles sensibles.
      if (code === 'AUTHENTICATION_REQUIRED') {
        authHeaders['WWW-Authenticate'] = 'Bearer';
      }
      return doFinish(
        new Response(JSON.stringify(authBody), {
          status: getHttpStatus(code),
          headers: authHeaders,
        }),
        code,
      );
    }

    // Auth exitosa: capturar slot para logging interno.
    traceCredentialSlot = authResult.identity.credential_slot;

    // ── Paso 9: Validación del contrato provider v1.0 ────────────────────────
    // No se ejecuta antes de auth. No reimplementa el schema.
    // validateCreateIncidentRequest es una función pura; se protege con try-catch
    // ante regresiones inesperadas de la función.
    let validation: ReturnType<typeof validateCreateIncidentRequest>;
    try {
      validation = validateCreateIncidentRequest(parsed);
    } catch {
      return doFinish(
        buildErrResponse('INTERNAL_ERROR', traceRequestId, traceCorrelationId),
        'INTERNAL_ERROR',
      );
    }

    if (!validation.ok) {
      return doFinish(
        buildErrResponse(validation.error_code, traceRequestId, traceCorrelationId, validation.field),
        validation.error_code,
      );
    }
    const validBody: CreateIncidentRequestV1 = validation.data;

    // Desde aquí, los IDs contractuales son autoritativos (invocación actual).
    const reqId = validBody.request_id;
    const corrId = validBody.correlation_id;

    // ── Paso 10: Consistencia headers–body ───────────────────────────────────
    // El body es la fuente contractual canónica. Los headers son opcionales de compatibilidad.

    // Idempotency-Key: si presente, debe coincidir exactamente con body.idempotency_key.
    const idempKeyHeader = request.headers.get('Idempotency-Key');
    if (idempKeyHeader !== null && idempKeyHeader !== validBody.idempotency_key) {
      return doFinish(
        buildErrResponse('VALIDATION_ERROR', reqId, corrId),
        'VALIDATION_ERROR',
      );
    }

    // X-Correlation-Id: si presente, debe coincidir exactamente con body.correlation_id.
    const xCorrId = request.headers.get('X-Correlation-Id');
    if (xCorrId !== null && xCorrId !== validBody.correlation_id) {
      return doFinish(
        buildErrResponse('VALIDATION_ERROR', reqId, corrId),
        'VALIDATION_ERROR',
      );
    }

    // X-Source: si presente, debe ser exactamente "smart_conversations".
    // Nunca autentica. Un token válido no permite continuar con X-Source incorrecto.
    const xSrc = request.headers.get('X-Source');
    if (xSrc !== null && xSrc !== 'smart_conversations') {
      return doFinish(
        buildErrResponse('VALIDATION_ERROR', reqId, corrId),
        'VALIDATION_ERROR',
      );
    }

    // ── Paso 11: Invocación del use case ─────────────────────────────────────
    // Solo si todos los pasos anteriores pasan. Exactamente una invocación por request.
    let ucResult: CreateIncidentDomainResult;
    try {
      ucResult = await deps.useCase.execute(validBody);
    } catch {
      // useCase.execute lanzó excepción inesperada — INTERNAL_ERROR sin detalles.
      return doFinish(
        buildErrResponse('INTERNAL_ERROR', reqId, corrId),
        'INTERNAL_ERROR',
      );
    }

    // ── Paso 12: Mapping de resultado del use case ───────────────────────────
    if (!ucResult.ok) {
      const code = ucResult.error.error_code;
      return doFinish(buildErrResponse(code, reqId, corrId), code);
    }

    const ucData = ucResult.data;
    const isReplay = ucData.idempotent_replay;

    // ── Paso 13: Respuesta HTTP ───────────────────────────────────────────────
    // El body de éxito es directamente CreateIncidentResultV1 (contrato wire).
    // No se añade wrapper { ok, data }. Los mappers son la fuente autoritativa.
    // Primera creación → HTTP 201 Created.
    // Replay → HTTP 200 OK (ver decisión de replay documentada arriba).
    const successData = isReplay
      ? buildReplayResponse({
          request_id: reqId,
          correlation_id: corrId,
          original_incident_id: ucData.incident_id,
          original_incident_reference: ucData.incident_reference,
          original_created_at: ucData.created_at,
        })
      : buildFirstCreationResponse({
          request_id: reqId,
          correlation_id: corrId,
          incident_id: ucData.incident_id,
          incident_reference: ucData.incident_reference,
          created_at: ucData.created_at,
        });

    const httpStatus = isReplay ? 200 : 201;

    return doFinish(
      new Response(JSON.stringify(successData), {
        status: httpStatus,
        headers: { 'Content-Type': 'application/json' },
      }),
      'SUCCESS',
      isReplay,
    );

    // Paso 14 (logging) — ejecutado dentro de doFinish en el retorno de cada rama.

  } catch {
    // ── Excepción inesperada no controlada ────────────────────────────────────
    // No exponer stack, mensaje raw ni payload.
    // INTERNAL_ERROR. El log puede fallar (absorbido por safeLog).
    return doFinish(
      buildErrResponse('INTERNAL_ERROR', traceRequestId, traceCorrelationId),
      'INTERNAL_ERROR',
    );
  }
}
