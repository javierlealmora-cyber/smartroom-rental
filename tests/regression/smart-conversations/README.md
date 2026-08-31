# SmartConversations — Regression Harness

Tests de regresión trazables para el add-on SmartConversations.

## Diferencia entre `/docs` y `/tests/regression`

| `/docs/smart-conversations/` | `/tests/regression/smart-conversations/` |
|---|---|
| Especificaciones documentales (lo que el sistema debe hacer) | Tests ejecutables que verifican que lo hace |
| Referencia para diseño y desarrollo | CI gate para detectar regresiones |
| Sin código ejecutable | Código TypeScript + Vitest |

## Estructura

```
tests/regression/smart-conversations/
  config/
    test-env.ts          Variables de entorno con defaults mock
    tenants.ts           Tenants de test predefinidos
    services.ts          Endpoints de servicios externos
  fixtures/
    tenants.fixture.ts   Datos de tenant simulados
    sessions.fixture.ts  Sesiones conv_sessions de test
    messages.fixture.ts  Mensajes normalizados de test
    identity.fixture.ts  Flags y resultados de WF-IDENTITY
    incidents.fixture.ts Conv cases e incidencias de test
    listings.fixture.ts  Listings y leads de test
  mocks/
    core.mock.ts         Mock de conv-ingest y EFs del Core
    wasender.mock.ts     9 escenarios de Wasender
    claude.mock.ts       Mock de respuestas de IA/Claude
    n8n.mock.ts          Mock de respuestas de workflows n8n
    supabase.mock.ts     Mock del cliente Supabase
  helpers/
    assert-no-pii.ts          Verifica ausencia de PII prohibida
    assert-canonical-response.ts  Verifica forma canónica de respuestas
    assert-activity-event.ts  Verifica eventos del catálogo (rules-75)
    assert-state-transition.ts  Verifica transiciones de estado
    reset-test-db.ts      Resetea estado entre tests
    create-test-session.ts  Fábrica de sesiones/mensajes de test
  suites/
    activity-log/         LOG-01 a LOG-9b + LOG-NEG-01 a LOG-NEG-06
    conversation-routing/ RT-01 a RT-13 + RT-NEG-01 a RT-NEG-06
    failure-recovery/     ERR-01 a ERR-25 + ERR-NEG-01 a ERR-NEG-08
    help-flow/            HLP-01 a HLP-12 + HLP-NEG-01 a HLP-NEG-06
    identity-validation/  ID-01 a ID-18 + ID-NEG-01 a ID-NEG-06
    incidents-flow/       INC-01 a INC-14 + INC-NEG-01 a INC-NEG-07
    listings-flow/        LST-01 a LST-14 + LST-NEG-01 a LST-NEG-06
    permissions-and-privacy/ PII-01 a PII-20 + PII-NEG-01 a PII-NEG-08
  vitest.config.ts        Config separada (environment: node)
  README.md               Este fichero
```

## Reglas de prefijo de tablas

**TODAS** las tablas propias de SmartConversations usan el prefijo `conv_`:

- `conv_sessions` — sesiones de conversación por canal
- `conv_cases` — casos (incidencias, leads, ayuda)
- `conv_messages` — mensajes almacenados
- `conv_send_queue` — cola de envío con reintentos
- `conv_wa_sessions` — sesiones de Wasender por tenant
- `conv_wc_configs` — configuración WebChat por tenant
- `conv_service_activations` — suscripciones de tenants
- `conv_admin_notifications` — notificaciones al admin

## Scripts npm

```bash
# Todos los tests SC
npm run test:sc:regression

# Por suite
npm run test:sc:activity
npm run test:sc:routing
npm run test:sc:failure
npm run test:sc:help
npm run test:sc:identity
npm run test:sc:incidents
npm run test:sc:listings
npm run test:sc:privacy
```

## Roadmap de fases

| Fase | Descripción | Estado |
|------|-------------|--------|
| 0 | Regression harness (estructura, mocks, fixtures, it.todo) | ✅ Completo |
| 1 | conv-ingest + normalización de mensajes | Pendiente |
| 2 | WF-IDENTITY — validación progresiva | Pendiente |
| 3 | WF-20 — gestión de incidencias | Pendiente |
| 4 | WF-30 — gestión de leads/listings | Pendiente |
| 5 | WF-40 — gestión de ayuda + IA | Pendiente |
| 6 | Integración Wasender (WhatsApp) | Pendiente |
| 7 | Integración WebChat | Pendiente |
| 8 | Activity log + privacidad | Pendiente |
| 9 | Integration API + autenticación service_role | Pendiente |

## Modo de ejecución

Los tests corren en **modo mock** por defecto (sin llamadas reales).  
Para apuntar a servicios reales: `USE_REAL_SERVICES=true npm run test:sc:regression`

La config de Vitest para SC es independiente del root `vitest.config.js`:
- Root: `environment: 'jsdom'` (tests React)
- SC: `environment: 'node'` (lógica pura, sin DOM)
