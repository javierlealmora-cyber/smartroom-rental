/**
 * Suite: Conversation Routing
 * Spec: docs/smart-conversations/tests/test-conversation-routing-spec.md
 * IDs: RT-01 a RT-13, RT-NEG-01 a RT-NEG-06
 */

import { describe, it } from 'vitest';

describe('Conversation Routing — SmartConversations', () => {

  describe('Casos positivos', () => {
    it.todo('[RT-01] Mensaje de incidencia con STRONG_MATCH_ACTIVE se dirige a WF-20');
    it.todo('[RT-02] Mensaje de lead/listing se dirige a WF-30');
    it.todo('[RT-03] Mensaje de ayuda se dirige a WF-40');
    it.todo('[RT-04] Intención desconocida devuelve respuesta de clarificación');
    it.todo('[RT-05] Canal WhatsApp llega via WF-01 → conv-ingest → motor conversacional');
    it.todo('[RT-06] Canal WebChat llama directamente a conv-ingest → motor conversacional');
    it.todo('[RT-07] Mensaje con identidad NO_MATCH activa WF-IDENTITY antes de routear');
    it.todo('[RT-08] Caso abierto + intención de servicio diferente activa confirmación de cambio de contexto — independientemente del nivel de confianza');
    it.todo('[RT-09] MATCH_INACTIVE deriva a escalado directo sin crear incidencia');
    it.todo('[RT-10] NO_MATCH con 3 intentos agotados escala al admin');
    it.todo('[RT-11] PARTIAL_MATCH_ACTIVE con intención incidencia crea pre-incidencia con status=open');
    it.todo('[RT-12] Respuesta HTTP 200 se devuelve a Wasender antes de cualquier procesamiento');
    it.todo('[RT-13] conv-ingest es la entrada común para ambos canales (WhatsApp y WebChat)');
  });

  describe('Casos negativos', () => {
    it.todo('[RT-NEG-01] Webhook con firma inválida es rechazado con 401 — no se routea');
    it.todo('[RT-NEG-02] Tenant sin suscripción activa es rechazado');
    it.todo('[RT-NEG-03] Mensaje duplicado (mismo external_message_id) no genera procesamiento doble');
    it.todo('[RT-NEG-04] Sesión desconectada de Wasender es detectada y el flujo se detiene');
    it.todo('[RT-NEG-05] Sin caso abierto: cambio de intención no activa confirmación de contexto');
    it.todo('[RT-NEG-06] WF-02 no existe — WebChat usa conv-ingest directamente');
  });

});
