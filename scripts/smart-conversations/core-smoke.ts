/**
 * core-smoke.ts — Runner de smoke tests Core sandbox/staging.
 *
 * MODO SEGURO POR DEFECTO:
 *   - No llama a Core real a menos que CORE_SMOKE_ENABLED=true.
 *   - No usa credenciales reales.
 *   - No imprime secrets, tokens, PII ni datos sensibles.
 *   - Producción bloqueada por defecto.
 *
 * Para ejecutar smoke real en sandbox:
 *   CORE_SMOKE_ENABLED=true \
 *   CORE_INTEGRATION_MODE=real \
 *   CORE_BASE_URL=https://core.sandbox.example.com \
 *   CORE_SERVICE_TOKEN=<token_sandbox> \
 *   CORE_SMOKE_CLIENT_ACCOUNT_ID=<tenant_prueba> \
 *   npx tsx scripts/smart-conversations/core-smoke.ts
 *
 * Fuente: SmartConversations Fase 10B.
 */

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

interface SmokeResult {
  operation:   string;
  status:      'pass' | 'fail' | 'skip' | 'dry_run';
  message:     string;
  // Nunca incluir token, phone, profile_id, contact, description, summary
}

interface SmokeConfig {
  enabled:             boolean;
  mode:                string;
  baseUrl:             string;
  hasToken:            boolean;
  clientAccountId:     string;
  profileId:           string | undefined;
  listingId:           string | undefined;
  allowProduction:     boolean;
}

// ---------------------------------------------------------------------------
// Patrones de URL de producción — el runner aborta si detecta producción
// ---------------------------------------------------------------------------

const PRODUCTION_URL_PATTERNS = [
  'smartroom.es',
  'smartroomrental.com',
  'smartroom.io',
  'api.smartroom',
  'core.smartroom',
];

// ---------------------------------------------------------------------------
// Lectura de configuración desde env
// ---------------------------------------------------------------------------

function readConfig(): SmokeConfig {
  const env = process.env;
  return {
    enabled:         env['CORE_SMOKE_ENABLED'] === 'true',
    mode:            env['CORE_INTEGRATION_MODE'] ?? 'mock',
    baseUrl:         env['CORE_BASE_URL'] ?? '',
    hasToken:        Boolean(env['CORE_SERVICE_TOKEN']),
    clientAccountId: env['CORE_SMOKE_CLIENT_ACCOUNT_ID'] ?? 'smoke_test_tenant',
    profileId:       env['CORE_SMOKE_PROFILE_ID'],
    listingId:       env['CORE_SMOKE_LISTING_ID'],
    allowProduction: env['CORE_SMOKE_ALLOW_PRODUCTION'] === 'true',
  };
}

// ---------------------------------------------------------------------------
// Validación de seguridad — nunca loguear token ni PII
// ---------------------------------------------------------------------------

function isProductionUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return PRODUCTION_URL_PATTERNS.some(p => lower.includes(p));
}

function validateConfig(cfg: SmokeConfig): string | null {
  if (!cfg.enabled) {
    return 'SMOKE_DISABLED';
  }
  if (!cfg.baseUrl) {
    return 'CORE_BASE_URL_MISSING';
  }
  if (cfg.mode !== 'real') {
    return 'CORE_INTEGRATION_MODE_NOT_REAL';
  }
  if (!cfg.hasToken) {
    return 'CORE_SERVICE_TOKEN_MISSING';
  }
  if (isProductionUrl(cfg.baseUrl) && !cfg.allowProduction) {
    return 'PRODUCTION_URL_BLOCKED';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Logger seguro — nunca imprime token, Authorization, PII
// ---------------------------------------------------------------------------

function safeLog(msg: string): void {
  // Verificar que el mensaje no contiene información sensible antes de imprimir
  const forbidden = [
    'Authorization',
    'Bearer ',
    'CORE_SERVICE_TOKEN',
  ];
  for (const f of forbidden) {
    if (msg.includes(f)) {
      console.log('[smoke] [REDACTED — log contenía campo sensible]');
      return;
    }
  }
  console.log(`[smoke] ${msg}`);
}

// ---------------------------------------------------------------------------
// Payload de prueba seguro — sin PII real
// Usa valores de env o genéricos de prueba
// ---------------------------------------------------------------------------

function buildTestPayloads(cfg: SmokeConfig) {
  return {
    identity: {
      client_account_id: cfg.clientAccountId,
      // phone y profile_id son opcionales — usar valores genéricos de test
      // NUNCA loguear estos campos
      ...(cfg.profileId ? { profile_id: cfg.profileId } : {}),
    },
    incident: {
      client_account_id: cfg.clientAccountId,
      conv_case_id:       'smoke_case_001',
      incident_type:      'other',
      urgency:            'low',
      description:        'smoke test — incidencia de prueba automatizada',
      source:             'webchat' as const,
    },
    listings: {
      client_account_id: cfg.clientAccountId,
      channel:           'webchat' as const,
      filters:           {},
    },
    lead: {
      client_account_id: cfg.clientAccountId,
      session_id:        'smoke_session_001',
      conv_case_id:      'smoke_case_001',
      listing_id:        cfg.listingId ?? 'smoke_listing_001',
      interest_type:     'request_info' as const,
      contact:           { name: 'Smoke Test Contact' }, // nunca loguear
      source:            'webchat' as const,
    },
    helpKb: {
      client_account_id: cfg.clientAccountId,
      channel:           'webchat' as const,
      question:          'pregunta de prueba automatizada smoke test',
    },
    helpTicket: {
      client_account_id: cfg.clientAccountId,
      session_id:        'smoke_session_001',
      conv_case_id:      'smoke_case_001',
      topic:             'general' as const,
      summary:           'smoke test — ticket de prueba automatizado',
      source:            'webchat' as const,
    },
  };
}

// ---------------------------------------------------------------------------
// Runner de cada operación
// ---------------------------------------------------------------------------

async function runOperation(
  name: string,
  fn:   () => Promise<unknown>,
): Promise<SmokeResult> {
  try {
    const data = await fn();
    safeLog(`✓ ${name} — ok`);
    return { operation: name, status: 'pass', message: 'ok' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'error desconocido';
    // No imprimir stack trace — puede contener info sensible
    safeLog(`✗ ${name} — ${msg}`);
    return { operation: name, status: 'fail', message: msg };
  }
}

// ---------------------------------------------------------------------------
// Dry-run — imprime lo que haría sin llamar fetch
// ---------------------------------------------------------------------------

function dryRunOperation(name: string, operation: string): SmokeResult {
  safeLog(`[dry-run] would call ${operation}`);
  return { operation: name, status: 'dry_run', message: `would call ${operation}` };
}

// ---------------------------------------------------------------------------
// Punto de entrada principal
// ---------------------------------------------------------------------------

export async function runCoreSmoke(): Promise<SmokeResult[]> {
  const cfg = readConfig();

  // Verificar guard principal
  const configError = validateConfig(cfg);

  if (configError === 'SMOKE_DISABLED') {
    safeLog('smoke disabled — set CORE_SMOKE_ENABLED=true to run');
    return [];
  }

  if (configError === 'PRODUCTION_URL_BLOCKED') {
    safeLog('ERROR: CORE_BASE_URL parece ser producción. Set CORE_SMOKE_ALLOW_PRODUCTION=true to override (only for authorized use).');
    return [{ operation: 'config', status: 'fail', message: 'PRODUCTION_URL_BLOCKED' }];
  }

  if (configError === 'CORE_INTEGRATION_MODE_NOT_REAL') {
    safeLog('ERROR: CORE_INTEGRATION_MODE debe ser "real" para smoke real. Usa CORE_INTEGRATION_MODE=real.');
    return [{ operation: 'config', status: 'fail', message: 'CORE_INTEGRATION_MODE_NOT_REAL' }];
  }

  if (configError === 'CORE_BASE_URL_MISSING') {
    safeLog('ERROR: CORE_BASE_URL no definida.');
    return [{ operation: 'config', status: 'fail', message: 'CORE_BASE_URL_MISSING' }];
  }

  if (configError === 'CORE_SERVICE_TOKEN_MISSING') {
    safeLog('ERROR: token de servicio no definido. Revisar configuración de entorno.');
    return [{ operation: 'config', status: 'fail', message: 'CORE_SERVICE_TOKEN_MISSING' }];
  }

  // Si llegamos aquí: config válida, sandbox confirmado
  safeLog(`modo=real | baseUrl=[REDACTED] | tenant=${cfg.clientAccountId}`);
  safeLog('iniciando smoke tests Core (6 operaciones)...');

  // Importar adapters dinámicamente para no crear instancias en import-time
  const { buildCoreIdentityClient }   = await import('../../supabase/functions/_shared/smart-conversations/runtime/core-identity-client.ts');
  const { buildCoreIncidentClient }   = await import('../../supabase/functions/_shared/smart-conversations/runtime/core-incident-client.ts');
  const { buildCoreListingsClient }   = await import('../../supabase/functions/_shared/smart-conversations/runtime/core-listings-client.ts');
  const { buildCoreLeadClient }       = await import('../../supabase/functions/_shared/smart-conversations/runtime/core-lead-client.ts');
  const { buildHelpKbClient }         = await import('../../supabase/functions/_shared/smart-conversations/runtime/help-kb-client.ts');
  const { buildCoreHelpTicketClient } = await import('../../supabase/functions/_shared/smart-conversations/runtime/core-help-ticket-client.ts');

  const payloads = buildTestPayloads(cfg);
  const results: SmokeResult[] = [];

  // --- 1. identity.validate ---
  results.push(await runOperation('identity.validate', async () => {
    const client = buildCoreIdentityClient('real');
    // Nunca loguear el resultado completo — puede contener profile_id
    const result = await client.validateIdentity(payloads.identity);
    const level = result.identity_level;
    safeLog(`  identity_level=${level}`);
    return { identity_level: level };
  }));

  // --- 2. incidents.create ---
  results.push(await runOperation('incidents.create', async () => {
    const client = buildCoreIncidentClient('real');
    const result = await client.createIncident(payloads.incident);
    safeLog(`  incident_id=${result.incident_id} ref=${result.incident_ref}`);
    return result;
  }));

  // --- 3. listings.query ---
  results.push(await runOperation('listings.query', async () => {
    const client = buildCoreListingsClient('real');
    const result = await client.queryListings(payloads.listings);
    safeLog(`  listings_count=${result.listings.length}`);
    return { listings_count: result.listings.length };
  }));

  // --- 4. leads.create ---
  results.push(await runOperation('leads.create', async () => {
    const client = buildCoreLeadClient('real');
    const result = await client.createLead(payloads.lead);
    // No loguear contact — puede contener phone/email
    safeLog(`  lead_id=${result.lead_id} ref=${result.lead_ref}`);
    return result;
  }));

  // --- 5. help.kb.query ---
  results.push(await runOperation('help.kb.query', async () => {
    const client = buildHelpKbClient('real');
    const result = await client.queryKb(payloads.helpKb);
    safeLog(`  kb_matches=${result.matches.length}`);
    return { matches_count: result.matches.length };
  }));

  // --- 6. help.tickets.create ---
  results.push(await runOperation('help.tickets.create', async () => {
    const client = buildCoreHelpTicketClient('real');
    const result = await client.createHelpTicket(payloads.helpTicket);
    // No loguear summary
    safeLog(`  help_ticket_id=${result.help_ticket_id} ref=${result.help_ticket_ref}`);
    return result;
  }));

  // Resumen final
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  safeLog(`--- resultado: ${passed}/${results.length} passed, ${failed} failed ---`);

  return results;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

// Ejecutar solo si se llama directamente (no en import/require)
if (
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].endsWith('core-smoke.ts')
) {
  runCoreSmoke()
    .then(results => {
      const failed = results.filter(r => r.status === 'fail').length;
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch(() => {
      // No loguear error completo — puede contener info sensible
      console.log('[smoke] error inesperado en runner');
      process.exit(1);
    });
}
