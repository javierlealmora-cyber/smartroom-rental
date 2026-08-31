# incident-entitlement-si-p4b-source-audit.md
# SI-P4B — Auditoría de la fuente canónica de entitlement de Smart Incidents

**Tipo:** Read-only audit. Sin código implementado. Sin adapter. Sin RPC. Sin EF. Sin migraciones.

**Versión:** SI-P4B-REV2 — Adicionalmente: semántica Gate2/Gate3 corregida (channel-specific), GATE_2_GATE_3_MODEL_CONTRADICTION eliminada. Ver SI-P4C1 para decisión arquitectónica completa.

**Fecha:** 2026-08-04

**Baseline git relevante:**
```
?? docs/smart-incidents/integration/         ← directorio nuevo (no rastreado)
 M docs/smart-incidents/rules/rules-01-document-authoring-standard.md
?? docs/smart-incidents/rules/rules-10-addon-entitlement.md
?? docs/smart-incidents/rules/rules-80-security-and-tenancy.md
?? supabase/functions/_shared/smart-incidents/
?? supabase/migrations/20260716000001_smart_conversations_core_schema.sql
?? supabase/migrations/20260718000001_rls_saas_subscriptions_admin.sql
?? supabase/migrations/20260721000001_sc_security_remediation_b2b.sql
?? supabase/migrations/20260723000001_sc_security_b3.sql
```

---

## 1. Documentos revisados

| Documento | Ruta | Relevancia |
|---|---|---|
| rules-10-addon-entitlement.md | `docs/smart-incidents/rules/` | Condición de entitlement activo, identificador canónico, doble gating, responsabilidades de SI vs SC |
| rules-80-security-and-tenancy.md | `docs/smart-incidents/rules/` | Prohibición SI→conv_*, RLS, cross-tenant, fronteras de acceso |
| contract-create-incident-request.md | `docs/smart-incidents/contracts/` | Contrato provider v1.0, doble gating §8.10, FEATURE_DISABLED §8.12 |
| incident-provider-si-p3b1-auth-decision.md | `docs/smart-incidents/integration/` | Capas de verificación del provider |
| rules-20-tenant-activation-and-lifecycle.md | `docs/smart-conversations/rules/` | Jerarquía de tres niveles de activación de SC |
| rules-60-service-incidents.md | `docs/smart-conversations/rules/` | Flujo de creación de incidencia desde SC, service_code conv_incidencias |
| rules-70-integration-api.md | `docs/smart-conversations/rules/` | EFs conv-core-*, prohibición de acceso directo al Core desde SC |
| contract-tenant-features-response.md | `docs/smart-conversations/contracts/` | Estructura TenantFeaturesResponse, servicios activos por canal |

---

## 2. Migraciones revisadas

| Migración | Hallazgos relevantes |
|---|---|
| `20260716000001_smart_conversations_core_schema.sql` | Esquema completo de `conv_service_activations`, `conv_wa_sessions`, `conv_wc_configs`, `conv_sessions`, `conv_cases`. Todas con RLS + policy `service_role only`. **Crítico:** `conv_service_activations.channel` es NOT NULL con CHECK IN ('whatsapp', 'webchat'). No existe fila sin canal. |
| `20260716000002_smart_lock_plan_features_seed.sql` | Modelo de `saas_services`, `saas_service_plans`, `saas_service_features`. Código de servicio `smart_access_lock` como patrón de referencia. |
| `20260718000001_rls_saas_subscriptions_admin.sql` | RLS sobre `saas_service_subscriptions`: policies para superadmin (all), admin (select/insert/update propio). Helper SECURITY DEFINER `get_my_client_account_id()`. |
| `20260721000001_sc_security_remediation_b2b.sql` | REVOKE explícito sobre anon/authenticated en todas las tablas `conv_*`. Columnas de seguridad WebChat. |
| `20260723000001_sc_security_b3.sql` | FORCE ROW LEVEL SECURITY adicional. Soporte rotación webhook_secret. Función SECURITY DEFINER `get_wa_webhook_secret`. |

---

## 3. Edge Functions y puertos revisados

| EF / Puerto | Hallazgos relevantes |
|---|---|
| `supabase/functions/conv-core-get-tenant-features/index.ts` | EF Deno con `serve`. Usa `SUPABASE_SERVICE_ROLE_KEY`. Ejecuta tres SELECT independientes (sin transacción explícita): `conv_service_activations` (Level 3), `conv_wa_sessions` (Level 2 WA), `conv_wc_configs` (Level 2 WC). No lee `saas_service_subscriptions` para `smart_incidents` (comentario: "implementar en fases posteriores"). |
| `supabase/functions/conv-core-create-incident/index.ts` | Delega al adapter `incidents-addon-adapter`. No verifica entitlement de `smart_incidents` directamente. |
| `supabase/functions/_shared/smart-conversations/incidents-integration-port.ts` | Puerto SC→SI, flujo de escritura. Sin check de entitlement. |

---

## 4. Tests y validadores revisados

| Test / Validador | Hallazgos relevantes |
|---|---|
| `tests/regression/smart-incidents/suites/si-p4a-entitlement.spec.ts` | Frontera offline de entitlement. Tres gates offline con port stub. Sin adapter real. 42 tests pasan. |
| `tests/regression/smart-incidents/suites/si-p3b2a-auth.spec.ts` | Autenticación del caller. Sin relación con entitlement. |

No se encontraron tests de integración de entitlement contra fuentes reales de datos.

---

## 5. Gate 1 — `smart_incidents_subscription_active`

### Fuente candidata

**Tabla:** `public.saas_service_subscriptions`

**Condición canónica** (rules-10 §4.2):
```sql
client_account_id = <client_account_id>
AND saas_service_id = (SELECT id FROM saas_services WHERE code = 'smart_incidents')
AND status = 'active'
```

### Propiedades auditadas

| Propiedad | Valor | Estado |
|---|---|---|
| Entidad propietaria | Core (SmartRoom Core) | VERIFIED |
| Tabla | `saas_service_subscriptions` | VERIFIED — migración 20260718000001 |
| Clave tenant | `client_account_id` (uuid) | VERIFIED |
| Identificador canónico del add-on | `saas_services.code = 'smart_incidents'` | VERIFIED — rules-10 §3.2 |
| Estados posibles | `active`, `pending`, `suspended`, `cancelled` | VERIFIED — rules-10 §3.3 |
| Estado "activo" | `status = 'active'` en el momento de la operación | VERIFIED — rules-10 §3.3 |
| RLS | Sí — policies superadmin (all), admin (select/insert/update), service_role (bypassrls) | VERIFIED — migración 20260718000001 |
| Core-owned | Sí | VERIFIED |
| Registro `saas_services.code = 'smart_incidents'` en catálogo | No hay seed en el repositorio | INFERRED (por analogía con `smart_access_lock`) |

### Gaps del Gate 1

- No hay migración de seed para `smart_incidents` en el repositorio auditado.
- No hay documentación del proceso de alta específico para `smart_incidents`.
- Período de gracia: NOT_FOUND — la condición es estricta: `status = 'active'` en tiempo real.

---

## 6. Gate 2 — `incident_creation_capability_active`

### Esquema exacto de `conv_service_activations` (evidencia directa — migración 20260716000001)

```sql
CREATE TABLE conv_service_activations (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id   uuid        NOT NULL,
  service_code        text        NOT NULL
                      CHECK (service_code IN ('conv_incidencias', 'conv_publicaciones', 'conv_ayuda')),
  channel             text        NOT NULL
                      CHECK (channel IN ('whatsapp', 'webchat')),
  is_active           boolean     NOT NULL DEFAULT true,
  config              jsonb,
  deactivated_at      timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_account_id, service_code, channel)
);
```

**Hallazgos críticos del esquema:**

1. `channel` es **NOT NULL** con `CHECK (channel IN ('whatsapp', 'webchat'))`. No puede existir ninguna fila sin canal.
2. `service_code` es **NOT NULL** con `CHECK (service_code IN ('conv_incidencias', 'conv_publicaciones', 'conv_ayuda'))`.
3. La clave única es `(client_account_id, service_code, channel)` — tres columnas. No existe una clave única solo sobre `(client_account_id, service_code)`.
4. **No existe ningún mecanismo para insertar una fila de activación tenant-level sin canal.** Para `conv_incidencias`, solo pueden existir a lo sumo dos filas por tenant: una para `whatsapp` y otra para `webchat`.

### Fuente candidata (definición corregida — SI-P4C1)

`incident_creation_capability_active` es una condición **channel-specific**. Pregunta: ¿está habilitada la capability de creación de incidencias para el canal concreto solicitado?

```sql
-- Gate 2 para source_channel = 'whatsapp':
EXISTS (
  SELECT 1 FROM conv_service_activations
  WHERE client_account_id = <X>
    AND service_code = 'conv_incidencias'
    AND channel = 'whatsapp'          -- ← canal específico de la solicitud
    AND is_active = true
)

-- Gate 2 para source_channel = 'webchat':
EXISTS (
  SELECT 1 FROM conv_service_activations
  WHERE client_account_id = <X>
    AND service_code = 'conv_incidencias'
    AND channel = 'webchat'           -- ← canal específico de la solicitud
    AND is_active = true
)
```

Esta condición tiene soporte directo en el esquema: la UNIQUE `(client_account_id, service_code, channel)` garantiza como máximo una fila por tenant+servicio+canal. La consulta por canal específico es precisa y sin agregación.

**No se agrega "cualquier canal activo".** La solicitud por WhatsApp revisa la activación de WhatsApp únicamente; la solicitud por WebChat revisa WebChat únicamente.

### Gaps del Gate 2

- No hay contrato neutral expuesto a SI que devuelva este booleano. El adapter de SI no puede leer `conv_service_activations` directamente (rules-80 §4.6, prohibición convencional).
- `conv-core-get-tenant-features` no es reutilizable sin modificación: devuelve `services_active[].channels` (lista combinada Level 2+3), no el booleano de Gate 2 aislado.
- La falta de contrato formal se resuelve en SI-P4C2B.

---

## 7. Gate 3 — `source_channel_active`

### Fuente candidata (definición corregida — SI-P4C1)

Gate 3 pregunta: ¿El transporte/canal subyacente solicitado está disponible? Gate 3 **no re-verifica** `conv_service_activations` (esa condición pertenece a Gate 2).

**WhatsApp:**
```sql
-- Gate 3 = transport (Level 2 únicamente):
conv_wa_sessions WHERE client_account_id = X AND status = 'active'
```

**WebChat:**
```sql
-- Gate 3 = transport (Level 2 únicamente):
conv_wc_configs WHERE client_account_id = X AND is_active = true
```

### Propiedades auditadas

| Propiedad | Valor | Estado |
|---|---|---|
| Entidad propietaria | SmartConversations | VERIFIED |
| Clave tenant | `client_account_id` | VERIFIED |
| Gate 3 WhatsApp (transport) | `conv_wa_sessions.status = 'active'` | VERIFIED — rules-20 §4.4 |
| Gate 3 WebChat (transport) | `conv_wc_configs.is_active = true` | VERIFIED — rules-20 §4.7 |
| `conv_wa_sessions.channel` | No existe. La tabla no tiene columna channel; es una sesión por tenant (UNIQUE client_account_id) | VERIFIED — esquema directo |
| `conv_wc_configs.channel` | No existe. Idem | VERIFIED |
| Level 3 de canal (conv_service_activations) | Pertenece a Gate 2 (definición corregida SI-P4C1), no a Gate 3 | REVISED |

---

## 8. Independencia entre Gate 2 y Gate 3

### Análisis con definiciones corregidas (SI-P4C1)

Con las definiciones corregidas en SI-P4C1:
- Gate 2 fuente: `conv_service_activations` (Level 3) — canal específico.
- Gate 3 fuente: `conv_wa_sessions` o `conv_wc_configs` (Level 2) — transporte únicamente.

Estas son **tablas distintas** con condiciones distintas. No hay implicación lógica entre ellas.

### Las cuatro combinaciones son representables (ejemplo WhatsApp)

| G2 | G3 | Estado del sistema | Representable |
|---|---|---|---|
| true | true | Fila `(tenant, conv_incidencias, whatsapp, is_active=true)` existe Y `conv_wa_sessions.status='active'` | **SÍ** |
| true | false | Fila `(tenant, conv_incidencias, whatsapp, is_active=true)` existe PERO `conv_wa_sessions.status='disconnected'` | **SÍ** — admin habilitó incidencias por WA pero la sesión está caída |
| false | true | Fila no existe (o `is_active=false`) PERO `conv_wa_sessions.status='active'` | **SÍ** — WA conectado pero incidencias no habilitadas para ese canal |
| false | false | Fila no existe Y `conv_wa_sessions.status='disconnected'` (o sin fila en `conv_wa_sessions`) | **SÍ** |

### Estado

```
GATE_2_GATE_3_SEMANTICS_RESOLVED
```

`GATE_2_GATE_3_MODEL_CONTRADICTION` queda eliminada. Ver SI-P4C1 §3 para el análisis completo.

---

## 9. Clave tenant canónica

`client_account_id` (uuid) es la clave de partición en todas las fuentes auditadas:

| Tabla | Campo | Constraint |
|---|---|---|
| `saas_service_subscriptions` | `client_account_id` | NOT NULL, filtro RLS |
| `conv_service_activations` | `client_account_id` | NOT NULL, UNIQUE (client_account_id, service_code, channel) |
| `conv_wa_sessions` | `client_account_id` | NOT NULL, UNIQUE (un tenant = una sesión WA) |
| `conv_wc_configs` | `client_account_id` | NOT NULL, UNIQUE (un tenant = una config WC) |

---

## 10. PostgreSQL RPC vs Edge Function — distinción explícita

Estos términos NO son sinónimos. Se usan con precisión en todo este documento.

### PostgreSQL RPC (función SQL/plpgsql)

- **Qué es:** Una función creada con `CREATE FUNCTION ... LANGUAGE sql|plpgsql` dentro del motor PostgreSQL.
- **Ejecución:** Dentro del proceso del servidor de base de datos, en el contexto de la sesión SQL activa.
- **Transaccionalidad:** Si la función se invoca dentro de un bloque de transacción explícito (o si la función misma abre una transacción con `BEGIN`), todas sus consultas internas comparten el mismo snapshot de MVCC. Con `REPEATABLE READ` o `SERIALIZABLE`, las tres consultas a las tres tablas verían el mismo estado consistente de la base de datos: `ATOMIC_DATABASE_SNAPSHOT`. Con `READ COMMITTED` (default de PostgreSQL), cada instrucción interna ve su propio snapshot: `BEST_EFFORT_MULTI_QUERY_SNAPSHOT`.
- **Seguridad:** Requiere decidir entre `SECURITY INVOKER` (usa privilegios del llamador) o `SECURITY DEFINER` (usa privilegios del dueño de la función). No usa `SUPABASE_SERVICE_ROLE_KEY`.
- **Auditoría de hardening:** Owner de la función, grants de EXECUTE, `SET search_path` para prevenir ataques de sustitución de schema, `REVOKE EXECUTE FROM PUBLIC`.
- **Invocación:** Mediante `supabase.rpc('nombre', args)` desde una EF o cliente.
- **Acceso cross-table:** En un único proyecto Supabase (una única base de datos), una función SQL puede consultar tablas de distintos módulos (Core + SC) en la misma función, pero esto crea acoplamiento a nivel de base de datos.

### Edge Function (Deno HTTP)

- **Qué es:** Una función serverless Deno que expone un endpoint HTTP. Creada con `Deno.serve` / `serve`.
- **Ejecución:** Fuera de PostgreSQL, en el runtime de Deno de Supabase.
- **Transaccionalidad:** Usa un cliente Supabase JS que ejecuta cada `from(...).select(...)` como una consulta HTTP REST/PostgREST independiente. Tres consultas son tres peticiones separadas: `BEST_EFFORT_MULTI_QUERY_SNAPSHOT`. No hay transacción implícita ni snapshot compartido.
- **Seguridad:** Usa `SUPABASE_SERVICE_ROLE_KEY` del entorno Deno para crear un cliente con bypassrls. La clave no vive en PostgreSQL sino en las variables de entorno de Deno.
- **Sin atomicidad nativa:** Para obtener un snapshot atómico desde una EF, la EF debería invocar una PostgreSQL RPC (función SQL) que internamente ejecute las tres consultas en un bloque de transacción consistente.
- **Overhead:** Cada consulta es una petición HTTP/REST (PostgREST → PostgreSQL). Tres consultas = tres roundtrips.

---

## 11. Clasificación de atomicidad por candidato

```
ATOMIC_DATABASE_SNAPSHOT          — Todas las lecturas comparten el mismo snapshot MVCC de PostgreSQL.
BEST_EFFORT_MULTI_QUERY_SNAPSHOT  — Lecturas secuenciales en snapshots distintos. Ventana TOCTOU presente.
PRECOMPUTED_READ_MODEL_SNAPSHOT   — Lee una tabla derivada que refleja estados anteriores al momento de lectura.
```

| Candidato | Tipo | Clasificación | Justificación |
|---|---|---|---|
| Edge Function con tres `from().select()` independientes | EF | `BEST_EFFORT_MULTI_QUERY_SNAPSHOT` | Tres peticiones REST/HTTP separadas, cada una con su propio snapshot READ COMMITTED de PostgreSQL. |
| Edge Function que invoca una PostgreSQL RPC interna | EF + RPC | Depende de la RPC (ver abajo) | La EF es solo el wrapper HTTP; la atomicidad depende de la función SQL invocada. |
| PostgreSQL RPC con `READ COMMITTED` (default) | RPC SQL | `BEST_EFFORT_MULTI_QUERY_SNAPSHOT` | Cada instrucción SQL dentro de la función ve el snapshot en el momento de su ejecución, no un snapshot compartido. |
| PostgreSQL RPC con `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ` | RPC SQL | `ATOMIC_DATABASE_SNAPSHOT` | Todas las instrucciones de la transacción comparten el mismo snapshot MVCC. Ningún cambio concurrente es visible entre las tres consultas. |
| Read model neutral (tabla derivada) | Tabla / vista | `PRECOMPUTED_READ_MODEL_SNAPSHOT` | Lee el estado calculado en un momento anterior. No refleja cambios en tiempo real. |

**Análisis TOCTOU por candidato:**

| Candidato | TOCTOU interno | TOCTOU entre gates | Fallo parcial |
|---|---|---|---|
| EF tres consultas | Presente entre cada par de consultas | Alto — tres snapshots distintos | Segundo SELECT puede fallar independientemente del primero |
| RPC READ COMMITTED | Presente entre instrucciones de la función | Bajo — misma sesión, latencia mínima | La función puede abortar a mitad → error técnico claro |
| RPC REPEATABLE READ | Ninguno | Ninguno — mismo snapshot | La función puede abortar si detecta conflicto de serialización |
| Read model | Lectura de estado pasado | N/A — una sola lectura | La tabla derivada puede estar desactualizada |

---

## 12. Posibilidad de snapshot atómico

Un snapshot verdaderamente atómico requiere que las tres lecturas (Gate 1, Gate 2/3) compartan el mismo snapshot MVCC de PostgreSQL. Esto solo es posible mediante una **PostgreSQL RPC** con nivel de aislamiento `REPEATABLE READ` o superior.

Una Edge Function que ejecuta tres consultas separadas nunca produce `ATOMIC_DATABASE_SNAPSHOT`, aunque todas las consultas se ejecuten en la misma llamada HTTP.

**Riesgos residuales (TOCTOU aceptable vs crítico):**

| Riesgo | Severidad | Gestión |
|---|---|---|
| Tenant desactiva suscripción entre Gate 1 y Gate 3 | Bajo — activaciones son eventos lentos; ventana de milisegundos | Acceptable para operaciones no financieras |
| Fallo parcial → FEATURE_DISABLED incorrecto | Alto — prohibido por SI-P4A invariante §8 | Debe propagarse como DEPENDENCY_UNAVAILABLE |
| Cross-tenant | Ninguno — todas las queries filtran por client_account_id | N/A |

---

## 13. Proyecto Supabase y service_role

### Proyecto único — evidencia directa

**Fichero:** `supabase/config.toml` (auditado)
```toml
project_id = "smartroom-rental"
```

**Conclusión:** Existe **un único proyecto Supabase**. En Supabase, un proyecto tiene una única base de datos PostgreSQL y una única variable de entorno `SUPABASE_SERVICE_ROLE_KEY`.

### Número de claves service_role demostrado

**1 (una).**

Todas las Edge Functions del proyecto — tanto las de SmartConversations (`conv-core-*`), como las de SmartLock (`sal-*`), como las futuras de SmartIncidents — comparten la **misma variable** `SUPABASE_SERVICE_ROLE_KEY` leída desde el entorno Deno. No existen credenciales técnicamente distintas por módulo.

**Evidencia:** `conv-core-get-tenant-features/index.ts` (auditado):
```typescript
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
```
El nombre de la variable es idéntico en todas las EFs del repositorio.

### Significado real de "service_role por módulo"

"service_role de SC" y "service_role de SI" son **designaciones documentales** (por convención de arquitectura), no credenciales técnicamente distintas. No existe un mecanismo de credenciales separado por módulo en este proyecto Supabase.

La separación es **puramente convencional**:
- Se enforcea mediante revisión de código y reglas documentales (rules-80 §4.5-4.6)
- No existe aislamiento técnico de credenciales entre módulos
- Cualquier EF que use `SUPABASE_SERVICE_ROLE_KEY` tiene la misma capacidad de bypassar toda RLS sobre todas las tablas del proyecto

### Riesgo de bypass RLS con service_role

Una EF que instancia un cliente Supabase con `service_role` bypassa toda la RLS del proyecto, incluyendo las tablas `conv_*`. Esto significa:

- Técnicamente, una EF de SI podría leer `conv_service_activations` usando service_role
- La prohibición en rules-80 §4.6 es **normativa**, no técnica
- La enforceabilidad depende de revisión de código y CI, no de una barrera de credenciales
- Este riesgo es sistémico en el diseño monoproyecto actual

### Análisis SECURITY INVOKER / SECURITY DEFINER para PostgreSQL RPC

Si se implementara una **PostgreSQL RPC** (función SQL) en lugar de una EF:

| Modo | Mecanismo | Implicaciones |
|---|---|---|
| `SECURITY INVOKER` | La función usa los privilegios del llamador (normalmente service_role via PostgREST) | Si el llamador es service_role, bypassa RLS igualmente. Si el llamador es `authenticated`, respeta RLS. |
| `SECURITY DEFINER` | La función usa los privilegios de su propietario (el usuario que creó la función) | Permite que un llamador con privilegios reducidos ejecute operaciones que el propietario tiene permitidas. Es el mecanismo para "elevar" privilegios de forma controlada. Requiere `SET search_path = ''` para prevenir ataques de sustitución. |

**Para el caso de entitlement:**

Si la RPC necesita leer `conv_service_activations` (que tiene `service_role only` RLS) y `saas_service_subscriptions` (con RLS para admin/superadmin), la RPC deberá ser `SECURITY DEFINER` con propietario que tenga permisos sobre ambas tablas — o bien el llamador deberá ser service_role.

**Grants mínimos conceptualmente requeridos para una RPC SECURITY DEFINER:**

```sql
-- Función owned por el usuario de migración (ej: postgres):
REVOKE EXECUTE ON FUNCTION get_incident_entitlement_snapshot FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_incident_entitlement_snapshot TO service_role;
-- SET search_path = '' dentro de la función para prevenir sustitución.
-- La función internamente selecciona de saas_service_subscriptions y conv_service_activations.
-- El propietario (postgres/migration user) tiene acceso bypassando RLS.
```

**Problema:** Una función SQL que accede a tablas de SC (`conv_*`) y tablas de Core (`saas_service_subscriptions`) crea acoplamiento a nivel de base de datos entre módulos, independientemente del SECURITY DEFINER. El dueño de la función tiene visibilidad sobre todas las tablas implicadas.

---

## 14. Modelo de seguridad encontrado (RLS)

| Tabla | RLS activa | FORCE RLS | Policy | Acceso EF directo posible |
|---|---|---|---|---|
| `saas_service_subscriptions` | Sí | No (migración 20260718000001) | superadmin (all), admin (select/insert/update), service_role (bypassrls) | Sí — con service_role (único en el proyecto) |
| `conv_service_activations` | Sí | Sí (migración 20260723000001) | service_role only | Sí — técnicamente, usando la misma service_role; prohibido por convention rules-80 §4.6 |
| `conv_wa_sessions` | Sí | Sí | service_role only | Idem |
| `conv_wc_configs` | Sí | Sí | service_role only | Idem |

---

## 15. Dependencias privadas detectadas

| Dependencia | Origen | Prohibición |
|---|---|---|
| `conv_service_activations` | SmartConversations | SI → tablas `conv_*` prohibido por convention (rules-80 §4.6); no es prohibición técnica de credenciales |
| `conv_wa_sessions` | SmartConversations | Mismo |
| `conv_wc_configs` | SmartConversations | Mismo |
| `service_code = 'conv_incidencias'` | Namespace interno de SC | SI no debe depender de identificadores privados de SC |

---

## 16. Referencias `conv_*` en código SI

En los ficheros de entitlement implementados en SI-P4A:
- `entitlement-types.ts`: 0 referencias a `conv_*` — verificado por test estructural SI-P4A Suite 6.
- `entitlement-port.ts`: 0 referencias a `conv_*`.
- `entitlement-policy.ts`: 0 referencias a `conv_*`.

---

## 17. Interfaces neutrales existentes

| Interfaz | Tipo | Owner | Cubre | Limitaciones para SI |
|---|---|---|---|---|
| `conv-core-get-tenant-features` | Edge Function (Deno HTTP) | SmartConversations | Gates 2+3 combinados (Level 2+3) como lista de canales por servicio; **NO** Gate 1 para `smart_incidents` | No es contrato formal para SI; no versionada para SI; diseñada para WF-10 de SC; tres SELECT sin transacción (BEST_EFFORT) |
| `conv-core-create-incident` | Edge Function | SmartConversations | Delegación de creación | No verifica entitlement de `smart_incidents` |
| `incidents-integration-port.ts` | Puerto TS | SmartConversations | Puerto SC→SI (escritura) | No incluye lectura de entitlement |

No existe ninguna interfaz neutral, versionada y documentada que exponga el snapshot de los tres gates a Smart Incidents.

---

## 18. Contrato documental existente

No existe ningún contrato documental formal entre Smart Incidents y SmartConversations (ni con Core) que defina la interfaz de consulta de entitlement. Los contratos existentes son del flujo de escritura o de uso interno de SC. Ninguno fue diseñado como contrato intermodular con SI.

---

## 19. Owner de cada hecho (FACT_OWNERSHIP_RESOLVED — SI-P4C1)

| Gate | Hecho | Tabla fuente (corregida) | Fact owner |
|---|---|---|---|
| Gate 1 | `smart_incidents_subscription_active` | `saas_service_subscriptions` | **Core** |
| Gate 2 | `incident_creation_capability_active` | `conv_service_activations` (`channel = source_channel`) — Level 3 channel-specific | **SmartConversations** |
| Gate 3 | `source_channel_active` | `conv_wa_sessions` o `conv_wc_configs` — Level 2 transport-only | **SmartConversations** |

Owner de la decisión: **Smart Incidents** (ver SI-P4C1 §5).

```
FACT_OWNERSHIP_RESOLVED
ENTITLEMENT_DECISION_OWNER_SMART_INCIDENTS
```

---

## 20. Evaluación de opciones de snapshot — Owner del snapshot completo

Se evalúan cuatro opciones. La asignación de owner a SmartConversations NO se cierra automáticamente por mayoría de gates. El owner del snapshot es el módulo/capa que puede obtener los tres gates de forma coherente y exponer una interfaz neutral.

### Opción A — Core/platform-owned entitlement orchestrator

**Descripción:** Core obtiene Gate 1 directamente y consume una interfaz neutral de SmartConversations para Gates 2+3.

**Cómo funcionaría:**
1. Core tiene acceso propio a `saas_service_subscriptions` (es su tabla) → Gate 1 directo.
2. SC expone una interfaz neutral (EF o RPC) que devuelve solo los dos booleanos de Gates 2+3 para un tenant + canal.
3. Core combina los tres valores y los expone a SI.

**Ventajas:**
- Gate 1 es nativo para Core.
- Core no accede a `conv_*` directamente.
- SI solo tiene un punto de llamada (Core).

**Desventajas y evidencia:**
- Core no tiene actualmente ninguna interfaz tipo "orchestrator de entitlement de add-ons conversacionales".
- Requeriría que SC exponga un nuevo contrato neutral para Gates 2+3 orientado a Core (no existe).
- Introduce un intermediario adicional (Core) que no agrega valor semántico.
- La atomicidad sería `BEST_EFFORT_MULTI_QUERY_SNAPSHOT` si Core hace dos llamadas separadas (Gate 1 local + EF de SC para Gates 2+3). Si Core invoca una única RPC que consulta las cuatro tablas, sería posible `ATOMIC_DATABASE_SNAPSHOT` con REPEATABLE READ — pero implica que Core tiene visibilidad sobre `conv_*` a nivel de DB.
- No hay evidencia en el repositorio de que Core sea o deba ser un orchestrator de este tipo.

**Estado:** DESCARTABLE — no hay evidencia de que Core sea la capa adecuada. Requiere nuevo contrato SC→Core no documentado.

---

### Opción B — PostgreSQL RPC neutral (cross-module DB function)

**Descripción:** Una función SQL SECURITY DEFINER en una capa neutral/plataforma que consulta `saas_service_subscriptions` (Core) y `conv_service_activations` + tablas Level 2 (SC) en la misma transacción.

**Cómo funcionaría:**
```sql
CREATE FUNCTION get_incident_entitlement_snapshot(
  p_client_account_id uuid,
  p_channel text
) RETURNS TABLE (...) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- En REPEATABLE READ → ATOMIC_DATABASE_SNAPSHOT
  -- Gate 1: saas_service_subscriptions
  -- Gate 2 (derivado): cualquier fila activa para conv_incidencias
  -- Gate 3: fila específica + Level 2
END;
$$;
```

**Ventajas:**
- Con `REPEATABLE READ`, produce `ATOMIC_DATABASE_SNAPSHOT`.
- Una sola invocación desde la EF llamante.
- No expone `SUPABASE_SERVICE_ROLE_KEY` adicional.

**Desventajas y evidencia:**
- No existe actualmente ninguna capa "neutral/plataforma" en el repositorio. Todas las tablas pertenecen a módulos específicos (Core = `saas_*`, SC = `conv_*`).
- La función SQL necesita ser propietaria/tener acceso a tablas de dos módulos distintos → acoplamiento a nivel de base de datos.
- La función debe tener acceso a `conv_*` que tienen `service_role only` RLS + FORCE RLS. Para ello, el propietario de la función debe ser el superuser de Postgres o tener bypassrls, lo que otorga acceso total a todas las tablas.
- La interdependencia modular a nivel de SQL es difícil de auditar y de versionar (un cambio de esquema en `conv_*` afecta la función).
- No hay owner neutral definido en el repositorio que pueda alojar esta función.
- Requeriría nueva migración y decisión de arquitectura formal.

**Atomicidad:** `ATOMIC_DATABASE_SNAPSHOT` si usa `REPEATABLE READ` explícito; `BEST_EFFORT_MULTI_QUERY_SNAPSHOT` si usa el default `READ COMMITTED`.

**Estado:** REQUIERE_DECISIÓN_ARQUITECTURA — no hay owner neutral documentado. Crea acoplamiento DB entre módulos.

---

### Opción C — Dos contratos neutrales + agregación en SI

**Descripción:** Core expone Gate 1 (interface sobre `saas_service_subscriptions`). SC expone Gates 2+3 (interface sobre `conv_*`). SI llama a ambos y agrega los resultados.

**Cómo funcionaría:**
1. SI llama al contrato de Core para Gate 1 → resultado: `{ smart_incidents_subscription_active: boolean }`.
2. SI llama al contrato de SC para Gates 2+3 → resultado: `{ incident_creation_capability_active: boolean, source_channel_active: boolean }`.
3. SI agrega los tres booleanos internamente con la política AND.

**Atomicidad:** `BEST_EFFORT_MULTI_QUERY_SNAPSHOT` — dos llamadas de red. TOCTOU presente entre Gates 1 y 2+3.

**Gestión de fallos parciales:**
- Si Gate 1 falla (DEPENDENCY_UNAVAILABLE): SI no puede saber si la suscripción está activa → debe propagar DEPENDENCY_UNAVAILABLE, nunca FEATURE_DISABLED. Está alineado con el invariante de SI-P4A.
- Si Gates 2+3 fallan: Idem.
- Si Gate 1 es false: fail-fast (no se llama a SC para Gates 2+3). Reduce carga, pero el TOCTOU persiste si Gate 1 es true.

**Ventajas:**
- Mantiene separación de módulos: Core no conoce `conv_*`, SC no orquesta para Core.
- Cada módulo expone solo su propio dominio.
- SI es el único punto de agregación.
- No requiere un tercer módulo/capa neutral.

**Desventajas:**
- No atómica.
- Requiere dos contratos nuevos (uno de Core, uno de SC), ninguno de los cuales existe hoy.
- Complejidad del adapter de SI aumenta (dos puertos, dos políticas de fallo).
- El TOCTOU es bajo en práctica (activaciones son eventos lentos) pero no es cero.

**Estado:** EVALUABLE — no atómica pero técnicamente correcta si el TOCTOU es aceptable. Requiere decisión de arquitectura sobre si la atomicidad es requisito estricto.

---

### Opción D — Read model neutral Core/platform-owned

**Descripción:** Los owners (Core y SC) publican cambios de estado en una tabla derivada (read model) que SI consume con una única lectura.

**Cómo funcionaría:**
1. Cuando `saas_service_subscriptions` cambia de estado para `smart_incidents`, un trigger/proceso actualiza el read model.
2. Cuando `conv_service_activations` o `conv_wa_sessions` / `conv_wc_configs` cambian, idem.
3. SI lee el read model con una consulta simple: `PRECOMPUTED_READ_MODEL_SNAPSHOT`.

**Ventajas:**
- SI solo necesita leer una tabla → interfaz más sencilla.
- Sin TOCTOU en el momento de la lectura.
- Desacoplado de los esquemas internos de Core y SC.

**Desventajas:**
- Estado potencialmente desactualizado entre la fuente y el read model (lag de replicación/trigger).
- Requiere nueva tabla y nuevos triggers/procesos para mantenerla actualizada → nueva migración.
- El owner del read model y el proceso de actualización no están definidos en el repositorio.
- Complejidad de mantener consistencia entre múltiples fuentes de verdad.

**Estado:** REQUIERE_DISEÑO_COMPLETO — no hay read model ni proceso de actualización en el repositorio. Podría ser viable a largo plazo.

---

## 21. Opción arquitectónica seleccionada (SI-P4C1)

```
OPTION_C_REFINED_SELECTED
```

Ver SI-P4C1 §6-§7 para evaluación completa de las cuatro opciones y justificación de la selección.

**Resumen de la decisión:** Dos contratos de hechos independientes (Core → SI para Gate 1; SC → SI para Gates 2+3). Smart Incidents compone los tres booleanos y aplica la política AND de SI-P4A. No se requiere RPC cross-module. No se requiere capa neutral. Consistencia: `BEST_EFFORT_CROSS_SOURCE_SNAPSHOT_ACCEPTED`.

---

## 22. Input recomendado (si se resuelve owner)

```typescript
{
  client_account_id: string;   // UUID del tenant
  operation: "create_incident";
  source_channel: "whatsapp" | "webchat";
}
```

Coincide con `IncidentEntitlementCheckRequest` de SI-P4A.

---

## 23. Output recomendado (política v1)

**Output en caso de éxito:**
```typescript
{
  smart_incidents_subscription_active: boolean;
  incident_creation_capability_active: boolean;  // Gate 2 = Level 3 channel-specific (SI-P4C1)
  source_channel_active: boolean;               // Gate 3 = Level 2 transport-only (SI-P4C1)
}
```

**Output en caso de fallo técnico:** El mecanismo exacto depende del candidato de implementación (RPC o EF), pero el consumidor (adapter de SI) siempre debe recibir suficiente información para distinguir fallo técnico de ausencia de configuración.

**Política de `additionalProperties`:**

Si el consumidor (adapter de SI) valida el output con `additionalProperties: false` (schema estricto):
- Añadir cualquier campo nuevo es **breaking change** → nueva versión obligatoria.

Si el consumidor acepta campos adicionales desconocidos (schema permisivo):
- Añadir campos opcionales sin cambio de semántica es **non-breaking** → compatible en v1.

El contrato v1 debe declarar explícitamente cuál de los dos casos aplica antes de diseñarse.

**Cambios siempre breaking (independientemente de `additionalProperties`):**

| Cambio | Motivo |
|---|---|
| Cambiar semántica de un booleano | Puede invertir decisiones de política en SI |
| Añadir gate obligatorio | Amplía el modelo de tres a N gates; SI-P4A espera exactamente tres campos |
| Eliminar campo | SI deja de recibir información que esperaba |
| Cambiar tipo de campo | Error de runtime en el adapter de SI |
| Cambiar política de ausencia (false→error o error→false) | Cambia el comportamiento observable de entitlement |
| Fusionar fallo técnico con `false` | Viola el invariante DEPENDENCY_UNAVAILABLE ≠ FEATURE_DISABLED de SI-P4A |
| Cambiar owner del contrato | Requiere decisión de arquitectura formal |

---

## 24. Tratamiento de ausencias — distinción semántica completa

Se distinguen cuatro tipos de ausencia con semántica diferente:

### A. Ausencia de suscripción para el tenant

**Situación:** `saas_services.code = 'smart_incidents'` existe en el catálogo global, pero no hay fila en `saas_service_subscriptions` para este `client_account_id`.

**Semántica:** El tenant no ha contratado el add-on.

**Resultado:** `smart_incidents_subscription_active = false` — no es error técnico. Es una ausencia de configuración esperada y semánticamente válida.

### B. Servicio global `smart_incidents` inexistente en el catálogo

**Situación:** No existe `saas_services` con `code = 'smart_incidents'`.

**Semántica:** El catálogo global está incompleto o corrupto. No es una ausencia de configuración del tenant: es un problema de integridad de la plataforma.

**Resultado:** `INTERNAL_ERROR` — nunca `false` silencioso, nunca `FEATURE_DISABLED`. Un servicio no registrado en el catálogo global indica un error de plataforma, no una decisión de configuración del tenant.

### C. Ausencia de configuración de `conv_incidencias` para el tenant

**Situación:** No hay filas activas en `conv_service_activations` con `service_code = 'conv_incidencias'` para el tenant (para ningún canal).

**Semántica:** El tenant no ha habilitado la integración conversacional de incidencias.

**Resultado:** `incident_creation_capability_active = false` y `source_channel_active = false` — no es error técnico.

### D. Ausencia de configuración de canal específico

**Situación:** No hay fila en `conv_service_activations` para el canal solicitado, o Level 2 para ese canal está inactivo.

**Semántica:** El canal solicitado no está habilitado para este tenant.

**Resultado:** `source_channel_active = false` — no es error técnico.

### E. Fallo técnico de infraestructura

**Situación:** Error de conexión, timeout, respuesta malformada, excepción no controlada.

**Resultado:** `DEPENDENCY_UNAVAILABLE` — NUNCA `false`, NUNCA `FEATURE_DISABLED`. Un fallo técnico no es una decisión de política.

### Aplicación al adapter futuro

| Caso | Gate afectado | Resultado | Tipo |
|---|---|---|---|
| Sin fila en `saas_service_subscriptions` | Gate 1 | `false` | Ausencia esperada |
| `saas_services.code = 'smart_incidents'` no existe | Gate 1 | `INTERNAL_ERROR` | Error de plataforma |
| Sin filas en `conv_service_activations` para `conv_incidencias` | Gates 2+3 | `false` para ambos | Ausencia esperada |
| Fila de canal solicitado no encontrada o L2 inactivo | Gate 3 | `false` | Ausencia esperada |
| Error BD, timeout, EF caída | Cualquier gate | `DEPENDENCY_UNAVAILABLE` | Fallo técnico |

---

## 25. Matriz de evidencia

### Gate 1

| Fuente | Owner | Neutral | Atomicidad | Evidencia | Accesibilidad SI |
|---|---|---|---|---|---|
| `saas_service_subscriptions` (code=`smart_incidents`, status=`active`) | Core | Sí | Depende del mecanismo de acceso | VERIFIED — rules-10 §4.2, migr. 20260718000001 | Con service_role (única clave del proyecto) |

### Gate 2 (Level 3 channel-specific — definición corregida SI-P4C1)

| Fuente | Owner | Neutral | Atomicidad | Evidencia | Accesibilidad SI |
|---|---|---|---|---|---|
| `conv_service_activations` (service_code=`conv_incidencias`, channel=source_channel, is_active=true) | SmartConversations | No — requiere contrato SC→SI (SI-P4C2B) | BEST_EFFORT por contrato EF | VERIFIED — esquema migr. 20260716000001; GATE_2_GATE_3_SEMANTICS_RESOLVED | Prohibida directamente (rules-80 §4.6). Acceso vía contrato SC→SI |

### Gate 3 (Level 2 transport-only — definición corregida SI-P4C1)

| Fuente | Owner | Neutral | Atomicidad | Evidencia | Accesibilidad SI |
|---|---|---|---|---|---|
| `conv_wa_sessions.status='active'` (WA) | SmartConversations | No — requiere contrato SC→SI (SI-P4C2B) | BEST_EFFORT | VERIFIED — migr. 20260716000001, rules-20 §4.4 | Prohibida directamente. Acceso vía contrato SC→SI |
| `conv_wc_configs.is_active=true` (WC) | SmartConversations | No — requiere contrato SC→SI (SI-P4C2B) | BEST_EFFORT | VERIFIED — migr. 20260716000001, rules-20 §4.7 | Prohibida directamente. Acceso vía contrato SC→SI |

---

## 26. Contradicciones restantes

### Contradicción C-001 — GATE_2_GATE_3_MODEL_CONTRADICTION → **RESUELTA (SI-P4C1)**

**Resolución:** La definición de Gate 2 se corrigió a channel-specific (Level 3, canal solicitado). La definición de Gate 3 se corrigió a transport-only (Level 2). Las dos condiciones son independientes: tablas distintas, condiciones distintas. Las cuatro combinaciones booleanas son representables. Ver SI-P4C1 §3.

### Contradicción C-002 — OWNER_DECISION_PENDING → **RESUELTA (SI-P4C1)**

**Resolución:** Seleccionada OPTION_C_REFINED. Fact owners: Core (Gate 1), SmartConversations (Gates 2+3). Decision owner: Smart Incidents. No se requiere capa neutral única. Ver SI-P4C1 §4-§7.

### Contradicción C-003 — service_role no aislada por módulo (INFORMATIVA)

**Descripción:** "service_role de SC" y "service_role de SI" son la misma credencial técnica (`ONE_SHARED_SUPABASE_SERVICE_ROLE`). La separación es puramente convencional.

**Estado:** No bloqueante. Documentado en SI-P4C1 §13. Mitigado por contratos explícitos y tests estructurales.

### Contradicción C-004 — conv-core-get-tenant-features no incluye Gate 1 (INFORMATIVA)

**Descripción:** La EF existente no lee `saas_service_subscriptions` para `smart_incidents`. No es reutilizable como fuente completa de gates para SI.

**Estado:** No bloqueante. Confirmado como restricción; resuelto por diseño de nuevos contratos en SI-P4C2A/SI-P4C2B.

---

## 27. Inferencias pendientes de verificación

| ID | Inferencia | Razón de pendencia |
|---|---|---|
| INF-001 | `saas_services` tiene un registro con `code = 'smart_incidents'` en la base de datos de producción | No hay seed ni migración específica. Inferido por analogía con `smart_access_lock`. |
| INF-002 | El proceso de alta de `smart_incidents` en `saas_service_subscriptions` está documentado fuera del repositorio auditado | No hay EF equivalente a `conv-activate-subscription` para `smart_incidents`. |
| INF-003 | `conv_service_activations` tendría filas con `service_code = 'conv_incidencias'` para tenants con integración activa | Inferido del esquema y `conv-core-get-tenant-features`. Sin seed de datos de prueba. |
| INF-004 | (RESUELTA) GATE_2_GATE_3_MODEL_CONTRADICTION resuelta por corrección semántica channel-specific en SI-P4C1. No se requiere cambio de esquema. | — |

---

## 28. Decisión de arquitectura

Ver `incident-entitlement-si-p4c1-architecture-decision.md` para la decisión completa.

**Estados cerrados en SI-P4C1:**
```
GATE_2_GATE_3_SEMANTICS_RESOLVED
FACT_OWNERSHIP_RESOLVED
ENTITLEMENT_DECISION_OWNER_SMART_INCIDENTS
BEST_EFFORT_CROSS_SOURCE_SNAPSHOT_ACCEPTED
TWO_VERSIONED_FACT_CONTRACTS_REQUIRED
OPTION_C_REFINED_SELECTED
ENTITLEMENT_ARCHITECTURE_SELECTED
```

---

## 29. Resumen de la decisión arquitectónica

La arquitectura seleccionada (OPTION_C_REFINED) requiere dos contratos de hechos:

1. **Core → SI:** expone `smart_incidents_subscription_active`.
2. **SC → SI:** expone `incident_creation_capability_active` y `source_channel_active`.

Smart Incidents compone los tres booleanos y aplica `evaluateIncidentEntitlement` (SI-P4A). No se requiere RPC cross-module ni capa neutral. La consistencia es `BEST_EFFORT_CROSS_SOURCE_SNAPSHOT`.

---

## 30. Rutas de los contratos (OPTION_C_REFINED_SELECTED — SI-P4C1)

Las rutas definitivas de los dos contratos intermodulares son:

```
docs/core/integrations/smart-incidents-entitlement/v1/contract-subscription-fact.md
docs/smart-conversations/integrations/smart-incidents-entitlement/v1/contract-incident-channel-facts.md
```

Cada contrato es:
- Un único `.md` canónico por versión
- Versionado por carpeta (`v1/`, `v2/`)
- Visible para agentes como contrato/skill del módulo propietario
- Independiente de los nombres de tablas internas de cada módulo
- Nueva versión (nueva carpeta) ante cualquier breaking change

Los contratos no se crean en este sublote. Se crean en SI-P4C2A y SI-P4C2B respectivamente.

---

## 31. Siguiente sublote

SI-P4C1 cerró la arquitectura. Los siguientes sublotes son:

| Sublote | Objetivo |
|---|---|
| **SI-P4C2A** | Diseño del contrato Core → Smart Incidents (`contract-subscription-fact.md`) |
| **SI-P4C2B** | Diseño del contrato SC → Smart Incidents (`contract-incident-channel-facts.md`) |
| Revisión cruzada | Revisión por owners (Core team + SC team) |
| **SI-P4D** | Adapter concreto de SI que implementa `IncidentEntitlementPort` con los dos contratos |
| **SI-P4E** | Integración del adapter en el handler HTTP de SI |

---

## 32. Confirmaciones de no implementación

| Ítem | Confirmación |
|---|---|
| No se creó código | ✓ Ningún fichero `.ts`, `.js`, `.sql` nuevo |
| No se creó adapter | ✓ Sin adapter en `supabase/functions/_shared/smart-incidents/` |
| No se creó RPC | ✓ Sin `CREATE FUNCTION` en ninguna migración |
| No se creó Edge Function | ✓ Sin `Deno.serve` ni directorio nuevo en `supabase/functions/` |
| No se crearon migraciones | ✓ Sin ficheros en `supabase/migrations/` |
| No se creó read model | ✓ Sin vistas ni tablas derivadas |
| No se modificó SI-P4A | ✓ `entitlement-types.ts`, `entitlement-port.ts`, `entitlement-policy.ts` sin cambios |
| No se integró entitlement en HTTP | ✓ `http-handler.ts` sin cambios |
| No se utilizó service_role | ✓ Sin lectura de `SUPABASE_SERVICE_ROLE_KEY` en este sublote |
| No se modificó SmartConversations | ✓ Sin cambios en `supabase/functions/conv-*` ni en `docs/smart-conversations/` |
| No se modificó Core | ✓ Sin cambios en tablas Core ni en documentación Core |
| No se modificó SmartLock | ✓ Sin cambios en `sal-*` |
| No hubo deploy | ✓ Sin `supabase functions deploy` |

---

## 33. Git status final

La única modificación atribuible a este lote (SI-P4B y su corrección SI-P4B-REV1) es la creación de este informe:

```
?? docs/smart-incidents/integration/incident-entitlement-si-p4b-source-audit.md
```

Todos los demás cambios listados en el baseline son preexistentes al inicio de este sublote.
