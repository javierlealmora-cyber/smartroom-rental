/**
 * n8n-workflow-registry.ts — Registro canónico de workflows n8n (Fase 11C4).
 *
 * Catálogo oficial: WF-10, WF-20, WF-30, WF-40, WF-91, WF-92.
 * Fuente de verdad: documentación en docs/smart-conversations/n8n/.
 * Workflows históricos (SC-WF-IDENTITY, SC-WF-C00) documentados como legacy.
 *
 * Un workflow NO registrado se rechaza antes de efectuar la llamada.
 * WF-02 está explícitamente ausente y prohibido.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tipos del registry
// ─────────────────────────────────────────────────────────────────────────────

export type WorkflowOperationType = 'orchestration' | 'service_read' | 'service_mutable' | 'outbound';
export type WorkflowStatus = 'active_mock' | 'canary_ready' | 'active' | 'deprecated' | 'legacy';
export type WorkflowMode = 'mock' | 'shadow' | 'canary' | 'real' | 'disabled';

export interface RetryPolicy {
  max_attempts: number;
  backoff_ms: number;
  jitter: boolean;
  retryable_on: (429 | 503 | 'TIMEOUT' | 'NETWORK_ERROR')[];
  non_retryable_on: (400 | 422 | 403 | 'CONTRACT_MISMATCH')[];
}

export interface WorkflowRegistryEntry {
  /** Código de workflow para el adapter. */
  workflow_code: string;
  /** Nombre legible. */
  logical_name: string;
  /** Versión semántica del workflow. */
  version: string;
  /** Versión del contrato de entrada/salida. */
  contract_version: string;
  /** Tipo de operación — determina shadow eligibility y retry policy. */
  operation_type: WorkflowOperationType;
  /** Si la operación produce efectos secundarios persistentes. */
  mutable: boolean;
  /** Si las invocaciones con mismo idempotency_key son deduplicables. */
  idempotent: boolean;
  /** EFs o módulos autorizados para invocar este workflow. */
  allowed_callers: string[];
  /** Endpoints autorizados para enviar callbacks de este workflow. */
  allowed_callbacks: string[];
  /** Timeout en ms para la llamada HTTP. */
  timeout_ms: number;
  retry_policy: RetryPolicy;
  /** Shadow permitido: solo operaciones no mutables. */
  shadow_allowed: boolean;
  /** Si el tenant canary ficticio puede activarlo en modo canary. */
  canary_allowed: boolean;
  /** Checksum del export JSON (placeholder hasta tener export real). */
  export_checksum: string | null;
  /** Modos habilitados para este workflow. */
  enabled_modes: WorkflowMode[];
  status: WorkflowStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Política de retry por defecto
// ─────────────────────────────────────────────────────────────────────────────

const READ_RETRY: RetryPolicy = {
  max_attempts: 3,
  backoff_ms: 500,
  jitter: true,
  retryable_on: [429, 503, 'TIMEOUT', 'NETWORK_ERROR'],
  non_retryable_on: [400, 422, 403, 'CONTRACT_MISMATCH'],
};

const MUTABLE_RETRY: RetryPolicy = {
  max_attempts: 2, // más conservador en ops mutables
  backoff_ms: 1000,
  jitter: true,
  retryable_on: [429, 503, 'TIMEOUT', 'NETWORK_ERROR'],
  non_retryable_on: [400, 422, 403, 'CONTRACT_MISMATCH'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo canónico (WF-10/20/30/40/91/92)
// ─────────────────────────────────────────────────────────────────────────────

export const N8N_WORKFLOW_REGISTRY: Record<string, WorkflowRegistryEntry> = {
  'wf10.routing': {
    workflow_code:      'wf10.routing',
    logical_name:       'WF-10 — Routing / Orchestration',
    version:            '1.0.0',
    contract_version:   '1.0',
    operation_type:     'orchestration',
    mutable:            false,
    idempotent:         true,
    allowed_callers:    ['conv-routing-engine', 'conv-ingest'],
    allowed_callbacks:  ['conv-routing-engine'],
    timeout_ms:         10_000,
    retry_policy:       READ_RETRY,
    shadow_allowed:     true,  // solo lectura/orquestación
    canary_allowed:     true,
    export_checksum:    null, // placeholder hasta export real
    enabled_modes:      ['mock', 'shadow', 'canary', 'real', 'disabled'],
    status:             'active_mock',
  },

  'wf20.incidents': {
    workflow_code:      'wf20.incidents',
    logical_name:       'WF-20 — Gestión de Incidencias',
    version:            '1.0.0',
    contract_version:   '1.0',
    operation_type:     'service_mutable',
    mutable:            true,
    idempotent:         true, // via idempotency_key
    allowed_callers:    ['conv-core-create-incident'],
    allowed_callbacks:  ['conv-core-create-incident'],
    timeout_ms:         15_000,
    retry_policy:       MUTABLE_RETRY,
    shadow_allowed:     false, // mutable — shadow no permitido
    canary_allowed:     true,
    export_checksum:    null,
    enabled_modes:      ['mock', 'canary', 'real', 'disabled'],
    status:             'active_mock',
  },

  'wf30.listings': {
    workflow_code:      'wf30.listings',
    logical_name:       'WF-30 — Gestión de Publicaciones',
    version:            '1.0.0',
    contract_version:   '1.0',
    operation_type:     'service_mutable',
    mutable:            true,
    idempotent:         true,
    allowed_callers:    ['conv-core-query-listings', 'conv-core-create-lead'],
    allowed_callbacks:  ['conv-core-query-listings', 'conv-core-create-lead'],
    timeout_ms:         15_000,
    retry_policy:       MUTABLE_RETRY,
    shadow_allowed:     false,
    canary_allowed:     true,
    export_checksum:    null,
    enabled_modes:      ['mock', 'canary', 'real', 'disabled'],
    status:             'active_mock',
  },

  'wf40.help': {
    workflow_code:      'wf40.help',
    logical_name:       'WF-40 — Ayuda y Soporte',
    version:            '1.0.0',
    contract_version:   '1.0',
    operation_type:     'service_read',
    mutable:            false,
    idempotent:         true,
    allowed_callers:    ['conv-core-query-help-kb', 'conv-core-create-help-ticket'],
    allowed_callbacks:  ['conv-core-query-help-kb', 'conv-core-create-help-ticket'],
    timeout_ms:         10_000,
    retry_policy:       READ_RETRY,
    shadow_allowed:     true,
    canary_allowed:     true,
    export_checksum:    null,
    enabled_modes:      ['mock', 'shadow', 'canary', 'real', 'disabled'],
    status:             'active_mock',
  },

  'wf91.wa_out': {
    workflow_code:      'wf91.wa_out',
    logical_name:       'WF-91 — WhatsApp Outbound',
    version:            '1.0.0',
    contract_version:   '1.0',
    operation_type:     'outbound',
    mutable:            true,
    idempotent:         true,
    allowed_callers:    ['conv-send-wa', 'conv-process-send-queue'],
    allowed_callbacks:  ['conv-send-wa'],
    timeout_ms:         12_000,
    retry_policy:       MUTABLE_RETRY,
    shadow_allowed:     false, // outbound mutable
    canary_allowed:     true,
    export_checksum:    null,
    enabled_modes:      ['mock', 'canary', 'real', 'disabled'],
    status:             'active_mock',
  },

  'wf92.webchat_out': {
    workflow_code:      'wf92.webchat_out',
    logical_name:       'WF-92 — WebChat Outbound',
    version:            '1.0.0',
    contract_version:   '1.0',
    operation_type:     'outbound',
    mutable:            true,
    idempotent:         true,
    allowed_callers:    ['conv-web-deliver', 'conv-process-send-queue'],
    allowed_callbacks:  ['conv-web-deliver'],
    timeout_ms:         10_000,
    retry_policy:       MUTABLE_RETRY,
    shadow_allowed:     false,
    canary_allowed:     true,
    export_checksum:    null,
    enabled_modes:      ['mock', 'canary', 'real', 'disabled'],
    status:             'active_mock',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Workflows legacy (documentados, no activos en 11C4)
// ─────────────────────────────────────────────────────────────────────────────

export const N8N_LEGACY_WORKFLOWS = new Set([
  'SC-WF-IDENTITY',  // Fase 9C — stub histórico
  'SC-WF-C00',       // Fase 9C — stub histórico de reconciliación
]);

/** WF-02 está explícitamente prohibido. */
export const WF02_PROHIBITED = true;

// ─────────────────────────────────────────────────────────────────────────────
// Lookups
// ─────────────────────────────────────────────────────────────────────────────

export function lookupWorkflow(workflow_code: string): WorkflowRegistryEntry | null {
  return N8N_WORKFLOW_REGISTRY[workflow_code] ?? null;
}

export function isWorkflowAllowed(workflow_code: string): boolean {
  return workflow_code in N8N_WORKFLOW_REGISTRY;
}

export function isShadowAllowed(workflow_code: string): boolean {
  return N8N_WORKFLOW_REGISTRY[workflow_code]?.shadow_allowed ?? false;
}

export function isWorkflowMutable(workflow_code: string): boolean {
  return N8N_WORKFLOW_REGISTRY[workflow_code]?.mutable ?? true;
}

export function getWorkflowTimeout(workflow_code: string): number {
  return N8N_WORKFLOW_REGISTRY[workflow_code]?.timeout_ms ?? 10_000;
}

/** Lista de codes activos (sin legacy). */
export const ACTIVE_WORKFLOW_CODES = Object.keys(N8N_WORKFLOW_REGISTRY);
