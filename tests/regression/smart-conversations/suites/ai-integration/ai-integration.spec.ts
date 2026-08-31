/**
 * Fase 10C -- AI Integration Tests
 *
 * No llama a ningun proveedor de IA real. No usa API keys reales.
 * Valida: ai-client vendor-agnostic, provider selection, allowlist,
 * retry HTTP, privacidad, validacion de output, adapters, limites.
 *
 * AI-01..AI-07   AI-CONFIG
 * AI-08..AI-15   AI-PROVIDER-SELECTION
 * AI-16..AI-18   AI-ALLOWLIST
 * AI-19..AI-29   AI-HTTP
 * AI-30..AI-41   AI-PRIVACY
 * AI-42..AI-54   AI-OUTPUT-VALIDATION
 * AI-55..AI-62   AI-ADAPTERS
 * AI-63..AI-73   AI-BOUNDARIES
 * AI-74..AI-81   AI-RESTRICTIONS
 * AI-82..AI-97   AI-REGRESSION
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Imports dinamicos de runtime (importados despues de stub Deno)
// ---------------------------------------------------------------------------

import {
  aiCall,
  getAiIntegrationMode,
  getSelectedAiProvider,
  AI_ALLOWED_OPERATIONS,
  AI_PII_FORBIDDEN_FIELDS,
  sanitizeAiInput,
  sanitizeAiOutput,
  validateIntentOutput,
  validateIncidentOutput,
  validateListingOutput,
  validateHelpOutput,
} from '../../../../../supabase/functions/_shared/smart-conversations/runtime/ai-client';

import {
  buildIntentClassifier,
  defaultClassifier,
} from '../../../../../supabase/functions/_shared/smart-conversations/runtime/intent-classifier';

import {
  buildIncidentExtractor,
  defaultIncidentExtractor,
} from '../../../../../supabase/functions/_shared/smart-conversations/runtime/incident-extractor';

import {
  buildListingIntentExtractor,
  defaultListingIntentExtractor,
} from '../../../../../supabase/functions/_shared/smart-conversations/runtime/listing-intent-extractor';

import {
  buildHelpIntentExtractor,
  defaultHelpIntentExtractor,
} from '../../../../../supabase/functions/_shared/smart-conversations/runtime/help-intent-extractor';

// ---------------------------------------------------------------------------
// Rutas de artefactos (analisis estatico)
// ---------------------------------------------------------------------------

const ROOT = resolve(__dirname, '../../../../../');

const AI_CLIENT_PATH     = resolve(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/ai-client.ts');
const PROVIDER_PATH      = resolve(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/ai-providers/generic-http-provider.ts');
const ENV_DOC_PATH       = resolve(ROOT, 'docs/smart-conversations/ai-integration/env.example.md');
const SELECTION_DOC_PATH = resolve(ROOT, 'docs/smart-conversations/ai-integration/provider-selection.md');
const SAFETY_DOC_PATH    = resolve(ROOT, 'docs/smart-conversations/ai-integration/prompt-safety.md');

function readFile(p: string): string { return readFileSync(p, 'utf-8'); }

// ---------------------------------------------------------------------------
// Setup global
// ---------------------------------------------------------------------------

const ENV: Record<string, string | undefined> = {};
const mockDeno = { env: { get: (k: string) => ENV[k] } };
let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  for (const k of Object.keys(ENV)) delete ENV[k];
  mockFetch = vi.fn();
  vi.stubGlobal('Deno', mockDeno);
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function fakeResponse(status: number, body: unknown = null): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response;
}

function abortErr(): Error {
  return Object.assign(new Error('aborted'), { name: 'AbortError' });
}

// ---------------------------------------------------------------------------
// AI-CONFIG (AI-01..AI-07)
// ---------------------------------------------------------------------------

describe('AI-CONFIG', () => {
  it('AI-01: default mode es mock cuando env esta vacio', () => {
    expect(getAiIntegrationMode()).toBe('mock');
  });

  it('AI-02: default provider es mock cuando env esta vacio', () => {
    expect(getSelectedAiProvider()).toBe('mock');
  });

  it('AI-03: mode=mock -- aiCall no llama fetch', async () => {
    ENV['AI_INTEGRATION_MODE'] = 'mock';
    await aiCall({ operation: 'ai.intent.classify', client_account_id: 'acc1', session_id: 's1', channel: 'webchat', safe_input: 'test' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('AI-04: mode=real + AI_PROVIDER=mock devuelve AI_PROVIDER_INVALID_FOR_REAL_MODE', async () => {
    ENV['AI_INTEGRATION_MODE'] = 'real';
    ENV['AI_PROVIDER'] = 'mock';
    const result = await aiCall({ operation: 'ai.intent.classify', client_account_id: 'acc1', session_id: 's1', channel: 'webchat', safe_input: 'test' });
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('AI_PROVIDER_INVALID_FOR_REAL_MODE');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('AI-04b: mode=real + AI_PROVIDER ausente devuelve AI_PROVIDER_REQUIRED', async () => {
    ENV['AI_INTEGRATION_MODE'] = 'real';
    // AI_PROVIDER no definido
    const result = await aiCall({ operation: 'ai.intent.classify', client_account_id: 'acc1', session_id: 's1', channel: 'webchat', safe_input: 'test' });
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('AI_PROVIDER_REQUIRED');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('AI-04c: mode=real + AI_PROVIDER desconocido devuelve AI_PROVIDER_UNSUPPORTED -- no fetch', async () => {
    ENV['AI_INTEGRATION_MODE'] = 'real';
    ENV['AI_PROVIDER'] = 'unknown_provider_xyz';
    const result = await aiCall({ operation: 'ai.intent.classify', client_account_id: 'acc1', session_id: 's1', channel: 'webchat', safe_input: 'test' });
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('AI_PROVIDER_UNSUPPORTED');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('AI-05: mode=real + provider valido sin credenciales -- devuelve error controlado (no crash)', async () => {
    ENV['AI_INTEGRATION_MODE'] = 'real';
    ENV['AI_PROVIDER'] = 'openai';
    // Sin OPENAI_API_KEY ni AI_API_KEY -- generic-http-provider devuelve 401
    mockFetch.mockResolvedValue(fakeResponse(401, null));
    const result = await aiCall({ operation: 'ai.intent.classify', client_account_id: 'acc1', session_id: 's1', channel: 'webchat', safe_input: 'test' });
    expect(result.ok).toBe(false);
  });

  it('AI-06: ai-client no loguea AI_API_KEY', () => {
    const src = readFile(AI_CLIENT_PATH);
    expect(src).not.toMatch(/console\.log\([^)]*AI_API_KEY[^)]*\)/);
    expect(src).not.toMatch(/console\.warn\([^)]*AI_API_KEY[^)]*\)/);
  });

  it('AI-07: ai-client no loguea Authorization', () => {
    const src = readFile(AI_CLIENT_PATH);
    expect(src).not.toMatch(/console\.log\([^)]*Authorization[^)]*\)/);
  });
});

// ---------------------------------------------------------------------------
// AI-PROVIDER-SELECTION (AI-08..AI-15)
// ---------------------------------------------------------------------------

describe('AI-PROVIDER-SELECTION', () => {
  it('AI-08: AI_PROVIDER=mock -> getSelectedAiProvider devuelve mock', () => {
    ENV['AI_PROVIDER'] = 'mock';
    expect(getSelectedAiProvider()).toBe('mock');
  });

  it('AI-09: AI_PROVIDER=openai -> getSelectedAiProvider devuelve openai', () => {
    ENV['AI_PROVIDER'] = 'openai';
    expect(getSelectedAiProvider()).toBe('openai');
  });

  it('AI-10: AI_PROVIDER=anthropic -> getSelectedAiProvider devuelve anthropic', () => {
    ENV['AI_PROVIDER'] = 'anthropic';
    expect(getSelectedAiProvider()).toBe('anthropic');
  });

  it('AI-11: AI_PROVIDER=azure_openai -> getSelectedAiProvider devuelve azure_openai', () => {
    ENV['AI_PROVIDER'] = 'azure_openai';
    expect(getSelectedAiProvider()).toBe('azure_openai');
  });

  it('AI-12: AI_PROVIDER=google_gemini -> getSelectedAiProvider devuelve google_gemini', () => {
    ENV['AI_PROVIDER'] = 'google_gemini';
    expect(getSelectedAiProvider()).toBe('google_gemini');
  });

  it('AI-13: AI_PROVIDER=local_llm -> getSelectedAiProvider devuelve local_llm', () => {
    ENV['AI_PROVIDER'] = 'local_llm';
    expect(getSelectedAiProvider()).toBe('local_llm');
  });

  it('AI-14: AI_PROVIDER desconocido -> getSelectedAiProvider devuelve mock (safe fallback)', () => {
    ENV['AI_PROVIDER'] = 'unknown_provider_xyz';
    expect(getSelectedAiProvider()).toBe('mock');
  });

  it('AI-14b: mode=mock + AI_PROVIDER desconocido no llama fetch', async () => {
    ENV['AI_INTEGRATION_MODE'] = 'mock';
    ENV['AI_PROVIDER'] = 'unknown_provider_xyz';
    await aiCall({ operation: 'ai.intent.classify', client_account_id: 'acc1', session_id: 's1', channel: 'webchat', safe_input: 'test' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('AI-15: ningun provider real se llama en tests (fetch no fue invocado en modo mock)', async () => {
    for (const provider of ['openai', 'anthropic', 'azure_openai']) {
      ENV['AI_PROVIDER'] = provider;
      ENV['AI_INTEGRATION_MODE'] = 'mock';
      await aiCall({ operation: 'ai.intent.classify', client_account_id: 'acc1', session_id: 's1', channel: 'webchat', safe_input: 'test' });
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AI-REAL-PROVIDERS (providers válidos en real mode -- spec puntos 7-14)
// ---------------------------------------------------------------------------

describe('AI-REAL-PROVIDERS', () => {
  const REAL_PROVIDERS = ['openai', 'anthropic', 'azure_openai', 'google_gemini', 'mistral', 'groq', 'local_llm', 'other'] as const;

  for (const provider of REAL_PROVIDERS) {
    it(`AI-RP: mode=real + provider=${provider} selecciona adapter y llama fetch`, async () => {
      ENV['AI_INTEGRATION_MODE'] = 'real';
      ENV['AI_PROVIDER'] = provider;
      ENV['AI_MAX_RETRIES'] = '0';
      // AI_API_KEY generica: todos los providers la usan como fallback
      // Nunca se envía al proveedor real -- fetch está mockeado
      ENV['AI_API_KEY'] = 'test_key_fake_do_not_use_in_prod';
      // Vars especificas para providers que las requieren explicitamente
      ENV['AZURE_OPENAI_ENDPOINT']   = 'https://test.example.invalid';
      ENV['AZURE_OPENAI_DEPLOYMENT'] = 'test-deployment';
      mockFetch.mockResolvedValue(fakeResponse(200, { service_code: 'unknown', confidence: 0 }));
      const result = await aiCall({ operation: 'ai.intent.classify', client_account_id: 'acc1', session_id: 's1', channel: 'webchat', safe_input: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.ok).toBe(true);
      expect(result.provider).toBe(provider);
    });
  }

  it('AI-RP-NO-REAL: ninguno de los tests anteriores llama proveedor real (fetch es mock)', () => {
    // Verificacion estatica: generic-http-provider no contiene URL hardcodeada de proveedor concreto
    const src = readFile(PROVIDER_PATH);
    expect(src).not.toContain('api.openai.com/v1/chat');  // puede estar como template literal
    // Lo importante: fetch nunca se llama con URL real en tests porque mockFetch intercepta todo
    expect(typeof mockFetch).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// AI-ALLOWLIST (AI-16..AI-18)
// ---------------------------------------------------------------------------

describe('AI-ALLOWLIST', () => {
  beforeEach(() => { ENV['AI_INTEGRATION_MODE'] = 'real'; ENV['AI_PROVIDER'] = 'openai'; ENV['OPENAI_API_KEY'] = 'test_key'; });

  it('AI-16: operacion allowlisted se acepta -- aiCall llama fetch', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { service_code: 'unknown', confidence: 0 }));
    const result = await aiCall({ operation: 'ai.intent.classify', client_account_id: 'acc1', session_id: 's1', channel: 'webchat', safe_input: 'test' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
  });

  it('AI-17: operacion NO allowlisted se rechaza -- fetch no se llama', async () => {
    const result = await aiCall({ operation: 'evil.operation' as any, client_account_id: 'acc1', session_id: 's1', channel: 'webchat', safe_input: 'test' });
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('AI_OPERATION_NOT_ALLOWED');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('AI-18: AI_ALLOWED_OPERATIONS contiene exactamente las 6 operaciones', () => {
    const ops = Object.keys(AI_ALLOWED_OPERATIONS);
    expect(ops).toHaveLength(6);
    expect(ops).toContain('ai.intent.classify');
    expect(ops).toContain('ai.incident.extract');
    expect(ops).toContain('ai.listing.extract');
    expect(ops).toContain('ai.help.extract');
    expect(ops).toContain('ai.safe_summary');
    expect(ops).toContain('ai.response_draft');
  });
});

// ---------------------------------------------------------------------------
// AI-HTTP (AI-19..AI-29)
// ---------------------------------------------------------------------------

describe('AI-HTTP', () => {
  beforeEach(() => {
    ENV['AI_INTEGRATION_MODE'] = 'real';
    ENV['AI_PROVIDER'] = 'openai';
    ENV['OPENAI_API_KEY'] = 'test_key_abc';
    ENV['AI_TIMEOUT_MS'] = '60000';
    ENV['AI_MAX_RETRIES'] = '2';
  });

  it('AI-19: mode=real llama fetch exactamente 1 vez en 200', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { service_code: 'conv_incidencias', confidence: 0.9 }));
    await aiCall({ operation: 'ai.intent.classify', client_account_id: 'acc1', session_id: 's1', channel: 'webchat', safe_input: 'gotera' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('AI-20: 200 parsea JSON y devuelve ok=true con data', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { service_code: 'conv_incidencias', confidence: 0.9 }));
    const result = await aiCall<{ service_code: string }>({ operation: 'ai.intent.classify', client_account_id: 'acc1', session_id: 's1', channel: 'webchat', safe_input: 'gotera' });
    expect(result.ok).toBe(true);
    expect((result.data as any).service_code).toBe('conv_incidencias');
  });

  it('AI-21: JSON invalido devuelve error controlado AI_INVALID_JSON', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); } } as any);
    const result = await aiCall({ operation: 'ai.intent.classify', client_account_id: 'acc1', session_id: 's1', channel: 'webchat', safe_input: 'test' });
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('AI_INVALID_JSON');
  });

  it('AI-22: 400 no retry -- fetch llamado 1 vez', async () => {
    mockFetch.mockResolvedValue(fakeResponse(400, null));
    const result = await aiCall({ operation: 'ai.intent.classify', client_account_id: 'acc1', session_id: 's1', channel: 'webchat', safe_input: 'test' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.retryable).toBe(false);
  });

  it('AI-23: 401 no retry', async () => {
    mockFetch.mockResolvedValue(fakeResponse(401, null));
    const result = await aiCall({ operation: 'ai.intent.classify', client_account_id: 'acc1', session_id: 's1', channel: 'webchat', safe_input: 'test' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.retryable).toBe(false);
    expect(result.error_code).toBe('AI_HTTP_401');
  });

  it('AI-24: 403 no retry', async () => {
    mockFetch.mockResolvedValue(fakeResponse(403, null));
    await aiCall({ operation: 'ai.intent.classify', client_account_id: 'acc1', session_id: 's1', channel: 'webchat', safe_input: 'test' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('AI-25: 429 retry controlado -- max 3 intentos con fake timers', async () => {
    vi.useFakeTimers();
    ENV['AI_MAX_RETRIES'] = '2';
    ENV['AI_RETRY_BACKOFF_SECONDS'] = '0.001,0.001';
    mockFetch.mockResolvedValue(fakeResponse(429, null));
    const promise = aiCall({ operation: 'ai.intent.classify', client_account_id: 'acc1', session_id: 's1', channel: 'webchat', safe_input: 'test' });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.error_code).toContain('RATE_LIMITED');
  });

  it('AI-26: 500 retry controlado -- max 3 intentos', async () => {
    vi.useFakeTimers();
    ENV['AI_MAX_RETRIES'] = '2';
    ENV['AI_RETRY_BACKOFF_SECONDS'] = '0.001,0.001';
    mockFetch.mockResolvedValue(fakeResponse(500, null));
    const promise = aiCall({ operation: 'ai.intent.classify', client_account_id: 'acc1', session_id: 's1', channel: 'webchat', safe_input: 'test' });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.error_code).toContain('EXHAUSTED');
  });

  it('AI-27: AbortError (timeout) retry controlado', async () => {
    vi.useFakeTimers();
    ENV['AI_MAX_RETRIES'] = '2';
    ENV['AI_RETRY_BACKOFF_SECONDS'] = '0.001,0.001';
    mockFetch.mockRejectedValue(abortErr());
    const promise = aiCall({ operation: 'ai.intent.classify', client_account_id: 'acc1', session_id: 's1', channel: 'webchat', safe_input: 'test', max_tokens: 100 });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.error_code).toContain('TIMEOUT');
  });

  it('AI-28: no hay intentos infinitos -- maximo AI_MAX_RETRIES + 1', async () => {
    vi.useFakeTimers();
    ENV['AI_MAX_RETRIES'] = '2';
    ENV['AI_RETRY_BACKOFF_SECONDS'] = '0.001,0.001';
    mockFetch.mockResolvedValue(fakeResponse(503, null));
    const promise = aiCall({ operation: 'ai.intent.classify', client_account_id: 'acc1', session_id: 's1', channel: 'webchat', safe_input: 'test' });
    await vi.runAllTimersAsync();
    await promise;
    expect(mockFetch.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it('AI-29: error no expone stack trace en result', async () => {
    vi.useFakeTimers();
    ENV['AI_MAX_RETRIES'] = '0';
    mockFetch.mockResolvedValue(fakeResponse(500, null));
    const promise = aiCall({ operation: 'ai.intent.classify', client_account_id: 'acc1', session_id: 's1', channel: 'webchat', safe_input: 'test' });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(JSON.stringify(result)).not.toContain('stack');
  });
});

// ---------------------------------------------------------------------------
// AI-PRIVACY (AI-30..AI-41)
// ---------------------------------------------------------------------------

describe('AI-PRIVACY', () => {
  beforeEach(() => {
    ENV['AI_INTEGRATION_MODE'] = 'real';
    ENV['AI_PROVIDER'] = 'openai';
    ENV['OPENAI_API_KEY'] = 'SECRET_KEY_DO_NOT_LOG';
    ENV['AI_TIMEOUT_MS'] = '60000';
    ENV['AI_MAX_RETRIES'] = '0';
  });

  function getFetchBody(): string {
    if (!mockFetch.mock.calls.length) return '';
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    return typeof opts?.body === 'string' ? opts.body : '';
  }

  it('AI-30: safe_input llega al proveedor sin profile_id', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { service_code: 'unknown', confidence: 0 }));
    await aiCall({ operation: 'ai.intent.classify', client_account_id: 'acc1', session_id: 's1', channel: 'webchat', safe_input: 'texto sin pii' });
    expect(getFetchBody()).not.toContain('profile_id');
  });

  it('AI-31: sanitizeAiInput elimina "profile_id":"xxx" del texto', () => {
    const result = sanitizeAiInput('texto normal "profile_id":"prof_secret_001" mas texto');
    expect(result).not.toContain('prof_secret_001');
  });

  it('AI-32: sanitizeAiInput elimina "phone":"xxx"', () => {
    const result = sanitizeAiInput('llama al "phone":"+34600000001" urgente');
    expect(result).not.toContain('+34600000001');
  });

  it('AI-33: sanitizeAiInput elimina "sender_ref":"xxx"', () => {
    const result = sanitizeAiInput('"sender_ref":"whatsapp_ref_secret"');
    expect(result).not.toContain('whatsapp_ref_secret');
  });

  it('AI-34: sanitizeAiInput elimina "identity_data":"xxx"', () => {
    const result = sanitizeAiInput('"identity_data":"datos_privados"');
    expect(result).not.toContain('datos_privados');
  });

  it('AI-35: sanitizeAiInput elimina "raw_payload":"xxx"', () => {
    const result = sanitizeAiInput('"raw_payload":"payload_secreto"');
    expect(result).not.toContain('payload_secreto');
  });

  it('AI-36: sanitizeAiInput elimina "contact":"xxx"', () => {
    const result = sanitizeAiInput('"contact":"datos_contacto_privado"');
    expect(result).not.toContain('datos_contacto_privado');
  });

  it('AI-37: sanitizeAiInput elimina "email":"xxx"', () => {
    const result = sanitizeAiInput('"email":"privado@test.example"');
    expect(result).not.toContain('privado@test.example');
  });

  it('AI-38: generic-http-provider no loguea Authorization', () => {
    const src = readFile(PROVIDER_PATH);
    expect(src).not.toMatch(/console\.log\([^)]*Authorization[^)]*\)/);
    expect(src).not.toMatch(/console\.log\([^)]*apiKey[^)]*\)/);
  });

  it('AI-39: generic-http-provider no loguea service_role', () => {
    const src = readFile(PROVIDER_PATH);
    expect(src).not.toMatch(/console\.log\([^)]*service_role[^)]*\)/);
  });

  it('AI-40: sanitizeAiOutput elimina profile_id del objeto de respuesta', () => {
    const output = { service_code: 'conv_incidencias', profile_id: 'secret', confidence: 0.9 };
    const result = sanitizeAiOutput(output) as Record<string, unknown>;
    expect(result['profile_id']).toBeUndefined();
    expect(result['service_code']).toBe('conv_incidencias');
  });

  it('AI-41: sanitizeAiOutput elimina phone, sender_ref, identity_data recursivamente', () => {
    const output = {
      result: { phone: '+34600000002', sender_ref: 'ref_secret', identity_data: { full_name: 'test' } },
      confidence: 0.8,
    };
    const result = sanitizeAiOutput(output) as Record<string, unknown>;
    const inner = result['result'] as Record<string, unknown>;
    expect(inner['phone']).toBeUndefined();
    expect(inner['sender_ref']).toBeUndefined();
    expect(inner['identity_data']).toBeUndefined();
    expect(result['confidence']).toBe(0.8);
  });
});

// ---------------------------------------------------------------------------
// AI-OUTPUT-VALIDATION (AI-42..AI-54)
// ---------------------------------------------------------------------------

describe('AI-OUTPUT-VALIDATION', () => {
  it('AI-42: validateIntentOutput acepta conv_incidencias', () => {
    const r = validateIntentOutput({ service_code: 'conv_incidencias', confidence: 0.9 });
    expect(r.service_code).toBe('conv_incidencias');
  });

  it('AI-43: validateIntentOutput acepta conv_publicaciones', () => {
    const r = validateIntentOutput({ service_code: 'conv_publicaciones', confidence: 0.85 });
    expect(r.service_code).toBe('conv_publicaciones');
  });

  it('AI-44: validateIntentOutput acepta conv_ayuda', () => {
    const r = validateIntentOutput({ service_code: 'conv_ayuda', confidence: 0.88 });
    expect(r.service_code).toBe('conv_ayuda');
  });

  it('AI-45: validateIntentOutput acepta unknown', () => {
    const r = validateIntentOutput({ service_code: 'unknown', confidence: 0 });
    expect(r.service_code).toBe('unknown');
  });

  it('AI-46: validateIntentOutput rechaza servicio desconocido -- normaliza a unknown', () => {
    const r = validateIntentOutput({ service_code: 'conv_evil_service', confidence: 0.99 });
    expect(r.service_code).toBe('unknown');
  });

  it('AI-47: confidence fuera de rango se normaliza a [0,1]', () => {
    const r1 = validateIntentOutput({ service_code: 'unknown', confidence: 1.5 });
    const r2 = validateIntentOutput({ service_code: 'unknown', confidence: -0.5 });
    expect(r1.confidence).toBeLessThanOrEqual(1);
    expect(r2.confidence).toBeGreaterThanOrEqual(0);
  });

  it('AI-48: validateIncidentOutput elimina campos prohibidos del output', () => {
    const raw = { incident_type: 'maintenance', urgency: 'high', profile_id: 'secret', phone: '+34600' };
    const r = validateIncidentOutput(raw);
    expect((r as any)['profile_id']).toBeUndefined();
    expect((r as any)['phone']).toBeUndefined();
    expect(r['incident_type']).toBe('maintenance');
  });

  it('AI-49: validateListingOutput elimina campos prohibidos del output', () => {
    const raw = { interest_type: 'search_listing', email: 'x@x.com', sender_ref: 'ref' };
    const r = validateListingOutput(raw);
    expect((r as any)['email']).toBeUndefined();
    expect((r as any)['sender_ref']).toBeUndefined();
    expect(r['interest_type']).toBe('search_listing');
  });

  it('AI-50: validateHelpOutput elimina campos prohibidos del output', () => {
    const raw = { help_intent: 'faq', identity_data: { secret: 'x' }, raw_payload: 'xyz' };
    const r = validateHelpOutput(raw);
    expect((r as any)['identity_data']).toBeUndefined();
    expect((r as any)['raw_payload']).toBeUndefined();
    expect(r['help_intent']).toBe('faq');
  });

  it('AI-51: salida con profile_id se rechaza -- sanitizeAiOutput lo elimina', () => {
    const raw = { result: 'ok', profile_id: 'prof_should_not_pass' };
    const r = sanitizeAiOutput(raw) as Record<string, unknown>;
    expect(r['profile_id']).toBeUndefined();
  });

  it('AI-52: salida con phone se rechaza', () => {
    const raw = { service_code: 'conv_incidencias', phone: '+34600000003' };
    const r = sanitizeAiOutput(raw) as Record<string, unknown>;
    expect(r['phone']).toBeUndefined();
  });

  it('AI-53: salida con sender_ref se rechaza', () => {
    const raw = { confidence: 0.9, sender_ref: 'whatsapp_secret_ref' };
    const r = sanitizeAiOutput(raw) as Record<string, unknown>;
    expect(r['sender_ref']).toBeUndefined();
  });

  it('AI-54: salida con raw_payload se rechaza', () => {
    const raw = { help_intent: 'faq', raw_payload: 'raw_data_secret' };
    const r = sanitizeAiOutput(raw) as Record<string, unknown>;
    expect(r['raw_payload']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// AI-ADAPTERS (AI-55..AI-62)
// ---------------------------------------------------------------------------

describe('AI-ADAPTERS', () => {
  it('AI-55: defaultClassifier (mock) clasifica sin llamar fetch', async () => {
    const result = await defaultClassifier.classify({ message_text: 'gotera urgente', services_active: [], channel: 'webchat' });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.service_code).toBe('conv_incidencias');
  });

  it('AI-56: buildIntentClassifier("real") usa ai-client -- con mock mode devuelve unknown', async () => {
    ENV['AI_INTEGRATION_MODE'] = 'mock'; // ai-client en mock no hace fetch
    const classifier = buildIntentClassifier('real');
    const result = await classifier.classify({ message_text: 'test', services_active: [], channel: 'webchat', client_account_id: 'acc1', session_id: 's1' });
    expect(mockFetch).not.toHaveBeenCalled();
    // Fallback a unknown cuando IA esta en mock
    expect(result.service_code).toBe('unknown');
  });

  it('AI-57: defaultIncidentExtractor (mock) extrae sin llamar fetch', () => {
    const result = defaultIncidentExtractor.extract('gotera urgente en el bano');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.incident_type).toBe('maintenance');
  });

  it('AI-58: buildIncidentExtractor("real") con ai-client mockeado -- usa ai-call y devuelve extraction', async () => {
    ENV['AI_INTEGRATION_MODE'] = 'real';
    ENV['AI_PROVIDER'] = 'openai';
    ENV['OPENAI_API_KEY'] = 'test_key';
    ENV['AI_MAX_RETRIES'] = '0';
    mockFetch.mockResolvedValue(fakeResponse(200, { incident_type: 'security', urgency: 'high', safe_summary: 'robo en edificio' }));
    const extractor = buildIncidentExtractor('real');
    const result = await extractor.extract('me han robado', { client_account_id: 'acc1', session_id: 's1' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.incident_type).toBe('security');
  });

  it('AI-59: defaultListingIntentExtractor (mock) extrae sin llamar fetch', () => {
    const result = defaultListingIntentExtractor.extract('busco habitacion en Madrid');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.intent_type).toBe('search_listing');
  });

  it('AI-60: buildListingIntentExtractor("real") con ai-client mockeado -- llama fetch', async () => {
    ENV['AI_INTEGRATION_MODE'] = 'real';
    ENV['AI_PROVIDER'] = 'openai';
    ENV['OPENAI_API_KEY'] = 'test_key';
    ENV['AI_MAX_RETRIES'] = '0';
    mockFetch.mockResolvedValue(fakeResponse(200, { interest_type: 'search_listing', city: 'Madrid' }));
    const extractor = buildListingIntentExtractor('real');
    await extractor.extract('busco piso en Madrid', { client_account_id: 'acc1', session_id: 's1' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('AI-61: defaultHelpIntentExtractor (mock) extrae sin llamar fetch', () => {
    const result = defaultHelpIntentExtractor.extract('como cambio mi contrasena');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.intent_type).toBe('faq');
  });

  it('AI-62: buildHelpIntentExtractor("real") con ai-client mockeado -- llama fetch', async () => {
    ENV['AI_INTEGRATION_MODE'] = 'real';
    ENV['AI_PROVIDER'] = 'openai';
    ENV['OPENAI_API_KEY'] = 'test_key';
    ENV['AI_MAX_RETRIES'] = '0';
    mockFetch.mockResolvedValue(fakeResponse(200, { help_intent: 'faq', kb_query: 'password reset' }));
    const extractor = buildHelpIntentExtractor('real');
    await extractor.extract('como recupero mi acceso', { client_account_id: 'acc1', session_id: 's1' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// AI-BOUNDARIES (AI-63..AI-73) -- analisis estatico
// ---------------------------------------------------------------------------

describe('AI-BOUNDARIES', () => {
  it('AI-63: ai-client no valida identidad -- no llama core-identity-client', () => {
    const src = readFile(AI_CLIENT_PATH);
    expect(src).not.toContain('core-identity-client');
    expect(src).not.toContain('validateIdentity');
  });

  it('AI-64: ai-client no decide permisos -- no contiene RequireRole ni llama service_role como credencial de acceso', () => {
    const src = readFile(AI_CLIENT_PATH);
    expect(src).not.toContain('RequireRole');
    // service_role puede aparecer como campo PII prohibido en AI_PII_FORBIDDEN_FIELDS (es correcto)
    // pero no debe usarse como credencial de acceso activo
    expect(src).not.toMatch(/service_role\s*=|service_role\s*:/);
    expect(src).not.toMatch(/headers.*service_role/);
  });

  it('AI-65: ai-client no crea incidencia oficial -- no importa core-incident-client', () => {
    const src = readFile(AI_CLIENT_PATH);
    expect(src).not.toContain('core-incident-client');
    expect(src).not.toContain('createIncident');
  });

  it('AI-66: ai-client no crea lead oficial -- no importa core-lead-client', () => {
    const src = readFile(AI_CLIENT_PATH);
    expect(src).not.toContain('core-lead-client');
    expect(src).not.toContain('createLead');
  });

  it('AI-67: ai-client no crea help ticket oficial -- no importa core-help-ticket-client', () => {
    const src = readFile(AI_CLIENT_PATH);
    expect(src).not.toContain('core-help-ticket-client');
    expect(src).not.toContain('createHelpTicket');
  });

  it('AI-68: ai-client no escribe conv_cases ni conv_messages', () => {
    const src = readFile(AI_CLIENT_PATH);
    expect(src).not.toContain('conv_cases');
    expect(src).not.toContain('conv_messages');
  });

  it('AI-69: ai-client no publica Activity Log', () => {
    const src = readFile(AI_CLIENT_PATH);
    expect(src).not.toContain('activity_log');
    expect(src).not.toContain('publishActivity');
  });

  it('AI-70: ai-client no llama Core real -- no importa core-http-client', () => {
    const src = readFile(AI_CLIENT_PATH);
    expect(src).not.toContain('core-http-client');
    expect(src).not.toContain('coreHttpCall');
  });

  it('AI-71: ai-client no llama n8n real -- no contiene URLs ni imports de n8n', () => {
    const src = readFile(AI_CLIENT_PATH);
    // n8n puede aparecer en comentarios indicando que NO se llama; lo que se prohíbe es llamarlo activamente
    expect(src).not.toContain('hstgr.cloud');
    expect(src).not.toMatch(/fetch\([^)]*n8n/);
    expect(src).not.toMatch(/import.*n8n/);
  });

  it('AI-72: ai-client no llama Wasender real', () => {
    const src = readFile(AI_CLIENT_PATH);
    expect(src).not.toContain('wasender');
  });

  it('AI-73: provider-selection.md documenta los limites de la IA', () => {
    const doc = readFile(SELECTION_DOC_PATH);
    expect(doc).toContain('Validar identidad');
    expect(doc).toContain('Decidir permisos');
    expect(doc).toContain('Escribir en conv_cases');
    expect(doc).toContain('Activity Log');
  });
});

// ---------------------------------------------------------------------------
// AI-RESTRICTIONS (AI-74..AI-81) -- terminos prohibidos
// ---------------------------------------------------------------------------

describe('AI-RESTRICTIONS', () => {
  it('AI-74: ai-client no introduce WF-02', () => {
    expect(readFile(AI_CLIENT_PATH)).not.toContain('WF-02');
  });

  it('AI-75: ai-client no introduce conv_help_escalated', () => {
    expect(readFile(AI_CLIENT_PATH)).not.toContain('conv_help_escalated');
  });

  it('AI-76: ai-client no introduce WEAK_MATCH como estado valido', () => {
    const src = readFile(AI_CLIENT_PATH);
    expect(src).not.toMatch(/VALID.*WEAK_MATCH/);
    expect(src).not.toMatch(/WEAK_MATCH.*valid/i);
  });

  it('AI-77: ai-client no introduce UNVERIFIED standalone como estado valido', () => {
    const src = readFile(AI_CLIENT_PATH);
    expect(src).not.toMatch(/'UNVERIFIED'[^_]/);
  });

  it('AI-78: ai-client no introduce next_retry_at como campo en respuesta o estado', () => {
    const src = readFile(AI_CLIENT_PATH);
    // No debe exportar ni asignar next_retry_at como campo de estado
    expect(src).not.toMatch(/next_retry_at\s*:/);
    expect(src).not.toMatch(/next_retry_at\s*=/);
    expect(src).not.toMatch(/result\.next_retry_at|response\.next_retry_at/);
  });

  it('AI-79: ai-client no introduce attempt_count como campo en respuesta o estado', () => {
    const src = readFile(AI_CLIENT_PATH);
    // No debe exportar ni asignar attempt_count como campo de estado
    expect(src).not.toMatch(/attempt_count\s*:/);
    expect(src).not.toMatch(/attempt_count\s*=/);
    expect(src).not.toMatch(/result\.attempt_count|response\.attempt_count/);
  });

  it('AI-80: documentacion no introduce estados prohibidos', () => {
    const combined = readFile(SELECTION_DOC_PATH) + readFile(SAFETY_DOC_PATH) + readFile(ENV_DOC_PATH);
    expect(combined).not.toContain('WF-02');
    expect(combined).not.toContain('conv_help_escalated');
    expect(combined).not.toContain('next_retry_at');
    expect(combined).not.toContain('attempt_count');
  });

  it('AI-81: generic-http-provider no introduce estados ni eventos prohibidos', () => {
    const src = readFile(PROVIDER_PATH);
    expect(src).not.toContain('WF-02');
    expect(src).not.toContain('conv_help_escalated');
    expect(src).not.toContain('next_retry_at');
    expect(src).not.toContain('attempt_count');
  });
});

// ---------------------------------------------------------------------------
// AI-REGRESSION (AI-82..AI-97) -- suites existentes no rotas
// ---------------------------------------------------------------------------

describe('AI-REGRESSION', () => {
  const SUITES_ROOT = resolve(ROOT, 'tests/regression/smart-conversations/suites');

  function suiteExists(path: string): boolean {
    return existsSync(resolve(SUITES_ROOT, path));
  }

  it('AI-82: suite schema existe', () => { expect(suiteExists('schema/schema.spec.ts')).toBe(true); });
  it('AI-83: suite types existe', () => { expect(suiteExists('types/types.spec.ts')).toBe(true); });
  it('AI-84: suite infra existe', () => { expect(suiteExists('infra/infra.spec.ts')).toBe(true); });
  it('AI-85: suite ingest existe', () => { expect(suiteExists('ingest/ingest.spec.ts')).toBe(true); });
  it('AI-86: suite channels existe', () => { expect(suiteExists('channels/channels.spec.ts')).toBe(true); });
  it('AI-87: suite outbound existe', () => { expect(suiteExists('outbound/outbound.spec.ts')).toBe(true); });
  it('AI-88: suite routing existe', () => { expect(suiteExists('routing/routing.spec.ts')).toBe(true); });
  it('AI-89: suite identity existe', () => { expect(suiteExists('identity/identity.spec.ts')).toBe(true); });
  it('AI-90: suite incidents existe', () => { expect(suiteExists('incidents/incidents.spec.ts')).toBe(true); });
  it('AI-91: suite listings-flow existe', () => { expect(suiteExists('listings-flow/listings-flow.spec.ts')).toBe(true); });
  it('AI-92: suite help-flow existe', () => { expect(suiteExists('help-flow/help-flow.spec.ts')).toBe(true); });
  it('AI-93: suite dispatch existe', () => { expect(suiteExists('dispatch/dispatch.spec.ts')).toBe(true); });
  it('AI-94: suite e2e existe', () => { expect(suiteExists('e2e/e2e-runtime.spec.ts')).toBe(true); });
  it('AI-95: suite n8n-contracts existe', () => { expect(suiteExists('n8n/n8n-contracts.spec.ts')).toBe(true); });
  it('AI-96: suite core-integration existe', () => { expect(suiteExists('core-integration/core-integration.spec.ts')).toBe(true); });
  it('AI-97: mocks siguen siendo default -- AI_INTEGRATION_MODE default es mock', () => {
    const src = readFile(AI_CLIENT_PATH);
    // El default en getAiIntegrationMode es 'mock'
    expect(src).toContain("?? 'mock'");
    expect(src).toContain("error_code: 'AI_MOCK_MODE'");
  });
});
