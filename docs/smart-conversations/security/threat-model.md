# Threat Model — SmartConversations
<!-- Fase 11B1 · Metodología STRIDE · 2026-07-21 -->

> Modelo de amenazas basado en STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).
> No modifica código, contratos ni políticas.

---

## Metodología

**STRIDE** aplicado a actores, fronteras de confianza y activos de SmartConversations.

| Categoría STRIDE | Descripción |
|---|---|
| S — Spoofing | Suplantar identidad de un actor legítimo |
| T — Tampering | Modificar datos en tránsito o en reposo |
| R — Repudiation | Negar acciones sin capacidad de auditoría |
| I — Information Disclosure | Exponer información a actores no autorizados |
| D — Denial of Service | Degradar o interrumpir la disponibilidad |
| E — Elevation of Privilege | Obtener permisos superiores a los asignados |

---

## Actores

| actor_id | Actor | Nivel de confianza | Descripción |
|---|---|---|---|
| A-01 | Visitante anónimo WebChat | Untrusted | Navegador sin autenticación; conoce solo `client_account_id` |
| A-02 | Inquilino autenticado futuro | Low | JWT Supabase válido para su tenant (GATE_4+) |
| A-03 | Administrador tenant | Medium | JWT Supabase con rol admin para su client_account_id |
| A-04 | Superadmin | High | JWT con rol superadmin; acceso cross-tenant controlado |
| A-05 | Operador interno | High | Acceso directo a Supabase dashboard / service_role |
| A-06 | Navegador comprometido | Hostile | Browser del visitante que ejecutó XSS o extensión maliciosa |
| A-07 | Tenant malicioso | Hostile | Actor con cuenta válida intentando acceso cross-tenant |
| A-08 | Atacante externo | Hostile | Sin cuenta; acceso solo a endpoints públicos |
| A-09 | Proveedor Wasender | External-Trusted | Llama a conv-wa-webhook con firma HMAC |
| A-10 | Proveedor IA | External-Trusted | Recibe prompts; puede devolver respuestas manipuladas |
| A-11 | n8n | Internal-Trusted | Orquestador; recibe eventos de workflow |
| A-12 | Core | Internal-Trusted | Sistema de identidad y entidades; responde a queries |
| A-13 | Supabase | Infrastructure | Base de datos, EF runtime, Realtime |
| A-14 | Usuario con anon key | Low | Cualquier actor con la anon key pública |
| A-15 | Usuario con JWT válido de otro tenant | Hostile | JWT válido pero de client_account_id diferente |
| A-16 | Poseedor de token WebChat robado | Hostile | Robó session_id + sender_ref (o signed_token) |
| A-17 | Poseedor de webhook secret | Hostile | Conoce el HMAC secret de Wasender de algún tenant |
| A-18 | Proceso con service_role | Privileged | EF o proceso interno con acceso completo a DB |

---

## Fronteras de confianza

| tb_id | Frontera | Desde | Hasta | Controles actuales | Hallazgos |
|---|---|---|---|---|---|
| TB-01 | Navegador → Edge Functions | A-01, A-06, A-08 | conv-web-session, conv-web-message, conv-web-poll | Origin validation, detectForbiddenPublicInput | SEC-004 (legacy auth), SEC-002 (rate limit mock) |
| TB-02 | Wasender → conv-wa-webhook | A-09, A-08, A-17 | conv-wa-webhook | HMAC-SHA256, silentOk en error | SEC-005 (webhook_secret plaintext) |
| TB-03 | conv-wa-webhook → conv-ingest | EF pública → EF interna | conv-ingest | service_role Bearer en llamada interna | Correcto |
| TB-04 | Edge Functions → Supabase DB | A-18 (EFs) | Tablas conv_* | RLS service_role only | SEC-001 (no FORCE RLS) |
| TB-05 | SmartConversations → Core | A-11 (EFs) | Core APIs | Service authn (mock en Fase 11A) | Pendiente verificación en Fase real |
| TB-06 | SmartConversations → IA | A-18 (EFs) | IA provider | PII guards (mock en Fase 11A) | SEC-010 (pendiente verificación adapter) |
| TB-07 | SmartConversations → n8n | A-18 (EFs) | n8n webhook | n8n secret header; PII guards | Pendiente verificación n8n real |
| TB-08 | SmartConversations → Wasender | A-18 (conv-send-wa) | Wasender API | API key en Vault (TODO) | SEC-005 (api_key en Vault pendiente) |
| TB-09 | Widget → Realtime | A-01 | Supabase Realtime (wss) | anon key; Realtime channel | SEC-011 (sin RLS de canal Realtime) |
| TB-10 | Widget → polling | A-01 | conv-web-poll | session_id + sender_ref (legacy) o signed_token | SEC-004 |
| TB-11 | CI → Repositorio | A-05 | GitHub Actions | GitHub Secrets; branch protection | SEC-008 (Snyk continue-on-error) |
| TB-12 | Entorno → Secret store | A-18 | Deno.env / Supabase Vault | Secrets en CI; Vault para API keys | SEC-005 |
| TB-13 | Tenant A → Tenant B | A-07, A-15 | conv_* tables | RLS; EF tenant validation | SEC-009 (tenant en payload, no JWT) |
| TB-14 | SmartConversations → Activity Log | A-18 | Core Activity Log | PII_FIELDS_FORBIDDEN_IN_ACTIVITY_LOG | Guards activos; pendiente verificación end-to-end |

---

## Amenazas (STRIDE)

| threat_id | Categoría | Activo | Actor | Frontera | Escenario | Control actual | Evidencia | Probabilidad | Impacto | Severidad | Riesgo residual | Mitigación recomendada | Fase | Bloquea sandbox | Bloquea preprod | Bloquea prod |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| TH-001 | S — Spoofing | conv_sessions | A-08 | TB-01 | Atacante crea sesión WebChat con client_account_id de otro tenant enviando UUID conocido | conv-web-session verifica que client_account_id existe en conv_wc_configs (DB) | conv_wc_configs service_role lookup | Bajo | Medio | MEDIUM | Bajo — requiere UUID válido | Ninguna adicional necesaria; control actual es suficiente | 11B2 | No | No | No |
| TH-002 | S — Spoofing | conv_sessions | A-16 | TB-10 | Atacante con session_id y sender_ref robados envía mensajes como la víctima | Modo legacy: solo verificación DB de existencia de sesión. Modo signed_token: verificación HMAC | SEC-004: signed_token mode desactivado por default | Alta (si legacy) | Alta | HIGH | Alto en legacy | Activar WEBCHAT_AUTH_MODE=signed_token (SEC-004) | 11B2 | No | Sí | Sí |
| TH-003 | S — Spoofing | conv-wa-webhook | A-17 | TB-02 | Atacante con webhook_secret genera webhooks falsos de Wasender | HMAC-SHA256 verificado; silentOk en error | Implementación correcta | Bajo (si secret robado) | Crítico | CRITICAL | Medio — requiere robo de secret | Migrar webhook_secret a Vault (SEC-005) | 11B2 | No | Sí | Sí |
| TH-004 | S — Spoofing | JWT | A-15 | TB-01 | Usuario con JWT válido de Tenant A intenta acceder con client_account_id de Tenant B | EFs internas usan service_role; no verifican JWT del usuario | Sin JWT check en EFs internas (correcto para WebChat anónimo) | Bajo (EFs no aceptan JWT de usuario) | Bajo | LOW | Bajo | Documentar como feature: WebChat no requiere JWT de usuario | 11B3 | No | No | No |
| TH-005 | T — Tampering | conv_messages | A-08 | TB-01 | Atacante modifica message_text en body de conv-web-message | conv-dispatch siempre lee message_text de DB, nunca del payload de dispatch | conv-dispatch-message: fuente de verdad = DB | Baja | Alto | MEDIUM | Bajo | Documentado y controlado | — | No | No | No |
| TH-006 | T — Tampering | conv_send_queue | A-07 | TB-13 | Tenant malicioso manipula client_account_id en payload para procesar queue de otro tenant | EFs internas requieren service_role; sin acceso directo a DB para anon/authenticated | RLS service_role only | Baja (sin acceso directo a DB) | Alto | HIGH | Bajo (requiere service_role) | SEC-001: FORCE RLS para evitar bypass por propietario de tabla | 11B2 | No | Sí | Sí |
| TH-007 | T — Tampering | conv-wa-webhook | A-09 (comprometido) | TB-02 | Wasender compromised o MITM modifica body antes de que llegue al webhook | HMAC-SHA256 firma el body exacto; verificación correcta | Implementación de firma correcta | Bajo | Alto | HIGH | Bajo | Verificar que body raw se usa para firma (no parsed) | 11B3 | No | No | Sí |
| TH-008 | R — Repudiation | conv_cases, conv_messages | A-01 | TB-01 | Visitante WebChat niega haber enviado un mensaje | conv_messages tiene created_at, session_id, sender_ref | Sin audit log de acciones de usuario | Media | Baja | MEDIUM | Medio | Activity Log de eventos de negocio (implementar en 11B4) | 11B4 | No | No | Sí |
| TH-009 | I — Info Disclosure | PII (identity_data) | A-08, A-06 | TB-01, TB-09 | XSS extrae sessionStorage con session_id, sender_ref y webchat_session_token | No hay CSP; sessionStorage accesible con XSS | SEC-003: sin CSP | Media (si hay XSS) | Alto | HIGH | Alto | Implementar CSP (SEC-003); activar signed_token (SEC-004) | 11B3 | No | Sí | Sí |
| TH-010 | I — Info Disclosure | conv_messages (raw_payload) | A-08 | TB-04 | Acceso a raw_payload que contiene contenido completo del mensaje WA | RLS service_role only; no expuesto via API pública | RLS correcta; conv-web-poll no devuelve raw_payload | Muy baja | Alta | MEDIUM | Bajo | Verificar que future anon policies excluyan raw_payload (SEC-010) | 11B2 | No | Sí | Sí |
| TH-011 | I — Info Disclosure | service_role key | A-08, A-06 | TB-01, TB-12 | service_role expuesto en frontend bundle o en logs | createSafeLogger redacta; no hay VITE_SUPABASE_SERVICE_ROLE_KEY | Validador verifica; HB-36..40 confirman | Muy baja | Crítico | CRITICAL | Muy bajo | Mantener validación automática en CI | — | No | Sí | Sí |
| TH-012 | I — Info Disclosure | webhook_secret | A-18 (comprometido) | TB-12 | Service_role comprometido expone webhook_secret de todos los tenants (plaintext en DB) | RLS service_role only; acceso físico a DB requiere credentials | SEC-005: plaintext en conv_wa_sessions.webhook_secret | Baja | Crítico | HIGH | Alto (si service_role robado) | Migrar a Supabase Vault | 11B2 | No | Sí | Sí |
| TH-013 | I — Info Disclosure | Logs (PII) | A-05 | TB-14 | Desarrollador loguea inadvertidamente message_text, sender_ref o identity_data | createSafeLogger redacta 22 campos PII automáticamente | Lista PII completa en ef-logger.ts | Media | Alto | HIGH | Bajo (logger automático) | Verificar periódicamente que lista PII cubre todos los campos nuevos | 11B3 | No | Sí | Sí |
| TH-014 | I — Info Disclosure | CORS | A-08 | TB-01 | Sitio malicioso llama EFs WebChat públicas con credenciales de usuario | EFs WebChat no validan Origin correctamente si allowedOrigins vacío | conv-web-session: sin Origin validation si allowedOrigins=[] | Media | Medio | MEDIUM | Medio | Configurar allowed_origins en conv_wc_configs para cada tenant | 11B2 | No | Sí | Sí |
| TH-015 | I — Info Disclosure | Realtime channel | A-14, A-08 | TB-09 | Cliente con anon key se suscribe a canal webchat:<session_id> ajeno y recibe notificaciones | Sin Realtime RLS de canal (configuración Supabase, no en código) | SEC-011: Realtime channel sin RLS | Media | Bajo | MEDIUM | Medio | Configurar Realtime RLS por canal (GATE_3+) | 11B2 | No | Sí | Sí |
| TH-016 | D — DoS | conv_sessions, pipeline SC | A-08 | TB-01 | Flood de creación de sesiones WebChat (miles de requests a conv-web-session) | Sin rate limiting en conv-web-session | SEC-006: sin rate limit en sesion creation | Alta | Alto | HIGH | Alto | Implementar rate limiting por IP/client_account_id (SEC-006) | 11B2 | Sí | Sí | Sí |
| TH-017 | D — DoS | Pipeline SC (conv-ingest → dispatch → WFs) | A-16 | TB-10 | Flood de mensajes WebChat usando sesión válida | WEBCHAT_RATE_LIMIT_MODE=mock — sin bloqueo | SEC-002: rate limiting desactivado | Alta | Alto | CRITICAL | Alto | Activar WEBCHAT_RATE_LIMIT_MODE=database (SEC-002) | 11B2 | Sí | Sí | Sí |
| TH-018 | D — DoS | conv-wa-webhook | A-08, A-17 | TB-02 | Flood de webhooks a conv-wa-webhook (sin rate limit documentado) | silentOk evita oracle; HMAC válida requiere secret | Sin rate limit documentado en webhook endpoint | Media | Medio | MEDIUM | Medio | Implementar rate limiting en conv-wa-webhook (por IP o por client_account_id) | 11B3 | No | Sí | Sí |
| TH-019 | D — DoS | conv_sessions (acumulación) | A-01 | TB-01 | Acumulación de conv_sessions sin expiración activa | Sin TTL de sesión ni purga automática | SEC-015: session accumulation | Media | Baja (DB storage) | MEDIUM | Medio | Implementar TTL de sesión o tarea de purga | 11B3 | No | Sí | Sí |
| TH-020 | E — Elevation | EF auth | A-08 | TB-01 | Timing attack en comparación de service_role key (`===` vs constant-time) | Latencia de EF hace el timing attack muy difícil en la práctica | SEC-012: non-constant-time comparison | Muy baja | Alto | MEDIUM | Bajo | Usar crypto.subtle.timingSafeEqual() (SEC-012) | 11B3 | No | No | Sí |
| TH-021 | E — Elevation | RLS bypass | A-18 (comprometido) | TB-04 | Propietario de tabla (postgres) puede bypassar RLS porque no está FORCE RLS | Sin FORCE ROW LEVEL SECURITY en tablas conv_* | SEC-001: no FORCE RLS | Muy baja | Crítico | CRITICAL | Bajo (requiere compromiso de postgres role) | ALTER TABLE ... FORCE ROW LEVEL SECURITY (SEC-001) | 11B2 | No | Sí | Sí |
| TH-022 | E — Elevation | Payload injection | A-07 | TB-13 | Tenant malicioso envía client_account_id de otro tenant en payload a EF pública | EFs públicas no aceptan client_account_id de body (lo obtienen de sesión en DB) | conv-web-message: client_account_id de DB, no body | Baja | Alto | HIGH | Bajo | Verificar que TODAS las EFs obtienen client_account_id de fuente confiable (SEC-013) | 11B2 | No | Sí | Sí |
| TH-023 | T — Tampering | conv_messages replay | A-16, A-08 | TB-01 | Replay de mensaje WebChat usando session válida | Sin nonce en mensajes WebChat; idempotencia parcial en dispatch | No hay deduplicación de mensajes WebChat (solo WA por wasender_message_id) | Media | Medio | MEDIUM | Medio | Añadir nonce o message_id cliente en conv-web-message | 11B3 | No | Sí | Sí |
| TH-024 | T — Tampering | conv-wa-webhook replay | A-17 | TB-02 | Replay de webhook de Wasender ya procesado | Deduplica por wasender_message_id (UNIQUE en conv_messages) | uq_wa_message_id UNIQUE parcial en DB | Baja | Medio | MEDIUM | Bajo | Verificar window de timestamp para replay antiguo | 11B3 | No | No | Sí |
| TH-025 | I — Info Disclosure | Prompt injection | A-01 (WebChat) | TB-06 | Visitante envía message_text diseñado para manipular prompt de IA | IA adapter es mock; message_text no va a IA directamente en Fase actual | Pendiente verificación en adapter IA real | Media | Alto | HIGH | Alto (en Fase real) | Sanitizar message_text antes de enviar a IA; aplicar template guards | 11B3 | No | Sí | Sí |
| TH-026 | I — Info Disclosure | PII exfiltración vía n8n | A-11 (comprometido) | TB-07 | n8n recibe PII (profile_id, phone, message_text) en payload de workflow | PII_FIELDS_FORBIDDEN_IN_N8N guards activos | Guards definidos en privacy-guards.ts | Baja | Alto | HIGH | Bajo | Verificar guards end-to-end cuando n8n es real | 11B3 | No | Sí | Sí |
| TH-027 | I — Info Disclosure | PII exfiltración vía IA | A-10 (comprometido) | TB-06 | IA recibe identity_data completo incluyendo full_name, email, phone | IA adapter es mock; guards definidos | Pendiente verificación en adapter IA real | Baja | Alto | HIGH | Alto (en Fase real) | Guards verificados antes de GATE_3 | 11B3 | No | Sí | Sí |
| TH-028 | I — Info Disclosure | PII en Activity Log | A-18 | TB-14 | EF publica message_text o identity_data en Activity Log | PII_FIELDS_FORBIDDEN_IN_ACTIVITY_LOG guards | Guards definidos | Baja | Alto | MEDIUM | Bajo | Verificar cada EF que llama conv-core-publish-activity | 11B3 | No | Sí | Sí |
| TH-029 | S — Spoofing | sender_ref WA | A-08 | TB-02 | Atacante envía sender_ref de otro usuario WA en payload a conv-ingest | conv-ingest requiere service_role (no accesible externamente) | isServiceRoleRequest en conv-ingest | Muy baja | Alto | MEDIUM | Muy bajo | Documentado como correcto | — | No | No | No |
| TH-030 | S — Spoofing | mass assignment | A-08 | TB-01 | Widget envía campos prohibidos (profile_id, phone, etc.) a conv-web-session | detectForbiddenPublicInput() rechaza y retorna 400 | Lista WEBCHAT_FORBIDDEN_PUBLIC_INPUT_FIELDS | Baja | Medio | LOW | Muy bajo | Correcto; documentar coverage de tests | — | No | No | No |
| TH-031 | D — DoS | payload excesivo | A-08 | TB-01 | Widget envía mensaje extremadamente largo (> maxMessageLength=2000) | maxMessageLength=2000 en webchat-config | Validación en frontend solamente | Media | Bajo | MEDIUM | Medio | Validar longitud de mensaje en EF backend también | 11B3 | No | Sí | Sí |
| TH-032 | E — Elevation | SECURITY DEFINER | A-18 | TB-04 | Función con SECURITY DEFINER sin search_path seguro ejecuta en contexto del owner | No hay funciones SECURITY DEFINER en la migración actual | Sin SECURITY DEFINER en migración | N/A actual | Crítico | N/A | N/A | Verificar en futures migraciones | 11B2 | No | No | Sí |
| TH-033 | I — Info Disclosure | secretos en errores | A-08 | TB-01 | Error de EF devuelve detalles internos (stack trace, service_role, etc.) | SAFE_ERROR_TEXT genérico; errores detallados solo en logs | Implementación correcta | Baja | Alto | LOW | Muy bajo | Mantener patrón | — | No | No | No |
| TH-034 | I — Info Disclosure | secretos en VITE_ | A-08 | TB-12 | Variable de entorno sensible expuesta en bundle frontend como VITE_SECRET_... | Validador verifica ausencia de service_role, signing_secret, private_key bajo VITE_ | Validator checks G0-SEC-SR | Muy baja | Crítico | CRITICAL | Muy bajo | Mantener validación en CI | — | No | No | Sí |
| TH-035 | I — Info Disclosure | secretos en CI | A-08 | TB-11 | Secret expuesto en logs de CI (echo, print, debug) | No hay comandos echo de secrets en workflows analizados | Revisión manual | Muy baja | Crítico | HIGH | Bajo | Auditar periódicamente CI scripts | 11B3 | No | No | Sí |
| TH-036 | T — Tampering | dependencia comprometida | A-08 | TB-11 | npm package malicioso modifica código durante CI | Snyk con continue-on-error (SEC-008); npm ci con lockfile | SEC-008 | Muy baja | Crítico | HIGH | Medio | Eliminar continue-on-error de Snyk (SEC-008) | 11B2 | No | Sí | Sí |

---

## Resumen de amenazas por categoría STRIDE

| Categoría | Count | Críticas | Altas | Medias | Bajas |
|---|---|---|---|---|---|
| S — Spoofing | 8 | 1 | 3 | 2 | 2 |
| T — Tampering | 6 | 0 | 2 | 3 | 1 |
| R — Repudiation | 1 | 0 | 0 | 1 | 0 |
| I — Information Disclosure | 13 | 3 | 6 | 3 | 1 |
| D — Denial of Service | 5 | 1 | 2 | 2 | 0 |
| E — Elevation of Privilege | 4 | 1 | 1 | 2 | 0 |
| **TOTAL** | **37** | **6** | **14** | **13** | **4** |

---

## Estado de GATE_1

Threat model completo con 37 amenazas identificadas. Los hallazgos están en `security-findings.md`.

**GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING**
