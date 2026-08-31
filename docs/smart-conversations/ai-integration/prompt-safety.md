# SmartConversations — Seguridad de prompts IA

## Principio fundamental

**La IA solo recibe texto anonimizado (`safe_input`).** Nunca recibe PII estructurada, metadatos de sesion, credenciales ni datos de contrato.

## Campos prohibidos en safe_input

Los siguientes campos NUNCA deben aparecer en el texto enviado al proveedor de IA:

| Campo | Tipo | Razon |
|---|---|---|
| `profile_id` | ID interno | Identifica al inquilino en Core |
| `phone` / `phone_number` | PII | Numero de telefono del usuario |
| `sender_ref` | Referencia interna | Vincula con canal de mensajeria |
| `full_name` | PII | Nombre completo del usuario |
| `room_label` / `residence_name` | PII parcial | Puede identificar al usuario |
| `assignment_id` / `room_id` | ID interno | Datos de contrato |
| `identity_data` | PII estructurada | Objeto con multiples datos de identidad |
| `raw_payload` | Payload bruto | Puede contener cualquier dato |
| `contact` | PII | Objeto con phone/email del interesado |
| `email` | PII | Email del usuario |
| `name` | PII | Nombre del usuario |
| `tokens` / `authorization` | Credencial | Tokens de sesion o API |
| `service_role` | Credencial | Rol de servicio Supabase |
| `jwt` | Credencial | Token JWT |

## Estructura segura de prompt

### Correcto (safe_input)

```
"Tengo una gotera en el bano, empezo ayer y esta empeorando"
"Busco habitacion en Madrid por menos de 700 euros al mes"
"Como puedo cambiar mi contrasena de acceso"
```

### Incorrecto (NO enviar a IA)

```json
{
  "profile_id": "prof_abc123",
  "phone": "+34600000001",
  "message": "Tengo una gotera"
}
```

## Uso de safe_input

`safe_input` es el campo `AiCallRequest.safe_input`. Reglas:

1. Debe ser texto plano, no JSON estructurado con PII.
2. `sanitizeAiInput()` elimina patrones JSON con campos PII antes de enviar.
3. Longitud maxima: 4000 caracteres (cortado en ai-client).
4. El caller es responsable de pre-sanitizar si el texto puede contener PII.

## Uso de safe_summary

`safe_summary` es el texto resumen que:
- No contiene nombre, telefono, email ni datos de identidad.
- Solo describe el tipo de solicitud (incidencia, busqueda, consulta).
- Es generado por la IA o por el extractor mock.

Ejemplo:
- `safe_input`:  `"Hay una averia en la calefaccion, urgente"`
- `safe_summary`: `"Incidencia de mantenimiento: averia en calefaccion, urgencia alta"`

## Validacion de output

La respuesta de la IA pasa por dos capas de validacion:

### 1. sanitizeAiOutput()

Elimina recursivamente del JSON de respuesta cualquier campo que coincida con `AI_PII_FORBIDDEN_FIELDS`. Aplica a toda respuesta IA antes de devolverla al caller.

### 2. validateXxxOutput()

Valida estructura especifica segun operacion:

| Operacion | Funcion | Campos permitidos en output |
|---|---|---|
| `intent.classify` | `validateIntentOutput()` | `service_code`, `confidence` |
| `incident.extract` | `validateIncidentOutput()` | `incident_type`, `urgency`, `safe_summary`, `missing_fields`, `is_complete` |
| `listing.extract` | `validateListingOutput()` | `interest_type`, `city`, `budget_range`, `dates`, `safe_summary`, `missing_fields` |
| `help.extract` | `validateHelpOutput()` | `help_intent`, `kb_query`, `safe_summary`, `request_human` |

## Fallback en caso de output invalido

Si la respuesta de la IA:
- No es JSON valido → `error_code: AI_INVALID_JSON`, fallback al mock.
- Contiene servicio desconocido en intent → se normaliza a `unknown`.
- Contiene `confidence` fuera de `[0, 1]` → se normaliza a `[0, 1]`.
- Contiene campos PII → `sanitizeAiOutput()` los elimina silenciosamente.
- No tiene la estructura esperada → fallback a resultado del mock.

El sistema nunca falla por un output inesperado de la IA. Siempre hay un fallback seguro.

## Prohibicion de prompts con PII estructurada

Los adapters (intent-classifier, incident-extractor, etc.) deben:

1. Pasar el texto del mensaje como `safe_input` plano.
2. Si el mensaje puede contener telefono o email, enmascararlo antes:
   - Telefono: reemplazar con `[PHONE]`
   - Email: reemplazar con `[EMAIL]`
3. Nunca construir un prompt que incluya campos JSON como `profile_id: xxx`.
4. Nunca incluir `identity_data`, `sender_ref` ni `raw_payload` en el prompt.

## Lo que la IA no puede decidir

La respuesta de la IA es una sugerencia, nunca una decision final:

- La IA clasifica la intencion → el routing engine aplica sus propias reglas.
- La IA extrae campos → las EFs validan con Core antes de crear entidades.
- La IA sugiere un resumen → el equipo de atencion lo revisa si escala a humano.
- La IA nunca puede bypasear un guard de seguridad ni una validacion de Core.
