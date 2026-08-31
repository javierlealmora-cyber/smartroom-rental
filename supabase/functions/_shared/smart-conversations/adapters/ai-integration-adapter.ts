/**
 * ai-integration-adapter.ts — Adapter AI con 5 modos (Fase 11C3).
 *
 * Modos: mock | shadow | canary | real | disabled
 * Estado actual: AI_DEV_CONFIGURATION_PENDING (sin proveedor aprobado).
 *
 * Principio de autoridad:
 * - La IA propone; SmartConversations valida mediante código determinista.
 * - La IA NO valida identidad, NO elige tenant, NO crea recursos.
 * - La IA NO publica Activity Log, NO accede a Core ni add-ons.
 *
 * Privacidad (AI_PII_FORBIDDEN_FIELDS_STRICT):
 * - No enviar: profile_id, sender_ref, phone, email, identity_data,
 *   raw_payload, jid, webchat_token, authorization, service_role.
 *
 * Fallback determinista: nunca realiza otra llamada IA.
 */

import type { IntegrationResult, IntegrationMode } from '../integration-framework.ts';
import {
  resolveMode, assertRealModeAllowed, buildSuccess, buildError, buildDisabledError,
} from '../integration-framework.ts';
import { resolveEffectiveMode } from '../integration-canary.ts';
import type { AiOperation } from '../runtime/ai-client.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Campos PII prohibidos en requests AI (estricto)
// ─────────────────────────────────────────────────────────────────────────────

export const AI_FORBIDDEN_INPUT_FIELDS = new Set<string>([
  'profile_id', 'sender_ref', 'phone', 'phone_number', 'email',
  'identity_data', 'raw_payload', 'jid', 'wa_jid', 'webchat_token',
  'authorization', 'service_role', 'full_name', 'room_label',
  'residence_name', 'assignment_id', 'contact', 'ip_address',
  'tokens', 'jwt', 'api_key', 'secret',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de request y response canónicos
// ─────────────────────────────────────────────────────────────────────────────

export interface AIRequestBase {
  operation: AiOperation;
  client_account_id: string;
  correlation_id: string;
  /** Texto sanitizado — único texto que llega al proveedor. */
  safe_text: string;
  language?: 'es' | 'en' | 'ca' | 'eu';
  max_input_chars?: number;
  max_output_tokens?: number;
}

export interface ClassifyIntentRequest extends AIRequestBase {
  operation: 'ai.intent.classify';
  allowed_intents: string[];
  context?: { previous_intent?: string | null; available_services?: string[] };
}

export interface ClassifyIntentResult {
  intent: 'incident' | 'listing_search' | 'help' | 'unknown';
  confidence: number;
  requires_clarification: boolean;
  clarification_reason: string | null;
}

export interface ExtractIncidentRequest extends AIRequestBase {
  operation: 'ai.incident.extract';
}

export interface ExtractIncidentResult {
  category?: string;
  description?: string;
  urgency_proposal?: 'low' | 'medium' | 'high';
  accommodation_reference?: string;
  room_reference?: string;
  missing_fields: string[];
  is_complete: boolean;
}

export interface ExtractListingsRequest extends AIRequestBase {
  operation: 'ai.listing.extract';
}

export interface ExtractListingsResult {
  location?: string;
  price_min?: number;
  price_max?: number;
  room_type?: string;
  move_in_date?: string;
  preferences?: string[];
  missing_fields: string[];
  is_complete: boolean;
}

export interface ExtractHelpRequest extends AIRequestBase {
  operation: 'ai.help.extract';
}

export interface ExtractHelpResult {
  topic?: string;
  question_summary?: string;
  requires_private_data: boolean;
  missing_fields: string[];
}

export interface SummarizeCaseRequest extends AIRequestBase {
  operation: 'ai.safe_summary';
}

export interface SummarizeCaseResult {
  facts: string[];
  pending_information: string[];
  actions_already_taken: string[];
  suggested_next_step: string | null;
  uncertainties: string[];
}

export interface DraftResponseRequest extends AIRequestBase {
  operation: 'ai.response_draft';
  tone?: 'formal' | 'friendly' | 'neutral';
  facts_validated?: string[];
  pending_fields?: string[];
}

export interface DraftResponseResult {
  text: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Límites canónicos
// ─────────────────────────────────────────────────────────────────────────────

export const AI_LIMITS = {
  MAX_INPUT_CHARS:        4000,
  MAX_OUTPUT_TOKENS:      512,
  MAX_COST_PER_REQUEST:   0.01,
  MAX_CALLS_PER_SESSION:  6,
  TIMEOUT_MS:             8_000,
  MAX_RETRIES:            2,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Validación de input
// ─────────────────────────────────────────────────────────────────────────────

export function validateAIRequest(req: AIRequestBase): { valid: boolean; reason?: string } {
  if (!req.client_account_id) return { valid: false, reason: 'client_account_id_required' };
  if (!req.correlation_id)    return { valid: false, reason: 'correlation_id_required' };
  if (!req.safe_text)         return { valid: false, reason: 'safe_text_required' };

  if (req.safe_text.length > AI_LIMITS.MAX_INPUT_CHARS) {
    return { valid: false, reason: `input_exceeds_limit_${AI_LIMITS.MAX_INPUT_CHARS}` };
  }

  // Verificar que safe_text no contiene campos PII conocidos en JSON
  const lowerText = req.safe_text.toLowerCase();
  for (const field of AI_FORBIDDEN_INPUT_FIELDS) {
    if (lowerText.includes(`"${field}"`)) {
      return { valid: false, reason: `forbidden_pii_field_in_input: ${field}` };
    }
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallbacks deterministas (sin llamada IA)
// ─────────────────────────────────────────────────────────────────────────────

export function fallbackClassifyIntent(): ClassifyIntentResult {
  return { intent: 'unknown', confidence: 0, requires_clarification: true, clarification_reason: 'ai_unavailable' };
}

export function fallbackExtractIncident(): ExtractIncidentResult {
  return { missing_fields: ['category', 'description'], is_complete: false };
}

export function fallbackExtractListings(): ExtractListingsResult {
  return { missing_fields: ['location'], is_complete: false };
}

export function fallbackExtractHelp(): ExtractHelpResult {
  return { requires_private_data: false, missing_fields: ['topic'] };
}

export function fallbackSummarizeCase(): SummarizeCaseResult {
  return { facts: [], pending_information: [], actions_already_taken: [], suggested_next_step: null, uncertainties: ['ai_unavailable'] };
}

export function fallbackDraftResponse(): DraftResponseResult {
  return { text: '¿Puede indicarme en qué puedo ayudarle?' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Validación de output de IA
// ─────────────────────────────────────────────────────────────────────────────

const VALID_INTENTS = new Set(['incident', 'listing_search', 'help', 'unknown']);

export function validateClassifyIntentOutput(raw: unknown): ClassifyIntentResult {
  if (!raw || typeof raw !== 'object') return fallbackClassifyIntent();
  const d = raw as Record<string, unknown>;
  const intent = typeof d['intent'] === 'string' && VALID_INTENTS.has(d['intent']) ? d['intent'] as ClassifyIntentResult['intent'] : 'unknown';
  const confidence = typeof d['confidence'] === 'number' ? Math.max(0, Math.min(1, d['confidence'])) : 0;
  const requires_clarification = typeof d['requires_clarification'] === 'boolean' ? d['requires_clarification'] : confidence < 0.6;
  const clarification_reason = typeof d['clarification_reason'] === 'string' ? d['clarification_reason'].slice(0, 200) : null;
  return { intent, confidence, requires_clarification, clarification_reason };
}

function toStringArray(v: unknown, maxLen = 200): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter(s => typeof s === 'string').map(s => (s as string).slice(0, maxLen));
}

export function validateSummarizeCaseOutput(raw: unknown): SummarizeCaseResult {
  if (!raw || typeof raw !== 'object') return fallbackSummarizeCase();
  const d = raw as Record<string, unknown>;
  return {
    facts:                 toStringArray(d['facts']),
    pending_information:   toStringArray(d['pending_information']),
    actions_already_taken: toStringArray(d['actions_already_taken']),
    suggested_next_step:   typeof d['suggested_next_step'] === 'string' ? d['suggested_next_step'].slice(0, 500) : null,
    uncertainties:         toStringArray(d['uncertainties']),
  };
}

export function validateDraftResponseOutput(raw: unknown): DraftResponseResult {
  if (!raw || typeof raw !== 'object') return fallbackDraftResponse();
  const d = raw as Record<string, unknown>;
  if (typeof d['text'] !== 'string') return fallbackDraftResponse();
  const text = d['text'].slice(0, 1000).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, '');
  return { text };
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter principal — 5 modos
// ─────────────────────────────────────────────────────────────────────────────

export async function callAI<T>(
  req: AIRequestBase,
  options: { mode?: string; appEnvironment?: string } = {},
): Promise<IntegrationResult<T>> {
  const rawMode = options.mode
    ?? (typeof Deno !== 'undefined' ? Deno.env.get('AI_INTEGRATION_MODE') : undefined)
    ?? 'mock';
  const mode: IntegrationMode = resolveMode(rawMode);

  if (mode === 'disabled') return buildDisabledError('ai') as IntegrationResult<T>;

  const validation = validateAIRequest(req);
  if (!validation.valid) {
    return buildError('VALIDATION_ERROR', validation.reason ?? 'invalid_ai_request', mode, 'ai') as IntegrationResult<T>;
  }

  const guard = assertRealModeAllowed(mode, options.appEnvironment);
  if (!guard.allowed) {
    return buildError('CONFIGURATION_ERROR', guard.reason ?? 'mode_requires_dev_environment', mode, 'ai') as IntegrationResult<T>;
  }

  if (mode === 'mock') {
    return _mockResponse<T>(req.operation, mode);
  }

  // canary: verifica allowlist
  const effectiveMode = resolveEffectiveMode(mode, req.client_account_id, 'ai', req.operation);
  if (effectiveMode === 'mock') {
    return _mockResponse<T>(req.operation, effectiveMode);
  }

  // shadow / canary / real: en 11C3 sin proveedor aprobado → AI_DEV_CONFIGURATION_PENDING
  const provider = typeof Deno !== 'undefined' ? Deno.env.get('AI_PROVIDER') : undefined;
  if (!provider || provider === 'mock') {
    return buildError('CONFIGURATION_ERROR', 'AI_DEV_CONFIGURATION_PENDING', effectiveMode, 'ai') as IntegrationResult<T>;
  }

  // Placeholder para llamada real cuando haya proveedor aprobado
  return buildError('CONFIGURATION_ERROR', 'AI_DEV_CONFIGURATION_PENDING', effectiveMode, 'ai') as IntegrationResult<T>;
}

function _mockResponse<T>(operation: string, mode: IntegrationMode): IntegrationResult<T> {
  const mocks: Record<string, unknown> = {
    'ai.intent.classify':  { intent: 'unknown', confidence: 0, requires_clarification: true, clarification_reason: null },
    'ai.incident.extract': { missing_fields: [], is_complete: false },
    'ai.listing.extract':  { missing_fields: [], is_complete: false },
    'ai.help.extract':     { requires_private_data: false, missing_fields: [] },
    'ai.safe_summary':     { facts: [], pending_information: [], actions_already_taken: [], suggested_next_step: null, uncertainties: [] },
    'ai.response_draft':   { text: '¿En qué puedo ayudarle?' },
  };
  return buildSuccess((mocks[operation] ?? {}) as T, mode, 'ai');
}
