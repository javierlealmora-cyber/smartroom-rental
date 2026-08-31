/**
 * core-incident-client — Adapter para crear incidencias en Core.
 *
 * Mode=mock (default): genera IDs sintéticos sin fetch externo.
 * Mode=real: llama a Core vía core-http-client con operación allowlisted.
 *
 * IMPORTANTE: profile_id y room_id no son parte del input de este adapter.
 * Son leídos internamente por conv-core-create-incident desde conv_sessions.
 * Este adapter solo recibe datos no-PII de la incidencia.
 *
 * Privacidad: description es sensible — NUNCA loguear.
 * 4xx: sin retry. 5xx/timeout: 3 intentos max (backoff 1s/5s/30s).
 * Fuente: rules-75, SmartConversations WF-20.
 */

import { coreHttpCall, getCoreIntegrationMode } from "./core-http-client.ts";
import type { CoreIntegrationMode } from "./core-http-client.ts";

export interface CreateIncidentInput {
  client_account_id: string;
  conv_case_id:      string;
  incident_type:     string;
  urgency:           string;
  description:       string;  // sensible — no loguear
  source:            string;
  // profile_id y room_id son cargados internamente por conv-core-create-incident
  // desde conv_sessions — nunca se aceptan desde payload externo ni orquestadores
}

export interface CreateIncidentResult {
  incident_id:  string;
  incident_ref: string;
}

export type CoreIncidentClient = {
  createIncident(input: CreateIncidentInput): Promise<CreateIncidentResult>;
};

// ---------------------------------------------------------------------------
// Mock client — IDs sintéticos, sin fetch externo
// ---------------------------------------------------------------------------

let _mockCounter = 1000;

const mockCoreIncidentClient: CoreIncidentClient = {
  async createIncident(input: CreateIncidentInput): Promise<CreateIncidentResult> {
    // No llamar al Core real. No hacer fetch. No loguear description.
    _mockCounter += 1;
    const incident_id  = `inc_mock_${input.conv_case_id.slice(0, 8)}_${_mockCounter}`;
    const year         = new Date().getFullYear();
    const incident_ref = `INC-${year}-${String(_mockCounter).padStart(4, '0')}`;
    return { incident_id, incident_ref };
  },
};

// ---------------------------------------------------------------------------
// Real client — usa core-http-client con operación allowlisted
// ---------------------------------------------------------------------------

const realCoreIncidentClient: CoreIncidentClient = {
  async createIncident(input: CreateIncidentInput): Promise<CreateIncidentResult> {
    // No loguear description (sensible)
    const resp = await coreHttpCall<{ incident_id: string; incident_ref: string }>({
      method:            'POST',
      operation:         'core.incidents.create',
      client_account_id: input.client_account_id,
      body: {
        conv_case_id:  input.conv_case_id,
        incident_type: input.incident_type,
        urgency:       input.urgency,
        description:   input.description,  // enviado a Core, no a logs
        source:        input.source,
        // profile_id y room_id NO se aceptan aquí; los lee conv-core-create-incident internamente
      },
    });

    if (!resp.ok || !resp.data) {
      throw new Error(`core.incidents.create failed: ${resp.error_code ?? 'UNKNOWN'}`);
    }

    return {
      incident_id:  resp.data.incident_id,
      incident_ref: resp.data.incident_ref,
    };
  },
};

// ---------------------------------------------------------------------------
// Factory — selecciona implementación según modo
// ---------------------------------------------------------------------------

export function buildCoreIncidentClient(mode?: CoreIntegrationMode): CoreIncidentClient {
  const resolved = mode ?? getCoreIntegrationMode();
  return resolved === 'real' ? realCoreIncidentClient : mockCoreIncidentClient;
}

/** Default export: siempre mock para backward compatibility */
export const defaultCoreIncidentClient: CoreIncidentClient = mockCoreIncidentClient;
