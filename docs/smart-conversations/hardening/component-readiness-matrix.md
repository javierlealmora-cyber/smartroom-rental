# Component Readiness Matrix — SmartConversations
<!-- Fase 11A · Generado 2026-07-19 -->

> **Criterio**: Listo para prueba/integración = tests estáticos/contratos pasan, sin dependencias de producción reales.  
> **NO** implica production-ready ni activación de Core real, IA real, n8n real, Wasender real, Realtime real.

## Leyenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Listo (tests pasan, contrato definido) |
| 🟡 | Parcial (scaffold, it.todo pendiente) |
| 🔴 | No listo (sin tests, sin contrato) |
| 🚫 | Bloqueado por restricción de seguridad |

---

## A. Frontend — Widget WebChat (Fase 10G)

| Componente | Archivo | Tests | Estado | Notas |
|---|---|---|---|---|
| `getWebchatConfig` | `src/features/webchat/utils/webchat-config.js` | ✅ config.test | ✅ | Feature flags desactivados por defecto |
| `dedupeMessages` | `src/features/webchat/utils/webchat-dedupe.js` | ✅ dedupe.test | ✅ | Map<message_id> + reconcileOptimistic |
| `toSafeError` | `src/features/webchat/utils/webchat-errors.js` | ✅ errors.test | ✅ | Sin PII, 4 categorías HTTP |
| `focusFirst/trapFocus` | `src/features/webchat/utils/webchat-accessibility.js` | ✅ a11y.test | ✅ | jsdom: double optional chaining |
| `webchat-api.js` | `src/features/webchat/services/webchat-api.js` | ✅ api.test | ✅ | fetch() nativo, sin service_role |
| `webchat-storage.js` | `src/features/webchat/services/webchat-storage.js` | ✅ storage.test | ✅ | memory-mode por defecto |
| `createRealtimeAdapter` | `src/features/webchat/services/webchat-realtime.js` | ✅ realtime.test | ✅ | best-effort, sin WS real |
| `useWebChatSession` | `src/features/webchat/hooks/useWebChatSession.js` | ✅ session.test | ✅ | AbortController, createSession |
| `useWebChatMessages` | `src/features/webchat/hooks/useWebChatMessages.js` | ✅ messages.test | ✅ | optimistic + dedupe |
| `useWebChatPolling` | `src/features/webchat/hooks/useWebChatPolling.js` | ✅ polling.test | ✅ | busyRef, visibilitychange |
| `useWebChatRealtime` | `src/features/webchat/hooks/useWebChatRealtime.js` | ✅ realtime-hook.test | ✅ | filter by session_id |
| `useWebChat` | `src/features/webchat/hooks/useWebChat.js` | ✅ orchestrator.test | ✅ | 401/403/429 recovery |
| `WebChatLauncher` | `src/features/webchat/components/WebChatLauncher.jsx` | ✅ launcher.test | ✅ | aria-expanded, aria-controls |
| `WebChatPanel` | `src/features/webchat/components/WebChatPanel.jsx` | ✅ panel.test | ✅ | role=dialog, Escape, trapFocus |
| `WebChatMessageList` | `src/features/webchat/components/WebChatMessageList.jsx` | ✅ msglist.test | ✅ | role=log, aria-live=polite |
| `WebChatMessageBubble` | `src/features/webchat/components/WebChatMessageBubble.jsx` | ✅ bubble.test | ✅ | texto plano, sin dangerouslySetInnerHTML |
| `WebChatComposer` | `src/features/webchat/components/WebChatComposer.jsx` | ✅ composer.test | ✅ | Enter/Shift+Enter, retryAfter |
| `WebChatStatus` | `src/features/webchat/components/WebChatStatus.jsx` | ✅ status.test | ✅ | role=alert / role=status |
| `WebChatErrorBoundary` | `src/features/webchat/components/WebChatErrorBoundary.jsx` | ✅ boundary.test | ✅ | getDerivedStateFromError |
| `WebChatWidget` | `src/features/webchat/components/WebChatWidget.jsx` | ✅ integration | ✅ | Integrador completo |
| `V2Layout integration` | `src/layouts/V2Layout.jsx` | ✅ INT-01..07 | ✅ | Flag=false por defecto |

**Subtotal Frontend**: 21/21 ✅

---

## B. Edge Functions — Smart Conversations (ingest + routing + workflows)

| Componente | EF | Tests regresión | Estado | Notas |
|---|---|---|---|---|
| `conv-ingest` | ✅ | 🟡 ingest.spec (todo) | 🟡 | Contrato definido, it.todo |
| `conv-dispatch-message` | ✅ | 🟡 dispatch.spec (todo) | 🟡 | |
| `conv-routing-engine` | ✅ | 🟡 routing.spec (todo) | 🟡 | 19 it.todo en conversation-routing |
| `conv-wf20-incidents` | ✅ | 🟡 incidents-flow.spec (22 todo) | 🟡 | |
| `conv-wf30-listings` | ✅ | 🟡 listings-flow.spec (todo) | 🟡 | |
| `conv-wf40-help` | ✅ | 🟡 help-flow.spec (todo) | 🟡 | |
| `conv-core-validate-identity` | ✅ | 🟡 identity-validation.spec (24 todo) | 🟡 | |
| `conv-core-publish-activity` | ✅ | 🟡 activity-log.spec (17 todo) | 🟡 | |
| `conv-core-get-tenant-features` | ✅ | 🟡 | 🟡 | |
| `conv-core-create-incident` | ✅ | 🟡 | 🟡 | |
| `conv-core-create-lead` | ✅ | 🟡 | 🟡 | |
| `conv-core-create-help-ticket` | ✅ | 🟡 | 🟡 | |
| `conv-core-query-listings` | ✅ | 🟡 | 🟡 | |
| `conv-core-query-help-kb` | ✅ | 🟡 | 🟡 | |
| `conv-send-wa` | ✅ | 🟡 wasender-integration.spec | 🟡 | Sin Wasender real |
| `conv-process-send-queue` | ✅ | 🟡 outbound.spec | 🟡 | |
| `conv-wa-webhook` | ✅ | 🟡 channels.spec | 🟡 | |
| `conv-web-session` | ✅ | ✅ webchat-integration.spec (133) | ✅ | |
| `conv-web-message` | ✅ | ✅ webchat-integration.spec | ✅ | |
| `conv-web-deliver` | ✅ | ✅ webchat-integration.spec | ✅ | |
| `conv-web-poll` | ✅ | ✅ webchat-integration.spec | ✅ | |
| `conv-close-case` | ✅ | 🟡 e2e.spec | 🟡 | |
| `conv-escalate-case` | ✅ | 🟡 | 🟡 | |
| `conv-identity-progressive` | ✅ | 🟡 identity.spec | 🟡 | |

**Subtotal EF**: 4/24 ✅, 20/24 🟡 (scaffold)

---

## C. Shared Library (`_shared/smart-conversations/`)

| Módulo | Archivo | Tests | Estado |
|---|---|---|---|
| Types | `types.ts` | 🟡 types.spec | 🟡 |
| Constants | `constants.ts` | 🟡 | 🟡 |
| Errors | `errors.ts` | 🟡 | 🟡 |
| Activity log | `activity-log.ts` | 🟡 activity-log.spec (17 todo) | 🟡 |
| Identity | `identity.ts` | 🟡 identity-validation.spec (24 todo) | 🟡 |
| Permissions | `permissions.ts` | 🟡 permissions-and-privacy.spec (31 todo) | 🟡 |
| Schema helpers | `schema.ts` | 🟡 schema.spec | 🟡 |
| Runtime | `runtime/` | 🟡 failure-recovery.spec (33 todo) | 🟡 |
| (otros) | varios | 🟡 | 🟡 |

---

## D. Infraestructura CI/CD

| Componente | Archivo | Estado | Notas |
|---|---|---|---|
| Build job | `pr-checks.yml` | ✅ | Bloqueante; lint + vite build |
| Unit tests job | `pr-checks.yml` | 🟡 | `continue-on-error: true` (no bloqueante) |
| E2E tests | `e2e-tests.yml` | 🟡 | Playwright, no SC-specific |
| Deploy dev | `deploy-dev.yml` | 🚫 | No activar sin aprobación |
| Deploy staging | `deploy-staging.yml` | 🚫 | No activar sin aprobación |
| Deploy production | `deploy-production.yml` | 🚫 | No activar sin aprobación |
| Deploy EFs | `deploy-edge-functions.yml` | 🚫 | No activar sin aprobación |
| Auto-merge PR | `auto-merge-pr.yml` | 🟡 | Solo en PRs aprobados |

---

## Resumen

| Categoría | ✅ Listo | 🟡 Parcial | 🔴 No listo | 🚫 Bloqueado |
|---|---|---|---|---|
| Frontend WebChat | 21 | 0 | 0 | 0 |
| Edge Functions | 4 | 20 | 0 | 0 |
| Shared Library | 0 | 9 | 0 | 0 |
| CI/CD | 2 | 3 | 0 | 3 |
| **Total** | **27** | **32** | **0** | **3** |

**Estado global: GATE_0 — Baseline registrado. No production-ready.**
