# AI Integration — Contratos

**Fase:** 11C3  
**Fecha:** 2026-07-24

## Contratos operacionales

### 5 modos de integración

| Modo | Comportamiento | Entorno permitido |
|------|--------------|-------------------|
| `mock` | Respuesta hardcoded, sin llamada real | Todos |
| `shadow` | Llama AI pero ignora resultado | Solo DEV |
| `canary` | Allowlist explícita tenant+op | Solo DEV |
| `real` | Llamada real al proveedor | Solo DEV |
| `disabled` | Error inmediato | Todos |

Modo desconocido → `disabled` (fail-closed).

### 6 operaciones canónicas

| Operación | Input | Output |
|-----------|-------|--------|
| `ai.intent.classify` | texto libre | `ClassifyIntentResult` |
| `ai.incident.extract` | texto libre | `ExtractIncidentResult` |
| `ai.listing.extract` | texto libre | `ExtractListingsResult` |
| `ai.help.extract` | texto libre | `ExtractHelpResult` |
| `ai.safe_summary` | texto libre | `SummarizeCaseResult` |
| `ai.response_draft` | texto + contexto | `DraftResponseResult` |

### Canary allowlist

- `dev-tenant-a-*`: todas las 6 ops AI
- `dev-tenant-b-*`: ninguna
- Tenants reales: nunca en allowlist canary

### Límites canónicos

```
MAX_INPUT_CHARS:       4000
MAX_OUTPUT_TOKENS:     512
MAX_COST_PER_REQUEST:  $0.01
MAX_CALLS_PER_SESSION: 6
TIMEOUT_MS:            8000
MAX_RETRIES:           2
```

### Principio de autoridad

La IA **propone** únicamente. SmartConversations valida mediante código determinista.

- La IA NO valida identidad
- La IA NO elige tenant
- La IA NO crea recursos
- La IA NO publica Activity Log
- La IA NO accede a Core ni add-ons directamente
