# Índice de Dominios Funcionales

Mapa vivo dominio → requirements → código → documentación de módulo → prefijo de test → tag Playwright. Gobernado por `docs/_commons/rules/rules-04-functional-domain-catalog.md`.

**Regla de mantenimiento:** cualquier REQ, carpeta de código o doc-módulo nuevo se añade aquí en la fila de su dominio. No mueve ficheros — solo cataloga.

---

## AUTH — Autenticación y Portales

- **Requirements:** `REQ-001-auth-portals.md`
- **Código:** `src/pages/v2/auth/`, `src/pages/v2/lodger/auth/`, `src/pages/v2/manager/auth/`, `src/services/auth.service.js`, `src/hooks/useLoginForm.js`, `src/router/{RequireAuth,RequireRole,RequireTenant,RequireOnboarding}.jsx`
- **Backend:** `supabase/functions/whoami`
- **Doc-módulo:** — (núcleo)
- **Prefijo test:** `AUTH-xx`
- **Tag Playwright:** `@auth`
- **Test E2E actual:** `qa/e2e/specs/auth.spec.js`

## SA — Cuentas Cliente SaaS (Superadmin)

- **Requirements:** — (onboarding cubierto transversalmente; sin REQ dedicado detectado)
- **Código:** `src/pages/v2/superadmin/{ClientAccountsList,ClientAccountCreate,ClientAccountDetail,DashboardSuperadmin,SuperadminSettings}.jsx`, `src/services/clientAccounts.service.js`, `src/services/companies.service.js` (ámbito exacto sin confirmar — ver nota)
- **Backend:** `supabase/functions/{wizard_init,wizard_submit,provision_client_account_superadmin,stripe_webhook}`
- **Doc-módulo:** — (núcleo)
- **Prefijo test:** `SA-xx`
- **Tag Playwright:** `@sa`
- **Test E2E actual:** `qa/e2e/specs/admin-basic.spec.js` (operativa completa por plan)
- **Nota:** `companies.service.js` no tiene dominio confirmado — candidato a `SA` por analogía con `internal_companies`/`legal_companies`, pendiente de verificar con el usuario.

## ENT — Entidades

- **Requirements:** `REQ-011-entity-management.md`
- **Código:** `src/pages/v2/admin/entities/`, `src/services/entities.service.js`, `src/services/payers.service.js`
- **Backend:** `supabase/functions/manage_entity`
- **Doc-módulo:** — (núcleo)
- **Prefijo test:** `ENT-xx`
- **Tag Playwright:** `@ent`
- **Test E2E actual:** `qa/e2e/specs/entities.spec.js`

## ACC — Alojamientos y Habitaciones

- **Requirements:** `REQ-003-room-assignment.md`, `REQ-005-room-states.md`, `REQ-012-room-search.md`, `REQ-015-shared-room-accompanist.md`
- **Código:** `src/pages/v2/admin/accommodations/`, `src/pages/v2/admin/rooms/`, `src/services/accommodations.service.js`
- **Backend:** `supabase/functions/manage_accommodation`
- **Doc-módulo:** — (núcleo; `docs/smart-shared-rooms/shared-rooms.md` documenta REQ-015 pero vive fuera de este índice — ver `rules-04` §8, pendiente de fusión)
- **Prefijo test:** `ACC-xx`
- **Tag Playwright:** `@acc`
- **Test E2E actual:** `qa/e2e/specs/accommodations.spec.js`, `qa/e2e/specs/room-status-and-checkout.spec.js`, `qa/e2e/specs/shared-rooms.spec.js`

## TEN — Inquilinos

- **Requirements:** `REQ-002-tenants-lifecycle.md`, `REQ-006-lodger-states.md`
- **Código:** `src/pages/v2/admin/tenants/`, `src/pages/v2/lodger/`, `src/services/lodgers.service.js`, `src/hooks/useLodgers.js`
- **Backend:** `supabase/functions/manage_lodger`
- **Doc-módulo:** — (núcleo)
- **Prefijo test:** `TEN-xx`
- **Tag Playwright:** `@ten`
- **Test E2E actual:** `qa/e2e/specs/tenants.spec.js`, `qa/e2e/specs/tenant-address-fields.spec.js`

## ENE — Energía y Facturación

- **Requirements:** `REQ-004-energy-billing.md`, `REQ-007-energy-bill-settlement.md`, `REQ-008-consumption-viewer.md`, `REQ-009-utility-split-config.md`
- **Código:** `src/pages/v2/admin/energy/`, `src/pages/v2/admin/bulletins/`, `src/pages/v2/lodger/{LodgerConsumo,LodgerBoletines}.jsx`, `src/services/energy.service.js`
- **Backend:** `supabase/functions/{scan_energy_bill,settle_energy_bill}`
- **Doc-módulo:** — (núcleo)
- **Prefijo test:** `ENE-xx`
- **Tag Playwright:** `@ene`
- **Test E2E actual:** `qa/e2e/specs/energy.spec.js`

## DASH — Dashboard

- **Requirements:** `REQ-010-dashboard-admin-v3.md`
- **Código:** `src/pages/v2/admin/{DashboardAdmin,DashboardAdminV3,DashboardAdminV3New}.jsx`, `src/pages/v2/superadmin/DashboardSuperadmin.jsx` (transversal con `SA`), `src/hooks/useAdminLayout.js`
- **Backend:** — (lecturas agregadas, sin Edge Function dedicada detectada)
- **Doc-módulo:** — (núcleo)
- **Prefijo test:** `DASH-xx`
- **Tag Playwright:** `@dash`
- **Test E2E actual:** — (pendiente, cubierto parcialmente dentro de `admin-basic.spec.js`)

## PLAN — Planes de Suscripción

- **Requirements:** — (sin REQ dedicado detectado; límites de plan se documentan dentro de otros REQ y en `docs/architecture/overview.md` §8)
- **Código:** `src/pages/v2/superadmin/plans/`, `src/services/plans.service.js`
- **Backend:** — (validación de límites embebida en cada Edge Function de escritura, no en una función propia)
- **Doc-módulo:** — (núcleo)
- **Prefijo test:** `PLAN-xx`
- **Tag Playwright:** `@plan`
- **Test E2E actual:** — (pendiente)

## SVC — Catálogo SaaS de Servicios/Add-ons

- **Requirements:** `REQ-013-saas-services-catalog.md`
- **Código:** `src/pages/v2/superadmin/saas-services/`, `src/pages/v2/superadmin/services/` (duplicación viva sin resolver — ver nota), `src/pages/v2/admin/catalogo/`, `src/pages/v2/admin/services/`, `src/pages/v2/admin/gestion-servicios/`, `src/services/{saasServices,services}.service.js`
- **Backend:** — (sin Edge Function dedicada detectada; CRUD directo con RLS)
- **Doc-módulo:** — (núcleo)
- **Prefijo test:** `SVC-xx`
- **Tag Playwright:** `@svc`
- **Test E2E actual:** — (pendiente)
- **⚠️ Decisión de producto abierta:** `src/App.jsx` líneas 297-305 registra **ambas** rutas activas en producción: `/v2/superadmin/servicios` (`ServicesListV2`) y `/v2/superadmin/saas-servicios` (`SaasServicesListV2`), las dos cubriendo aparentemente REQ-013. No se ha confirmado cuál es la fuente de verdad — no tocar código ni rutas hasta que el usuario lo decida (ver `rules-04` §8).

## SEC — Seguridad Transversal

- **Requirements:** transversal a todos los REQ (RLS, multi-tenant, JWT+rol+tenant+plan)
- **Código:** `src/router/`, políticas RLS en `supabase/migrations/`
- **Doc-módulo:** `docs/architecture/overview.md`, `docs/architecture/audit-log-system.md`
- **Prefijo test:** `SEC-xx`
- **Tag Playwright:** `@sec`
- **Test actual:** `qa/unit/security/multi-tenant-isolation.test.js` (Vitest, no Playwright)

## PERF — Rendimiento

- **Requirements:** — (no funcional, transversal)
- **Código:** — (transversal)
- **Doc-módulo:** — (núcleo)
- **Prefijo test:** `PERF-xx`
- **Tag Playwright:** `@perf`
- **Test actual:** `src/tests/rendimiento/` (Vitest, no Playwright)

## SAL — SmartLock (add-on)

- **Requirements:** `REQ-SL-000-smart-lock-capability.md` (fuente de verdad vigente; `REQ-014` es stub-redirect histórico)
- **Código:** `src/pages/v2/admin/services/smart-access/`, `src/pages/v2/superadmin/{client-sal,sal-shards}/`, `src/services/sal.service.js`
- **Backend:** `supabase/functions/sal-*` (23 funciones)
- **Doc-módulo:** `docs/smart-lock/{rules,contracts,skills,tests,diagrams}/` — módulo más maduro del repo (33 ficheros, sigue el patrón de 5 categorías perfectamente)
- **Prefijo test:** `SAL-xx`
- **Tag Playwright:** `@sal`
- **Test E2E actual:** — (pendiente, sin specs Playwright todavía)

## SC — SmartConversations (add-on)

- **Requirements:** `REQ-SC-000-smart-conversations-capability.md`, `REQ-SC-010-whatsapp-channel.md`, `REQ-SC-020-whatsapp-channel-integration.md`, + `REQ-SC-200/210/220` (help), `REQ-SC-300/320` (chatbot channel)
- **Código:** `src/features/webchat/`
- **Backend:** `supabase/functions/conv-*` (23 funciones), `supabase/functions/smart_conversations`
- **Doc-módulo:** `docs/smart-conversations/` (134 ficheros — 9 carpetas fuera del patrón de 5 categorías, ver `rules-04` §4.3)
- **Prefijo test:** `SC-xx`
- **Tag Playwright:** `@sc`
- **Test actual:** `tests/regression/smart-conversations/` (55 `.spec.ts` Vitest, scaffold Fase 0, todo `it.todo`) — no es Playwright, fuera del alcance del repo `smartroom-rental-test`

## SI — SmartIncidents (add-on)

- **Requirements:** `REQ-SC-100/110/120` (namespace provisional bajo `SC`, pendiente re-namespace a `REQ-SI-*` — ver `rules-04` §8)
- **Código:** `src/pages/v2/lodger/LodgerIncidencias.jsx` (frontend embrionario, sin service dedicado detectado)
- **Backend:** `supabase/functions/smart_incidents`
- **Doc-módulo:** `docs/smart-incidents/{rules,contracts,skills,tests,diagrams}/` (arrancando: solo `rules/rules-00`, `rules-01`, `rules-05`)
- **Prefijo test:** `SI-xx`
- **Tag Playwright:** `@si`
- **Test E2E actual:** — (pendiente)

---

## Decisiones pendientes registradas (no ejecutar sin confirmación del usuario)

Ver detalle completo en `docs/_commons/rules/rules-04-functional-domain-catalog.md` §8:

1. Re-namespace de `REQ-SC-100/110/120` → `REQ-SI-*` cuando se redacten.
2. Re-namespace de `REQ-SC-150/160/170` → `REQ-SP-*` (smart-publications) cuando se redacten.
3. Destino de `docs/smart-shared-rooms/shared-rooms.md` (fusionar en `ACC` y retirar la carpeta módulo).
4. Duplicación viva `superadmin/services/` vs `superadmin/saas-services/` (dominio `SVC`).
5. Reclasificación de las 9 carpetas de `docs/smart-conversations/` que exceden el patrón de 5 categorías.
