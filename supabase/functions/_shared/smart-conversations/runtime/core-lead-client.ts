/**
 * core-lead-client — Adapter para crear leads en Core.
 *
 * Mode=mock (default): genera IDs sintéticos sin fetch externo.
 * Mode=real: llama a Core vía core-http-client con operación allowlisted.
 *
 * El contacto (name, phone, email) llega internamente desde WF-30.
 * NO se loguea. NO se incluye en Activity Log ni conv_admin_notifications.
 * 4xx: sin retry. 5xx/timeout: 3 intentos max (backoff 1s/5s/30s).
 *
 * Privacidad: contact es PII — NUNCA loguear.
 * Fuente: rules-80, SmartConversations WF-30.
 */

import { coreHttpCall, getCoreIntegrationMode } from "./core-http-client.ts";
import type { CoreIntegrationMode } from "./core-http-client.ts";

export interface LeadContact {
  name?:  string;
  phone?: string;
  email?: string;
}

export interface LeadPreferences {
  budget_max?:   number;
  move_in_date?: string;
}

export interface CreateLeadInput {
  client_account_id: string;
  session_id:        string;
  conv_case_id:      string;
  listing_id:        string;
  interest_type:     string;
  contact:           LeadContact;  // PII — no loguear ni incluir en Activity Log
  preferences?:      LeadPreferences;
  source:            string;
}

export interface CreateLeadResult {
  lead_id:  string;
  lead_ref: string;
}

export type CoreLeadClient = {
  createLead(input: CreateLeadInput): Promise<CreateLeadResult>;
};

// ---------------------------------------------------------------------------
// Mock client — IDs sintéticos, sin fetch externo
// ---------------------------------------------------------------------------

let _leadCounter = 40;

const mockCoreLeadClient: CoreLeadClient = {
  async createLead(input: CreateLeadInput): Promise<CreateLeadResult> {
    // No llamar al Core real. No hacer fetch. No loguear contact (PII).
    _leadCounter += 1;
    const lead_id  = `lead_mock_${input.conv_case_id.slice(0, 8)}_${_leadCounter}`;
    const year     = new Date().getFullYear();
    const lead_ref = `LEAD-${year}-${String(_leadCounter).padStart(4, '0')}`;
    return { lead_id, lead_ref };
  },
};

// ---------------------------------------------------------------------------
// Real client — usa core-http-client con operación allowlisted
// ---------------------------------------------------------------------------

const realCoreLeadClient: CoreLeadClient = {
  async createLead(input: CreateLeadInput): Promise<CreateLeadResult> {
    // contact se envía a Core internamente — no loguear, no incluir en Activity Log
    const resp = await coreHttpCall<{ lead_id: string; lead_ref: string }>({
      method:            'POST',
      operation:         'core.leads.create',
      client_account_id: input.client_account_id,
      body: {
        session_id:    input.session_id,
        conv_case_id:  input.conv_case_id,
        listing_id:    input.listing_id,
        interest_type: input.interest_type,
        contact:       input.contact,   // PII: solo va a Core, nunca a logs ni Activity Log
        preferences:   input.preferences,
        source:        input.source,
      },
    });

    if (!resp.ok || !resp.data) {
      throw new Error(`core.leads.create failed: ${resp.error_code ?? 'UNKNOWN'}`);
    }

    return {
      lead_id:  resp.data.lead_id,
      lead_ref: resp.data.lead_ref,
    };
  },
};

// ---------------------------------------------------------------------------
// Factory — selecciona implementación según modo
// ---------------------------------------------------------------------------

export function buildCoreLeadClient(mode?: CoreIntegrationMode): CoreLeadClient {
  const resolved = mode ?? getCoreIntegrationMode();
  return resolved === 'real' ? realCoreLeadClient : mockCoreLeadClient;
}

/** Default export: siempre mock para backward compatibility */
export const defaultCoreLeadClient: CoreLeadClient = mockCoreLeadClient;
