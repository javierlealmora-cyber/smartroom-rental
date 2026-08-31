# Contrato del Actor Canónico — Fase 11C5

**Archivo:** `canonical-actor.ts`  
**Versión del modelo:** 1.0

---

## 1. Tipos de actor

| Tipo | Quién es | Cuándo usar |
|------|----------|-------------|
| `tenant_profile` | Inquilino identificado y verificado | Reportar incidencias, buscar como residente verificado |
| `unverified_lead` | Prospecto no verificado | Crear leads, buscar publicaciones sin verificar identidad |
| `system_service` | Operación técnica interna autorizada | Automatizaciones, bots, flujos de sistema |

---

## 2. Estructura por tipo

### `tenant_profile`

```typescript
{
  type: 'tenant_profile',
  profile_id: string,     // obligatorio
  verified: boolean,      // obligatorio
  verified_at: string,    // ISO-8601 obligatorio
}
```

### `unverified_lead`

```typescript
{
  type: 'unverified_lead',
  // Sin profile_id requerido
}
```

### `system_service`

```typescript
{
  type: 'system_service',
  service_name: string,   // obligatorio (ej: 'conv-wf20')
}
```

---

## 3. Campos absolutamente prohibidos en cualquier actor

```
identity_level          — enum interno SC, no el add-on
STRONG_MATCH_ACTIVE     — enum interno SC
PARTIAL_MATCH_ACTIVE    — enum interno SC
MATCH_INACTIVE          — enum interno SC
NO_MATCH                — enum interno SC
UNVERIFIED_LEAD         — el ENUM interno, NO el tipo 'unverified_lead'
sender_ref              — referencia de canal, no del add-on
phone                   — datos PII directos
email                   — datos PII directos
jid                     — WA/webchat identifier
wa_jid                  — WA identifier
webchat_token           — token de sesión webchat
```

---

## 4. Validación

`validateCanonicalActor(actor)` devuelve `{ valid: boolean, reason?: string }`.

Errores posibles:

| Código | Causa |
|--------|-------|
| `ACTOR_NOT_OBJECT` | `actor` no es objeto |
| `ACTOR_TYPE_MISSING` | Falta `type` |
| `INVALID_ACTOR_TYPE` | Tipo no reconocido |
| `FORBIDDEN_ACTOR_FIELD` | Campo prohibido presente |
| `PROFILE_ID_REQUIRED_FOR_TENANT_PROFILE` | tenant_profile sin profile_id |
| `VERIFIED_BOOLEAN_REQUIRED` | tenant_profile sin `verified` booleano |
| `VERIFIED_AT_REQUIRED` | tenant_profile sin `verified_at` |
| `SERVICE_NAME_REQUIRED_FOR_SYSTEM_SERVICE` | system_service sin service_name |

---

## 5. Distinción crítica: tipo vs enum

El tipo `'unverified_lead'` es el string que va en `actor.type`.  
El enum `UNVERIFIED_LEAD` es un valor interno de SmartConversations.  
**Nunca enviar `UNVERIFIED_LEAD` como valor de actor.type.**  
El adapter de listings tiene `FORBIDDEN_INTERNAL_ENUMS` que incluye `'UNVERIFIED_LEAD'` explícitamente.

---

## 6. Migración desde adapters 11C1

Los adapters de Fase 11C1 usaban un `CanonicalActor` local con:
- `type: 'tenant_profile' | 'agent' | 'system'`
- `identity_verified: boolean`

La Fase 11C5 introduce el modelo canónico unificado con:
- `type: 'tenant_profile' | 'unverified_lead' | 'system_service'`
- `verified: boolean` (para tenant_profile)

Los adapters 11C1 siguen funcionando en modo mock — la migración al nuevo modelo se hace progresivamente al activar canary DEV.
