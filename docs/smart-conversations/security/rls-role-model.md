# RLS Role Model — SmartConversations
<!-- Fase 11B2A · Verificación 2026-07-21 -->

> Modelo de roles PostgreSQL y su interacción con RLS en las tablas conv_*.
> No modifica SQL. No aplica cambios. Documenta el estado real verificado.

---

## 1. Roles relevantes en Supabase

| Rol | BYPASSRLS | Descripción | Quién lo usa |
|---|---|---|---|
| `postgres` | **SÍ** (superusuario) | Propietario de las tablas; acceso total | Migraciones, Supabase internals |
| `service_role` | **SÍ** (atributo BYPASSRLS) | Rol privilegiado sin JWT; accede al 100% de las tablas | Todas las EFs conv-* (verificado) |
| `authenticated` | No | Rol de usuario con JWT Supabase Auth | Dashboard admin, portales de tenants |
| `anon` | No | Rol sin autenticar | Visitantes sin sesión |
| `supabase_admin` | **SÍ** | Rol interno de Supabase | Supabase platform |

**Evidencia**: En Supabase, `service_role` tiene el atributo `BYPASSRLS = true` a nivel de rol PostgreSQL. Esto significa que este rol ignora completamente las políticas RLS, independientemente de si está activado ENABLE o FORCE ROW LEVEL SECURITY.

---

## 2. Propietario de tablas conv_*

El propietario de las tablas `conv_*` es el rol `postgres` (superusuario de Supabase). El rol `postgres` también tiene `BYPASSRLS` implícito por ser superusuario.

Las tablas fueron creadas en la migración `20260716000001_smart_conversations_core_schema.sql` sin `OWNER TO` explícito, por lo que pertenecen al rol que ejecutó la migración (postgres en Supabase).

---

## 3. Comportamiento real de RLS por rol

### 3.1 ENABLE ROW LEVEL SECURITY (estado actual)

| Actor | RLS activo afecta | Motivo |
|---|---|---|
| `anon` | **SÍ** — bloqueado sin policy compatible | Sin BYPASSRLS; RLS aplica |
| `authenticated` | **SÍ** — bloqueado sin policy compatible | Sin BYPASSRLS; RLS aplica |
| `service_role` | **NO** — pasa directo | BYPASSRLS = true |
| `postgres` | **NO** — pasa directo | Superusuario; BYPASSRLS implícito |

Con la política actual (`FOR ALL TO service_role USING (true)`), `anon` y `authenticated` quedan bloqueados porque no tienen ninguna policy que les permita acceso.

### 3.2 FORCE ROW LEVEL SECURITY — análisis real

`FORCE ROW LEVEL SECURITY` impide que el **propietario de la tabla** se salte RLS mediante `SET row_security = OFF`. Solo afecta a roles sin `BYPASSRLS`.

| Actor | FORCE RLS cambia algo | Motivo |
|---|---|---|
| `anon` | No (ya bloqueado con ENABLE RLS) | Sin BYPASSRLS; ya aplica |
| `authenticated` | No (ya bloqueado con ENABLE RLS) | Sin BYPASSRLS; ya aplica |
| `service_role` | **NO** | BYPASSRLS = true → FORCE RLS irrelevante |
| `postgres` (propietario) | Teóricamente SÍ — no podría hacer `SET row_security = OFF` | Pero postgres tiene BYPASSRLS de todas formas |

**Conclusión crítica**: En el entorno Supabase actual, `FORCE ROW LEVEL SECURITY` **NO aporta protección adicional** frente a los actores principales (`service_role`, `postgres`) porque ambos tienen `BYPASSRLS`. Solo prevendría un escenario hipotético en el que `postgres` usara `SET row_security = OFF` explícitamente — lo cual en Supabase no es un vector de ataque real (el acceso SQL directo al postgres role requiere credenciales de la instancia).

---

## 4. Re-evaluación de SEC-001

### Estado anterior (Fase 11B1)
- SEC-001 clasificado como `HIGH (potencial CRITICAL)`
- Argumento: FORCE RLS ausente permite al propietario de tabla bypassar RLS

### Evidencia nueva (Fase 11B2A)
- `service_role` tiene `BYPASSRLS = true` → FORCE RLS irrelevante para él
- `postgres` tiene superusuario → FORCE RLS irrelevante para él
- Ningún otro rol tiene acceso directo a las tablas conv_*
- El vector de ataque (comprometer el rol postgres) requiere acceso a las credenciales de DB del proyecto Supabase — nivel de compromiso catastrófico independiente de FORCE RLS

### Decisión
**SEC-001: severity_changed** de HIGH a **LOW** (defense-in-depth teórica, sin impacto real en el modelo de amenazas de Supabase)

FORCE RLS **sí tiene valor** en entornos PostgreSQL self-hosted donde el propietario de tabla es un rol de aplicación sin BYPASSRLS. En Supabase, su valor es mínimo dado el modelo de roles.

El finding permanece `open` porque FORCE RLS sigue siendo buena práctica, pero su severidad correcta es **LOW** en este contexto.

---

## 5. Protección real multi-tenant

El aislamiento multi-tenant **no depende de RLS** sino de:

1. **Código en EF** — cada query incluye `client_account_id` en el filtro WHERE
2. **Validación de tenant** — verificación previa de que `client_account_id` corresponde a una entidad activa
3. **service_role en backend** — la key nunca sale del Deno Edge Runtime

### Ejemplo en conv-web-message:
```typescript
// La función verifica primero que el tenant existe
const { data: config } = await supabase
  .from('conv_wc_configs')
  .select('is_active')
  .eq('client_account_id', clientAccountId)  // filtro tenant
  .single();

// Luego verifica que la sesión pertenece al tenant
const { data: session } = await supabase
  .from('conv_sessions')
  .select('id, sender_ref, channel')
  .eq('id', sessionId)
  .eq('client_account_id', clientAccountId)  // filtro tenant + ownership
  .eq('channel', 'webchat')
  .single();
```

Esta protección es **código-dependiente**, no **DB-dependiente**. Si el código EF fallara (bug, inject), RLS con policy service_role-only no protegería porque service_role bypassa RLS.

---

## 6. SECURITY DEFINER — auditoría

### Función encontrada: `public.get_my_client_account_id()`

**Fichero**: `supabase/migrations/20260718000001_rls_saas_subscriptions_admin.sql:7-17`

```sql
CREATE OR REPLACE FUNCTION public.get_my_client_account_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public      -- ← FIJADO correctamente
STABLE
AS $$
  SELECT client_account_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;
```

**Evaluación de seguridad:**

| Check | Estado | Evidencia |
|---|---|---|
| `SET search_path` fijado | ✅ Seguro | `SET search_path = public` en línea 11 |
| SQL injection posible | ✅ No — SQL estático | `WHERE id = auth.uid()` sin concatenación |
| Escalation de privilegios | ✅ No | Solo lee `profiles.client_account_id` del usuario actual |
| GRANT EXECUTE scope | ⚠️ Solo `authenticated` | No es `anon` ni `service_role` |
| Tablas accedidas | `profiles` (no conv_*) | Sin impacto en modelo SC |
| Uso por EFs conv_* | ❌ No | No es referenciada desde ninguna EF conv-* |

**Conclusión**: La función `get_my_client_account_id()` es **SEGURA**. El `SET search_path = public` está correctamente fijado, previniendo SQL injection via search_path manipulation. La función es para el portal admin/saas, no para SmartConversations.

**Decisión sobre SEC-SECDEF-SP**: El warning del validator se elimina como falsa alarma. No se crea SEC-028.

---

## 7. Políticas actuales por tabla

| Tabla | Policy nombre | FOR | TO | USING | WITH CHECK |
|---|---|---|---|---|---|
| conv_service_activations | "conv_service_activations: service_role only" | ALL | service_role | true | true |
| conv_wa_sessions | "conv_wa_sessions: service_role only" | ALL | service_role | true | true |
| conv_wc_configs | "conv_wc_configs: service_role only" | ALL | service_role | true | true |
| conv_sessions | "conv_sessions: service_role only" | ALL | service_role | true | true |
| conv_cases | "conv_cases: service_role only" | ALL | service_role | true | true |
| conv_messages | "conv_messages: service_role only" | ALL | service_role | true | true |
| conv_send_queue | "conv_send_queue: service_role only" | ALL | service_role | true | true |
| conv_admin_notifications | "conv_admin_notifications: service_role only" | ALL | service_role | true | true |

**Efecto real de estas policies**: Bloquean `anon` y `authenticated`. No afectan a `service_role` (BYPASSRLS). Son correctas para el estado actual donde TODO el acceso es vía service_role en EFs.

---

## 8. Amenazas por capa

| Amenaza | Mitigada por | ¿RLS ayuda? |
|---|---|---|
| anon → acceso directo DB | Policy service_role-only bloquea anon | ✅ Sí |
| authenticated → acceso directo DB | Policy service_role-only bloquea authenticated | ✅ Sí |
| service_role comprometido | Nada (BYPASSRLS) | ❌ No |
| postgres comprometido | Nada (superusuario) | ❌ No |
| EF conv-* comprometida (bug/inject) | Nada (usa service_role) | ❌ No |
| Cross-tenant en EF | Filtros client_account_id en código | ❌ No (código, no DB) |
| JWT falso desde frontend | EF no acepta JWT frontend → usa service_role propio | N/A |
| Enumeración de sesiones de otro tenant | Filtro client_account_id en código | ❌ No (código, no DB) |

---

## Estado GATE_1

**GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING**

SEC-001 re-evaluado y actualizado. No se declara ningún gate aprobado.
