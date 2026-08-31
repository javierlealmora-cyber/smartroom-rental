# n8n Node Allowlist — Fase 11C4

## Principio

Los workflows n8n en SmartConversations solo pueden usar nodos de la lista aprobada.
Nodos no listados deben ser revisados y aprobados antes de su uso.

## Nodos aprobados

| Nodo | Uso permitido |
|------|---------------|
| `n8n-nodes-base.webhook` | Recibir invocaciones de EFs |
| `n8n-nodes-base.httpRequest` | Llamar EFs con callback (solo URLs allowlisted) |
| `n8n-nodes-base.if` | Condicionales de routing |
| `n8n-nodes-base.switch` | Bifurcaciones múltiples |
| `n8n-nodes-base.set` | Transformar/preparar datos |
| `n8n-nodes-base.merge` | Combinar branches |
| `n8n-nodes-base.respondToWebhook` | Responder al caller |
| `n8n-nodes-base.wait` | Esperar callbacks externos |
| `n8n-nodes-base.noOp` | No-operation (flujos stub) |
| `n8n-nodes-base.function` | JS simple sin I/O externo (revisión requerida) |

## Nodos PROHIBIDOS

| Nodo | Razón |
|------|-------|
| `n8n-nodes-base.postgres` (PostgreSQL) | n8n no accede a DB directamente |
| `n8n-nodes-base.mysql` | n8n no accede a DB directamente |
| `n8n-nodes-base.mongodb` | n8n no accede a DB directamente |
| `n8n-nodes-base.executeCommand` (Execute Command) | Ejecución de comandos del sistema |
| `n8n-nodes-base.ssh` | Acceso SSH al servidor |
| `n8n-nodes-base.ftp` | Transferencia de archivos |
| `n8n-nodes-base.readBinaryFile` | Acceso a sistema de archivos |
| `n8n-nodes-base.writeBinaryFile` | Acceso a sistema de archivos |
| `n8n-nodes-base.crypto` | (revisar caso a caso) |

## Nodos de community

**Todos los nodos de community están prohibidos** sin aprobación explícita.
La instalación de community nodes requiere revisión de seguridad previa.

## URLs permitidas en httpRequest

Los nodos `httpRequest` solo pueden apuntar a:
- `https://*.supabase.co/functions/v1/conv-*` (EFs de SmartConversations)
- URLs del allowlist definido en `allowed_callbacks` del registry

Cualquier otra URL requiere aprobación.

## Revisión de workflows

Antes de importar un workflow en DEV:
1. Verificar que todos los nodos están en la allowlist
2. Verificar que no hay `pinData` en el export
3. Verificar que no hay credenciales embebidas
4. Verificar que `active: false` en el export
5. Verificar checksum SHA-256 del export JSON
