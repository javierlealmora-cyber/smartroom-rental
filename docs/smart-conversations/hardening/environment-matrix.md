# Environment Matrix — SmartConversations
<!-- Fase 11A · 2026-07-19 -->

> **Restricción**: Ningún entorno de SC debe conectar a Core real, IA real, n8n real, Wasender real, Realtime real, ni usar credenciales reales.

## Entornos definidos

| ID | Nombre | Propósito | Activación WebChat |
|---|---|---|---|
| ENV-0 | `test` | Vitest/JSDOM local, sin red | Desactivado (mock) |
| ENV-1 | `development` | Dev local con Vite | Desactivado por defecto |
| ENV-2 | `staging` | Staging Supabase | Desactivado por defecto |
| ENV-3 | `production` | Producción | Desactivado hasta GATE_5 |
| ENV-4 | `ci` | GitHub Actions PR checks | Desactivado (mock secrets) |
| ENV-5 | `e2e` | Playwright local | Desactivado por defecto |

---

## Variables por entorno

### Variables globales (todos los entornos)

| Variable | ENV-0 (test) | ENV-1 (dev) | ENV-2 (staging) | ENV-3 (prod) | ENV-4 (ci) | ENV-5 (e2e) |
|---|---|---|---|---|---|---|
| `VITE_SUPABASE_URL` | mock | `*.supabase.co` (dev) | `lopdwr*.supabase.co` | `oeofdv*.supabase.co` | secret CI | `.env.e2e` |
| `VITE_SUPABASE_ANON_KEY` | mock | anon dev | anon staging | anon prod | secret CI | `.env.e2e` |

### Variables WebChat (Fase 10G)

| Variable | ENV-0 | ENV-1 | ENV-2 | ENV-3 | ENV-4 | ENV-5 |
|---|---|---|---|---|---|---|
| `VITE_WEBCHAT_WIDGET_ENABLED` | `false` | `false` | `false` | `false` | `false` | `false` |
| `VITE_WEBCHAT_API_BASE_URL` | mock/`''` | `''` | `''` | `''` | `''` | `''` |
| `VITE_WEBCHAT_CLIENT_ACCOUNT_ID` | mock/`''` | `''` | `''` | `''` | `''` | `''` |
| `VITE_WEBCHAT_WIDGET_PUBLIC_KEY` | mock/`''` | `''` | `''` | `''` | `''` | `''` |
| `VITE_WEBCHAT_REALTIME_ENABLED` | `false` | `false` | `false` | `false` | `false` | `false` |
| `VITE_WEBCHAT_POLL_INTERVAL_MS` | `5000` | `5000` | `5000` | `5000` | `5000` | `5000` |
| `VITE_WEBCHAT_SESSION_STORAGE_MODE` | `memory` | `memory` | `memory` | `memory` | `memory` | `memory` |
| `VITE_WEBCHAT_DEFAULT_LOCALE` | `es` | `es` | `es` | `es` | `es` | `es` |
| `VITE_WEBCHAT_DEBUG` | `false` | `false` | `false` | `false` | `false` | `false` |

---

## Archivos de configuración por entorno

| Entorno | Archivo fuente | Estado |
|---|---|---|
| Base/ejemplo | `.env.example` | ✅ Incluido en repo, sin secrets |
| Test (Vitest) | Variables inyectadas por `vi.mock` | ✅ No usa `.env` real |
| Dev local | `.env.local` (gitignored) | ⚠️ El desarrollador crea manualmente |
| CI | GitHub Actions Secrets | ✅ Solo `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` |
| E2E | `tests/e2e/.env.e2e` (gitignored) | ⚠️ Requiere `.env.e2e.example` copiado |
| Staging | `.env.staging` (gitignored) | ⚠️ No comprometido |
| Producción | Variables de host/CI | 🚫 Gestionadas por ops |

---

## Reglas de seguridad por entorno

1. **ENV-0 (test)**: NUNCA leer `.env` real. Todo debe ser mock o `import.meta.env` inyectado.
2. **ENV-4 (ci)**: Solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en secrets. Sin signing secrets reales.
3. **ENV-2/ENV-3**: `VITE_WEBCHAT_WIDGET_ENABLED=false` hasta que GATE_4 esté aprobado.
4. **Todos**: `VITE_WEBCHAT_CLIENT_ACCOUNT_ID` vacío hasta onboarding de tenant real aprobado.
5. **Todos**: `service_role` NUNCA como variable `VITE_*`. Solo en Edge Functions via env del servidor.

---

## Variables prohibidas en frontend (VITE_*)

Estas variables NUNCA deben existir en el frontend:

- `VITE_SUPABASE_SERVICE_ROLE_KEY`
- `VITE_WEBCHAT_SERVICE_ROLE`
- `VITE_N8N_API_KEY`
- `VITE_WASENDER_API_KEY`
- `VITE_OPENAI_API_KEY`
- `VITE_WEBCHAT_SIGNING_SECRET`

---

## Validación automatizada

El script `scripts/smart-conversations/validate-release-readiness.mjs` verifica:

- Que ninguna variable prohibida esté en `.env.example`
- Que `VITE_WEBCHAT_WIDGET_ENABLED` sea `false` en `.env.example`
- Que no existan archivos `.env` con secrets en el repo

Estado actual: ✅ `.env.example` no contiene secrets ni activa WebChat
