/**
 * cors-policy.ts — CORS seguro por origen y widget para SmartConversations.
 *
 * Distingue entre endpoints browser (WebChat) y non-browser (webhooks, internos).
 * Para endpoints browser: allowlist exacta por widget/tenant; nunca wildcard.
 * Para endpoints non-browser: sin CORS público.
 *
 * Reglas:
 *  - No reflejar cualquier Origin (solo si está en allowlist)
 *  - No usar `*` para endpoints con contenido de tenant
 *  - Vary: Origin siempre presente cuando se evalúa
 *  - OPTIONS responde con headers exactos (preflight)
 *  - Origin no autorizado → respuesta opaca (sin Access-Control-Allow-Origin)
 *  - localhost solo permitido en modo local/test
 *  - Widget A no puede ser usado desde dominio de Tenant B
 *
 * Fuente: cors-audit.md §CORS objetivo, rules-80.
 */

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface CorsConfig {
  /** Orígenes explícitamente permitidos para este widget/tenant */
  allowedOrigins: string[];
  /** Métodos permitidos (default: POST, OPTIONS) */
  methods?: string;
  /** Headers que el cliente puede enviar (mínimos necesarios) */
  allowHeaders?: string;
}

export interface CorsResult {
  /** Headers a incluir en la respuesta */
  headers: Record<string, string>;
  /** true si el origen está autorizado */
  allowed: boolean;
  /** El origen efectivo (o vacío si no autorizado) */
  origin: string;
}

// ── Constantes ─────────────────────────────────────────────────────────────

/** Headers mínimos que necesita el widget WebChat */
const BROWSER_ALLOW_HEADERS = 'authorization, content-type';

/** Métodos mínimos para endpoints WebChat */
const BROWSER_ALLOW_METHODS = 'POST, OPTIONS';

/**
 * Orígenes permitidos en entorno local/test (nunca en producción).
 * Se añaden automáticamente cuando WEBCHAT_ENV no es un entorno real.
 */
const LOCAL_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

// ── Helper de entorno ──────────────────────────────────────────────────────

function _isPermissiveEnv(): boolean {
  if (typeof Deno === 'undefined') return true; // tests Node.js
  const mode = Deno.env.get('WEBCHAT_INTEGRATION_MODE') ?? 'local';
  return mode === 'local' || mode === 'test' || mode === 'ci';
}

// ── Core ───────────────────────────────────────────────────────────────────

/**
 * Construye headers CORS dinámicos para endpoints browser WebChat.
 *
 * Solo refleja el Origin si está en la allowlist del widget.
 * Siempre incluye Vary: Origin.
 * En entorno permisivo añade orígenes localhost a la allowlist.
 */
export function buildBrowserCorsHeaders(
  req: Request,
  config: CorsConfig,
): CorsResult {
  const requestOrigin = req.headers.get('origin') ?? req.headers.get('Origin') ?? '';

  const effectiveAllowed = _isPermissiveEnv()
    ? [...config.allowedOrigins, ...LOCAL_ALLOWED_ORIGINS]
    : config.allowedOrigins;

  const isAllowed = requestOrigin !== '' && effectiveAllowed.includes(requestOrigin);

  const headers: Record<string, string> = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': config.methods ?? BROWSER_ALLOW_METHODS,
    'Access-Control-Allow-Headers': config.allowHeaders ?? BROWSER_ALLOW_HEADERS,
  };

  if (isAllowed) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
  }
  // Si no está permitido: no incluir Access-Control-Allow-Origin (respuesta opaca)

  return { headers, allowed: isAllowed, origin: isAllowed ? requestOrigin : '' };
}

/**
 * Response 200 para preflight OPTIONS con CORS dinámico.
 * Solo incluye ACAO si el origen está permitido.
 */
export function buildPreflightResponse(
  req: Request,
  config: CorsConfig,
): Response {
  const { headers } = buildBrowserCorsHeaders(req, config);
  return new Response(null, { status: 204, headers });
}

/**
 * Devuelve headers CORS para endpoints non-browser (webhooks, internos, workers).
 * Estos endpoints no necesitan CORS browser — retorna objeto vacío.
 * Si la request tiene Origin header de un browser, se ignora (intencional).
 */
export function buildNonBrowserCorsHeaders(): Record<string, string> {
  return {};
}

/**
 * Valida que un Origin string es seguro para incluir en una allowlist.
 * - Debe empezar por https:// (o http:// en local)
 * - No debe contener caracteres especiales peligrosos
 * - No debe ser `*`
 */
export function isValidOriginForAllowlist(origin: string): boolean {
  if (!origin || origin === '*') return false;
  if (origin.includes('\n') || origin.includes('\r') || origin.includes('\0')) return false;
  return origin.startsWith('https://') || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
}

/**
 * Añade headers CORS a un Response existente (inmutable → crea nuevo Response).
 */
export function addCorsToResponse(response: Response, corsHeaders: Record<string, string>): Response {
  const newHeaders = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders)) {
    newHeaders.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
