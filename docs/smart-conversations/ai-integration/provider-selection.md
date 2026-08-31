# SmartConversations — Seleccion de proveedor de IA

## Estado actual

**El proveedor de IA definitivo NO esta seleccionado.**
La integracion esta preparada para cualquier proveedor via configuracion.
Activar `AI_INTEGRATION_MODE=real` solo cuando se confirme proveedor y entorno.

## Como seleccionar proveedor

El proveedor se selecciona exclusivamente mediante la variable de entorno:

```dotenv
AI_PROVIDER=<proveedor>
```

| Valor | Proveedor |
|---|---|
| `mock` | Sin proveedor real (default) |
| `openai` | OpenAI API |
| `anthropic` | Anthropic API |
| `azure_openai` | Azure OpenAI Service |
| `google_gemini` | Google AI / Gemini |
| `mistral` | Mistral AI |
| `groq` | Groq |
| `local_llm` | LLM local (Ollama u otro) |
| `other` | Proveedor generico HTTP |

**No hardcodear el proveedor en codigo.** Si `AI_PROVIDER` no esta definida, el sistema usa `mock`.

## Variables requeridas por proveedor

| Proveedor | Variable obligatoria | Variable opcional |
|---|---|---|
| `openai` | `OPENAI_API_KEY` | `OPENAI_BASE_URL`, `OPENAI_MODEL` |
| `anthropic` | `ANTHROPIC_API_KEY` | `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL` |
| `azure_openai` | `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT` | `AZURE_OPENAI_API_VERSION` |
| `google_gemini` | `GOOGLE_AI_API_KEY` | `GOOGLE_AI_MODEL` |
| `mistral` | `MISTRAL_API_KEY` | `MISTRAL_MODEL` |
| `groq` | `GROQ_API_KEY` | `GROQ_MODEL` |
| `local_llm` | `LOCAL_LLM_BASE_URL` | `LOCAL_LLM_MODEL` |
| `other` | `AI_BASE_URL`, `AI_API_KEY` | `AI_MODEL` |

## Operaciones soportadas

Todos los proveedores implementan las mismas 6 operaciones via `aiCall()`:

| Operacion | Descripcion |
|---|---|
| `ai.intent.classify` | Clasificacion de intencion del usuario |
| `ai.incident.extract` | Extraccion de datos de incidencia |
| `ai.listing.extract` | Extraccion de intencion de busqueda de listing |
| `ai.help.extract` | Extraccion de intencion de ayuda |
| `ai.safe_summary` | Generacion de resumen seguro sin PII |
| `ai.response_draft` | Borrador de respuesta al usuario |

No se pueden invocar operaciones arbitrarias desde payload externo.

## Lo que la IA puede hacer

- Clasificar intencion del usuario.
- Extraer campos de formulario (tipo incidencia, urgencia, etc.).
- Generar safe_summary sin PII.
- Generar borradores de respuesta.
- Detectar informacion faltante.

## Lo que la IA NO puede hacer (limites de arquitectura)

| Accion prohibida | Razon |
|---|---|
| Validar identidad | Solo Core valida identidad |
| Decidir permisos | Solo los guards de seguridad |
| Crear incidencia oficial | Solo conv-core-create-incident |
| Crear lead oficial | Solo conv-core-create-lead |
| Crear help ticket oficial | Solo conv-core-create-help-ticket |
| Escribir en conv_cases o conv_messages | Solo EF internas con service_role |
| Publicar Activity Log | Solo EF internas |
| Llamar a Core directamente | Solo via core-http-client.ts |
| Llamar a n8n directamente | Solo via EF de despacho |
| Llamar a Wasender directamente | Solo via conv-send-wa |
| Recibir profile_id, phone, sender_ref | PII -- prohibido en safe_input |
| Recibir identity_data o raw_payload | PII estructurada -- prohibida |

## Riesgos de privacidad

| Riesgo | Mitigacion |
|---|---|
| PII en safe_input | sanitizeAiInput() elimina patrones PII antes de enviar |
| PII en respuesta IA | sanitizeAiOutput() elimina campos PII del JSON de respuesta |
| API key en logs | safeLog() y ai-client nunca loguean Authorization ni API keys |
| Prompt leakage | No se loguean prompts completos |
| Respuesta con datos de otro usuario | validateXxxOutput() verifica formato y elimina campos prohibidos |

## Criterios para seleccionar proveedor

A tener en cuenta antes de elegir proveedor definitivo:

1. **Residencia de datos**: Los mensajes de usuarios se envian al proveedor. Verificar cumplimiento GDPR/LOPD.
2. **Retencion de datos**: Confirmar que el proveedor no retiene conversaciones para entrenamiento.
3. **SLA y disponibilidad**: La IA es un mejora, no bloqueante -- el sistema funciona en mock.
4. **Costo**: Estimar tokens por mensaje y coste mensual.
5. **Latencia**: El timeout default es 8s -- verificar que el proveedor cumple.
6. **Calidad de extraccion**: Evaluar con datos de prueba antes de activar.

## Eleccion del proveedor

**Pendiente.** La eleccion final queda sujeta a:

- [ ] Evaluacion de privacidad/GDPR por el equipo legal
- [ ] Benchmark de calidad con datos reales anonimizados
- [ ] Evaluacion de costos
- [ ] Aprobacion del equipo de producto
