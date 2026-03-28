# ADR-003: Multi-Tenancy por Columna (client_account_id)

**Estado:** Aceptado  
**Fecha:** 2026-02-01 (estimado)  
**Decisores:** Staff Engineer, Database Architect  

---

## Contexto

SmartRoom Rental es una plataforma SaaS multi-tenant donde múltiples clientes (gestores de alojamientos) usan la misma aplicación pero con datos completamente aislados.

**Requisitos:**
- Aislamiento total de datos entre tenants
- Escalabilidad para cientos de tenants
- Una sola URL para todos los tenants
- Personalización por tenant (branding)
- Seguridad a nivel de base de datos

**Opciones de multi-tenancy:**
1. **Por base de datos:** Una BD por tenant
2. **Por esquema:** Un esquema PostgreSQL por tenant
3. **Por columna:** Una columna `client_account_id` en cada tabla

---

## Decisión

**Implementar multi-tenancy por columna usando `client_account_id` con Row Level Security (RLS) en PostgreSQL.**

**Implementación:**
- Todas las tablas tenant-owned tienen columna `client_account_id UUID NOT NULL`
- RLS habilitado en todas las tablas tenant-owned
- Helper functions: `get_my_client_account_id()` para obtener tenant del usuario
- Políticas RLS que filtran por `client_account_id = get_my_client_account_id()`
- Superadmin bypass RLS via funciones SECURITY DEFINER

---

## Consecuencias

### Positivas ✅

- **Simplicidad:** Una sola base de datos, fácil de mantener
- **Escalabilidad:** Soporta miles de tenants sin problemas
- **Costo:** Infraestructura compartida, más económico
- **Migraciones:** Una sola migración para todos los tenants
- **Backups:** Un solo backup para toda la plataforma
- **Queries cross-tenant:** Posibles para analytics (con permisos)
- **RLS nativo:** PostgreSQL garantiza aislamiento a nivel de BD

### Negativas ❌

- **RLS obligatoria:** Debe implementarse correctamente en todas las tablas
- **Performance:** Overhead de RLS en queries (mínimo pero existe)
- **Complejidad de queries:** Todas las queries deben incluir filtro de tenant
- **Riesgo de bugs:** Un bug en RLS puede exponer datos entre tenants
- **Límites compartidos:** Todos los tenants comparten límites de BD
- **No aislamiento físico:** Datos de todos los tenants en misma BD

### Neutras ℹ️

- **Testing:** Requiere tests específicos de aislamiento multi-tenant
- **Debugging:** Más complejo que BD separadas
- **Monitoreo:** Necesita monitoreo de performance de RLS

---

## Alternativas Consideradas

### Alternativa A: Multi-Tenancy por Base de Datos

**Descripción:** Una base de datos PostgreSQL por tenant.

**Pros:**
- Aislamiento físico total
- Performance predecible por tenant
- Fácil de escalar horizontalmente
- Backups independientes
- Migración de tenant simple (mover BD)

**Contras:**
- **Costo:** Infraestructura multiplicada por número de tenants
- **Complejidad:** Gestión de múltiples BDs
- **Migraciones:** Aplicar migración a cada BD individualmente
- **Connection pooling:** Complejo con muchas BDs
- **Límite de BDs:** PostgreSQL tiene límite práctico de ~100 BDs

**Por qué se descartó:** Costo prohibitivo para SaaS con muchos tenants pequeños. Complejidad operativa excesiva.

---

### Alternativa B: Multi-Tenancy por Esquema

**Descripción:** Un esquema PostgreSQL por tenant en la misma BD.

**Pros:**
- Aislamiento lógico
- Mejor que por columna en términos de aislamiento
- Una sola BD
- Backups centralizados

**Contras:**
- **Complejidad de queries:** Cambiar esquema por tenant
- **Connection pooling:** Complejo (search_path por conexión)
- **Migraciones:** Aplicar a cada esquema
- **Límite de esquemas:** PostgreSQL tiene límite práctico
- **Performance:** Overhead de cambio de esquema

**Por qué se descartó:** Complejidad similar a múltiples BDs pero con limitaciones de PostgreSQL. RLS por columna es más simple y escalable.

---

### Alternativa C: Multi-Tenancy por Subdominio

**Descripción:** Cada tenant tiene su propio subdominio (tenant1.app.com, tenant2.app.com).

**Pros:**
- Personalización de URL
- Fácil identificar tenant
- Posibilidad de routing diferente

**Contras:**
- **No resuelve el problema de BD:** Aún necesitas elegir entre BD/esquema/columna
- **Complejidad de DNS:** Gestión de subdominios
- **SSL:** Certificados wildcard o múltiples certificados
- **Branding:** Menos flexible que dominio custom

**Por qué se descartó:** No resuelve el problema de aislamiento de datos. Añade complejidad sin beneficio claro. Preferimos una sola URL con branding interno.

---

## Impacto

### Equipos Afectados
- **Backend:** Implementar RLS en todas las tablas
- **Frontend:** Incluir tenant en contexto de usuario
- **QA:** Tests de aislamiento multi-tenant obligatorios
- **DevOps:** Monitoreo de performance de RLS

### Sistemas Afectados
- Todas las tablas tenant-owned
- Edge Functions (deben respetar RLS)
- Queries de frontend (filtradas por RLS)

### Esfuerzo Estimado
- **Implementación:** 2 semanas (RLS en todas las tablas)
- **Migración:** N/A (proyecto nuevo)
- **Testing:** 1 semana (tests de aislamiento)

---

## Plan de Implementación

1. **Diseñar esquema con client_account_id:**
   ```sql
   CREATE TABLE accommodations (
     id UUID PRIMARY KEY,
     client_account_id UUID NOT NULL REFERENCES client_accounts(id),
     -- otros campos
   );
   ```

2. **Crear helper functions:**
   ```sql
   CREATE FUNCTION get_my_client_account_id()
   RETURNS UUID AS $$
     SELECT client_account_id 
     FROM profiles 
     WHERE id = auth.uid()
   $$ LANGUAGE sql SECURITY DEFINER;
   ```

3. **Habilitar RLS:**
   ```sql
   ALTER TABLE accommodations ENABLE ROW LEVEL SECURITY;
   ```

4. **Crear políticas RLS:**
   ```sql
   CREATE POLICY "Users can only see their tenant data"
   ON accommodations FOR SELECT
   USING (client_account_id = get_my_client_account_id());
   ```

5. **Implementar para todas las operaciones:**
   - SELECT, INSERT, UPDATE, DELETE

6. **Testing:**
   - Tests de aislamiento entre tenants
   - Tests de performance con RLS

**Criterios de Aceptación:**
- [x] Todas las tablas tenant-owned tienen client_account_id
- [x] RLS habilitado en todas las tablas
- [x] Helper functions implementadas
- [x] Políticas RLS para todos los roles
- [x] Tests de aislamiento pasando
- [x] Superadmin puede bypass RLS

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Bug en RLS expone datos | Media | Crítico | Tests exhaustivos de aislamiento, code review obligatorio |
| Performance degradada | Baja | Medio | Índices en client_account_id, monitoreo de queries |
| Olvido de RLS en tabla nueva | Media | Crítico | Checklist en PR, tests automáticos |
| Superadmin accede a datos incorrectos | Baja | Alto | Funciones SECURITY DEFINER bien testeadas |

---

## Validación de Seguridad

### Tests Obligatorios

**Test 1: Aislamiento de SELECT**
```sql
-- Usuario de Tenant A no puede ver datos de Tenant B
SET LOCAL jwt.claims.sub = 'user-tenant-a';
SELECT COUNT(*) FROM accommodations; -- Solo de Tenant A
```

**Test 2: Aislamiento de INSERT**
```sql
-- Usuario de Tenant A no puede insertar con client_account_id de Tenant B
SET LOCAL jwt.claims.sub = 'user-tenant-a';
INSERT INTO accommodations (client_account_id, ...) 
VALUES ('tenant-b-id', ...); -- Debe fallar
```

**Test 3: Superadmin Bypass**
```sql
-- Superadmin puede ver todos los datos
SET LOCAL jwt.claims.sub = 'superadmin-user';
SELECT COUNT(*) FROM accommodations; -- Todos los tenants
```

---

## Referencias

- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Multi-Tenancy Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/multi-tenancy)
- `docs/architecture/security.md` - Implementación detallada

---

## Notas Adicionales

**Decisión tomada en:** Fase de diseño del proyecto (Feb 2026)

**Resultado:** RLS ha funcionado excelentemente. Aislamiento garantizado a nivel de BD. Performance aceptable con índices adecuados.

**Lecciones aprendidas:**
- Índices en `client_account_id` son críticos
- Helper functions SECURITY DEFINER simplifican políticas
- Tests de aislamiento deben ser parte de CI/CD
- Documentar RLS en cada migración es esencial

**Tablas con RLS implementado:**
- client_accounts
- entities
- accommodations
- rooms
- lodgers
- lodger_room_assignments
- services_catalog
- accommodation_services
- lodger_services
- energy_bills
- energy_readings
- energy_settlements
- bulletins
- consumptions

**Políticas por tabla:** Típicamente 4 políticas (SELECT, INSERT, UPDATE, DELETE)

---

**Creado por:** Staff Engineer  
**Última actualización:** 2026-03-28  
**Revisores:** Database Architect, Security Lead
