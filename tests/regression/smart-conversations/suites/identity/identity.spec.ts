/**
 * Suite: Identity — WF-IDENTITY (Fase 7)
 * Análisis estático de conv-core-validate-identity, conv-identity-progressive,
 * core-identity-client, identity-level y las modificaciones mínimas a conv-ingest
 * y conv-web-session.
 * IDs: IDENT-AUTH, IDENT-MOCK, IDENT-WA, IDENT-WC, IDENT-PROG, IDENT-NODEG,
 *      IDENT-ACT, IDENT-PRIV, IDENT-RES, IDENT-REG
 */

import { describe, it, beforeAll, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EF_DIR     = resolve(__dirname, '../../../../../supabase/functions');
const SHARED_DIR = resolve(EF_DIR, '_shared/smart-conversations/runtime');

let srcValidateIdentity:    string;
let srcIdentityProgressive: string;
let srcCoreIdentityClient:  string;
let srcIdentityLevel:       string;
let srcIngest:              string;
let srcWebSession:          string;

beforeAll(() => {
  srcValidateIdentity    = readFileSync(resolve(EF_DIR, 'conv-core-validate-identity/index.ts'), 'utf-8');
  srcIdentityProgressive = readFileSync(resolve(EF_DIR, 'conv-identity-progressive/index.ts'), 'utf-8');
  srcCoreIdentityClient  = readFileSync(resolve(SHARED_DIR, 'core-identity-client.ts'), 'utf-8');
  srcIdentityLevel       = readFileSync(resolve(SHARED_DIR, 'identity-level.ts'), 'utf-8');
  srcIngest              = readFileSync(resolve(EF_DIR, 'conv-ingest/index.ts'), 'utf-8');
  srcWebSession          = readFileSync(resolve(EF_DIR, 'conv-web-session/index.ts'), 'utf-8');
});

// ---------------------------------------------------------------------------
// IDENT-AUTH — autenticación y validación de input
// ---------------------------------------------------------------------------

describe('IDENT-AUTH: autenticación y validación de input', () => {

  it('IDENT-AUTH-01: conv-core-validate-identity requiere service_role', () => {
    expect(srcValidateIdentity).toContain('isServiceRoleRequest');
    expect(srcValidateIdentity).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(srcValidateIdentity).toContain('ERROR_CODES.UNAUTHORIZED');
  });

  it('IDENT-AUTH-02: conv-core-validate-identity rechaza session_token — no usa getUser/getSession', () => {
    expect(srcValidateIdentity).not.toContain('getUser');
    expect(srcValidateIdentity).not.toContain('getSession');
  });

  it('IDENT-AUTH-03: conv-core-validate-identity rechaza payload sin client_account_id', () => {
    expect(srcValidateIdentity).toContain('client_account_id es obligatorio');
  });

  it('IDENT-AUTH-04: conv-core-validate-identity rechaza si no hay phone ni profile_id ni session_id', () => {
    expect(srcValidateIdentity).toContain('Se requiere al menos phone, profile_id o session_id');
  });

  it('IDENT-AUTH-05: conv-identity-progressive requiere service_role', () => {
    expect(srcIdentityProgressive).toContain('isServiceRoleRequest');
    expect(srcIdentityProgressive).toContain('ERROR_CODES.UNAUTHORIZED');
  });

  it('IDENT-AUTH-06: conv-identity-progressive rechaza provided_field inválido', () => {
    expect(srcIdentityProgressive).toContain('VALID_IDENTITY_FIELDS');
    expect(srcIdentityProgressive).toContain('provided_field inválido');
  });

});

// ---------------------------------------------------------------------------
// IDENT-MOCK — adapter mock de identidad Core
// ---------------------------------------------------------------------------

describe('IDENT-MOCK: adapter core-identity-client', () => {

  it('IDENT-MOCK-07: adapter no hace fetch a Core real', () => {
    expect(srcCoreIdentityClient).not.toContain('fetch(');
    expect(srcCoreIdentityClient).not.toContain('smartroom-core');
    expect(srcCoreIdentityClient).not.toContain('/api/v1/');
  });

  it("IDENT-MOCK-08: adapter no devuelve 'UNVERIFIED_LEAD'", () => {
    // Ninguna rama del mock devuelve el literal 'UNVERIFIED_LEAD'
    expect(srcCoreIdentityClient).not.toContain("'UNVERIFIED_LEAD'");
  });

  it('IDENT-MOCK-09: adapter no devuelve WEAK_MATCH', () => {
    expect(srcCoreIdentityClient).not.toContain('WEAK_MATCH');
  });

  it("IDENT-MOCK-10: adapter no devuelve 'UNVERIFIED'", () => {
    expect(srcCoreIdentityClient).not.toContain("'UNVERIFIED'");
  });

  it('IDENT-MOCK-11: profile_id tiene prioridad sobre phone', () => {
    // La rama if (input.profile_id) aparece antes que if (input.phone ...) en el código
    const profileIdBranchPos = srcCoreIdentityClient.indexOf('if (input.profile_id)');
    const phoneBranchPos     = srcCoreIdentityClient.indexOf('if (input.phone');
    expect(profileIdBranchPos).toBeGreaterThan(0);
    expect(phoneBranchPos).toBeGreaterThan(0);
    expect(profileIdBranchPos).toBeLessThan(phoneBranchPos);
  });

  it('IDENT-MOCK-12: JWT válido no implica tenencia activa — MATCH_INACTIVE es nivel válido del sistema', () => {
    // El adapter tiene MATCH_INACTIVE en su conjunto de niveles válidos
    // conv-web-session público ya no asigna MATCH_INACTIVE desde datos del widget
    // (la identidad autenticada requiere JWT firmado en fase posterior)
    expect(srcCoreIdentityClient).toContain('MATCH_INACTIVE');
    // conv-web-session siempre inserta NO_MATCH sin JWT; nunca asigna MATCH_INACTIVE desde payload público
    // No debe haber fetch() a conv-core-validate-identity en codigo activo (JSDoc puede mencionarlo)
    expect(srcWebSession).not.toMatch(/fetch\s*\(.*conv-core-validate-identity/);
    expect(srcWebSession).toContain('NO_MATCH');
  });

  it('IDENT-MOCK-13: MATCH_INACTIVE es un nivel válido en el sistema de identidad', () => {
    // El adapter mock no devuelve MATCH_INACTIVE directamente, pero es un nivel
    // válido definido en IDENTITY_LEVEL_RANK (lo puede devolver el Core real en Fase futura)
    expect(srcIdentityLevel).toContain("'MATCH_INACTIVE': 1");
  });

});

// ---------------------------------------------------------------------------
// IDENT-WA — fast-path WhatsApp
// ---------------------------------------------------------------------------

describe('IDENT-WA: fast-path WhatsApp en conv-ingest', () => {

  it('IDENT-WA-14: WhatsApp usa sender_ref como teléfono normalizado sin @c.us', () => {
    // El fast-path pasa phone: sender_ref (ya normalizado — @c.us rechazado en validación)
    expect(srcIngest).toContain('phone: sender_ref');
    expect(srcIngest).not.toMatch(/phone:\s*sender_ref.*@c\.us/);
  });

  it('IDENT-WA-15: llama a conv-core-validate-identity con phone', () => {
    expect(srcIngest).toContain('conv-core-validate-identity');
    expect(srcIngest).toContain('phone: sender_ref');
  });

  it('IDENT-WA-16: persiste identity_level en conv_sessions', () => {
    expect(srcIngest).toContain('identity_level: newLevel');
    expect(srcIngest).toContain("'conv_sessions'");
  });

  it('IDENT-WA-17: persiste profile_id si existe en la respuesta', () => {
    // Patrón: sessionUpdate['profile_id'] = identData.data.profile_id
    expect(srcIngest).toContain("sessionUpdate['profile_id'] = identData.data.profile_id");
    expect(srcIngest).toContain('sessionUpdate');
  });

  it('IDENT-WA-18: no guarda phone_number en identity_data', () => {
    // safeData nunca asigna phone_number
    const safeDataBlock = srcIngest.match(/safeData[\s\S]{0,400}\}/);
    expect(safeDataBlock).not.toBeNull();
    expect(safeDataBlock![0]).not.toContain('phone_number');
  });

  it('IDENT-WA-19: no degrada identidad existente — usa canAdvanceIdentityLevel', () => {
    expect(srcIngest).toContain('canAdvanceIdentityLevel');
    // La actualización de sesión solo ocurre cuando canAdvanceIdentityLevel devuelve true
    const advanceBlock = srcIngest.match(/canAdvanceIdentityLevel[\s\S]{0,300}sessionUpdate/);
    expect(advanceBlock).not.toBeNull();
  });

  it('IDENT-WA-20: no loguea teléfono ni sender_ref en logs del fast-path', () => {
    expect(srcIngest).not.toMatch(/log\.(info|warn|error)[^;]*\bphone\b/);
    expect(srcIngest).not.toMatch(/log\.(info|warn|error)[^;]*sender_ref/);
  });

});

// ---------------------------------------------------------------------------
// IDENT-WC — fast-path WebChat
// ---------------------------------------------------------------------------

describe('IDENT-WC: fast-path WebChat en conv-web-session', () => {

  it('IDENT-WC-21: WebChat público rechaza profile_id sin JWT -- no llama conv-core-validate-identity', () => {
    // Seguridad: el widget público no puede enviar profile_id sin JWT firmado.
    // conv-web-session rechaza el campo y no llama a conv-core-validate-identity.
    // La identidad WebChat autenticada se implementa en fase posterior con JWT real.
    // No debe haber fetch() a conv-core-validate-identity en codigo activo (JSDoc puede mencionarlo)
    expect(srcWebSession).not.toMatch(/fetch\s*\(.*conv-core-validate-identity/);
    expect(srcWebSession).toContain('detectForbiddenPublicInput');
    expect(srcWebSession).toContain('Campo no permitido en WebChat público');
  });

  it('IDENT-WC-22: WebChat sin JWT siempre inicia NO_MATCH -- const no let', () => {
    // identity_level es siempre NO_MATCH en WebChat público sin JWT
    // ya no hay fast-path con datos del widget (Fase 10E microfix)
    expect(srcWebSession).toContain("wcIdentityLevel = 'NO_MATCH'");
    expect(srcWebSession).toContain('identity_level: wcIdentityLevel');
  });

  it('IDENT-WC-23: WebChat no devuelve profile_id al widget (Fase 11B3)', () => {
    // Fase 11B3: respuesta via successResponse = ok(...) + addCorsToResponse
    const returnBlock = srcWebSession.match(/(?:return ok|const successResponse = ok)\(\{[\s\S]{0,500}\}\)/);
    expect(returnBlock).not.toBeNull();
    expect(returnBlock![0]).not.toContain('profile_id');
  });

  it('IDENT-WC-24: WebChat no devuelve identity_data al widget (Fase 11B3)', () => {
    const returnBlock = srcWebSession.match(/(?:return ok|const successResponse = ok)\(\{[\s\S]{0,500}\}\)/);
    expect(returnBlock).not.toBeNull();
    expect(returnBlock![0]).not.toContain('identity_data');
  });

  it('IDENT-WC-25: WebChat público nunca asigna MATCH_INACTIVE -- solo NO_MATCH sin JWT', () => {
    // Seguridad: sin JWT firmado, conv-web-session solo puede insertar NO_MATCH.
    // MATCH_INACTIVE es un nivel válido del sistema pero requiere autenticación real.
    expect(srcWebSession).not.toContain('MATCH_INACTIVE');
    expect(srcWebSession).toContain("wcIdentityLevel = 'NO_MATCH'");
    // No debe haber fetch() a conv-core-validate-identity en codigo activo (JSDoc puede mencionarlo)
    expect(srcWebSession).not.toMatch(/fetch\s*\(.*conv-core-validate-identity/);
  });

});

// ---------------------------------------------------------------------------
// IDENT-PROG — flujo progresivo WF-IDENTITY
// ---------------------------------------------------------------------------

describe('IDENT-PROG: conv-identity-progressive — flujo progresivo', () => {

  it('IDENT-PROG-26: pide full_name si falta — VALID_IDENTITY_FIELDS empieza por full_name', () => {
    expect(srcIdentityProgressive).toContain('VALID_IDENTITY_FIELDS');
    expect(srcIdentityProgressive).toMatch(/VALID_IDENTITY_FIELDS\s*=\s*\[.*'full_name'/);
  });

  it('IDENT-PROG-27: después pide residence_name', () => {
    expect(srcIdentityProgressive).toContain("'residence_name'");
  });

  it('IDENT-PROG-28: después pide room_label', () => {
    expect(srcIdentityProgressive).toContain("'room_label'");
    const fieldsMatch = srcIdentityProgressive.match(/VALID_IDENTITY_FIELDS\s*=\s*\[([^\]]+)\]/);
    expect(fieldsMatch).not.toBeNull();
    // Orden: full_name, residence_name, room_label
    const fields = fieldsMatch![1];
    const fnPos = fields.indexOf('full_name');
    const rnPos = fields.indexOf('residence_name');
    const rlPos = fields.indexOf('room_label');
    expect(fnPos).toBeLessThan(rnPos);
    expect(rnPos).toBeLessThan(rlPos);
  });

  it('IDENT-PROG-29: no repregunta campos ya persistidos — usa find(f => !newIdentityData[f])', () => {
    expect(srcIdentityProgressive).toContain('VALID_IDENTITY_FIELDS.find(f => !newIdentityData[f])');
  });

  it('IDENT-PROG-30: persiste identity_data en conv_sessions', () => {
    expect(srcIdentityProgressive).toContain('identity_data: newIdentityData');
    expect(srcIdentityProgressive).toContain("'conv_sessions'");
  });

  it('IDENT-PROG-31: no persiste phone_number en identity_data', () => {
    // Se elimina explícitamente phone_number del newIdentityData
    expect(srcIdentityProgressive).toContain("delete newIdentityData['phone_number']");
  });

  it('IDENT-PROG-32: con datos suficientes llama a conv-core-validate-identity', () => {
    expect(srcIdentityProgressive).toContain('conv-core-validate-identity');
    expect(srcIdentityProgressive).toContain('session_id');
  });

  it('IDENT-PROG-33: si PARTIAL_MATCH_ACTIVE actualiza identity_level en sesión', () => {
    expect(srcIdentityProgressive).toContain("'PARTIAL_MATCH_ACTIVE'");
    expect(srcIdentityProgressive).toContain('identity_level: identityLevel');
  });

  it('IDENT-PROG-34: si STRONG_MATCH_ACTIVE actualiza identity_level en sesión', () => {
    expect(srcIdentityProgressive).toContain("'STRONG_MATCH_ACTIVE'");
    expect(srcIdentityProgressive).toContain('canAdvanceIdentityLevel');
  });

  it('IDENT-PROG-35: si NO_MATCH incrementa identity_attempts', () => {
    expect(srcIdentityProgressive).toContain('identity_attempts');
    expect(srcIdentityProgressive).toContain('newAttempts');
    expect(srcIdentityProgressive).toMatch(/newAttempts\s*=\s*currentAttempts\s*\+\s*1/);
  });

  it('IDENT-PROG-36: tras 3 fallos escala — MAX_IDENTITY_ATTEMPTS = 3', () => {
    expect(srcIdentityProgressive).toContain('MAX_IDENTITY_ATTEMPTS');
    expect(srcIdentityProgressive).toContain('const MAX_IDENTITY_ATTEMPTS = 3');
    expect(srcIdentityProgressive).toContain("response_type: 'identity_escalated'");
  });

  it('IDENT-PROG-37: no inicia cuarto intento — guarda antes de llamar a validación', () => {
    // El guard currentAttempts >= MAX_IDENTITY_ATTEMPTS aparece ANTES de la fetch a validate-identity
    const preCheckPos   = srcIdentityProgressive.indexOf('currentAttempts >= MAX_IDENTITY_ATTEMPTS');
    const validateFetch = srcIdentityProgressive.indexOf('functions/v1/conv-core-validate-identity');
    expect(preCheckPos).toBeGreaterThan(0);
    expect(validateFetch).toBeGreaterThan(0);
    expect(preCheckPos).toBeLessThan(validateFetch);
  });

  it('IDENT-PROG-38: si hay conv_case_id llama a conv-escalate-case', () => {
    expect(srcIdentityProgressive).toContain('conv-escalate-case');
    // La llamada a conv-escalate-case está dentro de un if de conv_case_id
    const caseGuard = srcIdentityProgressive.match(/conv_case_id[\s\S]{0,200}conv-escalate-case/);
    expect(caseGuard).not.toBeNull();
  });

  it('IDENT-PROG-39: si no hay conv_case_id no falla — identity_escalated siempre disponible', () => {
    // identity_escalated se devuelve independientemente de conv_case_id
    expect(srcIdentityProgressive).toContain("response_type: 'identity_escalated'");
    const escalatedCount = (srcIdentityProgressive.match(/identity_escalated/g) ?? []).length;
    expect(escalatedCount).toBeGreaterThanOrEqual(1);
  });

});

// ---------------------------------------------------------------------------
// IDENT-NODEG — no degradación de identity_level
// ---------------------------------------------------------------------------

describe('IDENT-NODEG: no degradación de identity_level', () => {

  it('IDENT-NODEG-40: PARTIAL_MATCH_ACTIVE no baja a NO_MATCH — rango PARTIAL(2) > NO_MATCH(0)', () => {
    // canAdvanceIdentityLevel('PARTIAL_MATCH_ACTIVE', 'NO_MATCH') → next(0) < current(2) → false
    expect(srcIdentityLevel).toContain("'PARTIAL_MATCH_ACTIVE': 2");
    expect(srcIdentityLevel).toContain("'NO_MATCH': 0");
    expect(srcIdentityLevel).toContain('return next > current');
  });

  it('IDENT-NODEG-41: STRONG_MATCH_ACTIVE no baja a PARTIAL_MATCH_ACTIVE — rango STRONG(3) > PARTIAL(2)', () => {
    expect(srcIdentityLevel).toContain("'STRONG_MATCH_ACTIVE': 3");
    expect(srcIdentityLevel).toContain("'PARTIAL_MATCH_ACTIVE': 2");
    expect(srcIdentityLevel).toContain('return next > current');
  });

  it('IDENT-NODEG-42: PARTIAL_MATCH_ACTIVE puede subir a STRONG_MATCH_ACTIVE — next(3) > current(2)', () => {
    expect(srcIdentityLevel).toContain('canAdvanceIdentityLevel');
    expect(srcIdentityLevel).toContain("'STRONG_MATCH_ACTIVE': 3");
    expect(srcIdentityLevel).toContain("'PARTIAL_MATCH_ACTIVE': 2");
  });

  it('IDENT-NODEG-43: NO_MATCH puede subir a PARTIAL_MATCH_ACTIVE — next(2) > current(0)', () => {
    expect(srcIdentityLevel).toContain("'NO_MATCH': 0");
    expect(srcIdentityLevel).toContain("'PARTIAL_MATCH_ACTIVE': 2");
  });

  it('IDENT-NODEG-44: NO_MATCH puede subir a STRONG_MATCH_ACTIVE — next(3) > current(0)', () => {
    expect(srcIdentityLevel).toContain("'NO_MATCH': 0");
    expect(srcIdentityLevel).toContain("'STRONG_MATCH_ACTIVE': 3");
    // canAdvanceIdentityLevel se usa en conv-ingest y conv-identity-progressive
    expect(srcIngest).toContain('canAdvanceIdentityLevel');
    expect(srcIdentityProgressive).toContain('canAdvanceIdentityLevel');
  });

});

// ---------------------------------------------------------------------------
// IDENT-ACT — Activity Log
// ---------------------------------------------------------------------------

describe('IDENT-ACT: Activity Log de identidad', () => {

  it('IDENT-ACT-45: STRONG_MATCH_ACTIVE publica conv_identity_validated', () => {
    expect(srcIdentityProgressive).toContain("'conv_identity_validated'");
    expect(srcIdentityProgressive).toContain("'STRONG_MATCH_ACTIVE'");
    expect(srcIdentityProgressive).toContain('PUBLISHABLE_LEVELS');
  });

  it('IDENT-ACT-46: PARTIAL_MATCH_ACTIVE publica conv_identity_validated', () => {
    const publishBlock = srcIdentityProgressive.match(
      /PUBLISHABLE_LEVELS[\s\S]{0,200}PARTIAL_MATCH_ACTIVE[\s\S]{0,200}STRONG_MATCH_ACTIVE/
    );
    expect(publishBlock).not.toBeNull();
    expect(publishBlock![0]).toContain("'PARTIAL_MATCH_ACTIVE'");
  });

  it('IDENT-ACT-47: NO_MATCH no publica conv_identity_validated', () => {
    // PUBLISHABLE_LEVELS solo contiene PARTIAL y STRONG
    const publishBlock = srcIdentityProgressive.match(
      /PUBLISHABLE_LEVELS\s*=\s*\[[^\]]+\]/
    );
    expect(publishBlock).not.toBeNull();
    expect(publishBlock![0]).not.toContain('NO_MATCH');
  });

  it('IDENT-ACT-48: MATCH_INACTIVE no publica conv_identity_validated', () => {
    const publishBlock = srcIdentityProgressive.match(
      /PUBLISHABLE_LEVELS\s*=\s*\[[^\]]+\]/
    );
    expect(publishBlock![0]).not.toContain('MATCH_INACTIVE');
  });

  it('IDENT-ACT-49: payload de Activity Log no contiene PII', () => {
    const actBlock = srcIdentityProgressive.match(
      /conv_identity_validated[\s\S]{0,600}data:\s*\{[^}]+\}/
    );
    expect(actBlock).not.toBeNull();
    const block = actBlock![0];
    expect(block).not.toContain('full_name');
    expect(block).not.toContain('profile_id');
    expect(block).not.toContain('phone');
    expect(block).not.toContain('room_label');
    expect(block).not.toContain('assignment_id');
  });

  it('IDENT-ACT-50: fallo de Activity Log no bloquea validación — fire-and-log', () => {
    expect(srcIdentityProgressive).toMatch(/conv_identity_validated[\s\S]{0,600}\.catch\(/);
  });

});

// ---------------------------------------------------------------------------
// IDENT-PRIV — privacidad y logging
// ---------------------------------------------------------------------------

describe('IDENT-PRIV: privacidad y sanitización de logs', () => {

  it('IDENT-PRIV-51: no se envía profile_id a n8n — no hay llamadas a n8n', () => {
    for (const src of [srcValidateIdentity, srcIdentityProgressive]) {
      expect(src).not.toContain('n8n.io');
      expect(src).not.toContain('/webhook/');
    }
  });

  it('IDENT-PRIV-52: no se envía phone_number a n8n', () => {
    for (const src of [srcValidateIdentity, srcIdentityProgressive]) {
      expect(src).not.toContain('n8n.io');
    }
  });

  it('IDENT-PRIV-53: no se envía identity_data a n8n', () => {
    for (const src of [srcValidateIdentity, srcIdentityProgressive]) {
      expect(src).not.toContain('n8n.io');
    }
  });

  it('IDENT-PRIV-54: no se llama a Claude real', () => {
    for (const src of [srcValidateIdentity, srcIdentityProgressive, srcCoreIdentityClient]) {
      expect(src).not.toContain('anthropic');
      expect(src).not.toContain('messages.create');
    }
  });

  it('IDENT-PRIV-55: no se llama a n8n real', () => {
    for (const src of [srcValidateIdentity, srcIdentityProgressive, srcCoreIdentityClient]) {
      expect(src).not.toContain('n8n.io');
      expect(src).not.toContain('/webhook/');
    }
  });

  it('IDENT-PRIV-56: no se llama a Core real — el adapter es mock', () => {
    expect(srcCoreIdentityClient).not.toContain('fetch(');
    expect(srcValidateIdentity).not.toContain('smartroom-core');
    expect(srcIdentityProgressive).not.toContain('smartroom-core');
  });

  it('IDENT-PRIV-57: logs de conv-identity-progressive no contienen provided_value', () => {
    expect(srcIdentityProgressive).not.toMatch(/log\.(info|warn|error)[^;]*provided_value/);
  });

  it('IDENT-PRIV-58: logs no contienen phone ni sender_ref como argumento directo', () => {
    // Usamos [^\n] para no cruzar líneas (evita falsos positivos en comentarios de objeto)
    for (const src of [srcValidateIdentity, srcIdentityProgressive]) {
      expect(src).not.toMatch(/log\.(info|warn|error)\([^\n]*\bphone\b/);
      expect(src).not.toMatch(/log\.(info|warn|error)\([^\n]*sender_ref/);
    }
  });

  it('IDENT-PRIV-59: logs no contienen profile_id como argumento directo', () => {
    for (const src of [srcValidateIdentity, srcIdentityProgressive]) {
      expect(src).not.toMatch(/log\.(info|warn|error)\([^\n]*profile_id/);
    }
  });

  it('IDENT-PRIV-60: logs no contienen identity_data', () => {
    for (const src of [srcValidateIdentity, srcIdentityProgressive]) {
      expect(src).not.toMatch(/log\.(info|warn|error)[^;]*identity_data/);
    }
  });

});

// ---------------------------------------------------------------------------
// IDENT-RES — restricciones
// ---------------------------------------------------------------------------

describe('IDENT-RES: restricciones globales', () => {

  it('IDENT-RES-61: no introduce WEAK_MATCH como nivel de retorno o código activo', () => {
    // identity-level.ts puede mencionar WEAK_MATCH en comentario aclaratorio ("no existe")
    // Las EFs funcionales no deben usarlo como nivel real
    for (const src of [srcValidateIdentity, srcIdentityProgressive, srcCoreIdentityClient]) {
      expect(src).not.toContain('WEAK_MATCH');
    }
    // En identity-level.ts solo debe aparecer en comentario, nunca en código ejecutable
    expect(srcIdentityLevel).not.toMatch(/['"]WEAK_MATCH['"]/);
    expect(srcIdentityLevel).not.toMatch(/identity_level.*WEAK_MATCH/);
  });

  it("IDENT-RES-62: no introduce 'UNVERIFIED' como nivel literal", () => {
    for (const src of [srcValidateIdentity, srcIdentityProgressive, srcCoreIdentityClient]) {
      expect(src).not.toContain("'UNVERIFIED'");
    }
  });

  it('IDENT-RES-63: no introduce WF-02', () => {
    for (const src of [srcValidateIdentity, srcIdentityProgressive, srcCoreIdentityClient]) {
      expect(src).not.toContain('WF-02');
    }
  });

  it('IDENT-RES-64: no implementa WF-20', () => {
    for (const src of [srcValidateIdentity, srcIdentityProgressive]) {
      expect(src).not.toContain('WF-20');
      expect(src).not.toContain('conv-incidencias-handler');
    }
  });

  it('IDENT-RES-65: no implementa WF-30', () => {
    for (const src of [srcValidateIdentity, srcIdentityProgressive]) {
      expect(src).not.toContain('WF-30');
    }
  });

  it('IDENT-RES-66: no implementa WF-40', () => {
    for (const src of [srcValidateIdentity, srcIdentityProgressive]) {
      expect(src).not.toContain('WF-40');
    }
  });

});

// ---------------------------------------------------------------------------
// IDENT-REG — regresión global
// ---------------------------------------------------------------------------

describe('IDENT-REG: regresión — invariantes globales', () => {

  it('IDENT-REG-67: identity EFs no introducen WF-20/30/40', () => {
    for (const src of [srcValidateIdentity, srcIdentityProgressive, srcCoreIdentityClient]) {
      expect(src).not.toContain('WF-20');
      expect(src).not.toContain('WF-30');
      expect(src).not.toContain('WF-40');
    }
  });

  it('IDENT-REG-68: identity EFs no introducen WEAK_MATCH ni nivel prohibido', () => {
    // WEAK_MATCH no debe aparecer como nivel ejecutable (puede estar en comentario aclaratorio en identity-level.ts)
    for (const src of [srcValidateIdentity, srcIdentityProgressive, srcCoreIdentityClient]) {
      expect(src).not.toContain('WEAK_MATCH');
    }
    expect(srcIdentityLevel).not.toMatch(/['"]WEAK_MATCH['"]/);
    // 'UNVERIFIED' como literal de nivel tampoco debe aparecer
    for (const src of [srcValidateIdentity, srcIdentityProgressive, srcCoreIdentityClient, srcIdentityLevel]) {
      expect(src).not.toContain("'UNVERIFIED'");
    }
  });

  it('IDENT-REG-69: identity EFs no introducen WF-02', () => {
    for (const src of [srcValidateIdentity, srcIdentityProgressive]) {
      expect(src).not.toContain('WF-02');
    }
  });

  it('IDENT-REG-70: identity EFs no llaman a Claude real', () => {
    for (const src of [srcValidateIdentity, srcIdentityProgressive, srcCoreIdentityClient]) {
      expect(src).not.toContain('anthropic');
      expect(src).not.toContain('messages.create');
    }
  });

  it('IDENT-REG-71: identity EFs no llaman a n8n real', () => {
    for (const src of [srcValidateIdentity, srcIdentityProgressive, srcCoreIdentityClient]) {
      expect(src).not.toContain('n8n.io');
      expect(src).not.toContain('/webhook/');
    }
  });

  it('IDENT-REG-72: identity EFs no llaman a Wasender real', () => {
    for (const src of [srcValidateIdentity, srcIdentityProgressive, srcCoreIdentityClient]) {
      expect(src).not.toContain('wasender.io');
      expect(src).not.toContain('@s.whatsapp.net');
    }
  });

  it('IDENT-REG-73: conv-ingest modificado conserva deduplicación WhatsApp', () => {
    expect(srcIngest).toContain('wasender_message_id');
    expect(srcIngest).toContain("response_type: 'duplicate_ignored'");
  });

  it('IDENT-REG-74: conv-ingest modificado conserva no_service response', () => {
    expect(srcIngest).toContain("response_type: 'no_service'");
    expect(srcIngest).toContain('NO_SERVICE_TEXT');
  });

});
