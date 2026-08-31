/**
 * listings-addon-adapter.ts — Puerto estable para el add-on de anuncios (Fase 11C1).
 *
 * Puertos:
 *   SearchListingsQuery → SearchListingsResult
 *   CreateLeadCommand   → CreateLeadResult
 *
 * El actor para lead puede ser no verificado:
 *   { type: 'unverified_lead' } — nunca enviar el enum interno UNVERIFIED_LEAD.
 *
 * No enviar: STRONG_MATCH_ACTIVE, UNVERIFIED_LEAD enum interno,
 *            phone, sender_ref, raw_payload, tokens.
 *
 * SmartConversations solo guarda lead_id/ref externo.
 */

import type { IntegrationResult, IntegrationMode } from '../integration-framework.ts';
import {
  resolveMode, assertRealModeAllowed, buildSuccess, buildError, buildDisabledError,
  INTEGRATION_POLICIES, checkCircuit, recordSuccess, recordFailure,
} from '../integration-framework.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos del puerto canónico
// ─────────────────────────────────────────────────────────────────────────────

export type ListingActorType =
  | 'tenant_profile'      // inquilino verificado
  | 'unverified_lead'     // prospecto no verificado (este tipo, NO el enum interno)
  | 'agent'
  | 'system';

export interface ListingActor {
  type: ListingActorType;
  profile_id?: string;    // solo para tenant_profile/agent
}

export interface SearchListingsQuery {
  client_account_id: string;
  correlation_id: string;
  filters: {
    city?: string;
    max_price?: number;
    min_rooms?: number;
    available_from?: string;  // ISO date
    cursor?: string;
    page_size?: number;
  };
  actor: ListingActor;
}

export interface ListingItem {
  listing_id: string;
  title: string;
  city: string;
  price: number;
  rooms: number;
  available_from: string;
}

export interface SearchListingsResult {
  items: ListingItem[];
  next_cursor: string | null;
  total: number;
}

export interface CreateLeadCommand {
  client_account_id: string;
  correlation_id: string;
  idempotency_key: string;
  source: 'smart_conversations';
  actor: ListingActor;
  listing_id: string;
  contact: {
    name?: string;
    // No enviar phone/email directamente — el add-on los solicita si los necesita
  };
  message?: string;
}

export interface CreateLeadResult {
  lead_id: string;
  lead_ref: string;
  status: 'created' | 'existing';
  idempotent: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validación — campos prohibidos del modelo conversacional
// ─────────────────────────────────────────────────────────────────────────────

const FORBIDDEN_INTERNAL_ENUMS = new Set([
  'STRONG_MATCH_ACTIVE', 'PARTIAL_MATCH_ACTIVE', 'NO_MATCH', 'MATCH_INACTIVE',
  'UNVERIFIED_LEAD',  // este enum es interno; el add-on recibe 'unverified_lead' como type
]);

export function validateListingActor(actor: ListingActor): string | null {
  if (FORBIDDEN_INTERNAL_ENUMS.has(actor.type)) {
    return `forbidden_actor_type: ${actor.type}`;
  }
  return null;
}

export function validateSearchQuery(query: SearchListingsQuery): string | null {
  const actorError = validateListingActor(query.actor);
  if (actorError) return actorError;
  if (query.filters.cursor && !/^[A-Za-z0-9+/=_-]{0,512}$/.test(query.filters.cursor)) {
    return 'invalid_cursor_format';
  }
  if (query.filters.page_size !== undefined && (query.filters.page_size < 1 || query.filters.page_size > 100)) {
    return 'invalid_page_size';
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock responses
// ─────────────────────────────────────────────────────────────────────────────

function _mockSearch(): SearchListingsResult {
  return {
    items: [
      { listing_id: 'mock-l-001', title: 'Habitación centro', city: 'Madrid', price: 650, rooms: 1, available_from: '2026-08-01' },
      { listing_id: 'mock-l-002', title: 'Piso amplio', city: 'Madrid', price: 900, rooms: 2, available_from: '2026-08-15' },
    ],
    next_cursor: null,
    total: 2,
  };
}

function _mockLead(cmd: CreateLeadCommand): CreateLeadResult {
  return {
    lead_id:   `mock-lead-${cmd.correlation_id.slice(0, 8)}`,
    lead_ref:  `LEAD-DEV-MOCK-${Date.now()}`,
    status:    'created',
    idempotent: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function _getEnv(key: string): string | undefined {
  if (typeof Deno !== 'undefined') return Deno.env.get(key);
  if (typeof process !== 'undefined') return process.env[key];
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// SearchListings
// ─────────────────────────────────────────────────────────────────────────────

export async function searchListings(
  query: SearchListingsQuery,
  opts: { mode_override?: IntegrationMode; _fetchImpl?: typeof fetch } = {},
): Promise<IntegrationResult<SearchListingsResult>> {
  const request_id = crypto.randomUUID();
  const meta_base = {
    request_id,
    correlation_id: query.correlation_id,
    provider: 'listings_addon',
    idempotent_replay: false,
  };
  const policy = INTEGRATION_POLICIES['listings_addon'];

  const raw_mode = opts.mode_override ?? resolveMode(_getEnv('LISTINGS_ADDON_INTEGRATION_MODE'));
  const modeCheck = assertRealModeAllowed(raw_mode, _getEnv('APP_ENVIRONMENT'));
  if (!modeCheck.allowed) {
    return buildError('CONFIGURATION_ERROR', 'real mode requires DEV environment',
      { ...meta_base, mode: raw_mode, duration_ms: 0 });
  }

  const validationError = validateSearchQuery(query);
  if (validationError) {
    return buildError('VALIDATION_ERROR', validationError,
      { ...meta_base, mode: raw_mode, duration_ms: 0 });
  }

  if (raw_mode === 'disabled') {
    return buildDisabledError('listings_addon', request_id, query.correlation_id);
  }
  if (raw_mode === 'mock') {
    return buildSuccess(_mockSearch(), { ...meta_base, mode: 'mock', duration_ms: 0 });
  }

  const circuit = checkCircuit('listings_addon', policy);
  if (!circuit.allowed) {
    return buildError('DEPENDENCY_UNAVAILABLE', 'circuit_open',
      { ...meta_base, mode: raw_mode, duration_ms: 0 }, { retryable: true });
  }

  const baseUrl = _getEnv('LISTINGS_ADDON_BASE_URL');
  const token = _getEnv('LISTINGS_ADDON_SERVICE_TOKEN');
  if (!baseUrl || !token) {
    return buildError('CONFIGURATION_ERROR', 'listings_addon configuration missing',
      { ...meta_base, mode: raw_mode, duration_ms: 0 });
  }

  const fetchImpl = opts._fetchImpl ?? globalThis.fetch;
  const start = Date.now();
  try {
    const params = new URLSearchParams();
    if (query.filters.city) params.set('city', query.filters.city);
    if (query.filters.cursor) params.set('cursor', query.filters.cursor);
    if (query.filters.page_size) params.set('page_size', String(query.filters.page_size));

    const resp = await fetchImpl(`${baseUrl}/listings/search?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Client-Account-Id': query.client_account_id,
        'X-Correlation-Id': query.correlation_id,
      },
      signal: AbortSignal.timeout(policy.timeout_ms),
    });
    const duration_ms = Date.now() - start;

    if (!resp.ok) {
      recordFailure('listings_addon', policy);
      return buildError('DEPENDENCY_UNAVAILABLE', `listings_addon_${resp.status}`,
        { ...meta_base, mode: raw_mode, duration_ms }, { retryable: resp.status >= 500 });
    }

    const json = await resp.json() as SearchListingsResult;
    if (!Array.isArray(json.items)) {
      recordFailure('listings_addon', policy);
      return buildError('CONTRACT_MISMATCH', 'listings_addon_response_invalid',
        { ...meta_base, mode: raw_mode, duration_ms });
    }
    recordSuccess('listings_addon');
    return buildSuccess(json, { ...meta_base, mode: raw_mode, duration_ms });

  } catch (err) {
    const duration_ms = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    recordFailure('listings_addon', policy);
    return buildError(
      isTimeout ? 'TIMEOUT' : 'DEPENDENCY_UNAVAILABLE',
      isTimeout ? 'listings_addon_timeout' : 'listings_addon_network_error',
      { ...meta_base, mode: raw_mode, duration_ms }, { retryable: true },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CreateLead
// ─────────────────────────────────────────────────────────────────────────────

export async function createLead(
  cmd: CreateLeadCommand,
  opts: { mode_override?: IntegrationMode; _fetchImpl?: typeof fetch } = {},
): Promise<IntegrationResult<CreateLeadResult>> {
  const request_id = crypto.randomUUID();
  const meta_base = {
    request_id,
    correlation_id: cmd.correlation_id,
    provider: 'listings_addon',
    idempotent_replay: false,
  };
  const policy = INTEGRATION_POLICIES['listings_addon'];

  const raw_mode = opts.mode_override ?? resolveMode(_getEnv('LISTINGS_ADDON_INTEGRATION_MODE'));
  const modeCheck = assertRealModeAllowed(raw_mode, _getEnv('APP_ENVIRONMENT'));
  if (!modeCheck.allowed) {
    return buildError('CONFIGURATION_ERROR', 'real mode requires DEV environment',
      { ...meta_base, mode: raw_mode, duration_ms: 0 });
  }

  const actorError = validateListingActor(cmd.actor);
  if (actorError) {
    return buildError('VALIDATION_ERROR', actorError,
      { ...meta_base, mode: raw_mode, duration_ms: 0 });
  }

  if (!cmd.listing_id) {
    return buildError('VALIDATION_ERROR', 'listing_id_required',
      { ...meta_base, mode: raw_mode, duration_ms: 0 });
  }

  if (raw_mode === 'disabled') return buildDisabledError('listings_addon', request_id, cmd.correlation_id);
  if (raw_mode === 'mock') {
    return buildSuccess(_mockLead(cmd), { ...meta_base, mode: 'mock', duration_ms: 0 });
  }

  const circuit = checkCircuit('listings_addon', policy);
  if (!circuit.allowed) {
    return buildError('DEPENDENCY_UNAVAILABLE', 'circuit_open',
      { ...meta_base, mode: raw_mode, duration_ms: 0 }, { retryable: true });
  }

  const baseUrl = _getEnv('LISTINGS_ADDON_BASE_URL');
  const token = _getEnv('LISTINGS_ADDON_SERVICE_TOKEN');
  if (!baseUrl || !token) {
    return buildError('CONFIGURATION_ERROR', 'listings_addon configuration missing',
      { ...meta_base, mode: raw_mode, duration_ms: 0 });
  }

  const fetchImpl = opts._fetchImpl ?? globalThis.fetch;
  const start = Date.now();
  try {
    const resp = await fetchImpl(`${baseUrl}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Idempotency-Key': cmd.idempotency_key,
        'X-Correlation-Id': cmd.correlation_id,
      },
      body: JSON.stringify({
        client_account_id: cmd.client_account_id,
        idempotency_key:   cmd.idempotency_key,
        source:            cmd.source,
        actor:             cmd.actor,
        listing_id:        cmd.listing_id,
        contact:           cmd.contact,
        message:           cmd.message,
      }),
      signal: AbortSignal.timeout(policy.timeout_ms),
    });
    const duration_ms = Date.now() - start;

    if (resp.status === 409) {
      const json = await resp.json() as { lead_id?: string; lead_ref?: string };
      recordSuccess('listings_addon');
      return buildSuccess(
        { lead_id: json.lead_id ?? '', lead_ref: json.lead_ref ?? '', status: 'existing' as const, idempotent: true },
        { ...meta_base, mode: raw_mode, duration_ms, idempotent_replay: true },
      );
    }
    if (!resp.ok) {
      recordFailure('listings_addon', policy);
      return buildError('DEPENDENCY_UNAVAILABLE', `listings_addon_${resp.status}`,
        { ...meta_base, mode: raw_mode, duration_ms }, { retryable: resp.status >= 500 });
    }
    const json = await resp.json() as CreateLeadResult;
    if (!json.lead_id) {
      recordFailure('listings_addon', policy);
      return buildError('CONTRACT_MISMATCH', 'listings_addon_lead_response_invalid',
        { ...meta_base, mode: raw_mode, duration_ms });
    }
    recordSuccess('listings_addon');
    return buildSuccess(json, { ...meta_base, mode: raw_mode, duration_ms });

  } catch (err) {
    const duration_ms = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    recordFailure('listings_addon', policy);
    return buildError(
      isTimeout ? 'TIMEOUT' : 'DEPENDENCY_UNAVAILABLE',
      isTimeout ? 'listings_addon_timeout' : 'listings_addon_network_error',
      { ...meta_base, mode: raw_mode, duration_ms }, { retryable: true },
    );
  }
}
