# Security Findings Register — SmartConversations
<!-- Fase 11B2A · Actualizado 2026-07-21 — SEC-001 severity_changed, SEC-024 añadido -->

> Registro canónico de findings de seguridad.
> No se corrigen en esta fase. Estados: open | accepted | mitigated | false_positive | requires_validation

---

## Resumen por severidad

| Severidad | Count | Notas Fase 11B2A |
|---|---|---|
| CRITICAL | 4 | SEC-001 movido a LOW |
| HIGH | 6 | SEC-001 pasó a LOW |
| MEDIUM | 7 | Sin cambios |
| LOW | 5 | +SEC-001 (severity_changed) |
| INFO | 4 | +SEC-024 (nuevo) |
| **TOTAL** | **26** | +1 SEC-024; SEC-015 y SEC-028 no_created |

---

## LOW (severity_changed en Fase 11B2A)

### SEC-001: No FORCE ROW LEVEL SECURITY en tablas conv_*

| Campo | Valor |
|---|---|
| finding_id | SEC-001 |
| título | Tablas conv_* sin FORCE ROW LEVEL SECURITY |
| componente | Supabase DB — 8 tablas conv_* |
| categoría | RLS / Database Security |
| evidencia | Migración 20260716000001_smart_conversations_core_schema.sql: ENABLE RLS presente en 8 tablas, FORCE RLS ausente en todas |
| fichero / línea | supabase/migrations/20260716000001_smart_conversations_core_schema.sql:47,88,127,195,254,318,371,423 |
| severidad | LOW (severity_changed de HIGH — análisis BYPASSRLS en rls-role-model.md §4) |
| explotación | FORCE RLS impide que el propietario de tabla use `SET row_security = off`. Sin embargo, en Supabase: `service_role` tiene `BYPASSRLS=true` y `postgres` es superusuario con BYPASSRLS implícito. Ninguno de los actores con acceso a conv_* está restringido por FORCE RLS. El vector de ataque real requiere comprometer las credenciales de DB del proyecto Supabase. |
| impacto | Defense-in-depth teórica. Sin impacto práctico en el modelo de amenazas de Supabase actual |
| probabilidad | Muy baja (requiere acceso a credenciales de DB del proyecto; nivel de compromiso catastrófico independiente de FORCE RLS) |
| recomendación | Aplicar `FORCE ROW LEVEL SECURITY` en Fase 11B2B como buena práctica, con baja prioridad |
| esfuerzo | Bajo — 8 ALTER TABLE statements en nueva migración |
| fase | 11B2 |
| bloquea sandbox | No |
| bloquea preproduction | No (severity_changed a LOW en Fase 11B2A) |
| bloquea production | No (severity_changed a LOW en Fase 11B2A) |
| estado | open |
| severity_changed | HIGH → LOW (Fase 11B2A, evidencia: rls-role-model.md §4) |

---

### SEC-002: Rate limiting WebChat desactivado por defecto

| Campo | Valor |
|---|---|
| finding_id | SEC-002 |
| título | WEBCHAT_RATE_LIMIT_MODE=mock — rate limiting desactivado |
| componente | conv-web-message, conv-web-poll; webchat-rate-limiter.ts |
| categoría | Availability / DoS |
| evidencia | `_shared/smart-conversations/webchat-rate-limiter.ts`: modo default = 'mock'; nunca bloquea requests |
| fichero / línea | supabase/functions/_shared/smart-conversations/webchat-rate-limiter.ts |
| severidad | CRITICAL |
| explotación | Sin configurar `WEBCHAT_RATE_LIMIT_MODE=database`, un atacante puede enviar mensajes ilimitados a conv-web-message. Cada mensaje dispara la pipeline completa: conv-ingest → conv-dispatch → WF → IA/n8n/Core → conv-web-deliver. Costo amplificado por cada step |
| impacto | DoS de la pipeline SC; costo de API calls amplificado; degradación del servicio para todos los tenants |
| probabilidad | Alta (endpoint público; sin configuración especial requerida) |
| recomendación | Cambiar default a `database` o documentar como MUST-CONFIGURE antes de sandbox |
| esfuerzo | Bajo — cambiar valor default en código o exigir configuración explícita |
| fase | 11B2 |
| bloquea sandbox | Sí |
| bloquea preproduction | Sí |
| bloquea production | Sí |
| estado | open |

---

### SEC-003: Sin Content-Security-Policy

| Campo | Valor |
|---|---|
| finding_id | SEC-003 |
| título | No hay CSP en index.html ni en Vercel |
| componente | Frontend — index.html, vite.config.js |
| categoría | Frontend Security / XSS |
| evidencia | index.html sin meta CSP; vite.config.js sin server.headers; vercel.json no encontrado en repo |
| fichero / línea | index.html:1-12 |
| severidad | CRITICAL |
| explotación | Un XSS exitoso (en cualquier dependencia o en el código propio) tiene alcance completo: acceso a sessionStorage (session_id, sender_ref, webchat_session_token), llamadas a Supabase con el token del usuario, etc. |
| impacto | Robo de sesiones WebChat; acceso a datos del usuario autenticado; potencial takeover de cuenta |
| probabilidad | Media (requiere XSS previo; React mitiga muchos vectores pero no todos) |
| recomendación | Crear vercel.json con CSP objetivo documentada en csp-frontend-audit.md |
| esfuerzo | Medio — crear vercel.json; verificar no-breaks con AntD |
| fase | 11B3 |
| bloquea sandbox | No |
| bloquea preproduction | Sí |
| bloquea production | Sí |
| estado | open |

---

### SEC-004: WebChat authentication mode legacy por defecto

| Campo | Valor |
|---|---|
| finding_id | SEC-004 |
| título | WEBCHAT_AUTH_MODE=legacy — autenticación de token WebChat desactivada |
| componente | conv-web-message, conv-web-poll; webchat-session-token.ts |
| categoría | Authentication / Authorization |
| evidencia | Default de WEBCHAT_AUTH_MODE es 'legacy'; sin signed_token, autorización depende solo de conocer session_id + sender_ref |
| fichero / línea | supabase/functions/_shared/smart-conversations/webchat-session-token.ts |
| severidad | CRITICAL |
| explotación | En modo legacy: poseedor de session_id y sender_ref (disponibles en sessionStorage o en tráfico de red) puede enviar mensajes y consultar historial como esa sesión. Sin HTTPS estricto o con XSS, estos valores pueden robarse |
| impacto | Impersonación de usuario WebChat; acceso a historial de conversación; envío de mensajes en nombre de otro usuario |
| probabilidad | Alta (si HTTPS degradado o XSS; media en entorno normal) |
| recomendación | Activar WEBCHAT_AUTH_MODE=signed_token como default de producción |
| esfuerzo | Bajo — cambiar variable de entorno; alto — verificar que todos los clientes mandan token |
| fase | 11B2 |
| bloquea sandbox | No |
| bloquea preproduction | Sí |
| bloquea production | Sí |
| estado | open |

---

## HIGH

### SEC-005: webhook_secret en texto claro en conv_wa_sessions

| Campo | Valor |
|---|---|
| finding_id | SEC-005 |
| título | Wasender webhook_secret almacenado en plaintext en DB |
| componente | conv_wa_sessions tabla; conv-wa-webhook |
| categoría | Secrets Management |
| evidencia | Migración línea ~80: `webhook_secret TEXT NOT NULL`. Comentario indica migración a Vault en Fase 9 (TODO pendiente) |
| fichero / línea | supabase/migrations/20260716000001_smart_conversations_core_schema.sql:~80 |
| severidad | CRITICAL (escalado a HIGH dado que acceso es solo con service_role) |
| explotación | Si service_role key se compromete, todos los webhook_secrets de todos los tenants están expuestos. Un atacante con estos secrets puede generar webhooks de Wasender falsos |
| impacto | Suplantación de webhooks; inyección de mensajes WA falsos; bypass de validación HMAC |
| probabilidad | Baja (requiere compromiso de service_role) |
| recomendación | Migrar webhook_secret a Supabase Vault; almacenar solo el nombre del secret en DB |
| esfuerzo | Alto — requiere migración + cambio en conv-wa-webhook para leer de Vault |
| fase | 11B2 |
| bloquea sandbox | No |
| bloquea preproduction | Sí |
| bloquea production | Sí |
| estado | open |

---

### SEC-006: Sin rate limiting en conv-web-session

| Campo | Valor |
|---|---|
| finding_id | SEC-006 |
| título | No hay rate limiting en creación de sesiones WebChat |
| componente | conv-web-session |
| categoría | Availability / DoS |
| evidencia | conv-web-session no implementa rate limiting. Crear sesión solo requiere un client_account_id válido |
| fichero / línea | supabase/functions/conv-web-session/index.ts |
| severidad | HIGH |
| explotación | Atacante puede crear miles de sesiones, llenando conv_sessions y degradando el servicio para ese tenant |
| impacto | Degradación del servicio; costos de DB; dificultad para tenants legítimos |
| probabilidad | Media (endpoint público) |
| recomendación | Implementar rate limiting por IP y/o por client_account_id usando conv_wc_configs o middleware |
| esfuerzo | Medio |
| fase | 11B2 |
| bloquea sandbox | Sí |
| bloquea preproduction | Sí |
| bloquea production | Sí |
| estado | open |

---

### SEC-007: raw_payload sin purga automática

| Campo | Valor |
|---|---|
| finding_id | SEC-007 |
| título | conv_messages.raw_payload sin mecanismo de purga automática tras 30 días |
| componente | conv_messages tabla |
| categoría | Data Privacy / Retention |
| evidencia | Migración línea ~320: comentario "retención 30 días". Sin trigger, pg_cron ni tarea periódica implementada |
| fichero / línea | supabase/migrations/20260716000001_smart_conversations_core_schema.sql:~320 |
| severidad | HIGH |
| explotación | PII potencial en raw_payload (payload completo de WhatsApp con sender, texto, media) retenida indefinidamente |
| impacto | Incumplimiento de política de retención de datos; riesgo GDPR |
| probabilidad | Alta (sin acción → acumulación indefinida) |
| recomendación | Implementar pg_cron job o EF periódica que pone raw_payload=NULL para mensajes > 30 días |
| esfuerzo | Medio |
| fase | 11B3 |
| bloquea sandbox | No |
| bloquea preproduction | Sí |
| bloquea production | Sí |
| estado | open |

---

### SEC-008: Snyk security scan con continue-on-error

| Campo | Valor |
|---|---|
| finding_id | SEC-008 |
| título | Job 'security' con Snyk tiene continue-on-error:true |
| componente | .github/workflows/pr-checks.yml |
| categoría | CI Security |
| evidencia | pr-checks.yml línea ~190: `continue-on-error: true` en step de Snyk |
| fichero / línea | .github/workflows/pr-checks.yml:~190 |
| severidad | HIGH |
| explotación | Una dependencia npm con vulnerabilidad CRITICAL detectada por Snyk no bloquea el merge del PR |
| impacto | Supply chain vulnerability puede entrar en producción sin revisión |
| probabilidad | Media |
| recomendación | Remover `continue-on-error: true` del job de security; o al menos del step de Snyk |
| esfuerzo | Bajo |
| fase | 11B2 |
| bloquea sandbox | No |
| bloquea preproduction | Sí |
| bloquea production | Sí |
| estado | open |

---

### SEC-009: Políticas TODO no implementadas (anon/authenticated)

| Campo | Valor |
|---|---|
| finding_id | SEC-009 |
| título | Políticas de acceso anon/authenticated en conv_* marcadas como TODO |
| componente | conv_wc_configs, conv_sessions, conv_messages, conv_admin_notifications |
| categoría | RLS / Authorization |
| evidencia | Migración: 4 comentarios TODO sobre políticas futuras necesarias para Realtime, polling y admin dashboard |
| fichero / línea | supabase/migrations/20260716000001_smart_conversations_core_schema.sql:~136,~204,~327,~432 |
| severidad | HIGH |
| explotación | Las EFs WebChat actualmente usan service_role para TODO el acceso a DB (correcto en Fase actual). En Fase 2+, cuando Realtime y el dashboard admin necesiten acceso directo, faltarán las políticas |
| impacto | En Fases futuras: sin política → acceso denegado a funciones legítimas, o tentación de dar acceso demasiado amplio |
| probabilidad | Certeza (TODO está documentado) |
| recomendación | Implementar políticas RLS con mínimo privilegio antes de activar acceso directo desde frontend/Realtime |
| esfuerzo | Alto |
| fase | 11B2 |
| bloquea sandbox | No |
| bloquea preproduction | Sí |
| bloquea production | Sí |
| estado | open |

---

### SEC-013: Aislamiento multi-tenant depende de UUIDs conocidos en modo legacy

| Campo | Valor |
|---|---|
| finding_id | SEC-013 |
| título | client_account_id en request body no verificado criptográficamente (modo legacy) |
| componente | conv-web-session, conv-web-message, conv-web-poll |
| categoría | Tenant Isolation / Authorization |
| evidencia | multi-tenant-isolation-audit.md Casos 1-4: acceso posible si atacante conoce UUIDs válidos |
| fichero / línea | supabase/functions/conv-web-session/index.ts, conv-web-message/index.ts, conv-web-poll/index.ts |
| severidad | HIGH |
| explotación | En modo legacy: atacante que conoce client_account_id + session_id + sender_ref de otro tenant puede leer mensajes y enviar mensajes como esa sesión |
| impacto | Acceso cross-tenant a historial de conversaciones; impersonación de sesión |
| probabilidad | Baja (UUIDs son opacos; requiere enumeración o filtración previa) |
| recomendación | Activar signed_token mode (SEC-004) que vincula criptográficamente el client_account_id al token |
| esfuerzo | Bajo (cuando SEC-004 se implemente) |
| fase | 11B2 |
| bloquea sandbox | No |
| bloquea preproduction | Sí |
| bloquea production | Sí |
| estado | open |

---

### SEC-026: Sin validación de timestamp en webhook Wasender

| Campo | Valor |
|---|---|
| finding_id | SEC-026 |
| título | Conv-wa-webhook no valida timestamp del webhook (ventana de replay indefinida) |
| componente | conv-wa-webhook |
| categoría | Webhook Security / Replay |
| evidencia | webhook-replay-audit.md: no hay validación de timestamp ni ventana de tolerancia |
| fichero / línea | supabase/functions/conv-wa-webhook/index.ts |
| severidad | HIGH |
| explotación | Un webhook con firma HMAC válida puede ser rerepetido indefinidamente. La deduplicación por wasender_message_id previene mensajes duplicados, pero otros efectos secundarios (notificaciones, Activity Log events) podrían repetirse si la EF los genera antes de la verificación de dedup |
| impacto | Replay attacks; acción repetida en sistemas downstream si dedup no es 100% efectivo |
| probabilidad | Baja (requiere intercepción de tráfico Wasender → SmartConversations) |
| recomendación | Verificar X-Wasender-Timestamp header; rechazar webhooks con timestamp > 5 minutos de antigüedad |
| esfuerzo | Bajo |
| fase | 11B3 |
| bloquea sandbox | No |
| bloquea preproduction | No |
| bloquea production | Sí |
| estado | open |

---

## MEDIUM

### SEC-010: Política anon en conv_messages excluyendo raw_payload no implementada

| Campo | Valor |
|---|---|
| finding_id | SEC-010 |
| título | TODO: política SELECT en conv_messages excluyendo raw_payload no implementada |
| componente | conv_messages |
| categoría | RLS / Data Privacy |
| evidencia | Migración línea ~327: `-- TODO: política de lectura por session_id verificado, excluyendo raw_payload` |
| fichero / línea | supabase/migrations/20260716000001_smart_conversations_core_schema.sql:~327 |
| severidad | MEDIUM (CRITICAL si se implementa policy incorrecta que incluya raw_payload) |
| explotación | Si se implementa una política anon demasiado amplia, raw_payload (PII completo de WhatsApp) sería accesible |
| impacto | Exposición de PII de mensajes WhatsApp |
| probabilidad | Baja (riesgo futuro en implementación de política) |
| recomendación | Al implementar: usar `SELECT (id, client_account_id, session_id, direction, sender_type, text, status, created_at)` — excluir raw_payload explícitamente |
| esfuerzo | Medio |
| fase | 11B2 |
| bloquea sandbox | No |
| bloquea preproduction | Sí |
| bloquea production | Sí |
| estado | open |

---

### SEC-011: Realtime channels sin RLS de canal

| Campo | Valor |
|---|---|
| finding_id | SEC-011 |
| título | Canal Realtime webchat:<session_id> sin autorización de suscripción |
| componente | Supabase Realtime; webchat-realtime.js |
| categoría | Authorization / Information Disclosure |
| evidencia | webchat-realtime.js: `supabaseClient.channel('webchat:${sessionId}')`. Realtime RLS no está en este repositorio |
| fichero / línea | src/features/webchat/services/webchat-realtime.js |
| severidad | MEDIUM |
| explotación | Cualquier cliente con anon key puede suscribirse a `webchat:<cualquier_session_id>` y recibir notificaciones de disponibilidad de mensajes. No revelan contenido, pero revelan actividad |
| impacto | Privacy leak: saber que una sesión específica tiene mensajes nuevos |
| probabilidad | Media (requiere conocer un session_id; pero UUIDs son predecibles si se enumera) |
| recomendación | Configurar Realtime RLS en Supabase para autorizar suscripción solo al poseedor del session_id |
| esfuerzo | Medio (configuración de Supabase Realtime) |
| fase | 11B3 |
| bloquea sandbox | No |
| bloquea preproduction | Sí |
| bloquea production | Sí |
| estado | open |

---

### SEC-012: Comparación de service_role key no es constant-time

| Campo | Valor |
|---|---|
| finding_id | SEC-012 |
| título | ef-auth.ts usa `===` para comparar service_role key (timing attack teórico) |
| componente | _shared/smart-conversations/ef-auth.ts |
| categoría | Authentication / Timing Attack |
| evidencia | ef-auth.ts: `return !!token && token === serviceRoleKey` |
| fichero / línea | supabase/functions/_shared/smart-conversations/ef-auth.ts |
| severidad | MEDIUM |
| explotación | Teoréticamente, un atacante puede medir latencia de respuesta para deducir longitud del prefijo correcto de la service_role key. En práctica, la latencia de red y del Edge Runtime hace este ataque extremadamente difícil |
| impacto | Potencial extracción parcial de service_role key por timing |
| probabilidad | Muy baja |
| recomendación | Reemplazar con `crypto.subtle.timingSafeEqual()` |
| esfuerzo | Bajo |
| fase | 11B3 |
| bloquea sandbox | No |
| bloquea preproduction | No |
| bloquea production | Sí |
| estado | open |

---

### SEC-017: Access-Control-Allow-Origin wildcard en EFs públicas WebChat

| Campo | Valor |
|---|---|
| finding_id | SEC-017 |
| título | EFs públicas WebChat devuelven `Access-Control-Allow-Origin: *` |
| componente | conv-web-session, conv-web-message, conv-web-poll; _shared/response.ts |
| categoría | CORS |
| evidencia | corsHeaders en _shared/response.ts: `'Access-Control-Allow-Origin': '*'` aplicado en todas las EFs |
| fichero / línea | supabase/functions/_shared/smart-conversations/response.ts |
| severidad | MEDIUM |
| explotación | Cualquier sitio web puede hacer requests JS a estas EFs. Sin credenciales, no expone tokens de Supabase del usuario, pero permite crear sesiones y enviar mensajes WebChat desde sitios maliciosos |
| impacto | Abuso de widgets WebChat desde dominios no autorizados |
| probabilidad | Media |
| recomendación | CORS dinámico basado en allowed_origins de conv_wc_configs (propuesto en cors-audit.md) |
| esfuerzo | Medio |
| fase | 11B3 |
| bloquea sandbox | No |
| bloquea preproduction | Sí |
| bloquea production | Sí |
| estado | open |

---

### SEC-019: Respuesta de Core puede contener datos de otro tenant (pendiente verificación)

| Campo | Valor |
|---|---|
| finding_id | SEC-019 |
| título | Core adapter real podría devolver entidades de otro tenant sin verificación cruzada |
| componente | conv-core-validate-identity, conv-core-query-listings |
| categoría | Tenant Isolation |
| evidencia | multi-tenant-isolation-audit.md Caso 10; Core adapter es mock en Fase 11A |
| fichero / línea | supabase/functions/_shared/smart-conversations/core-http-client.ts |
| severidad | MEDIUM (requiere verificación cuando Core sea real) |
| explotación | Si Core no verifica que la entidad retornada pertenece al tenant que hizo la query, SmartConversations usaría datos de otro tenant |
| impacto | Cross-tenant data leak vía Core |
| probabilidad | Baja (depende de implementación de Core) |
| recomendación | En Fase real: verificar que response.client_account_id === request.client_account_id antes de persistir |
| esfuerzo | Bajo (verificación de campo) |
| fase | 11B3 |
| bloquea sandbox | No |
| bloquea preproduction | Sí |
| bloquea production | Sí |
| estado | requires_validation |

---

### SEC-025: IA adapter debe sanitizar message_text antes de enviar a IA

| Campo | Valor |
|---|---|
| finding_id | SEC-025 |
| título | IA adapter puede recibir message_text con PII sin sanitización previa |
| componente | WF EFs con IA; IA adapter |
| categoría | Privacy / Prompt Injection |
| evidencia | logging-privacy-audit.md: adapter IA es mock; guards definidos pero no verificados end-to-end |
| fichero / línea | supabase/functions/_shared/smart-conversations/ (adapter IA) |
| severidad | MEDIUM (HIGH cuando IA sea real) |
| explotación | message_text con PII del usuario (nombre, email, teléfono mencionados en conversación) llega a IA externa sin sanitización |
| impacto | PII exfiltrada a proveedor IA externo |
| probabilidad | Alta (cuando IA sea real) |
| recomendación | Sanitizar message_text antes de incluir en prompt; no incluir identity_data en ningún caso |
| esfuerzo | Medio |
| fase | 11B3 |
| bloquea sandbox | No |
| bloquea preproduction | Sí |
| bloquea production | Sí |
| estado | open |

---

### SEC-027: Sin deduplicación de mensajes WebChat (replay posible)

| Campo | Valor |
|---|---|
| finding_id | SEC-027 |
| título | conv-web-message no deduplica mensajes (replay crea duplicados) |
| componente | conv-web-message |
| categoría | Integrity / Replay |
| evidencia | webhook-replay-audit.md: no hay nonce ni idempotency key en conv-web-message |
| fichero / línea | supabase/functions/conv-web-message/index.ts |
| severidad | MEDIUM |
| explotación | Un retry del widget (reconexión de red) puede crear mensajes duplicados. Un atacante con sesión válida puede enviar el mismo mensaje múltiples veces |
| impacto | Mensajes duplicados en conversación; posible trigger duplicado de workflows |
| probabilidad | Media (reintentos de red son comunes) |
| recomendación | Añadir `idempotency_key` (UUID generado por cliente) a conv-web-message; deduplicar en DB |
| esfuerzo | Medio |
| fase | 11B3 |
| bloquea sandbox | No |
| bloquea preproduction | Sí |
| bloquea production | Sí |
| estado | open |

---

## LOW

### SEC-020: Sin X-Frame-Options (clickjacking)

| Campo | Valor |
|---|---|
| finding_id | SEC-020 |
| título | No hay X-Frame-Options ni frame-ancestors en CSP |
| componente | Frontend |
| categoría | Frontend Security |
| evidencia | index.html sin meta CSP; vercel.json no encontrado |
| fichero / línea | index.html |
| severidad | LOW (MEDIUM si el widget debe embeberse en iframe controlado) |
| explotación | La aplicación puede ser embebida en iframe de sitio malicioso para clickjacking |
| recomendación | `X-Frame-Options: DENY` o `frame-ancestors 'none'` en CSP |
| esfuerzo | Bajo |
| fase | 11B3 |
| bloquea sandbox | No |
| bloquea preproduction | No |
| bloquea production | Sí |
| estado | open |

---

### SEC-021: Sin X-Content-Type-Options

| Campo | Valor |
|---|---|
| finding_id | SEC-021 |
| título | No hay X-Content-Type-Options: nosniff |
| componente | Frontend |
| categoría | Frontend Security |
| evidencia | Headers de seguridad ausentes en index.html y vite.config.js |
| severidad | LOW |
| recomendación | `X-Content-Type-Options: nosniff` en vercel.json |
| fase | 11B3 |
| bloquea sandbox | No |
| bloquea preproduction | No |
| bloquea production | No |
| estado | open |

---

### SEC-022: VITE_WEBCHAT_DEBUG podría activarse en producción

| Campo | Valor |
|---|---|
| finding_id | SEC-022 |
| título | VITE_WEBCHAT_DEBUG=true en producción activaría logs en browser |
| componente | Frontend WebChat |
| categoría | Information Disclosure |
| evidencia | webchat-config.js: `debug: import.meta.env.VITE_WEBCHAT_DEBUG === 'true'` |
| severidad | LOW |
| recomendación | Forzar VITE_WEBCHAT_DEBUG=false en build de producción (ya es false en .env.example) |
| fase | 11B3 |
| bloquea sandbox | No |
| bloquea preproduction | No |
| bloquea production | No |
| estado | open |

---

### SEC-023: PII list de ef-logger no cubre algunos patrones de key

| Campo | Valor |
|---|---|
| finding_id | SEC-023 |
| título | ef-logger.ts PII_FIELDS_TO_REDACT no incluye 'api_key', 'key', 'credential' explícitamente |
| componente | _shared/ef-logger.ts |
| categoría | Privacy / Logging |
| evidencia | Lista incluye 'secret' y 'token' pero no 'api_key', 'key', 'credential' |
| severidad | LOW |
| recomendación | Añadir 'api_key', 'key', 'credential', 'private_key' a PII_FIELDS_TO_REDACT |
| fase | 11B3 |
| bloquea sandbox | No |
| bloquea preproduction | No |
| bloquea production | No |
| estado | open |

---

## INFO

### SEC-014: EFs conv-wf20/30/40 inicialmente sin clasificación explícita

| Campo | Valor |
|---|---|
| finding_id | SEC-014 |
| título | conv-wf20-incidents, conv-wf30-listings, conv-wf40-help sin documentación de clasificación explícita |
| componente | conv-wf20-incidents, conv-wf30-listings, conv-wf40-help |
| categoría | Documentation |
| evidencia | EFs solo invocadas internamente; clasificación derivada de análisis |
| severidad | INFO |
| recomendación | Añadir comentario de clasificación `// Classification: internal_service` al inicio de cada EF |
| fase | 11B2 |
| bloquea sandbox | No |
| bloquea preproduction | No |
| bloquea production | No |
| estado | open |

---

### SEC-016: conv-core-get-tenant-features loguea client_account_id en error

| Campo | Valor |
|---|---|
| finding_id | SEC-016 |
| título | client_account_id incluido en log de error de conv-core-get-tenant-features |
| componente | conv-core-get-tenant-features |
| categoría | Privacy / Logging |
| evidencia | index.ts línea ~62: `log.error('Error', { client_account_id, ... })` |
| severidad | INFO |
| recomendación | Usar solo error code/type en log; evitar incluir client_account_id aunque sea UUID opaco |
| fase | 11B3 |
| bloquea sandbox | No |
| bloquea preproduction | No |
| bloquea production | No |
| estado | open |

---

### SEC-018: client_account_id como query param en conv-wa-webhook

| Campo | Valor |
|---|---|
| finding_id | SEC-018 |
| título | client_account_id como query param de la URL del webhook Wasender |
| componente | conv-wa-webhook |
| categoría | Authorization |
| evidencia | URL de webhook: `POST /conv-wa-webhook?client_account_id=<uuid>` |
| severidad | INFO |
| explotación | Teórico: atacante enumera UUIDs. Mitigado: sin HMAC válido, el payload es ignorado silenciosamente |
| recomendación | Evaluar si es posible derivar client_account_id del wasender_session_id vía DB en vez de query param |
| fase | 11B3 |
| bloquea sandbox | No |
| bloquea preproduction | No |
| bloquea production | No |
| estado | open |

---

### SEC-024: conv-core-publish-activity puede publicar PII en Activity Log

| Campo | Valor |
|---|---|
| finding_id | SEC-024 |
| título | conv-core-publish-activity puede publicar content o sender_ref en actividad pública |
| componente | conv-core-publish-activity |
| categoría | Privacy / Logging |
| evidencia | EF publica eventos de actividad vía Core adapter. El payload incluye potencialmente content de mensajes y sender_ref (PII). Core adapter es mock en Fase 11A; pendiente verificación en modo real. |
| fichero / línea | supabase/functions/conv-core-publish-activity/index.ts |
| severidad | INFO (MEDIUM cuando Core adapter sea real) |
| explotación | Si el Activity Log del tenant es accesible desde el dashboard admin, podría incluir PII de usuarios de conversación sin sanitizar |
| impacto | PII de usuarios WebChat/WhatsApp visible en logs de actividad del tenant |
| probabilidad | Baja en Fase actual (Core mock); Media cuando Core sea real |
| recomendación | Sanitizar payload antes de enviar a Core: solo incluir session_id, case_id, tipo de evento; no incluir content ni sender_ref en Activity Log |
| esfuerzo | Bajo |
| fase | 11B3 |
| bloquea sandbox | No |
| bloquea preproduction | No |
| bloquea production | No |
| estado | open |

---

## IDs no creados (gaps en numeración)

| ID | Estado | Motivo |
|---|---|---|
| SEC-015 | `not_created` | Numeración reservada pero nunca asignada a un finding. No existe evidencia de finding asociado. |
| SEC-028 | `not_created` | SECURITY DEFINER function `public.get_my_client_account_id()` analizada en Fase 11B2A: tiene `SET search_path = public` (fijado), no accede a tablas conv_*, GRANT solo a authenticated. Conclusión: SEGURA. No se crea finding. Ver rls-role-model.md §6. |

---

## Resumen de findings por gate bloqueante

| Gate | Findings que bloquean |
|---|---|
| Sandbox | SEC-002 (CRITICAL), SEC-006 (HIGH) |
| Preproduction | SEC-002, SEC-003, SEC-004, SEC-005, SEC-006, SEC-007, SEC-008, SEC-009, SEC-010, SEC-011, SEC-013, SEC-017, SEC-019, SEC-025, SEC-027 |
| Production | Todos los anteriores + SEC-012, SEC-020, SEC-026 |

> **Cambios Fase 11B2A**: SEC-001 removido de bloqueantes de preproduction y production (severity_changed HIGH→LOW). SEC-024 añadido (INFO, no bloqueante). SEC-015 y SEC-028 documentados como not_created.
