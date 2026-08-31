/**
 * help-kb-client — Adapter para consultar la base de conocimiento de ayuda.
 *
 * Mode=mock (default): respuestas KB locales sin fetch externo.
 * Mode=real: llama a Core vía core-http-client con operación allowlisted.
 *
 * Solo devuelve respuestas públicas/generales:
 *   kb_id, title, answer, confidence, public.
 * NO devuelve: profile_id, identity_data, sender_ref, datos de contrato,
 *              datos personales, información específica de usuario.
 * NO acepta: profile_id, identity_data, sender_ref.
 *
 * Fuente: rules-80, SmartConversations WF-40.
 */

import { coreHttpCall, getCoreIntegrationMode } from "./core-http-client.ts";
import type { CoreIntegrationMode } from "./core-http-client.ts";

export interface KbQueryInput {
  client_account_id: string;
  channel:           string;
  topic?:            string;
  question:          string;
  // NO acepta: profile_id, identity_data, sender_ref
}

export interface KbMatch {
  kb_id:      string;
  title:      string;
  answer:     string;
  confidence: number;
  public:     boolean;
}

export interface KbQueryResult {
  matches: KbMatch[];
}

export type HelpKbClient = {
  queryKb(input: KbQueryInput): Promise<KbQueryResult>;
};

// ---------------------------------------------------------------------------
// Mock client — entradas KB locales, sin fetch externo
// NO contiene: profile_id, identity_data, sender_ref, datos de usuario específico
// ---------------------------------------------------------------------------

const MOCK_KB: KbMatch[] = [
  {
    kb_id:      'kb-001',
    title:      'Cambiar contraseña',
    answer:     'Puedes cambiar tu contraseña desde tu perfil en Ajustes → Seguridad.',
    confidence: 0.92,
    public:     true,
  },
  {
    kb_id:      'kb-002',
    title:      'Recuperar acceso a la cuenta',
    answer:     'Si no puedes entrar, usa la opción "Olvidé mi contraseña" en la pantalla de login.',
    confidence: 0.91,
    public:     true,
  },
  {
    kb_id:      'kb-003',
    title:      'Cómo funciona el pago de la renta',
    answer:     'La renta se cobra automáticamente el día 1 de cada mes mediante domiciliación.',
    confidence: 0.88,
    public:     true,
  },
  {
    kb_id:      'kb-004',
    title:      'Duración mínima del contrato',
    answer:     'El contrato mínimo es de 3 meses. Puedes consultarlo en la sección Documentos.',
    confidence: 0.86,
    public:     true,
  },
  {
    kb_id:      'kb-005',
    title:      'Solicitar mantenimiento',
    answer:     'Puedes solicitar mantenimiento desde la app en la sección Incidencias.',
    confidence: 0.84,
    public:     true,
  },
];

const TOPIC_MAP: Record<string, string[]> = {
  login:       ['kb-001', 'kb-002'],
  payments:    ['kb-003'],
  contract:    ['kb-004'],
  maintenance: ['kb-005'],
};

const mockHelpKbClient: HelpKbClient = {
  async queryKb(input: KbQueryInput): Promise<KbQueryResult> {
    // No llamar al Core real. No hacer fetch. No aceptar ni devolver PII ni datos internos.
    const relevantIds = input.topic ? (TOPIC_MAP[input.topic] ?? []) : [];
    const matches = MOCK_KB.filter(
      entry => relevantIds.includes(entry.kb_id) && entry.public,
    );
    return { matches };
  },
};

// ---------------------------------------------------------------------------
// Real client — usa core-http-client con operación allowlisted
// Solo devuelve respuestas públicas — filtra datos de usuario específico
// ---------------------------------------------------------------------------

const realHelpKbClient: HelpKbClient = {
  async queryKb(input: KbQueryInput): Promise<KbQueryResult> {
    const resp = await coreHttpCall<{ matches: Record<string, unknown>[] }>({
      method:            'POST',
      operation:         'core.help.kb.query',
      client_account_id: input.client_account_id,
      body: {
        channel:  input.channel,
        topic:    input.topic,
        question: input.question,
        // NO se envía profile_id, identity_data ni sender_ref
      },
    });

    if (!resp.ok || !resp.data) {
      return { matches: [] };
    }

    // Solo devolver entradas públicas — filtrar datos específicos de usuario
    const matches: KbMatch[] = (resp.data.matches ?? [])
      .filter(raw => raw['public'] === true)
      .map(raw => ({
        kb_id:      String(raw['kb_id'] ?? ''),
        title:      String(raw['title'] ?? ''),
        answer:     String(raw['answer'] ?? ''),
        confidence: Number(raw['confidence'] ?? 0),
        public:     true,
        // NO incluir: profile_id, identity_data, datos de contrato específico
      }));

    return { matches };
  },
};

// ---------------------------------------------------------------------------
// Factory — selecciona implementación según modo
// ---------------------------------------------------------------------------

export function buildHelpKbClient(mode?: CoreIntegrationMode): HelpKbClient {
  const resolved = mode ?? getCoreIntegrationMode();
  return resolved === 'real' ? realHelpKbClient : mockHelpKbClient;
}

/** Default export: siempre mock para backward compatibility */
export const defaultHelpKbClient: HelpKbClient = mockHelpKbClient;
