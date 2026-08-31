# Risk Register — SmartConversations
<!-- Fase 11A · Normalizado en microfix 2026-07-19 -->

> Tabla canónica. Cada R-ID aparece exactamente una vez.
> Estados: OPEN | MITIGATED | CLOSED | ACCEPTED
> Severidades: CRITICAL | HIGH | MEDIUM | LOW

## Escala de severidad

| Nivel | Descripción |
|---|---|
| CRITICAL | Exposición de seguridad directa o bloqueo de release |
| HIGH | Bloquea gate avanzado; degradación funcional grave |
| MEDIUM | Degradación parcial; workaround disponible |
| LOW | Mejora técnica; sin impacto funcional inmediato |

## Escala de estado

| Estado | Descripción |
|---|---|
| OPEN | Sin mitigación activa; requiere acción en gate futuro |
| MITIGATED | Controles activos en su lugar; tests confirman; no totalmente cerrado |
| CLOSED | Resuelto y verificado en este repo |
| ACCEPTED | Riesgo conocido, aceptado explícitamente con justificación |

---

## Tabla canónica — R-01 a R-26

| risk_id | Descripción | Severidad | Estado | Área | Fase objetivo | Bloquea sandbox | Bloquea preprod | Bloquea prod | Bloquea GATE_0 | Evidencia | Mitigación |
|---|---|---|---|---|---|---|---|---|---|---|---|
| R-01 | Widget activado accidentalmente en producción antes de EFs deployadas | CRITICAL | OPEN | Feature flags | GATE_4 | No | Sí | Sí | No | `VITE_WEBCHAT_WIDGET_ENABLED=false` en .env.example; G0-FF-01 pasa | Default false; validador verifica en G0-FF-01 |
| R-02 | `service_role` expuesto como variable `VITE_*` en frontend | CRITICAL | MITIGATED | Seguridad / credenciales | GATE_1 | No | Sí | Sí | No | G0-SEC-SR, G0-SRC-SR-* pasan; validador 54/54 | Validador verifica 7 patrones; revisión de código; HB-36..40 confirman |
| R-03 | PII en sessionStorage (message_text, profile_id, identity_data) | CRITICAL | MITIGATED | Privacidad / GDPR | GATE_1 | No | Sí | Sí | No | Tests SEC-RT-01..03 pasan; webchat-storage.js filtra campos | webchat-storage.js filtra explícitamente; tests RT-24..28 confirman |
| R-04 | `webchat_session_token` expuesto en DOM o localStorage | CRITICAL | MITIGATED | Seguridad / tokens | GATE_1 | No | Sí | Sí | No | Tests HB-36..40; modo memory no persiste; RT-23..28 pasan | Modo memory por defecto; no escribe en storage persistente |
| R-05 | `dangerouslySetInnerHTML` en bubbles de mensaje (XSS) | CRITICAL | MITIGATED | Seguridad / XSS | GATE_1 | No | Sí | Sí | No | HB-41..43 pasan; WebChatMessageBubble usa texto plano | Componente renderiza texto plano; tests verifican |
| R-06 | Conexión accidental a servicios reales (Core, IA, n8n, Wasender, Realtime) en tests | CRITICAL | OPEN | Seguridad / aislamiento | GATE_1 | No | Sí | Sí | No | Sin credenciales reales en CI; todos los tests usan mocks | Mocks en vitest.config.ts; validador no llama URLs externas; verificación manual requerida |
| R-07 | 146 it.todo activados o modificados prematuramente | HIGH | OPEN | Tests / scaffold | Fase 12+ | No | No | No | No | HB-57..62 validan exactamente 146 it.todo intactos | Restricción documentada en CLAUDE.md; tests HB-57..62 verifican count |
| R-08 | Fallos históricos en CI ocultan regresiones (unit-tests job con continue-on-error) | HIGH | OPEN | CI / calidad | GATE_1 | No | Sí | Sí | No | `unit-tests` job tiene `continue-on-error: true`; 10+ fallos históricos | Job sc-baseline añadido en Fase 11A sin continue-on-error; job historical permanece informativo |
| R-09 | 24 Edge Functions de SC no deployadas en ningún entorno | HIGH | OPEN | Backend / deployment | GATE_3 | Sí | Sí | Sí | No | `supabase/functions/conv-*` existen en repo; sin deploy confirmado | Widget desactivado por flag; GATE_3 requiere deploy en staging |
| R-10 | Schema de base de datos SC no aplicado en entornos (estado desconocido) | HIGH | OPEN | Base de datos / migración | GATE_3 | Sí | Sí | Sí | No | Migración existe en repo; no hay confirmación de aplicación | No se modifica en este scope; GATE_3 requiere verificación |
| R-11 | RLS no configurado para tablas SC | HIGH | OPEN | Seguridad / base de datos | GATE_4 | No | Sí | Sí | No | Restricción "No modificar RLS todavía" activa | Excluido del scope actual; GATE_4 requiere RLS completo |
| R-12 | Polling sin backoff exponencial ni circuit breaker | MEDIUM | OPEN | Resiliencia / frontend | GATE_2 | No | Sí | Sí | No | `busyRef` evita solapamiento pero no implementa backoff | busyRef como mitigación parcial; pendiente implementación |
| R-13 | Realtime sin reconexión automática tras CHANNEL_ERROR/TIMED_OUT | MEDIUM | OPEN | Resiliencia / WebSocket | GATE_2 | No | Sí | Sí | No | Hook llama onError pero no re-subscribe; Realtime desactivado por defecto | Polling como fallback; Realtime desactivado |
| R-14 | Focus trap puede no funcionar en iOS Safari | MEDIUM | OPEN | Accesibilidad / compatibilidad | GATE_4 | No | No | Sí | No | Tests pasan en jsdom/Chromium; iOS Safari no verificado | Tests unitarios verifican en jsdom; pendiente verificación en dispositivo |
| R-15 | Audit log de mensajes WebChat no implementado | MEDIUM | OPEN | Compliance / trazabilidad | Fase 12+ | No | Sí | Sí | No | 17 it.todo de activity-log sin implementar | Parte de scope de Fase 12+ |
| R-16 | vitest.config.ts usa TypeScript sin tsconfig.json en raíz | LOW | ACCEPTED | CI / testing | N/A | No | No | No | No | Vitest transpila TS con esbuild; 2121 tests pasan | Aceptado: esbuild maneja la transpilación sin tsconfig |
| R-17 | `scrollIntoView` no disponible en jsdom | LOW | CLOSED | Tests / jsdom | N/A | No | No | No | No | Fix aplicado: `?.scrollIntoView?.()` en WebChatMessageList.jsx | Corregido con doble optional chaining |
| R-18 | Ambigüedad de `aria-label="Cerrar chat"` entre Launcher y Panel | LOW | CLOSED | Tests / selectors | N/A | No | No | No | No | INT-04 usa `document.getElementById('webchat-launcher')` | Corregido usando selector por ID único |
| R-19 | `require()` en archivos ESM de tests falla con SyntaxError | LOW | CLOSED | Tests / módulos | N/A | No | No | No | No | Todos los imports convertidos a static ESM | Corregido en Fase 10G |
| R-20 | `no-unused-vars` warnings en test files (ESLint) | LOW | CLOSED | Lint / calidad | N/A | No | No | No | No | 0 warnings en archivos de test de SC post-fix | Imports no usados eliminados en Fase 10G |
| R-21 | `conv-web-session` sin rate limiting verificado en EF real | MEDIUM | OPEN | Seguridad / backend | GATE_3 | Sí | Sí | Sí | No | Contrato define 429; frontend maneja retryAfter; sin EF real verificada | Frontend maneja 429; pendiente verificación en EF real |
| R-22 | `sender_ref` generado con algoritmo potencialmente débil | MEDIUM | OPEN | Seguridad / anonimato | GATE_3 | No | Sí | Sí | No | Generado por EF `conv-web-session`; algoritmo no documentado | Generación en backend (no frontend); pendiente revisar contrato EF |
| R-23 | Archivos SQL sueltos en raíz del repo sin versionar en migrations/ | HIGH | OPEN | Base de datos / migración | GATE_2 | No | Sí | Sí | No | `locks-*.sql`, `schema-*.sql` visibles en `git status` | No se modifica en este scope; requiere auditoría |
| R-24 | `conv-web-poll` sin paginación verificada (payloads potencialmente masivos) | MEDIUM | OPEN | Backend / escalabilidad | GATE_3 | No | Sí | Sí | No | Contrato define cursor param; sin EF real verificada | cursor en storage limita mensajes nuevos; pendiente verificación |
| R-25 | `webchat_session_token` sin rotación durante vida de sesión | MEDIUM | OPEN | Seguridad / tokens | GATE_4 | No | Sí | Sí | No | Token creado una vez; 401/403 fuerza nueva sesión | 401/403 como mecanismo de expiración; pendiente rotación explícita |
| R-26 | Tests de rendimiento preexistentes fallan en CI por parse error JSX en .js | LOW | OPEN | Tests / CI | N/A (preexistente) | No | No | No | No | `concurrencia.test.js` clasificado en historical-test-debt.md D-14 | `continue-on-error: true` en job unit-tests; fuera de scope SC |

---

## Tabla canónica de severidad y estado

| risk_id | Severidad | Estado |
|---|---|---|
| R-01 | CRITICAL | OPEN |
| R-02 | CRITICAL | MITIGATED |
| R-03 | CRITICAL | MITIGATED |
| R-04 | CRITICAL | MITIGATED |
| R-05 | CRITICAL | MITIGATED |
| R-06 | CRITICAL | OPEN |
| R-07 | HIGH | OPEN |
| R-08 | HIGH | OPEN |
| R-09 | HIGH | OPEN |
| R-10 | HIGH | OPEN |
| R-11 | HIGH | OPEN |
| R-12 | MEDIUM | OPEN |
| R-13 | MEDIUM | OPEN |
| R-14 | MEDIUM | OPEN |
| R-15 | MEDIUM | OPEN |
| R-16 | LOW | ACCEPTED |
| R-17 | LOW | CLOSED |
| R-18 | LOW | CLOSED |
| R-19 | LOW | CLOSED |
| R-20 | LOW | CLOSED |
| R-21 | MEDIUM | OPEN |
| R-22 | MEDIUM | OPEN |
| R-23 | HIGH | OPEN |
| R-24 | MEDIUM | OPEN |
| R-25 | MEDIUM | OPEN |
| R-26 | LOW | OPEN |

---

## Resumen por severidad (derivado de tabla canónica)

| Severidad | Count | IDs |
|---|---|---|
| CRITICAL | 6 | R-01, R-02, R-03, R-04, R-05, R-06 |
| HIGH | 6 | R-07, R-08, R-09, R-10, R-11, R-23 |
| MEDIUM | 8 | R-12, R-13, R-14, R-15, R-21, R-22, R-24, R-25 |
| LOW | 6 | R-16, R-17, R-18, R-19, R-20, R-26 |
| **TOTAL** | **26** | R-01 a R-26 |

## Resumen por estado (derivado de tabla canónica)

| Estado | Count | IDs |
|---|---|---|
| OPEN | 17 | R-01, R-06, R-07, R-08, R-09, R-10, R-11, R-12, R-13, R-14, R-15, R-21, R-22, R-23, R-24, R-25, R-26 |
| MITIGATED | 4 | R-02, R-03, R-04, R-05 |
| CLOSED | 4 | R-17, R-18, R-19, R-20 |
| ACCEPTED | 1 | R-16 |
| **TOTAL** | **26** | — |

---

## Riesgos por gate bloqueante

| Gate | Riesgos bloqueantes | Count |
|---|---|---|
| GATE_1 | R-02 (audit), R-03 (audit), R-04 (audit), R-05 (audit), R-06 (verificación formal), R-08 (CI) | 6 |
| GATE_2 | R-12 (backoff), R-13 (reconexión), R-23 (schema SQL) | 3 |
| GATE_3 | R-09 (EFs no deployed), R-10 (schema no aplicado), R-21 (rate limiting), R-22 (sender_ref), R-24 (paginación) | 5 |
| GATE_4 | R-01 (widget activación), R-11 (RLS), R-14 (iOS Safari), R-25 (token rotación) | 4 |
| Producción | R-03 (audit), R-04 (audit), R-05 (audit), R-06 (verificación), R-09, R-10, R-11, R-14, R-15 (audit log), R-21, R-22, R-24, R-25 | 13 |

> Nota: Los riesgos MITIGATED (R-02..R-05) bloquearían producción si la mitigación dejara de ser efectiva. En estado actual son aceptables para GATE_0.

---

## Estado de GATE_0

Los 26 riesgos están inventariados. Ninguno bloquea GATE_0. Los CRITICAL mitigados tienen tests que los verifican. Los CRITICAL abiertos (R-01, R-06) tienen controles compensatorios.

**GATE_0: PASS_WITH_WARNINGS** — Risk register completo, sin bloqueantes de Gate 0.
