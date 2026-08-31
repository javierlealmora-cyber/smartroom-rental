/**
 * Suite: Incidents Flow
 * Spec: docs/smart-conversations/tests/test-incidents-flow-spec.md
 * IDs: INC-01 a INC-14, INC-NEG-01 a INC-NEG-07
 */

import { describe, it } from 'vitest';

describe('Incidents Flow — SmartConversations (WF-20)', () => {

  describe('Creación de incidencia', () => {
    it.todo('[INC-01] Intención de incidencia con STRONG_MATCH_ACTIVE crea incidencia via WF-20');
    it.todo('[INC-02] WF-20 llama a conv-core-create-incident con los datos del mensaje');
    it.todo('[INC-03] conv_incident_created se registra en el activity log');
    it.todo('[INC-04] STRONG_MATCH_ACTIVE con datos incompletos: conv_cases.status=waiting_user');
    it.todo('[INC-05] PARTIAL_MATCH_ACTIVE con intención incidencia: conv_cases nace con status=open (pre-incidencia)');
  });

  describe('Payload oficial conv_incident_created', () => {
    it.todo('[INC-06] Payload incluye incident_id');
    it.todo('[INC-07] Payload incluye incident_ref');
    it.todo('[INC-08] Payload incluye conv_case_id');
    it.todo('[INC-09] Payload incluye channel');
    it.todo('[INC-10] Payload incluye incident_type');
    it.todo('[INC-11] Payload incluye urgency');
    it.todo('[INC-12] Payload NO incluye session_id');
    it.todo('[INC-13] El payload completo oficial es {incident_id, incident_ref, conv_case_id, channel, incident_type, urgency}');
  });

  describe('MATCH_INACTIVE y NO_MATCH', () => {
    it.todo('[INC-14a] MATCH_INACTIVE con intención incidencia: WF-20 escala sin crear incidencia');
    it.todo('[INC-14b] NO_MATCH con intención incidencia: WF-20 activa WF-IDENTITY — solo escala si intentos agotados');
  });

  describe('Casos negativos', () => {
    it.todo('[INC-NEG-01] Incidencia sin identity STRONG/PARTIAL no crea registro en Core');
    it.todo('[INC-NEG-02] conv-core-create-incident falla 3 veces: escalado al admin');
    it.todo('[INC-NEG-03] Incidencia duplicada (mismo caso abierto, mismo usuario) no crea segunda incidencia');
    it.todo('[INC-NEG-04] Payload de conv_incident_created no acepta campos extra no definidos en rules-75');
    it.todo('[INC-NEG-05] MATCH_INACTIVE no pasa por WF-IDENTITY antes de escalar');
    it.todo('[INC-NEG-06] session_id en el payload de conv_incident_created hace fallar la validación');
    it.todo('[INC-NEG-07] Tenant inactivo no puede crear incidencias');
  });

});
