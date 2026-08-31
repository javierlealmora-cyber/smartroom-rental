/**
 * e2e-turn-runner — API de alto nivel para simulaciones E2E conversacionales.
 *
 * Expone `runTurn(setup, opts)` que:
 *   1. Crea un MemoryStore + CallTracker limpios (o usa los provistos).
 *   2. Inserta sesión e inbound message en el store.
 *   3. Ejecuta el simulador de dispatch.
 *   4. Devuelve TurnResult con todo el estado final.
 */

import {
  MemoryStore, ConvSession, ConvMessage, Channel, IdentityLevel,
  OutboundRecord, ConvCase, ConvAdminNotif, ActivityEvent,
} from './e2e-memory-store';
import { CallTracker } from './e2e-call-tracker';
import {
  simulateDispatch, DispatchInput, RoutingConfig, WfConfig, DispatchResult,
} from './e2e-dispatch-sim';

// ── Turn config ────────────────────────────────────────────────────────────

export interface TurnSetup {
  tenantId: string;
  session: {
    id:                  string;
    channel?:            Channel;
    identity_level?:     IdentityLevel;
    state?:              string;
    active_case_id?:     string | null;
    active_service_code?: string | null;
    identity_attempts?:  number;
  };
  message: {
    id:      string;
    text:    string;
    channel?: Channel;
  };
}

export interface TurnOptions {
  routing: RoutingConfig;
  wf?:     WfConfig;
  force?:  boolean;
}

// ── Turn result ────────────────────────────────────────────────────────────

export interface TurnResult {
  dispatchResult: DispatchResult;
  inboundStatus:  string;
  outbounds:      OutboundRecord[];
  cases:          ConvCase[];
  activityEvents: ActivityEvent[];
  adminNotifs:    ConvAdminNotif[];
  calledEfs:      string[];
  efCallCount:    (efName: string) => number;
  efWasCalled:    (efName: string) => boolean;
  store:          MemoryStore;
  tracker:        CallTracker;
}

// ── Helpers de privacidad ──────────────────────────────────────────────────

const PII_KEYS = [
  'profile_id', 'identity_data', 'sender_ref', 'phone', 'phone_number',
  'raw_payload', '@c.us', '@s.whatsapp.net', 'full_name', 'email',
] as const;

export function assertNoPII(value: string, label: string): void {
  for (const key of PII_KEYS) {
    if (value.includes(key)) {
      throw new Error(`[PII] "${key}" encontrado en ${label}`);
    }
  }
}

export function assertOutboundNoPII(outbounds: OutboundRecord[]): void {
  for (const o of outbounds) {
    assertNoPII(o.text, `outbound text [${o.ef_name}]`);
    assertNoPII(JSON.stringify(o), `outbound record [${o.ef_name}]`);
  }
}

export function assertActivityNoPII(events: ActivityEvent[]): void {
  for (const e of events) {
    const serialized = JSON.stringify(e.payload);
    assertNoPII(serialized, `activity payload [${e.event_type}]`);
  }
}

export function assertLogsNoPII(store: MemoryStore): void {
  for (const log of store.logs) {
    const serialized = JSON.stringify(log.context);
    assertNoPII(serialized, `log context [${log.ef_name}]`);
  }
}

export function assertNoTechJson(text: string, label = 'outbound text'): void {
  const markers = ['"response_type"', '"error":', '"stack"', 'Error:', 'JSON.stringify'];
  for (const m of markers) {
    if (text.includes(m)) {
      throw new Error(`[TechJson] "${m}" en ${label}`);
    }
  }
}

// ── Core runner ────────────────────────────────────────────────────────────

export function runMockTurn(
  store:   MemoryStore,
  tracker: CallTracker,
  setup:   TurnSetup,
  opts:    TurnOptions,
): TurnResult {
  const channel = (setup.session.channel ?? setup.message.channel ?? 'whatsapp') as Channel;

  // Upsert sesión
  const session: ConvSession = {
    id:                  setup.session.id,
    client_account_id:   setup.tenantId,
    channel,
    identity_level:      setup.session.identity_level    ?? 'STRONG_MATCH_ACTIVE',
    state:               setup.session.state             ?? 'active',
    active_case_id:      setup.session.active_case_id    ?? null,
    active_service_code: setup.session.active_service_code ?? null,
    identity_attempts:   setup.session.identity_attempts ?? 0,
  };
  store.upsertSession(session);

  // Upsert mensaje inbound
  const msgChannel = (setup.message.channel ?? channel) as Channel;
  const message: ConvMessage = {
    id:                setup.message.id,
    session_id:        setup.session.id,
    client_account_id: setup.tenantId,
    direction:         'inbound',
    channel:           msgChannel,
    status:            'received',
    message_text:      setup.message.text,
  };
  store.upsertMessage(message);

  const dispatchInput: DispatchInput = {
    client_account_id: setup.tenantId,
    session_id:        setup.session.id,
    message_id:        setup.message.id,
    force:             opts.force,
    routing:           opts.routing,
    wf:                opts.wf,
  };

  const dispatchResult = simulateDispatch(store, tracker, dispatchInput);
  const finalMsg       = store.getMessage(setup.message.id);

  return {
    dispatchResult,
    inboundStatus:  finalMsg?.status ?? 'unknown',
    outbounds:      store.getOutboundsForSession(setup.session.id),
    cases:          store.getCasesForSession(setup.session.id),
    activityEvents: [...store.activityEvents],
    adminNotifs:    [...store.adminNotifs],
    calledEfs:      tracker.getAllCalledEfs(),
    efCallCount:    (ef) => tracker.getCallCount(ef),
    efWasCalled:    (ef) => tracker.wasCalled(ef),
    store,
    tracker,
  };
}

/**
 * Factory limpia: crea store + tracker nuevos por turno.
 * Útil cuando no se necesita estado compartido entre turnos.
 */
export function runTurn(setup: TurnSetup, opts: TurnOptions): TurnResult {
  return runMockTurn(new MemoryStore(), new CallTracker(), setup, opts);
}
