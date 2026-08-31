/**
 * e2e-memory-store — Almacén en memoria que simula las tablas de Supabase
 * usadas por el pipeline SmartConversations.
 *
 * Diseñado para tests E2E dinámicos: reemplaza las llamadas reales a Supabase
 * sin depender de Deno, red ni DB real.
 */

export type InboundStatus = 'received' | 'processing' | 'sent' | 'failed';
export type IdentityLevel =
  | 'STRONG_MATCH_ACTIVE'
  | 'PARTIAL_MATCH_ACTIVE'
  | 'MATCH_INACTIVE'
  | 'NO_MATCH'
  | 'UNVERIFIED_LEAD';
export type Channel    = 'whatsapp' | 'webchat';
export type CaseRefType = 'incident' | 'lead' | 'help_ticket';

export interface ConvSession {
  id:                  string;
  client_account_id:   string;
  channel:             Channel;
  identity_level:      IdentityLevel;
  state:               string;
  active_case_id:      string | null;
  active_service_code: string | null;
  identity_attempts:   number;
}

export interface ConvMessage {
  id:                string;
  session_id:        string;
  client_account_id: string;
  direction:         'inbound' | 'outbound';
  channel:           Channel;
  status:            InboundStatus;
  message_text:      string;
}

export interface ConvCase {
  id:                string;
  session_id:        string;
  client_account_id: string;
  status:            string;
  case_ref_type:     CaseRefType;
  service_code:      string;
  case_ref?:         string | null;
  case_ref_id?:      string | null;
}

export interface ConvAdminNotif {
  id:                string;
  client_account_id: string;
  event_type:        string;
  severity:          string;
  context:           Record<string, unknown>;
}

export interface ActivityEvent {
  event_type:        string;
  source:            string;
  client_account_id: string;
  payload:           Record<string, unknown>;
}

export interface OutboundRecord {
  ef_name:           string;
  session_id:        string;
  client_account_id: string;
  text:              string;
}

export interface LogRecord {
  level:   'info' | 'warn' | 'error';
  ef_name: string;
  context: Record<string, unknown>;
}

export class MemoryStore {
  sessions        = new Map<string, ConvSession>();
  messages        = new Map<string, ConvMessage>();
  cases           = new Map<string, ConvCase>();
  adminNotifs:      ConvAdminNotif[]   = [];
  activityEvents:   ActivityEvent[]    = [];
  outbounds:        OutboundRecord[]   = [];
  logs:             LogRecord[]        = [];
  private counter = 0;

  private uid(prefix: string): string {
    return `${prefix}-${(++this.counter).toString(16).padStart(4, '0')}`;
  }

  // ── Sessions ──────────────────────────────────────────────────────────────
  upsertSession(s: ConvSession): void { this.sessions.set(s.id, { ...s }); }
  getSession(id: string): ConvSession | undefined { return this.sessions.get(id); }
  updateSession(id: string, up: Partial<ConvSession>): void {
    const s = this.sessions.get(id);
    if (s) this.sessions.set(id, { ...s, ...up });
  }

  // ── Messages ──────────────────────────────────────────────────────────────
  upsertMessage(m: ConvMessage): void { this.messages.set(m.id, { ...m }); }
  getMessage(id: string): ConvMessage | undefined { return this.messages.get(id); }
  updateMessageStatus(id: string, status: InboundStatus): void {
    const m = this.messages.get(id);
    if (m) this.messages.set(id, { ...m, status });
  }
  /** Actualización condicional: solo si status='received'. Devuelve true si actualizó. */
  conditionalUpdateToProcessing(id: string): boolean {
    const m = this.messages.get(id);
    if (!m || m.status !== 'received') return false;
    this.messages.set(id, { ...m, status: 'processing' });
    return true;
  }

  // ── Cases ─────────────────────────────────────────────────────────────────
  insertCase(c: Omit<ConvCase, 'id'>): ConvCase {
    const newCase: ConvCase = { ...c, id: this.uid('case') };
    this.cases.set(newCase.id, newCase);
    return newCase;
  }
  updateCase(id: string, up: Partial<ConvCase>): void {
    const c = this.cases.get(id);
    if (c) this.cases.set(id, { ...c, ...up });
  }
  getCasesForSession(sid: string): ConvCase[] {
    return [...this.cases.values()].filter(c => c.session_id === sid);
  }

  // ── Admin notifs ──────────────────────────────────────────────────────────
  insertAdminNotif(n: Omit<ConvAdminNotif, 'id'>): void {
    this.adminNotifs.push({ ...n, id: this.uid('notif') });
  }

  // ── Activity events ───────────────────────────────────────────────────────
  publishActivity(evt: ActivityEvent): void { this.activityEvents.push(evt); }
  getEventsOfType(t: string): ActivityEvent[] {
    return this.activityEvents.filter(e => e.event_type === t);
  }

  // ── Outbound ──────────────────────────────────────────────────────────────
  recordOutbound(rec: OutboundRecord): string {
    this.outbounds.push(rec);
    return this.uid('out');
  }
  getOutboundsForSession(sid: string): OutboundRecord[] {
    return this.outbounds.filter(o => o.session_id === sid);
  }

  // ── Logs (mock) ───────────────────────────────────────────────────────────
  log(level: LogRecord['level'], efName: string, ctx: Record<string, unknown>): void {
    this.logs.push({ level, ef_name: efName, context: ctx });
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  reset(): void {
    this.sessions.clear(); this.messages.clear(); this.cases.clear();
    this.adminNotifs = []; this.activityEvents = [];
    this.outbounds = []; this.logs = []; this.counter = 0;
  }
}
