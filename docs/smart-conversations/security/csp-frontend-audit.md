# CSP & Frontend Security Audit — SmartConversations
<!-- Fase 11B1 · Auditoría 2026-07-21 -->

> Auditoría de Content-Security-Policy y seguridad frontend.
> No activa CSP en esta fase. Solo inventario y propuesta.

---

## Estado actual de CSP

### index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SmartRoom Rental Platform</title>
    <!-- ❌ Sin Content-Security-Policy meta tag -->
    <!-- ❌ Sin X-Frame-Options meta tag -->
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

**Hallazgo:** No hay CSP. **SEC-003 (CRITICAL)**

---

### vite.config.js

```javascript
export default defineConfig({
  plugins: [react()],
  build: { target: 'es2022' },
  optimizeDeps: { ... }
});
```

**Hallazgo:** Sin `server.headers` para desarrollo ni headers de producción (Vercel los maneja externamente). No hay `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, ni `Permissions-Policy`.

---

### vercel.json

No encontrado en el repositorio. Los headers de seguridad de Vercel no están configurados en código fuente.

**Hallazgo:** Los headers de seguridad deben configurarse en `vercel.json`. SEC-003.

---

## Inventario de patrones de riesgo frontend

### dangerouslySetInnerHTML

| Búsqueda | Resultado |
|---|---|
| En `src/features/webchat/` | ✅ No encontrado |
| En `src/` (general) | Pendiente auditoría general |

### eval / new Function

| Búsqueda | Resultado |
|---|---|
| En `src/features/webchat/` | ✅ No encontrado |
| En `src/` (general) | Pendiente auditoría general |

### Scripts inline

| Tipo | Estado |
|---|---|
| `<script>` inline en index.html | ✅ No hay scripts inline |
| Event handlers inline (`onclick=`) | No aplica (React) |
| Módulo de entrada | `<script type="module" src="/src/main.jsx">` — externo, correcto |

### Estilos inline con datos dinámicos

| Tipo | Estado |
|---|---|
| `style={{}}` con datos de usuario | Pendiente revisión en componentes WebChat |
| CSS injection risk | Bajo (React escapa automáticamente valores en style) |

---

## Conexiones permitidas actuales (observadas)

| Destino | Propósito | Protocolo | Desde |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Supabase API | HTTPS | Frontend React |
| `VITE_SUPABASE_URL` (wss) | Supabase Realtime | WSS | WebChatRealtime hook |
| Assets propios | Vite dev / Vercel | HTTPS | Frontend |
| `VITE_WEBCHAT_API_BASE_URL` | Edge Functions WebChat | HTTPS | Widget WebChat |

### Conexiones NO permitidas desde frontend (verificadas)

| Destino | Estado | Evidencia |
|---|---|---|
| Wasender API | ✅ Solo desde EF conv-send-wa | No hay fetch a Wasender en src/ |
| Core API | ✅ Solo desde EF conv-core-* | No hay fetch a Core en src/ |
| IA provider | ✅ Solo desde EF (mock) | No hay fetch a IA en src/ |
| n8n | ✅ Solo desde EF (stub) | No hay fetch a n8n en src/ |
| service_role endpoints | ✅ Nunca en frontend | No hay VITE_SUPABASE_SERVICE_ROLE_KEY |

---

## CSP objetivo (propuesto para 11B3)

> **No activar en esta fase.** Esta es la propuesta para la remediación.

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self'
    https://<SUPABASE_PROJECT_REF>.supabase.co
    wss://<SUPABASE_PROJECT_REF>.supabase.co
    https://<SUPABASE_PROJECT_REF>.functions.supabase.co;
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
```

**Notas sobre la propuesta:**
- `script-src 'self'` sin `unsafe-eval` ni `unsafe-inline` — React no requiere eval.
- `style-src 'unsafe-inline'` provisional — Ant Design y estilos inline de React requieren `unsafe-inline` para estilos. Alternativa: usar nonce/hash en Fase 11B4.
- `connect-src` restringido a Supabase project ref — no `*`.
- `frame-ancestors 'none'` — previene clickjacking (WebChat no se embebe en iframe ajeno).
- `object-src 'none'` — sin plugins Flash/etc.
- `base-uri 'self'` — previene inyección de base URL.
- No se incluye `unsafe-eval` como solución por defecto.
- No se incluye `connect-src *`.
- Si el widget se embebe en iframe: `frame-ancestors 'self' <trusted-domains>`.

**Headers adicionales propuestos para vercel.json:**
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

---

## Análisis de Realtime WebSocket en CSP

El cliente WebChat usa:
```javascript
supabaseClient.channel(`webchat:${sessionId}`)
```

Esto abre una conexión WSS a:
```
wss://<project_ref>.supabase.co/realtime/v1/websocket
```

La CSP propuesta incluye `wss://<SUPABASE_PROJECT_REF>.supabase.co` en `connect-src`. ✅

---

## Hallazgos CSP

| Finding | Descripción | Severidad |
|---|---|---|
| SEC-003 | No hay Content-Security-Policy en index.html ni en Vercel | CRITICAL |
| SEC-020 | No hay X-Frame-Options (clickjacking posible) | MEDIUM |
| SEC-021 | No hay X-Content-Type-Options (MIME sniffing) | LOW |

---

## Estado de GATE_1

CSP auditada. No se activa CSP en esta fase. Propuesta documentada para 11B3.

**GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING**
