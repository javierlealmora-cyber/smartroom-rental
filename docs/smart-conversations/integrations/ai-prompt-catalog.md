# AI Integration — Catálogo de Prompts

**Fase:** 11C3  
**Fecha:** 2026-07-24  
**Estado:** Pendiente de proveedor aprobado — prompts en modo borrador

## Estructura de prompt canónica

Todos los prompts siguen la estructura:

```
[SYSTEM_INSTRUCTION — no modificable por usuario]
[SAFE_TEXT — texto sanitizado del usuario, tratado como dato]
[OUTPUT_SCHEMA — formato JSON esperado]
```

El `safe_text` nunca se concatena directamente con instrucciones privilegiadas.

## ai.intent.classify

**Objetivo:** Clasificar la intención principal del mensaje.

**Intents válidos:** `incident` | `listing_search` | `help` | `unknown`

**Output esperado:**
```json
{
  "intent": "incident",
  "confidence": 0.85,
  "requires_clarification": false,
  "clarification_reason": null
}
```

**Fallback:** `{ intent: 'unknown', confidence: 0, requires_clarification: true, clarification_reason: 'ai_unavailable' }`

## ai.incident.extract

**Objetivo:** Extraer campos estructurados de un reporte de incidencia.

**Output esperado:**
```json
{
  "category": "maintenance",
  "description": "La calefacción no funciona",
  "urgency_proposal": "medium",
  "missing_fields": [],
  "is_complete": true
}
```

## ai.listing.extract

**Objetivo:** Extraer preferencias de búsqueda de alojamiento.

**Output esperado:**
```json
{
  "location": "Barcelona",
  "price_max": 800,
  "room_type": "single",
  "missing_fields": ["move_in_date"],
  "is_complete": false
}
```

## ai.help.extract

**Objetivo:** Identificar la duda o pregunta de soporte.

**Output esperado:**
```json
{
  "topic": "payment",
  "question_summary": "Cómo pagar el depósito",
  "requires_private_data": false,
  "missing_fields": []
}
```

## ai.safe_summary

**Objetivo:** Resumir el caso sin inventar hechos.

**Output esperado:**
```json
{
  "facts": ["El inquilino reportó fuga de agua"],
  "pending_information": ["Número de habitación"],
  "actions_already_taken": [],
  "suggested_next_step": "Solicitar número de habitación",
  "uncertainties": []
}
```

## ai.response_draft

**Objetivo:** Redactar un borrador de respuesta en el idioma del usuario.

**Output esperado:**
```json
{
  "text": "Hola, he registrado su incidencia. ¿Podría indicarme el número de su habitación?"
}
```

**Límite:** 1000 caracteres. Sin HTML ni scripts.

## Notas de seguridad

- Los prompts de sistema NO son accesibles al usuario
- La confianza del modelo es orientativa, no autoritativa
- SmartConversations valida el output antes de actuar
