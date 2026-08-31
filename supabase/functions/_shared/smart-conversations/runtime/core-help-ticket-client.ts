/**
 * core-help-ticket-client — Adapter para crear tickets de ayuda en Core.
 *
 * Mode=mock (default): genera IDs sintéticos sin fetch externo.
 * Mode=real: llama a Core vía core-http-client con operación allowlisted.
 *
 * Privacidad: summary puede contener texto de usuario — NUNCA loguear.
 * NO acepta profile_id, identity_data ni teléfono desde payload externo.
 * 4xx: sin retry. 5xx/timeout: 3 intentos max (backoff 1s/5s/30s).
 *
 * Fuente: rules-80, SmartConversations WF-40.
 */

import { coreHttpCall, getCoreIntegrationMode } from "./core-http-client.ts";
import type { CoreIntegrationMode } from "./core-http-client.ts";

export interface CreateHelpTicketInput {
  client_account_id: string;
  session_id:        string;
  conv_case_id:      string;
  topic:             string;
  summary:           string;  // texto anónimo de resumen — no loguear
  source:            string;
  // NO acepta: profile_id, identity_data, teléfono desde payload externo
}

export interface CreateHelpTicketResult {
  help_ticket_id:  string;
  help_ticket_ref: string;
}

export type CoreHelpTicketClient = {
  createHelpTicket(input: CreateHelpTicketInput): Promise<CreateHelpTicketResult>;
};

// ---------------------------------------------------------------------------
// Mock client — IDs sintéticos, sin fetch externo
// ---------------------------------------------------------------------------

let _helpCounter = 40;

const mockCoreHelpTicketClient: CoreHelpTicketClient = {
  async createHelpTicket(input: CreateHelpTicketInput): Promise<CreateHelpTicketResult> {
    // No llamar al Core real. No hacer fetch. No loguear summary (puede contener texto de usuario).
    _helpCounter += 1;
    const help_ticket_id  = `help_mock_${input.conv_case_id.slice(0, 8)}_${_helpCounter}`;
    const year            = new Date().getFullYear();
    const help_ticket_ref = `HELP-${year}-${String(_helpCounter).padStart(4, '0')}`;
    return { help_ticket_id, help_ticket_ref };
  },
};

// ---------------------------------------------------------------------------
// Real client — usa core-http-client con operación allowlisted
// ---------------------------------------------------------------------------

const realCoreHelpTicketClient: CoreHelpTicketClient = {
  async createHelpTicket(input: CreateHelpTicketInput): Promise<CreateHelpTicketResult> {
    // summary puede contener texto de usuario — enviado a Core, no a logs
    const resp = await coreHttpCall<{ help_ticket_id: string; help_ticket_ref: string }>({
      method:            'POST',
      operation:         'core.help.tickets.create',
      client_account_id: input.client_account_id,
      body: {
        session_id:   input.session_id,
        conv_case_id: input.conv_case_id,
        topic:        input.topic,
        summary:      input.summary,  // enviado a Core, no a logs ni Activity Log
        source:       input.source,
        // NO se incluye profile_id, identity_data ni teléfono
      },
    });

    if (!resp.ok || !resp.data) {
      throw new Error(`core.help.tickets.create failed: ${resp.error_code ?? 'UNKNOWN'}`);
    }

    return {
      help_ticket_id:  resp.data.help_ticket_id,
      help_ticket_ref: resp.data.help_ticket_ref,
    };
  },
};

// ---------------------------------------------------------------------------
// Factory — selecciona implementación según modo
// ---------------------------------------------------------------------------

export function buildCoreHelpTicketClient(mode?: CoreIntegrationMode): CoreHelpTicketClient {
  const resolved = mode ?? getCoreIntegrationMode();
  return resolved === 'real' ? realCoreHelpTicketClient : mockCoreHelpTicketClient;
}

/** Default export: siempre mock para backward compatibility */
export const defaultCoreHelpTicketClient: CoreHelpTicketClient = mockCoreHelpTicketClient;
