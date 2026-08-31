/**
 * listings-integration-port.ts — Puerto neutral para integración de publicaciones (Fase 11C5).
 *
 * Los módulos conversacionales SOLO dependen de este puerto.
 * No importan el adapter concreto ni ningún add-on específico.
 *
 * Operaciones:
 *   searchListings(query) → SearchListingsResult
 *   createLead(command)   → CreateLeadResult
 */

import type { CanonicalActor } from './canonical-actor.ts';

// ─────────────────────────────────────────────────────────────────────────────
// DTOs de búsqueda
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchListingsQuery {
  contract_version: '1.0';
  client_account_id: string;
  request_id: string;
  correlation_id: string;
  filters: {
    location: string | null;
    price_min: number | null;
    price_max: number | null;
    room_type: string | null;
    move_in_date: string | null; // ISO date
    preferences: string[];
  };
  pagination: {
    cursor: string | null;  // opaco
    limit: number;          // máx 50
  };
}

export interface ListingItem {
  listing_id: string;        // opaco
  reference: string;
  title: string;
  public_location: string;   // solo zona/ciudad pública
  price: { amount: number; currency: string };
  room_type: string;
  available_from: string | null;
  public_features: string[];
}

export interface SearchListingsResult {
  items: ListingItem[];
  next_cursor: string | null;  // opaco
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs de lead
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateLeadCommand {
  contract_version: '1.0';
  client_account_id: string;
  request_id: string;
  correlation_id: string;
  idempotency_key: string;
  source: 'smart_conversations';
  actor: CanonicalActor;
  lead: {
    listing_id: string | null;
    search_context: Record<string, string | number | boolean | null>;
    contact_preferences: Record<string, string | boolean | null>;
    message_summary: string | null;  // sanitizado, limitado
  };
}

export interface CreateLeadResult {
  lead_id: string;                 // referencia opaca — SmartConversations guarda esto
  lead_reference: string | null;   // referencia visible opcional
  status: string;
  created_at: string;              // ISO-8601
  idempotent_replay: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Estado de health
// ─────────────────────────────────────────────────────────────────────────────

export type ListingsAddonHealthStatus =
  | 'mock' | 'healthy' | 'degraded' | 'unavailable'
  | 'misconfigured' | 'contract_mismatch' | 'canary';

// ─────────────────────────────────────────────────────────────────────────────
// Puerto neutral
// ─────────────────────────────────────────────────────────────────────────────

export interface ListingsIntegrationPort {
  searchListings(query: SearchListingsQuery): Promise<{
    ok: boolean;
    data?: SearchListingsResult;
    error_code?: string;
    meta: { mode: string; duration_ms: number };
  }>;

  createLead(command: CreateLeadCommand): Promise<{
    ok: boolean;
    data?: CreateLeadResult;
    error_code?: string;
    meta: { mode: string; duration_ms: number; idempotent_replay: boolean };
  }>;

  health(): Promise<{ status: ListingsAddonHealthStatus }>;
  getReadiness(): Promise<{ ready: boolean; reason?: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Campos prohibidos en salida del add-on
// ─────────────────────────────────────────────────────────────────────────────

export const LISTINGS_FORBIDDEN_OUTPUT_FIELDS = new Set([
  'profile_id', 'phone', 'email', 'identity_data', 'raw_payload',
  'authorization', 'service_role', 'api_key', 'sql', 'sender_ref',
  'owner_contacts', 'private_notes', 'financial_margin', 'internal_status',
]);

export const LISTING_PRIVATE_FIELDS = new Set([
  'owner_id', 'owner_phone', 'owner_email', 'tenant_ids',
  'private_address', 'financial_data', 'internal_notes',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Validación de resultado de búsqueda
// ─────────────────────────────────────────────────────────────────────────────

export function validateSearchResult(raw: unknown): { ok: boolean; reason?: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'RESULT_NOT_OBJECT' };
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r['items'])) return { ok: false, reason: 'ITEMS_NOT_ARRAY' };
  for (const item of r['items'] as Record<string, unknown>[]) {
    if (!item['listing_id']) return { ok: false, reason: 'LISTING_ID_MISSING' };
    for (const f of Object.keys(item)) {
      if (LISTING_PRIVATE_FIELDS.has(f)) return { ok: false, reason: `PRIVATE_FIELD_IN_RESULT: ${f}` };
    }
    const price = item['price'] as Record<string, unknown> | undefined;
    if (price && typeof price['amount'] !== 'number') return { ok: false, reason: 'PRICE_INVALID' };
    if (price && !price['currency']) return { ok: false, reason: 'CURRENCY_MISSING' };
  }
  return { ok: true };
}

export function validateLeadResult(raw: unknown, expectedTenant: string): { ok: boolean; reason?: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'RESULT_NOT_OBJECT' };
  const r = raw as Record<string, unknown>;
  if (!r['lead_id'] || typeof r['lead_id'] !== 'string' || r['lead_id'].trim() === '') {
    return { ok: false, reason: 'LEAD_ID_MISSING_OR_EMPTY' };
  }
  if (r['client_account_id'] && r['client_account_id'] !== expectedTenant) {
    return { ok: false, reason: 'TENANT_MISMATCH_IN_RESULT' };
  }
  for (const k of Object.keys(r)) {
    if (LISTINGS_FORBIDDEN_OUTPUT_FIELDS.has(k.toLowerCase())) {
      return { ok: false, reason: `FORBIDDEN_OUTPUT_FIELD: ${k}` };
    }
  }
  return { ok: true };
}
