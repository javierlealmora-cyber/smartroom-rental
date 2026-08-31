# AI Integration — Cost & Limits

**Fase:** 11C3  
**Fecha:** 2026-07-24

## Límites canónicos

| Límite | Valor | Razón |
|--------|-------|-------|
| `MAX_INPUT_CHARS` | 4000 | Control de costo y latencia |
| `MAX_OUTPUT_TOKENS` | 512 | Respuestas concisas |
| `MAX_COST_PER_REQUEST` | $0.01 | Cap de gasto por llamada |
| `MAX_CALLS_PER_SESSION` | 6 | Previene loops y abuso |
| `TIMEOUT_MS` | 8000 | SLA de respuesta conversacional |
| `MAX_RETRIES` | 2 | 3 intentos totales máximo |

## Gestión de sesión

El guard de sesión (`AISessionGuard`) rastrea:
- Número de llamadas AI en la sesión
- Costo acumulado estimado

Al alcanzar el límite → fallback determinista, sin llamada adicional.

## Estrategia de retry

```
Intento 1 → FAIL (retryable: 429, 503)
Intento 2 → FAIL (retryable)
Intento 3 → FAIL → FALLBACK (no más reintentos)
```

Errores no retryables (400, 422, JSON inválido) → fallback directo.

## Impacto en costo estimado

Con `MAX_COST_PER_REQUEST=$0.01` y `MAX_CALLS_PER_SESSION=6`:
- Costo máximo por sesión: $0.06
- Threshold de alerta: >$0.005 por request

## Vendor-agnostic

Los límites son independientes del proveedor. El adapter AI no hardcodea ningún modelo específico (Claude, GPT, Gemini). El proveedor se configura vía `AI_PROVIDER` env var cuando esté aprobado para DEV.
