# ADR-004: Edge Functions para Lógica de Negocio

**Estado:** ⚠️ PARCIALMENTE SUPERSEDIDO — ver sección "Revisión 2026-04-02"  
**Fecha:** 2026-02-15 (estimado)  
**Decisores:** Staff Engineer, Backend Lead  

---

## Contexto

SmartRoom Rental necesita implementar lógica de negocio compleja que incluye:
- Validación de límites de plan
- Creación de recursos con reglas de negocio
- Procesamiento de pagos con Stripe
- Onboarding de nuevos clientes
- Gestión de estados con transiciones complejas

**Opciones disponibles:**
1. Lógica en frontend (React)
2. Lógica en base de datos (Triggers/Functions PostgreSQL)
3. Lógica en Edge Functions (Serverless)
4. Backend tradicional (Node.js/Express)

**Restricciones:**
- Equipo pequeño (1-2 desarrolladores)
- Necesidad de seguridad robusta
- Escalabilidad
- Tiempo de desarrollo limitado

---

## Decisión

**Implementar toda la lógica de negocio crítica en Edge Functions de Supabase.**

**Patrón Edge-First:**
- **Escrituras:** Siempre por Edge Functions
- **Lecturas:** Directas con RLS (ANON key)
- **Lógica de negocio:** En Edge Functions
- **Validaciones simples:** En frontend (UX)

**Implementación:**
```typescript
// ❌ INCORRECTO: Escritura directa desde frontend
await supabase.from("accommodations").insert(payload);

// ✅ CORRECTO: Escritura por Edge Function
await invokeWithAuth("manage_accommodation", { 
  action: "create", 
  payload 
});
```

---

## Consecuencias

### Positivas ✅

- **Seguridad:** Lógica de negocio no puede bypassearse desde frontend
- **Validación centralizada:** Una sola fuente de verdad para reglas
- **Límites de plan:** Validados en servidor, imposible de evadir
- **Auditoría:** Todas las operaciones críticas pasan por Edge Functions
- **Escalabilidad:** Serverless escala automáticamente
- **Mantenibilidad:** Lógica de negocio en un solo lugar
- **Testing:** Más fácil testear lógica aislada

### Negativas ❌

- **Latencia adicional:** Request extra vs escritura directa
- **Complejidad:** Más código que mantener
- **Debugging:** Más difícil que lógica en frontend
- **Deno vs Node.js:** Ecosistema más limitado
- **Cold starts:** Latencia inicial en funciones inactivas
- **Costo:** Invocaciones cuentan contra límites de plan

### Neutras ℹ️

- **Desarrollo:** Requiere conocimiento de Deno
- **Deploy:** Proceso adicional para Edge Functions
- **Monitoreo:** Logs separados de frontend

---

## Alternativas Consideradas

### Alternativa A: Lógica en Frontend

**Descripción:** Implementar validaciones y lógica de negocio en React.

**Pros:**
- Desarrollo más rápido
- Menos latencia
- Feedback inmediato al usuario
- Más simple de debuggear

**Contras:**
- **Seguridad crítica:** Usuario puede bypassear validaciones
- **Límites de plan:** Fácil de evadir
- **Inconsistencia:** Lógica duplicada si hay múltiples clientes
- **Auditoría:** Difícil de rastrear operaciones

**Por qué se descartó:** Riesgo de seguridad inaceptable. Usuario malicioso podría crear recursos ilimitados, bypassear límites de plan, etc.

---

### Alternativa B: Lógica en PostgreSQL (Triggers/Functions)

**Descripción:** Usar triggers y stored procedures para lógica de negocio.

**Pros:**
- Muy rápido (sin latencia de red)
- Garantizado a nivel de BD
- Imposible de bypassear

**Contras:**
- **Complejidad:** PL/pgSQL es difícil de mantener
- **Testing:** Difícil de testear triggers
- **Debugging:** Muy complicado
- **Versionado:** Migraciones complejas
- **Lógica externa:** Difícil integrar con Stripe, APIs externas

**Por qué se descartó:** Demasiado complejo para equipo pequeño. Difícil de mantener y testear. No adecuado para integraciones externas (Stripe).

---

### Alternativa C: Backend Tradicional (Node.js/Express)

**Descripción:** Desarrollar backend custom con Express/Fastify.

**Pros:**
- Control total
- Ecosistema Node.js completo
- Familiar para desarrolladores
- Fácil de debuggear

**Contras:**
- **Tiempo de desarrollo:** 4-6 semanas solo para MVP
- **Infraestructura:** Necesita hosting, load balancer, etc.
- **Escalabilidad:** Requiere configuración manual
- **Mantenimiento:** Servidor que mantener
- **Costo:** Hosting adicional

**Por qué se descartó:** Tiempo de desarrollo excesivo. Equipo pequeño no puede mantener infraestructura adicional. Supabase Edge Functions ofrece lo mismo sin overhead.

---

## Impacto

### Equipos Afectados
- **Frontend:** Usar `invokeWithAuth` para todas las escrituras
- **Backend:** Desarrollar Edge Functions en Deno
- **QA:** Tests de integración con Edge Functions
- **DevOps:** Deploy de Edge Functions

### Sistemas Afectados
- Todas las operaciones de escritura críticas
- Validaciones de límites de plan
- Procesamiento de pagos
- Onboarding

### Esfuerzo Estimado
- **Implementación:** 2 semanas (6 Edge Functions iniciales)
- **Migración:** N/A (proyecto nuevo)
- **Testing:** 1 semana

---

## Plan de Implementación

### Edge Functions Implementadas

1. ✅ **`wizard_submit`** - Onboarding completo
   - Crea client_account
   - Crea entities
   - Actualiza profile
   - Integra con Stripe

2. ✅ **`wizard_init`** - Inicializa sesión de wizard

3. ✅ **`whoami`** - Perfil completo + branding + plan

4. ✅ **`provision_client_account_superadmin`** - Provisión manual

5. ✅ **`stripe_webhook`** - Eventos de Stripe

6. ✅ **`manage_lodger`** - CRUD inquilinos + invitación

### Edge Functions Planificadas

7. 📝 **`manage_accommodation`** - CRUD alojamientos
8. 📝 **`manage_room`** - CRUD habitaciones
9. 📝 **`manage_assignment`** - Asignaciones de habitaciones
10. 📝 **`manage_energy_bill`** - Facturas de energía
11. 📝 **`manage_settlement`** - Liquidaciones

### Wrapper en Frontend

```typescript
// services/supabaseInvoke.services.js

export const invokeWithAuth = async (functionName, payload) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('No session');
  }

  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  });

  if (error) {
    throw error;
  }

  return data;
};
```

**Criterios de Aceptación:**
- [x] 6 Edge Functions implementadas
- [x] Wrapper `invokeWithAuth` con retries
- [x] Validación de límites de plan
- [x] Integración con Stripe
- [x] Tests de integración
- [ ] Todas las escrituras por Edge Functions

---

## Validación de Seguridad

### Validaciones Obligatorias en Edge Functions

**1. Autenticación:**
```typescript
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
    status: 401 
  });
}
```

**2. Rol:**
```typescript
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('role, client_account_id')
  .eq('id', userId)
  .single();

if (!profile || profile.role !== 'admin') {
  return new Response(JSON.stringify({ error: 'Forbidden' }), { 
    status: 403 
  });
}
```

**3. Límites de Plan:**
```typescript
const { data: plan } = await supabaseAdmin
  .from('plans_catalog')
  .select('features')
  .eq('code', clientAccount.plan_code)
  .single();

const currentCount = await getCurrentEntityCount(clientAccountId);
const maxEntities = plan.features.max_owner_entities;

if (currentCount >= maxEntities) {
  return new Response(JSON.stringify({ 
    error: 'Plan limit exceeded',
    limit: maxEntities 
  }), { 
    status: 400 
  });
}
```

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Cold starts lentos | Media | Medio | Mantener funciones warm, optimizar código |
| Límites de invocaciones | Baja | Medio | Monitorear uso, upgrade plan si necesario |
| Bugs en lógica de negocio | Media | Alto | Tests exhaustivos, code review obligatorio |
| Deno ecosystem limitado | Baja | Bajo | Usar librerías estándar, evaluar antes de usar |

---

## Métricas de Éxito

### Performance
- **Latencia p95:** < 500ms
- **Cold start:** < 1s
- **Error rate:** < 1%

### Uso
- **Invocaciones/mes:** < 1M (plan gratuito: 2M)
- **Duración promedio:** < 200ms

### Calidad
- **Cobertura de tests:** > 80%
- **Bugs críticos:** 0

---

## Referencias

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Deno Runtime](https://deno.land/)
- `docs/architecture/backend.md` - Detalles de implementación
- `docs/architecture/security.md` - Validaciones de seguridad

---

## Notas Adicionales

**Decisión tomada en:** Fase de diseño del proyecto (Feb 2026)

**Resultado:** Edge Functions han funcionado excelentemente. Seguridad garantizada, lógica centralizada, fácil de mantener.

**Lecciones aprendidas:**
- `invokeWithAuth` wrapper con retries es esencial
- Circuit breaker previene cascading failures
- Validar límites de plan en TODAS las operaciones de creación
- Logs estructurados facilitan debugging
- Tests de integración son críticos

**Funciones más usadas:**
1. `whoami` - Cada carga de página
2. `manage_lodger` - CRUD inquilinos
3. `wizard_submit` - Onboarding

**Optimizaciones aplicadas:**
- Conexión a BD reutilizada
- Queries optimizadas con índices
- Response caching donde aplica
- Payload mínimo en requests

---

**Creado por:** Staff Engineer  
**Última actualización:** 2026-04-02  
**Revisores:** Backend Lead, Security Lead

---

## Revisión 2026-04-02 — Migración parcial a llamadas directas Supabase

**Decisión revisada:** La estrategia Edge-First se mantiene para operaciones que requieren service role o APIs externas, pero se abandona para operaciones que RLS puede gestionar por sí sola.

**Problema detectado:** Las edge functions provocaban errores 401 cuando el JWT del usuario expiraba. El `invokeWithAuth` wrapper intentaba refresh del token, pero si el refresh token también había caducado, el circuit breaker abría y forzaba logout — incluso en medio de formularios largos (BUG-047).

**Nueva regla:** Usar llamadas directas a Supabase siempre que RLS sea suficiente. Reservar edge functions **solo** para operaciones que requieren:
1. `auth.admin.createUser()` — service role key (imposible desde cliente)
2. APIs externas con secretos (Stripe, OpenAI)
3. Transacciones multi-tabla que RLS no puede garantizar

### Estado actualizado de edge functions

| Edge Function | Estado | Motivo para mantener / migrar |
|---|---|---|
| `manage_accommodation` | ✅ Migrada (2026-04-02) | RLS suficiente — BUG-047 |
| `manage_entity` | ✅ Migrada (2026-04-02) | RLS suficiente — BUG-049 |
| `wizard_init` | ✅ Migrada (2026-04-02) | Solo UPDATE en profiles — BUG-048 |
| `settle_energy_bill` | ✅ Ya no se usaba | Lógica reimplementada en cliente |
| `whoami` | ✅ Ya no se usaba | TenantProvider usa query directa |
| `manage_lodger` | 🔴 Permanece | Crea usuarios en Auth (service role) |
| `wizard_submit` | 🔴 Permanece | Auth creation + Stripe Checkout |
| `provision_client_account_superadmin` | 🔴 Permanece | Service role + solo superadmin |
| `scan_energy_bill` | 🔴 Permanece | OpenAI API key (server-side) |
| `stripe_webhook` | 🔴 Permanece | Webhook externo Stripe |
