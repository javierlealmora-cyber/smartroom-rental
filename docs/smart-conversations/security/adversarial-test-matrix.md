# Adversarial Test Matrix — SmartConversations Fase 11B4

Estado: ADVERSARIAL_OFFLINE_COMPLETE_DEV_PENDING
GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING (no cerrar hasta Fase 11B2D)

---

## AUTH — Autenticación y tokens

| attack_id | activo | actor | entrada | frontera | control | respuesta | HTTP | evidencia | test | finding | estado | DEV_REQUIRED |
|-----------|--------|-------|---------|----------|---------|-----------|------|-----------|------|---------|--------|--------------|
| AUTH-01 | conv_sessions | anon | sin Authorization | EF interna | await isServiceRoleRequest | 401 | 401 | SRR-AUTH-01 | SEC-011 | mitigated_offline | no |
| AUTH-02 | EF interna | anon | Basic scheme | EF interna | esquema Bearer requerido | 401 | 401 | SRR-AUTH-02 | SEC-011 | mitigated_offline | no |
| AUTH-03 | EF interna | anon | Bearer vacío | EF interna | empty_token check | 401 | 401 | SRR-AUTH-03 | SEC-011 | mitigated_offline | no |
| AUTH-04 | EF interna | anon | token incorrecto | EF interna | constant-time comparison | 401 | 401 | SRR-AUTH-04 | SEC-012 | mitigated_offline | no |
| AUTH-05 | EF interna | sistema | token correcto | EF interna | constant-time match | 200 | 200 | SRR-AUTH-05 | SEC-011 | mitigated_offline | no |
| AUTH-06 | EF interna | anon | token truncado | EF interna | longitud distinta | 401 | 401 | SRR-AUTH-06 | SEC-012 | mitigated_offline | no |
| AUTH-07 | EF interna | anon | token + 1 char | EF interna | constant-time falla | 401 | 401 | SRR-AUTH-07 | SEC-012 | mitigated_offline | no |
| AUTH-08 | EF interna | anon | header undefined | EF interna | missing_authorization | 401 | 401 | SRR-AUTH-08 | SEC-011 | mitigated_offline | no |
| AUTH-09 | EF interna | anon | header vacío | EF interna | invalid_scheme | 401 | 401 | SRR-AUTH-09 | SEC-011 | mitigated_offline | no |
| AUTH-16 | EF interna | anon | "bearer" lowercase | EF interna | case-sensitive check | 401 | 401 | SRR-AUTH-16 | SEC-011 | mitigated_offline | no |
| AUTH-19 | EF interna | anon | token + chars control | EF interna | longitud distinta | 401 | 401 | SRR-AUTH-19 | SEC-012 | mitigated_offline | no |
| AUTH-20 | EF interna | anon | token de entorno PRE | EF interna | constant-time falla | 401 | 401 | SRR-AUTH-20 | SEC-020 | mitigated_offline | no |

## TENANT — Cross-tenant

| attack_id | activo | actor | entrada | frontera | control | respuesta | HTTP | evidencia | test | finding | estado | DEV_REQUIRED |
|-----------|--------|-------|---------|----------|---------|-----------|------|-----------|------|---------|--------|--------------|
| TENANT-01 | conv_sessions | Tenant B | sesión de A, token de B | EF interna | tenant_mismatch check | 403 opaco | 403/404 | SRR-TENANT-01 | SEC-001 | open_dev_validation | sí |
| TENANT-02 | conv_messages | Tenant B | mensaje de A, sesión de B | EF interna | tenant isolation | 403 opaco | 403/404 | SRR-TENANT-02 | SEC-001 | open_dev_validation | sí |
| TENANT-05 | API | Tenant B | tenant vacío | EF interna | missing_tenant | 400 | 400 | SRR-TENANT-05 | SEC-001 | mitigated_offline | no |
| TENANT-09 | conv_messages | Tenant B | idempotency key de A | idempotency store | clave aislada por tenant | idempotente en A, nueva en B | - | SRR-TENANT-09 | SEC-027 | mitigated_offline | no |
| TENANT-11 | rate_limit | Tenant B | quota de A | rate limiter | bucket aislado | Tenant B no bloqueado | - | SRR-TENANT-11 | - | mitigated_offline | no |

## TOKEN — Webhook tokens

| attack_id | activo | actor | entrada | frontera | control | respuesta | HTTP | evidencia | test | finding | estado | DEV_REQUIRED |
|-----------|--------|-------|---------|----------|---------|-----------|------|-----------|------|---------|--------|--------------|
| TOKEN-01 | conv-wa-webhook | externo | firma incorrecta | HMAC check | timingSafeEqualBytes | 200 opaco | 200 | SRR-WEBHOOK-07 | SEC-012 | mitigated_offline | no |
| TOKEN-02 | conv-wa-webhook | externo | firma vacía | HMAC check | missing/empty check | 200 opaco | 200 | SRR-WEBHOOK-08 | SEC-012 | mitigated_offline | no |
| TOKEN-03 | conv-wa-webhook | externo | body modificado post-firma | HMAC check | hash distinto | 200 opaco | 200 | SRR-WEBHOOK-09 | SEC-012 | mitigated_offline | no |
| TOKEN-04 | conv-wa-webhook | externo | current secret | HMAC rotation | ok_current | 200 aceptado | 200 | SRR-WEBHOOK-10 | SEC-005 | mitigated_offline | no |
| TOKEN-05 | conv-wa-webhook | externo | prev secret (gracia) | HMAC rotation | ok_previous | 200 aceptado | 200 | SRR-WEBHOOK-11 | SEC-005 | mitigated_offline | no |
| TOKEN-06 | conv-wa-webhook | externo | prev secret (expirado) | HMAC rotation | previous_secret_expired | 200 opaco | 200 | SRR-WEBHOOK-12 | SEC-005 | mitigated_offline | no |

## CORS — CORS adversarial

| attack_id | activo | actor | entrada | frontera | control | respuesta | HTTP | evidencia | test | finding | estado | DEV_REQUIRED |
|-----------|--------|-------|---------|----------|---------|-----------|------|-----------|------|---------|--------|--------------|
| CORS-01 | WebChat EFs | browser | sin Origin | cors-policy | no ACAO header | respuesta opaca | 200 | SRR-CORS-01 | SEC-003 | mitigated_offline | no |
| CORS-02 | WebChat EFs | browser | origin permitido | cors-policy | ACAO = origin | 200 con CORS | 200 | SRR-CORS-02 | SEC-003 | mitigated_offline | no |
| CORS-03 | WebChat EFs | browser | http vs https | cors-policy | scheme distinto | sin ACAO | 200 | SRR-CORS-03 | SEC-003 | mitigated_offline | no |
| CORS-04 | WebChat EFs | browser | puerto distinto | cors-policy | host distinto | sin ACAO | 200 | SRR-CORS-04 | SEC-003 | mitigated_offline | no |
| CORS-05 | WebChat EFs | browser | subdominio no autorizado | cors-policy | host distinto | sin ACAO | 200 | SRR-CORS-05 | SEC-003 | mitigated_offline | no |
| CORS-06 | WebChat EFs | browser | suffix attack | cors-policy | URL parsing (no startsWith) | sin ACAO | 200 | SRR-CORS-06 | SEC-003 | mitigated_offline | no |
| CORS-07 | WebChat EFs | browser | origin "null" | cors-policy | parse falla | sin ACAO | 200 | SRR-CORS-07 | SEC-003 | mitigated_offline | no |

## WEBHOOK — Webhook replay y DoS

| attack_id | activo | actor | entrada | frontera | control | respuesta | HTTP | evidencia | test | finding | estado | DEV_REQUIRED |
|-----------|--------|-------|---------|----------|---------|-----------|------|-----------|------|---------|--------|--------------|
| WEBHOOK-01 | conv-wa-webhook | externo | timestamp ausente | timestamp validation | missing_timestamp | 200 opaco | 200 | SRR-WEBHOOK-01 | SEC-026 | mitigated_offline | no |
| WEBHOOK-02 | conv-wa-webhook | externo | timestamp antiguo >300s | timestamp validation | too_old | 200 opaco | 200 | SRR-WEBHOOK-03 | SEC-026 | mitigated_offline | no |
| WEBHOOK-03 | conv-wa-webhook | externo | timestamp futuro >30s | timestamp validation | too_future | 200 opaco | 200 | SRR-WEBHOOK-04 | SEC-026 | mitigated_offline | no |
| WEBHOOK-04 | conv-wa-webhook | externo | replay exacto | dedup por provider_message_id | duplicate detected | 200 opaco | 200 | SRR-WEBHOOK-13 | SEC-024 | mitigated_offline | no |
| WEBHOOK-05 | conv-wa-webhook | externo | body > límite | payload validation | body_too_large | 413/200 | 200 | SRR-WEBHOOK-15 | - | mitigated_offline | no |
| WEBHOOK-06 | conv-wa-webhook | externo | ingest antes de auth | pipeline order | ingest solo tras auth+dedup | - | - | SRR-WEBHOOK-18 | SEC-022 | mitigated_offline | no |

## REPLAY — Idempotencia y replay

| attack_id | activo | actor | entrada | frontera | control | respuesta | HTTP | evidencia | test | finding | estado | DEV_REQUIRED |
|-----------|--------|-------|---------|----------|---------|-----------|------|-----------|------|---------|--------|--------------|
| REPLAY-01 | conv-web-message | browser | mismo client_message_id | idempotency store | idempotent: true | 200 idempotente | 200 | SRR-IDEMP-01 | SEC-027 | mitigated_offline | no |
| REPLAY-02 | conv-web-message | browser | doble click | idempotency store | 1 mensaje, 1 dispatch | 200 idempotente | 200 | SRR-IDEMP-07 | SEC-027 | mitigated_offline | no |
| REPLAY-03 | conv-web-message | browser | cross-tenant same key | idempotency store | key aislada por tenant | independiente | - | SRR-IDEMP-05 | SEC-027 | mitigated_offline | no |
| REPLAY-04 | conv-web-message | browser | cross-session same key | idempotency store | key aislada por sesión | independiente | - | SRR-IDEMP-06 | SEC-027 | mitigated_offline | no |

## RATE — Rate limiting

| attack_id | activo | actor | entrada | frontera | control | respuesta | HTTP | evidencia | test | finding | estado | DEV_REQUIRED |
|-----------|--------|-------|---------|----------|---------|-----------|------|-----------|------|---------|--------|--------------|
| RATE-01 | conv_sessions | browser | polling agresivo | rate limiter | bloquear tras límite | 429 | 429 | SRR-RATE-07 | - | mitigated_offline | no |
| RATE-02 | conv_sessions | browser | quota entre tenants | rate limiter | buckets aislados | Tenant B no bloqueado | - | SRR-RATE-09 | - | mitigated_offline | no |
| RATE-03 | rate_limiter | sistema | rate limiter down | fail-closed | deny by default | 429/503 | 503 | SRR-RATE-10 | - | mitigated_offline | no |

## QUEUE — Queue y retry

| attack_id | activo | actor | entrada | frontera | control | respuesta | HTTP | evidencia | test | finding | estado | DEV_REQUIRED |
|-----------|--------|-------|---------|----------|---------|-----------|------|-----------|------|---------|--------|--------------|
| QUEUE-01 | conv_send_queue | sistema | doble worker | claim lock | solo uno procesa | - | - | SRR-QUEUE-05 | - | mitigated_offline | no |
| QUEUE-02 | conv_send_queue | Tenant B | payload de A | tenant check | tenant_mismatch | rechazado | - | SRR-QUEUE-06 | SEC-001 | open_dev_validation | sí |
| QUEUE-03 | conv_send_queue | sistema | fallo temporal | retry logic | pending, retry | - | - | SRR-QUEUE-02 | - | mitigated_offline | no |
| QUEUE-04 | conv_send_queue | sistema | agotamiento retries | retry logic | failed, final | - | - | SRR-QUEUE-03 | - | mitigated_offline | no |
| QUEUE-05 | conv_send_queue | sistema | doble dispatch | dispatch set | 1 send | - | - | SRR-QUEUE-12 | - | mitigated_offline | no |

## PRIVACY — Privacidad y logging

| attack_id | activo | actor | entrada | frontera | control | respuesta | HTTP | evidencia | test | finding | estado | DEV_REQUIRED |
|-----------|--------|-------|---------|----------|---------|-----------|------|-----------|------|---------|--------|--------------|
| PRIVACY-01 | ef-logger | sistema | profile_id en log | FIELDS_TO_REDACT | [REDACTED] | - | - | SRF-PRIVACY-01 | SEC-023 | mitigated_offline | no |
| PRIVACY-02 | ef-logger | sistema | api_key en log | FIELDS_TO_REDACT | [REDACTED] | - | - | SRF-PRIVACY-03 | SEC-023 | mitigated_offline | no |
| PRIVACY-03 | ef-logger | sistema | service_role en log | FIELDS_TO_REDACT | [REDACTED] | - | - | SRF-PRIVACY-04 | SEC-023 | mitigated_offline | no |
| PRIVACY-04 | ef-logger | sistema | message_text en log | FIELDS_TO_REDACT | [REDACTED] | - | - | SRF-PRIVACY-06 | SEC-021 | mitigated_offline | no |
| PRIVACY-05 | ef-logger | sistema | webhook_secret en log | FIELDS_TO_REDACT | [REDACTED] | - | - | SRF-PRIVACY-14 | SEC-005 | mitigated_offline | no |
| PRIVACY-06 | ef-logger | sistema | prompt/completion IA | FIELDS_TO_REDACT | [REDACTED] | - | - | SRF-PRIVACY-19 | SEC-021 | mitigated_offline | no |
| PRIVACY-07 | ef-logger | sistema | URL con api_key | sanitizeUrlForLog | valor redactado | - | - | SRF-PRIVACY-16 | SEC-023 | mitigated_offline | no |

## LOGGING — Logging adversarial

| attack_id | activo | actor | entrada | frontera | control | respuesta | evidencia | test | finding | estado | DEV_REQUIRED |
|-----------|--------|-------|---------|----------|---------|-----------|-----------|------|---------|--------|--------------|
| LOG-01 | ef-logger | sistema | nested object con PII | sanitizeForLog (recursivo) | [REDACTED] anidado | - | SRF-PRIVACY-08 | SEC-023 | mitigated_offline | no |
| LOG-02 | ef-logger | sistema | array con PII | sanitizeArray | [REDACTED] en array | - | SRF-PRIVACY-09 | SEC-023 | mitigated_offline | no |
| LOG-03 | ef-logger | sistema | identity_data completo | FIELDS_TO_REDACT | [REDACTED] | - | SRF-PRIVACY-20 | SEC-021 | mitigated_offline | no |

## AI — IA y prompt injection

| attack_id | activo | actor | entrada | frontera | control | respuesta | evidencia | test | finding | estado | DEV_REQUIRED |
|-----------|--------|-------|---------|----------|---------|-----------|-----------|------|---------|--------|--------------|
| AI-01 | adapter IA | usuario | "ignora instrucciones" | AI constraint check | injection_detected | respuesta opaca | SRF-AI-01 | SEC-025 | mitigated_offline | no |
| AI-02 | adapter IA | usuario | "show system prompt" | AI constraint check | injection_detected | respuesta opaca | SRF-AI-02 | SEC-025 | mitigated_offline | no |
| AI-03 | adapter IA | usuario | "<script>..." | AI constraint check | injection_detected | respuesta opaca | SRF-AI-04 | SEC-025 | mitigated_offline | no |
| AI-04 | adapter IA | usuario | "service_role key" | AI constraint check | injection_detected | respuesta opaca | SRF-AI-05 | SEC-025 | mitigated_offline | no |
| AI-05 | adapter IA | sistema | set_identity prohibido | AI roles | forbidden | error | SRF-AI-07 | SEC-025 | mitigated_offline | no |
| AI-06 | adapter IA | sistema | use_service_role prohibido | AI roles | forbidden | error | SRF-AI-09 | SEC-025 | mitigated_offline | no |

## DATABASE — Acceso directo a tablas

| attack_id | activo | actor | entrada | frontera | control | respuesta | evidencia | test | finding | estado | DEV_REQUIRED |
|-----------|--------|-------|---------|----------|---------|-----------|-----------|------|---------|--------|--------------|
| DB-01 | conv_* tables | anon/authenticated | acceso directo via REST | FORCE RLS | bloqueado por RLS | 403/401 | SRA-BOUND-06 (migración) | SRA-BOUND | SEC-001 | open_dev_validation | sí |
| DB-02 | conv_wa_sessions | anon | webhook_secret directo | get_wa_webhook_secret RPC | solo service_role | 403 | migración 11B3 | SRA-BOUND | SEC-005 | open_dev_validation | sí |

## CONFIG — Configuraciones inseguras

| attack_id | activo | actor | entrada | frontera | control | evidencia | test | finding | estado | DEV_REQUIRED |
|-----------|--------|-------|---------|----------|---------|-----------|------|---------|--------|--------------|
| CONFIG-01 | CORS | browser | wildcard * | cors-policy | sin wildcard | SRA-BOUND-09 | SRA-BOUND | SEC-003 | mitigated_offline | no |
| CONFIG-02 | CSP | browser | unsafe-eval | vercel.json | ausente | SRA-CSP-12 | SRA-CSP | SEC-010 | mitigated_offline | no |
| CONFIG-03 | headers | browser | frame embedding | X-Frame-Options | DENY | SRA-CSP-02 | SRA-CSP | SEC-010 | mitigated_offline | no |

## DOS — Denegación de servicio

| attack_id | activo | actor | entrada | frontera | control | respuesta | HTTP | evidencia | test | finding | estado | DEV_REQUIRED |
|-----------|--------|-------|---------|----------|---------|-----------|------|-----------|------|---------|--------|--------------|
| DOS-01 | EF HTTP | externo | body > 64KB | payload validator | 413 | - | 413 | SRR-PAYLOAD-02 | - | mitigated_offline | no |
| DOS-02 | EF HTTP | externo | message_text > 4096 | payload validator | 422 | - | 422 | SRR-PAYLOAD-03 | - | mitigated_offline | no |
| DOS-03 | EF HTTP | externo | array > 100 elementos | payload validator | 422 | - | 422 | SRR-PAYLOAD-05 | - | mitigated_offline | no |
| DOS-04 | polling | browser | polling agresivo | rate limiter | 429 | - | 429 | SRR-RATE-07 | - | mitigated_offline | no |

---

## Tests DEV_REQUIRED (pendientes Fase 11B2D)

Los siguientes ataques requieren entorno DEV real para validación completa:

- TENANT-01/02/12: cross-tenant con RLS real en Supabase
- QUEUE-02: tenant isolation con queue real
- DB-01/02: acceso directo a tablas con políticas RLS reales
- CORS en hosting real (headers HTTP reales de Vercel)
- Webhook desplegado en DEV
- Rate limiter con Supabase RPC real

---

*Generado: Fase 11B4 — GATE_1 permanece AUDIT_COMPLETE_REMEDIATION_PENDING*
