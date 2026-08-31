# Feature Flag Matrix — SmartConversations
<!-- Fase 11A · 2026-07-19 -->

> **Estado por defecto: TODOS los flags desactivados.** Ningún flag debe activarse en producción hasta cumplir su GATE correspondiente.

## Flags del Widget WebChat

| Flag | Variable | Default | Tipo | GATE mínimo para activar |
|---|---|---|---|---|
| Widget habilitado | `VITE_WEBCHAT_WIDGET_ENABLED` | `false` | boolean | GATE_4 |
| Realtime habilitado | `VITE_WEBCHAT_REALTIME_ENABLED` | `false` | boolean | GATE_4 + Realtime EF deployado |
| Debug mode | `VITE_WEBCHAT_DEBUG` | `false` | boolean | N/A (solo dev local) |
| Storage mode | `VITE_WEBCHAT_SESSION_STORAGE_MODE` | `memory` | enum | N/A |

## Flags del sistema (preexistentes)

| Flag | Variable | Default | Tipo | Notas |
|---|---|---|---|---|
| Analytics | `VITE_ENABLE_ANALYTICS` | `false` | boolean | No relacionado con SC |
| Debug global | `VITE_ENABLE_DEBUG` | `false` | boolean | No relacionado con SC |

---

## Combinaciones seguras e inseguras

### ✅ Combinaciones permitidas

| Combinación | `WIDGET_ENABLED` | `REALTIME_ENABLED` | `DEBUG` | Entorno válido |
|---|---|---|---|---|
| Off total (default) | `false` | `false` | `false` | Todos |
| Widget ON, Realtime OFF | `true` | `false` | `false` | staging/prod con GATE_4 |
| Widget ON, Realtime ON | `true` | `true` | `false` | staging/prod con GATE_4 + RT |
| Widget ON, Debug ON | `true` | `false` | `true` | Solo dev local |

### 🚫 Combinaciones prohibidas

| Combinación | Por qué está prohibida |
|---|---|
| `WIDGET_ENABLED=false` + `REALTIME_ENABLED=true` | Realtime activo sin widget sirve de nada y abre canales sin UI |
| `DEBUG=true` en staging/prod | Expone tokens en consola |
| `SESSION_STORAGE_MODE=sessionStorage` con PII | El modo sessionStorage NO debe persistir datos identificables |
| Cualquier flag activo antes de GATE_4 | Viola la política de no-activar-producción |

---

## Tabla de impacto por flag

### `VITE_WEBCHAT_WIDGET_ENABLED`

| Valor | Comportamiento en V2Layout | Comportamiento en tests |
|---|---|---|
| `false` (default) | `WebChatWidget` NO se monta. Cero impacto en layout. | INT-02 valida que el launcher no aparece |
| `true` | `WebChatWidget` se monta. Launcher visible en bottom-right. | INT-01 valida que el launcher aparece |

### `VITE_WEBCHAT_REALTIME_ENABLED`

| Valor | Comportamiento en `useWebChatRealtime` | Sin sesión |
|---|---|---|
| `false` (default) | Hook no se subscribe. Solo polling. | N/A |
| `true` | Hook crea subscription Supabase Realtime. Requiere `realtimeAdapter` prop. | No subscribe si no hay sesión |

### `VITE_WEBCHAT_SESSION_STORAGE_MODE`

| Valor | Datos persistidos en sessionStorage | Datos NUNCA persistidos |
|---|---|---|
| `memory` (default) | Nada | Todo (incluyendo token) |
| `sessionStorage` | `session_id`, `sender_ref`, `client_account_id`, `expires_at`, `webchat_session_token` | `message_text`, `profile_id`, `identity_data`, `service_role` |

---

## Estado actual del repositorio

```
VITE_WEBCHAT_WIDGET_ENABLED=false     # .env.example — ✅ seguro
VITE_WEBCHAT_REALTIME_ENABLED=false   # .env.example — ✅ seguro
VITE_WEBCHAT_DEBUG=false              # .env.example — ✅ seguro
```

Ningún flag de SC está activo. Estado: **GATE_0 baseline — safe**.
