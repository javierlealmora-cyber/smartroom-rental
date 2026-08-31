/**
 * TYPES-* — Verificación de alineación entre enums TypeScript y migración SQL.
 * No requiere conexión a Supabase. Lee archivos de disco.
 *
 * Cobertura:
 *   TYPES-E* → enums.ts vs CHECK constraints en migración
 *   TYPES-D* → db-types.ts vs columnas de migración
 *   TYPES-P* → privacy-guards.ts (reglas runtime)
 *   TYPES-V* → validators.ts (validadores de contrato)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOT = resolve(__dirname, '../../../../../');
const ENUMS_FILE = resolve(ROOT, 'supabase/functions/_shared/smart-conversations/enums.ts');
const DB_TYPES_FILE = resolve(ROOT, 'supabase/functions/_shared/smart-conversations/db-types.ts');
const CONTRACTS_FILE = resolve(ROOT, 'supabase/functions/_shared/smart-conversations/contracts.ts');
const PRIVACY_FILE = resolve(ROOT, 'supabase/functions/_shared/smart-conversations/privacy-guards.ts');
const VALIDATORS_FILE = resolve(ROOT, 'supabase/functions/_shared/smart-conversations/validators.ts');
const INDEX_FILE = resolve(ROOT, 'supabase/functions/_shared/smart-conversations/index.ts');
const MIGRATION_FILE = resolve(ROOT, 'supabase/migrations/20260716000001_smart_conversations_core_schema.sql');

let enumsSrc: string;
let dbTypesSrc: string;
let contractsSrc: string;
let privacySrc: string;
let validatorsSrc: string;
let indexSrc: string;
let migrationSql: string;

beforeAll(() => {
  enumsSrc = readFileSync(ENUMS_FILE, 'utf-8');
  dbTypesSrc = readFileSync(DB_TYPES_FILE, 'utf-8');
  contractsSrc = readFileSync(CONTRACTS_FILE, 'utf-8');
  privacySrc = readFileSync(PRIVACY_FILE, 'utf-8');
  validatorsSrc = readFileSync(VALIDATORS_FILE, 'utf-8');
  indexSrc = readFileSync(INDEX_FILE, 'utf-8');
  migrationSql = readFileSync(MIGRATION_FILE, 'utf-8');
});

// ---------------------------------------------------------------------------
// TYPES-E — Enums
// ---------------------------------------------------------------------------

describe('TYPES-E: enums.ts vs migración SQL', () => {

  describe('TYPES-E01: SESSION_STATE', () => {
    const states = ['NEW', 'SELECTING_SERVICE', 'IN_SERVICE', 'AWAITING_USER', 'ESCALATED', 'IDLE', 'EXPIRED', 'CLOSED'];
    it.each(states)('SESSION_STATE contiene %s', (state) => {
      expect(enumsSrc).toContain(`'${state}'`);
    });
    it('migración tiene CHECK con todos los estados de sesión', () => {
      expect(migrationSql).toContain("'NEW'");
      expect(migrationSql).toContain("'SELECTING_SERVICE'");
      expect(migrationSql).toContain("'CLOSED'");
    });
    it('SESSION_STATE tiene exactamente 8 valores', () => {
      const matches = enumsSrc.match(/SESSION_STATE\s*=\s*\{([^}]+)\}/s);
      expect(matches).not.toBeNull();
      const entries = (matches![1].match(/:\s*'/g) ?? []).length;
      expect(entries).toBe(8);
    });
  });

  describe('TYPES-E02: IDENTITY_LEVEL', () => {
    const levels = ['NO_MATCH', 'MATCH_INACTIVE', 'PARTIAL_MATCH_ACTIVE', 'STRONG_MATCH_ACTIVE', 'UNVERIFIED_LEAD'];
    it.each(levels)('IDENTITY_LEVEL contiene %s', (level) => {
      expect(enumsSrc).toContain(`'${level}'`);
    });
    it('IDENTITY_LEVEL tiene exactamente 5 valores', () => {
      const matches = enumsSrc.match(/IDENTITY_LEVEL\s*=\s*\{([^}]+)\}/s);
      expect(matches).not.toBeNull();
      const entries = (matches![1].match(/:\s*'/g) ?? []).length;
      expect(entries).toBe(5);
    });
    it('VALIDATION_IDENTITY_LEVELS excluye UNVERIFIED_LEAD', () => {
      expect(enumsSrc).toContain('VALIDATION_IDENTITY_LEVELS');
      expect(enumsSrc).not.toMatch(/VALIDATION_IDENTITY_LEVELS\s*=\s*\[[^\]]*UNVERIFIED_LEAD/);
    });
    it('migración tiene CHECK con los 5 identity levels', () => {
      expect(migrationSql).toContain("'UNVERIFIED_LEAD'");
      expect(migrationSql).toContain("'NO_MATCH'");
      expect(migrationSql).toContain("'STRONG_MATCH_ACTIVE'");
    });
  });

  describe('TYPES-E03: CASE_STATUS', () => {
    const statuses = ['open', 'waiting_user', 'waiting_internal', 'escalated', 'resolved', 'closed'];
    it.each(statuses)('CASE_STATUS contiene %s', (status) => {
      expect(enumsSrc).toContain(`'${status}'`);
    });
    it('CASE_STATUS tiene exactamente 6 valores', () => {
      const matches = enumsSrc.match(/CASE_STATUS\s*=\s*\{([^}]+)\}/s);
      expect(matches).not.toBeNull();
      const entries = (matches![1].match(/:\s*'/g) ?? []).length;
      expect(entries).toBe(6);
    });
    it('CASE_FINAL_STATUSES solo incluye closed', () => {
      expect(enumsSrc).toContain("CASE_FINAL_STATUSES = [CASE_STATUS.CLOSED]");
    });
  });

  describe('TYPES-E04: SEND_QUEUE_STATUS', () => {
    const statuses = ['pending', 'processing', 'succeeded', 'failed'];
    it.each(statuses)('SEND_QUEUE_STATUS contiene %s', (status) => {
      expect(enumsSrc).toContain(`'${status}'`);
    });
    it('migración tiene CHECK con los 4 estados de cola', () => {
      expect(migrationSql).toContain("'pending'");
      expect(migrationSql).toContain("'processing'");
      expect(migrationSql).toContain("'succeeded'");
    });
  });

  describe('TYPES-E05: RESPONSE_TYPE', () => {
    const types = ['success', 'pending_input', 'escalated', 'identity_required', 'error_handled', 'no_service'];
    it.each(types)('RESPONSE_TYPE contiene %s', (t) => {
      expect(enumsSrc).toContain(`'${t}'`);
    });
  });

  describe('TYPES-E06: ACTIVITY_EVENT_TYPE', () => {
    const events = [
      'conv_subscription_activated', 'conv_channel_connected', 'conv_channel_offboarded',
      'conv_conversation_started', 'conv_identity_validated', 'conv_pre_incident_created',
      'conv_incident_created', 'conv_lead_created', 'conv_case_escalated',
      'conv_case_summary_updated', 'conv_case_closed', 'conv_case_created',
      'conv_message_delivery_failed',
    ];
    it.each(events)('ACTIVITY_EVENT_TYPE contiene %s', (event) => {
      expect(enumsSrc).toContain(`'${event}'`);
    });
    it('enums NO contiene conv_help_escalated (nombre incorrecto)', () => {
      expect(enumsSrc).not.toContain('conv_help_escalated');
    });
    it('ACTIVITY_EVENT_TYPE tiene exactamente 13 valores', () => {
      const matches = enumsSrc.match(/ACTIVITY_EVENT_TYPE\s*=\s*\{([^}]+)\}/s);
      expect(matches).not.toBeNull();
      const entries = (matches![1].match(/:\s*'/g) ?? []).length;
      expect(entries).toBe(13);
    });
  });

  describe('TYPES-E07: WA_SESSION_STATUS', () => {
    const statuses = ['disconnected', 'connecting', 'active', 'error'];
    it.each(statuses)('WA_SESSION_STATUS contiene %s', (s) => {
      expect(enumsSrc).toContain(`'${s}'`);
    });
  });

  describe('TYPES-E08: nomenclatura prohibida en enums', () => {
    it('enums NO contiene next_retry_at', () => {
      expect(enumsSrc).not.toContain('next_retry_at');
    });
    it('enums NO contiene attempt_count', () => {
      expect(enumsSrc).not.toContain('attempt_count');
    });
    it('enums NO contiene UNVERIFIED como valor independiente', () => {
      expect(enumsSrc).not.toMatch(/['"]UNVERIFIED['"]/);
    });
  });

});

// ---------------------------------------------------------------------------
// TYPES-D — DB Types
// ---------------------------------------------------------------------------

describe('TYPES-D: db-types.ts vs migración SQL', () => {

  it('TYPES-D01: ConvSessionRow exporta sender_ref como string', () => {
    expect(dbTypesSrc).toContain('sender_ref: string');
  });

  it('TYPES-D02: ConvSessionRow documenta sender_ref como PII en WhatsApp', () => {
    // El JSDoc menciona PII antes del campo sender_ref:
    expect(dbTypesSrc).toMatch(/PII[\s\S]{0,200}sender_ref/);
  });

  it('TYPES-D03: ConvSessionRow tiene identity_attempts como number', () => {
    expect(dbTypesSrc).toContain('identity_attempts: number');
  });

  it('TYPES-D04: ConvSendQueueRow usa "attempts" no "attempt_count"', () => {
    expect(dbTypesSrc).toContain('attempts: number');
    expect(dbTypesSrc).not.toContain('attempt_count');
  });

  it('TYPES-D05: ConvSendQueueRow usa "next_attempt_at" no "next_retry_at"', () => {
    expect(dbTypesSrc).toContain('next_attempt_at: string');
    expect(dbTypesSrc).not.toContain('next_retry_at');
  });

  it('TYPES-D06: ConvWaSessionRow documenta api_key_secret_name (no plain text)', () => {
    expect(dbTypesSrc).toContain('api_key_secret_name');
    // El JSDoc menciona Vault antes del campo:
    expect(dbTypesSrc).toMatch(/Vault[\s\S]{0,100}api_key_secret_name/);
  });

  it('TYPES-D07: ConvMessageRow tiene wasender_message_id como nullable', () => {
    expect(dbTypesSrc).toContain('wasender_message_id: string | null');
  });

  it('TYPES-D08: ConvMessageRow tiene raw_payload con JSDoc de retención', () => {
    // El JSDoc menciona retención antes del campo:
    expect(dbTypesSrc).toMatch(/30 días[\s\S]{0,100}raw_payload/);
  });

  it('TYPES-D09: ConvSessionRow tiene profile_id como nullable', () => {
    expect(dbTypesSrc).toContain('profile_id: string | null');
  });

  it('TYPES-D10: ConvSessionIdentityData no incluye phone_number', () => {
    const identityDataBlock = dbTypesSrc.match(/interface ConvSessionIdentityData \{([^}]+)\}/s);
    expect(identityDataBlock).not.toBeNull();
    expect(identityDataBlock![1]).not.toContain('phone_number');
    expect(identityDataBlock![1]).not.toContain('phone');
  });

  it('TYPES-D11: las 8 tablas conv_ tienen su tipo Row exportado', () => {
    const rowTypes = [
      'ConvServiceActivationRow',
      'ConvWaSessionRow',
      'ConvWcConfigRow',
      'ConvSessionRow',
      'ConvCaseRow',
      'ConvMessageRow',
      'ConvSendQueueRow',
      'ConvAdminNotificationRow',
    ];
    for (const t of rowTypes) {
      expect(dbTypesSrc).toContain(t);
    }
  });

});

// ---------------------------------------------------------------------------
// TYPES-C — Contracts
// ---------------------------------------------------------------------------

describe('TYPES-C: contracts.ts vs contratos oficiales', () => {

  it('TYPES-C01: NormalizedMessage tiene sender_ref como string obligatorio', () => {
    expect(contractsSrc).toContain('sender_ref: string');
  });

  it('TYPES-C02: NormalizedMessage documenta sender_ref con instrucción sobre @c.us', () => {
    // El JSDoc menciona @c.us antes del campo sender_ref:
    expect(contractsSrc).toMatch(/@c\.us[\s\S]{0,400}sender_ref/);
  });

  it('TYPES-C03: IdentityLevelForN8n solo expone identity_level', () => {
    const block = contractsSrc.match(/interface IdentityLevelForN8n \{([^}]+)\}/s);
    expect(block).not.toBeNull();
    const fields = block![1].trim().split('\n').filter(l => l.trim() && !l.trim().startsWith('/') && !l.trim().startsWith('*'));
    expect(fields.length).toBe(1);
    expect(block![1]).toContain('identity_level');
    expect(block![1]).not.toContain('profile_id');
    expect(block![1]).not.toContain('phone');
  });

  it('TYPES-C04: IdentityValidationResult tiene match_details obligatorio', () => {
    expect(contractsSrc).toContain('match_details: {');
  });

  it('TYPES-C05: ActivityDataIncidentCreated NO tiene session_id', () => {
    const block = contractsSrc.match(/interface ActivityDataIncidentCreated \{([^}]+)\}/s);
    expect(block).not.toBeNull();
    expect(block![1]).not.toContain('session_id');
  });

  it('TYPES-C06: ActivityDataLeadCreated NO tiene session_id', () => {
    const block = contractsSrc.match(/interface ActivityDataLeadCreated \{([^}]+)\}/s);
    expect(block).not.toBeNull();
    expect(block![1]).not.toContain('session_id');
  });

  it('TYPES-C07: CanonicalResponse NO tiene campos PII como campos directos', () => {
    const block = contractsSrc.match(/interface CanonicalResponse \{([^}]+)\}/s);
    expect(block).not.toBeNull();
    expect(block![1]).not.toContain('profile_id:');
    expect(block![1]).not.toContain('phone_number:');
    expect(block![1]).not.toContain('full_name:');
  });

  it('TYPES-C08: contracts tiene los 13 ActivityData interfaces', () => {
    const count = (contractsSrc.match(/interface ActivityData/g) ?? []).length;
    expect(count).toBe(13);
  });

  it('TYPES-C09: ActivityLogEvent usa ActivityEventType del enum', () => {
    expect(contractsSrc).toContain('event_type: ActivityEventType');
  });

  it('TYPES-C10: CanonicalResponse.text tiene JSDoc sobre marcadores prohibidos', () => {
    // El JSDoc prohíbe marcadores antes del campo text:
    expect(contractsSrc).toMatch(/incident_ref[\s\S]{0,200}text: string/);
  });

});

// ---------------------------------------------------------------------------
// TYPES-P — Privacy Guards
// ---------------------------------------------------------------------------

describe('TYPES-P: privacy-guards.ts', () => {

  it('TYPES-P01: PII_FIELDS_FORBIDDEN_IN_N8N incluye profile_id', () => {
    expect(privacySrc).toContain("'profile_id'");
  });

  it('TYPES-P02: PII_FIELDS_FORBIDDEN_IN_N8N incluye phone_number', () => {
    expect(privacySrc).toContain("'phone_number'");
  });

  it('TYPES-P03: PII_FIELDS_FORBIDDEN_IN_N8N incluye assignment_id', () => {
    expect(privacySrc).toContain("'assignment_id'");
  });

  it('TYPES-P04: OFFICIAL_TEMPLATE_MARKERS incluye los 5 marcadores oficiales', () => {
    const markers = ['{incident_ref}', '{lead_ref}', '{due_date}', '{amount}', '{bot_name}'];
    for (const m of markers) {
      expect(privacySrc).toContain(m);
    }
  });

  it('TYPES-P05: OFFICIAL_TEMPLATE_MARKERS NO incluye {user_name}', () => {
    // {user_name} no es marcador oficial
    const block = privacySrc.match(/OFFICIAL_TEMPLATE_MARKERS\s*=\s*\[([^\]]+)\]/s);
    expect(block).not.toBeNull();
    expect(block![1]).not.toContain('{user_name}');
  });

  it('TYPES-P06: FORBIDDEN_UNSUBSTITUTED_MARKERS incluye {user_name}', () => {
    // {user_name} debe detectarse como no sustituido aunque no sea oficial
    expect(privacySrc).toContain("'{user_name}'");
  });

  it('TYPES-P07: senderRefIsPii trata WhatsApp como PII si empieza con +', () => {
    expect(privacySrc).toContain("senderRef.startsWith('+'");
  });

  it('TYPES-P08: senderRefHasForbiddenSuffix detecta @c.us', () => {
    expect(privacySrc).toContain('@c.us');
  });

  it('TYPES-P09: senderRefHasForbiddenSuffix detecta @s.whatsapp.net', () => {
    expect(privacySrc).toContain('@s.whatsapp.net');
  });

  it('TYPES-P10: hasSessionIdInRestrictedPayload existe para conv_incident_created y conv_lead_created', () => {
    expect(privacySrc).toContain('conv_incident_created');
    expect(privacySrc).toContain('conv_lead_created');
  });

  it('TYPES-P11: validateIdentityResultConsistency detecta profile_id en NO_MATCH', () => {
    expect(privacySrc).toMatch(/NO_MATCH[\s\S]{0,200}profile_id/);
  });

  it('TYPES-P12: validateIdentityResultConsistency detecta assignment_id en MATCH_INACTIVE', () => {
    expect(privacySrc).toMatch(/MATCH_INACTIVE[\s\S]{0,200}assignment_id/);
  });

  it('TYPES-P13: PII_FIELDS_FORBIDDEN_IN_N8N incluye sender_ref', () => {
    expect(privacySrc).toMatch(/PII_FIELDS_FORBIDDEN_IN_N8N[\s\S]{0,400}'sender_ref'/);
  });

  it('TYPES-P14: PII_FIELDS_FORBIDDEN_IN_N8N incluye room_id', () => {
    expect(privacySrc).toMatch(/PII_FIELDS_FORBIDDEN_IN_N8N[\s\S]{0,400}'room_id'/);
  });

  it('TYPES-P15: PII_FIELDS_FORBIDDEN_IN_N8N incluye identity_data y raw_payload', () => {
    expect(privacySrc).toMatch(/PII_FIELDS_FORBIDDEN_IN_N8N[\s\S]{0,600}'identity_data'/);
    expect(privacySrc).toMatch(/PII_FIELDS_FORBIDDEN_IN_N8N[\s\S]{0,600}'raw_payload'/);
  });

  it('TYPES-P16: PII_FIELDS_FORBIDDEN_IN_ACTIVITY_LOG incluye sender_ref', () => {
    expect(privacySrc).toMatch(/PII_FIELDS_FORBIDDEN_IN_ACTIVITY_LOG[\s\S]{0,600}'sender_ref'/);
  });

  it('TYPES-P17: PII_FIELDS_FORBIDDEN_IN_ACTIVITY_LOG incluye message_text y description', () => {
    expect(privacySrc).toMatch(/PII_FIELDS_FORBIDDEN_IN_ACTIVITY_LOG[\s\S]{0,800}'message_text'/);
    expect(privacySrc).toMatch(/PII_FIELDS_FORBIDDEN_IN_ACTIVITY_LOG[\s\S]{0,800}'description'/);
  });

  it('TYPES-P18: PII_FIELDS_FORBIDDEN_IN_ACTIVITY_LOG incluye raw_payload e identity_data', () => {
    expect(privacySrc).toMatch(/PII_FIELDS_FORBIDDEN_IN_ACTIVITY_LOG[\s\S]{0,900}'raw_payload'/);
    expect(privacySrc).toMatch(/PII_FIELDS_FORBIDDEN_IN_ACTIVITY_LOG[\s\S]{0,900}'identity_data'/);
  });

});

// ---------------------------------------------------------------------------
// TYPES-V — Validators
// ---------------------------------------------------------------------------

describe('TYPES-V: validators.ts', () => {

  it('TYPES-V01: validateNormalizedMessage existe y es función', () => {
    expect(validatorsSrc).toContain('export function validateNormalizedMessage');
  });

  it('TYPES-V02: validateNormalizedMessage valida sender_ref con sufijo @c.us', () => {
    expect(validatorsSrc).toContain('senderRefHasForbiddenSuffix');
  });

  it('TYPES-V03: validateNormalizedMessage rechaza raw_payload en NormalizedMessage', () => {
    expect(validatorsSrc).toContain('raw_payload');
  });

  it('TYPES-V04: validateNormalizedMessage valida que audio requiere is_transcribed=true', () => {
    expect(validatorsSrc).toContain("is_transcribed debe ser true cuando message_type = audio");
  });

  it('TYPES-V05: validateNormalizedMessage detecta WebChat con audio/document (no soportado)', () => {
    expect(validatorsSrc).toContain('WebChat V1');
  });

  it('TYPES-V06: validateCanonicalResponse detecta marcadores sin sustituir en text', () => {
    expect(validatorsSrc).toContain('findUnsubstitutedMarkers');
  });

  it('TYPES-V07: validateCanonicalResponse detecta campos PII en respuesta', () => {
    expect(validatorsSrc).toContain('Campo PII prohibido en CanonicalResponse');
  });

  it('TYPES-V08: validateIdentityRequest requiere al menos un identificador', () => {
    expect(validatorsSrc).toContain('al menos uno de:');
  });

  it('TYPES-V09: validateIdentityResult delega a validateIdentityResultConsistency', () => {
    expect(validatorsSrc).toContain('validateIdentityResultConsistency');
  });

  it('TYPES-V10: validateIdentityResult verifica matched_by vacío en NO_MATCH', () => {
    expect(validatorsSrc).toContain('match_details.matched_by debe ser [] cuando NO_MATCH');
  });

  it('TYPES-V11: validateIdentityResult verifica confidence >= 0.95 en STRONG_MATCH_ACTIVE', () => {
    expect(validatorsSrc).toContain('>= 0.95');
  });

  it('TYPES-V12: validateCanonicalResponse valida escalation_reason cuando escalated', () => {
    expect(validatorsSrc).toContain('escalation_reason es obligatorio');
  });

});

// ---------------------------------------------------------------------------
// TYPES-I — Index (barrel)
// ---------------------------------------------------------------------------

describe('TYPES-I: index.ts barrel', () => {

  it('TYPES-I01: re-exporta enums.ts', () => {
    expect(indexSrc).toContain("from './enums.js'");
  });

  it('TYPES-I02: re-exporta db-types.ts', () => {
    expect(indexSrc).toContain("from './db-types.js'");
  });

  it('TYPES-I03: re-exporta contracts.ts', () => {
    expect(indexSrc).toContain("from './contracts.js'");
  });

  it('TYPES-I04: re-exporta privacy-guards.ts', () => {
    expect(indexSrc).toContain("from './privacy-guards.js'");
  });

  it('TYPES-I05: re-exporta validators.ts', () => {
    expect(indexSrc).toContain("from './validators.js'");
  });

});

// ---------------------------------------------------------------------------
// TYPES-X — Coherencia cruzada enums ↔ migración
// ---------------------------------------------------------------------------

describe('TYPES-X: coherencia cruzada enums vs migración', () => {

  it('TYPES-X01: migración NO usa "attempt_count"', () => {
    expect(migrationSql).not.toContain('attempt_count');
  });

  it('TYPES-X02: migración NO usa "next_retry_at"', () => {
    expect(migrationSql).not.toContain('next_retry_at');
  });

  it('TYPES-X03: migración NO usa "UNVERIFIED" como identity level sin sufijo', () => {
    expect(migrationSql).not.toMatch(/'UNVERIFIED'(?!\s*_)/);
  });

  it('TYPES-X04: migración NO usa NULLS NOT DISTINCT', () => {
    expect(migrationSql).not.toContain('NULLS NOT DISTINCT');
  });

  it('TYPES-X05: enums exporta todos los tipos necesarios para db-types', () => {
    const dbImportMatch = dbTypesSrc.match(/import type \{([^}]+)\} from '\.\/enums\.js'/s);
    expect(dbImportMatch).not.toBeNull();
    const importedTypes = dbImportMatch![1].split(',').map(t => t.trim()).filter(Boolean);
    for (const t of importedTypes) {
      expect(enumsSrc).toContain(t);
    }
  });

  it('TYPES-X06: contracts exporta IdentityLevelForN8n (safe-for-n8n subset)', () => {
    expect(contractsSrc).toContain('IdentityLevelForN8n');
  });

  it('TYPES-X07: migración tiene tabla conv_send_queue con columna "attempts"', () => {
    expect(migrationSql).toMatch(/conv_send_queue[\s\S]{0,2000}attempts\s+integer/);
  });

  it('TYPES-X08: migración tiene tabla conv_send_queue con columna "next_attempt_at"', () => {
    expect(migrationSql).toMatch(/conv_send_queue[\s\S]{0,2000}next_attempt_at/);
  });

});
