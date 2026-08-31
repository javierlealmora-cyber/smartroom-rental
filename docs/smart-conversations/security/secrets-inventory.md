# Secrets Inventory — SmartConversations
<!-- Fase 11B1 · Auditoría 2026-07-21 -->

> Inventario de secretos. Solo nombres de variables, NUNCA valores.
> No imprime tokens, API keys, passwords ni hashes completos.

---

## Patrones buscados

```
sk-* | Bearer | service_role | api_key | secret | token | password | private_key | Authorization
```

Búsqueda en: supabase/functions/conv-*/index.ts, _shared/**, .env.example, package.json, .github/workflows/**, vite.config.js, scripts/**

---

## Inventario canónico de secretos

| Variable | Componente | Clasificación | Entorno | Consumidor | Frontend/Backend | Required | Rotación | Expiración | Almacenamiento esperado | En .env.example | En VITE_ | En CI | En código (Deno.env) | En logs | Finding |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | secret | dev/staging/prod | Todas las EFs conv-* | Backend (Deno.env) | Sí | Manual (trimestral recomendado) | No expira | Supabase project settings + CI secrets | No | ❌ No | Sí (CI para EF deployment) | Sí (`Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`) | ❌ No (logger redacta) | — |
| `SUPABASE_URL` | Supabase | internal | dev/staging/prod | EFs + Frontend | Ambos | Sí | No rota (URL del proyecto) | No | Supabase project settings | No (solo VITE_) | Sí (`VITE_SUPABASE_URL`) | Sí | Sí (`Deno.env.get('SUPABASE_URL')`) | No | — |
| `SUPABASE_ANON_KEY` | Supabase | internal | dev/staging/prod | Frontend | Frontend | Sí | Manual | No expira | CI secrets + Supabase settings | No (solo VITE_) | Sí (`VITE_SUPABASE_ANON_KEY`) | Sí | No (solo frontend) | No | — |
| `WEBCHAT_SESSION_SIGNING_SECRET` | conv-web-session, conv-web-message, conv-web-poll | secret | prod/staging | EFs WebChat | Backend (Deno.env) | Solo si WEBCHAT_AUTH_MODE=signed_token | Manual (al rotar invalida tokens activos) | No (sin TTL propio; tokens tienen TTL) | Supabase EF secrets | No | ❌ No | No | Sí | ❌ No | SEC-004 (no activado por defecto) |
| `conv_wa_sessions.webhook_secret` | conv-wa-webhook | secret | prod | conv-wa-webhook | Backend (DB) | Sí (por sesión WA) | Por tenant | No | conv_wa_sessions DB (plaintext) | No | ❌ No | No | No (leído de DB) | ❌ No | **SEC-005** |
| `conv_wa_sessions.api_key_secret_name` | conv-send-wa | confidential | prod | conv-send-wa | Backend (Vault) | Sí (por sesión WA) | Por proveedor | Según proveedor | Supabase Vault (TODO) | No | ❌ No | No | No (nombre solo en DB; valor en Vault) | ❌ No | SEC-005 (TODO Vault pendiente) |
| Core credentials | conv-core-* | secret | staging/prod | conv-core-validate-identity, conv-core-create-*, conv-core-query-* | Backend (Deno.env) | Sí (en Fase real) | Por acuerdo | Según proveedor | Supabase EF secrets | No | ❌ No | No | Sí (mock en Fase 11A) | ❌ No | — (no activo) |
| IA provider key | conv-wf20/30/40-* | secret | staging/prod | WF EFs con IA | Backend (Deno.env) | Sí (en Fase real) | Por proveedor | Según proveedor | Supabase EF secrets | No | ❌ No | No | Sí (mock en Fase 11A) | ❌ No | — (no activo) |
| Wasender API key (valor) | conv-send-wa | secret | prod | conv-send-wa (vía Vault) | Backend (Vault) | Sí (en Fase real) | Por proveedor | Según proveedor | Supabase Vault (TODO Fase 9) | No | ❌ No | No | No (pendiente Vault) | ❌ No | SEC-005 |
| n8n webhook secret | conv-wf* | secret | staging/prod | WF EFs que llaman n8n | Backend (Deno.env) | Sí (en Fase real) | Manual | No | Supabase EF secrets | No | ❌ No | No | Sí (mock en Fase 11A) | ❌ No | — (no activo) |
| `WEBCHAT_RATE_LIMIT_MODE` | conv-web-message | config (no secret) | prod | conv-web-message | Backend (Deno.env) | Sí (para producción) | N/A | N/A | Supabase EF env vars | No | ❌ No | No | Sí | No | SEC-002 (default mock) |
| `WEBCHAT_AUTH_MODE` | conv-web-session, conv-web-message, conv-web-poll | config (no secret) | prod | EFs WebChat | Backend (Deno.env) | Sí (para producción) | N/A | N/A | Supabase EF env vars | No | ❌ No | No | Sí | No | SEC-004 (default legacy) |
| `secrets.DEV_SUPABASE_URL` | CI pr-checks.yml | internal | CI (dev) | GitHub Actions | CI | Sí | Manual | No | GitHub Secrets | No | N/A | Sí | No | No | — |
| `secrets.DEV_SUPABASE_ANON_KEY` | CI pr-checks.yml | internal | CI (dev) | GitHub Actions | CI | Sí | Manual | No | GitHub Secrets | No | N/A | Sí | No | No | — |
| `secrets.SNYK_TOKEN` | CI (Snyk) | secret | CI | snyk scan job | CI | Sí | Manual | Por Snyk | GitHub Secrets | No | N/A | Sí | No | No | SEC-008 (continue-on-error) |
| `secrets.PRODUCTION_SUPABASE_URL` | deploy-production.yml | internal | CI (prod) | GitHub Actions | CI | Sí | No | No | GitHub Secrets | No | N/A | Sí | No | No | — |
| `secrets.PRODUCTION_STRIPE_PUBLISHABLE_KEY` | deploy-production.yml | internal | CI (prod) | GitHub Actions | CI | Sí | Manual | No | GitHub Secrets | No | N/A | Sí | No | No | — |
| `secrets.VERCEL_TOKEN` | deploy-production.yml | secret | CI | Vercel deployment | CI | Sí | Manual | No | GitHub Secrets | No | N/A | Sí | No | No | — |
| `secrets.SLACK_WEBHOOK_URL` | deploy-production.yml | secret | CI | Notificaciones | CI | Opcional | N/A | No | GitHub Secrets | No | N/A | Sí | No | No | — |
| Smoke runner credentials | scripts de prueba | secret | local/CI | Smoke tests | CI | Solo para tests | N/A | N/A | .env.e2e (local) | No (en .e2e.example) | ❌ No | No | No | ❌ No | — |

---

## Búsqueda de patrones sensibles — resultados redactados

| Patrón | Archivos | Líneas | Tipo | Severidad | Nota |
|---|---|---|---|---|---|
| `service_role` | supabase/functions/conv-*/index.ts (múltiples) | Múltiples | Uso en Deno.env.get() | OK | Solo en EFs, no en frontend |
| `service_role` | supabase/functions/_shared/*/ef-auth.ts | 5-10 | Validación de token | OK | Solo compara; no loguea |
| `webhook_secret` | supabase/migrations/*.sql | ~80 | Nombre de columna | HIGH | Valor en DB plaintext (SEC-005) |
| `WEBCHAT_SESSION_SIGNING_SECRET` | supabase/functions/_shared/*/webchat-session-token.ts | 10-15 | Deno.env.get() | OK | Correcto — Deno.env |
| `Bearer` | supabase/functions/conv-*/index.ts | Múltiples | Extracción de header | OK | Lee header Authorization |
| `Authorization` | supabase/functions/_shared/*/ef-auth.ts | 5-10 | Extracción de header | OK | Correcto; logger redacta |
| `api_key` | supabase/functions/_shared/*/wasender-client.ts | 5-10 | api_key_secret_name | OK | Solo el nombre, no el valor |
| `sk-` | (no encontrado en src/ ni en scripts/) | — | — | OK | Sin pattern de OpenAI key encontrado |
| `VITE_` con secret | .env.example | Múltiples | Configs WebChat | OK | Sin service_role ni signing secret bajo VITE_ |

---

## Variables VITE_* que NO deben existir nunca

| Variable prohibida | Estado | Evidencia |
|---|---|---|
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | ✅ No encontrada | .env.example, src/, scripts/ revisados |
| `VITE_WEBCHAT_SESSION_SIGNING_SECRET` | ✅ No encontrada | .env.example revisado |
| `VITE_WASENDER_API_KEY` | ✅ No encontrada | .env.example revisado |
| `VITE_WASENDER_WEBHOOK_SECRET` | ✅ No encontrada | .env.example revisado |
| `VITE_N8N_SECRET` | ✅ No encontrada | .env.example revisado |
| `VITE_CORE_API_KEY` | ✅ No encontrada | .env.example revisado |
| `VITE_IA_PROVIDER_KEY` | ✅ No encontrada | .env.example revisado |

---

## Hallazgos de secretos

| Finding | Descripción | Severidad |
|---|---|---|
| SEC-005 | webhook_secret en plaintext en conv_wa_sessions DB | CRITICAL |
| SEC-005b | api_key en Supabase Vault pendiente (solo nombre en DB actualmente) | HIGH |
| SEC-008 | Snyk security scan con continue-on-error (vulnerabilidades no bloquean PR) | HIGH |

---

## Estado de GATE_1

Inventario completo. Sin secrets bajo VITE_. webhook_secret pendiente de migración a Vault.

**GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING**
