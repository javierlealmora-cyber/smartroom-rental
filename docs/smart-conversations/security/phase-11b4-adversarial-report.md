# Phase 11B4 — Adversarial Testing Report

Estado: **ADVERSARIAL_OFFLINE_COMPLETE_DEV_PENDING**
Fecha: 2026-07-23
GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING (no cerrar en esta fase)

---

## Resumen ejecutivo

La Fase 11B4 implementa la suite de tests adversariales offline para SmartConversations.
Se han creado 3 archivos de tests con un total de ≥250 tests cubriendo 14 categorías de ataque.
Todos los tests adversariales offline pasan. Los controles de DEV quedan inventariados en
`gate-1-closure-checklist.md` como DEV_REQUIRED (Fase 11B2D).

---

## Cobertura de tests

### security-adversarial.spec.ts — Análisis estático (SRA-*)
98 tests que verifican el código fuente de los EFs sin ejecutar Deno.

Categorías:
- SRA-BOUND (1..15): Restricciones de código — ausencia de estados prohibidos, flags prohibidos,
  CORS sin wildcard, timestamp antes de HMAC, matriz adversarial existe, checklist GATE_1 existe,
  reporte existe, GATE_1 no cerrado prematuramente en artefactos 11B4
- SRA-CSP (1..13): Headers de seguridad en vercel.json y respuestas de EFs
- SRA-AUTH (1..20): Patrón `await isServiceRoleRequest` en los 20 EFs internos
- SRA-PRIVACY (1..20): `FIELDS_TO_REDACT` en ef-logger.ts cubre PII + secrets + contenido
- SRA-EVENTS (1..13): 13 eventos oficiales en `ALLOWED_EVENT_TYPES`
- SRA-PII (1..8): 8 campos PII prohibidos en Activity Log
- SRA-WEBHOOK (1..20): Validaciones de webhook (HMAC, timestamp, dedup, orden de ejecución)

### security-adversarial-runtime.spec.ts — Simulación runtime (SRR-*)
120 tests con funciones de simulación inline (sin imports Deno).

Categorías:
- SRR-AUTH (1..20): Auth service-role — sin header, esquema incorrecto, token vacío,
  token incorrecto, token correcto, token truncado, token extendido, prompt injection en token,
  token de entorno PRE, chars de control en token
- SRR-TENANT (1..12): Cross-tenant isolation, tenant vacío, idempotency cross-tenant
- SRR-CORS (1..10): CORS dinámico — sin origin, origin permitido, http vs https,
  puerto distinto, subdominio, suffix attack, origin null
- SRR-WEBHOOK (1..20): Timestamp + HMAC — timestamp ausente, en ventana, antiguo, futuro,
  dedup por provider_message_id, body modificado, rotation secret
- SRR-IDEMP (1..10): Idempotencia WebChat — mismo client_message_id, cross-tenant,
  cross-session, doble click
- SRR-RATE (1..12): Rate limiting — límite, burst, cross-tenant, fail-closed
- SRR-QUEUE (1..15): Queue y retry — claim lock, tenant check, retry, agotamiento,
  doble dispatch
- SRR-PAYLOAD (1..15): Validación de payload — tamaño, longitud de campos, arrays
- SRR-CORS (preflight): OPTIONS 204

### security-adversarial-fuzz.spec.ts — Fuzzing (SRF-*)
32 tests de fuzzing estructurado.

Categorías:
- SRF-PRIVACY (1..20): Fuzzing de privacidad — PII en logger (profile_id, phone_number,
  api_key, service_role, authorization, message_text, raw_payload), campos anidados,
  arrays, variantes camelCase, URL con parámetros sensibles, URL inválida, prompt/completion,
  identity_data
- SRF-AI (1..12): Prompt injection y restricciones IA — patrones de injection detectados,
  consultas legítimas aceptadas, acciones prohibidas al adapter IA

---

## Hallazgos por categoría

### CRITICAL (0 abiertos)
Ninguno. Todos los hallazgos CRITICAL de Fases 11B1..11B3 están en estado `mitigated_offline`
o `open_dev_validation`.

### HIGH (0 abiertos sin test)
| finding | descripción | estado |
|---------|-------------|--------|
| SEC-001 | Cross-tenant isolation | open_dev_validation — test DEV_REQUIRED |
| SEC-003 | CORS wildcard eliminado | mitigated_offline |
| SEC-005 | Webhook HMAC + rotación | mitigated_offline |
| SEC-011 | service-role auth en EFs | mitigated_offline |
| SEC-012 | Constant-time comparison | mitigated_offline |

### MEDIUM (0 abiertos sin test)
| finding | descripción | estado |
|---------|-------------|--------|
| SEC-021 | Contenido de mensajes en logs | mitigated_offline |
| SEC-022 | Orden timestamp→HMAC en webhook | mitigated_offline |
| SEC-023 | PII en logs | mitigated_offline |
| SEC-024 | Dedup webhook replay | mitigated_offline |
| SEC-025 | Prompt injection IA | mitigated_offline |
| SEC-026 | Validación de timestamp webhook | mitigated_offline |
| SEC-027 | Idempotencia WebChat | mitigated_offline |

### LOW / ACCEPTED
| finding | descripción | estado |
|---------|-------------|--------|
| SEC-020 | Token de entorno PRE en DEV | accepted — entornos aislados |

---

## Controles DEV_REQUIRED

Los siguientes controles tienen cobertura offline pero requieren validación en entorno DEV real:

1. **RLS real**: acceso directo a `conv_*` via REST como anon/authenticated
2. **Cross-tenant real**: Tenant B no puede leer datos de Tenant A con RLS real
3. **CORS en Vercel DEV**: headers HTTP reales (no simulados)
4. **CSP en Vercel DEV**: `Content-Security-Policy-Report-Only` en respuestas reales
5. **Webhook DEV**: dedup con provider_message_id real en base de datos real
6. **Rate limiting DEV**: RPC Supabase real
7. **Idempotencia DEV**: columna `client_message_id` en base de datos real

Ver `gate-1-closure-checklist.md` Sección B para el checklist completo.

---

## Estado del validator

`validate-security-baseline.mjs` — Sección 21 (11B4):
- Estado: `ADVERSARIAL_OFFLINE_COMPLETE`
- Fase: `11B4`
- 0 blockers
- DEV_REQUIRED_COUNT: 7 categorías inventariadas

---

## Próximos pasos (Fase 11B2D)

1. Desplegar controles a DEV (primera vez)
2. Ejecutar checklist Sección B de `gate-1-closure-checklist.md`
3. Resolver hallazgos `open_dev_validation`
4. Actualizar `security-findings.md` con resultados DEV
5. Cerrar GATE_1 solo si todos los criterios de cierre se cumplen

**No desplegar a PRE ni PRO hasta cierre formal de GATE_1.**
