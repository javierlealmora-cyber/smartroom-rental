# ADR-001: Usar Supabase como Backend-as-a-Service

**Estado:** Aceptado  
**Fecha:** 2026-02-01 (estimado)  
**Decisores:** Staff Engineer, Product Owner  

---

## Contexto

SmartRoom Rental necesita un backend completo con:
- Autenticación de usuarios
- Base de datos PostgreSQL
- Storage para archivos
- APIs REST/GraphQL
- Funciones serverless para lógica de negocio
- Tiempo de desarrollo rápido (MVP en 2-3 meses)

**Restricciones:**
- Presupuesto limitado para infraestructura
- Equipo pequeño (1-2 desarrolladores)
- Necesidad de escalar rápidamente
- Multi-tenancy obligatorio

---

## Decisión

**Usar Supabase como Backend-as-a-Service (BaaS) para SmartRoom Rental.**

Supabase proporciona:
- **Auth:** Sistema de autenticación completo
- **Database:** PostgreSQL con RLS (Row Level Security)
- **Storage:** Almacenamiento de archivos con buckets
- **Edge Functions:** Funciones serverless en Deno
- **Realtime:** Suscripciones en tiempo real (opcional)
- **Dashboard:** Interfaz de administración

---

## Consecuencias

### Positivas ✅

- **Velocidad de desarrollo:** Backend completo en días vs semanas
- **Costo reducido:** Plan gratuito generoso, pricing escalable
- **PostgreSQL nativo:** Base de datos robusta y conocida
- **RLS integrado:** Multi-tenancy a nivel de BD
- **Edge Functions:** Lógica de negocio serverless
- **Ecosistema:** Librerías oficiales para React, Next.js
- **Dashboard:** Administración visual de BD, Auth, Storage
- **Backups automáticos:** En planes de pago

### Negativas ❌

- **Vendor lock-in:** Dependencia de Supabase
- **Limitaciones de plan gratuito:** 
  - 500MB de BD
  - 1GB de Storage
  - 2 millones de invocaciones de Edge Functions/mes
- **Migración compleja:** Si se necesita cambiar de proveedor
- **Menos control:** Sobre infraestructura vs self-hosted
- **Edge Functions en Deno:** Ecosistema más limitado que Node.js

### Neutras ℹ️

- **Open source:** Supabase es open source, posibilidad de self-host futuro
- **Comunidad activa:** Buen soporte y documentación
- **Integración con Vercel:** Deploy simplificado

---

## Alternativas Consideradas

### Alternativa A: Firebase (Google)

**Descripción:** BaaS de Google con Firestore, Auth, Functions.

**Pros:**
- Ecosistema maduro
- Integración con Google Cloud
- Realtime database nativo

**Contras:**
- Firestore (NoSQL) vs PostgreSQL (SQL)
- Pricing más complejo
- Menos control sobre queries

**Por qué se descartó:** Preferencia por PostgreSQL y SQL sobre NoSQL. Supabase ofrece más flexibilidad en queries complejas.

---

### Alternativa B: Backend Custom (Node.js + PostgreSQL)

**Descripción:** Desarrollar backend desde cero con Express/Fastify + PostgreSQL.

**Pros:**
- Control total
- Sin vendor lock-in
- Flexibilidad máxima

**Contras:**
- Tiempo de desarrollo: 4-6 semanas solo para MVP
- Mantenimiento de infraestructura
- Implementar Auth, Storage, etc. desde cero
- Costos de hosting (EC2, RDS, S3)

**Por qué se descartó:** Tiempo de desarrollo excesivo para MVP. Equipo pequeño no puede mantener infraestructura compleja.

---

### Alternativa C: AWS Amplify

**Descripción:** BaaS de AWS con AppSync, Cognito, DynamoDB.

**Pros:**
- Ecosistema AWS completo
- Escalabilidad ilimitada

**Contras:**
- Complejidad de configuración
- DynamoDB (NoSQL) vs PostgreSQL
- Pricing complejo
- Curva de aprendizaje alta

**Por qué se descartó:** Demasiado complejo para el tamaño del equipo. Preferencia por PostgreSQL.

---

## Impacto

### Equipos Afectados
- **Frontend:** Integración con Supabase Client, Edge Functions
- **Backend:** Desarrollo de Edge Functions en Deno
- **DevOps:** Configuración de proyectos Supabase (dev, staging, prod)
- **QA:** Tests de integración con Supabase

### Sistemas Afectados
- Todos los sistemas del proyecto dependen de Supabase

### Esfuerzo Estimado
- **Implementación:** 1 semana (setup inicial)
- **Migración:** N/A (proyecto nuevo)
- **Testing:** Continuo

---

## Plan de Implementación

1. **Crear proyectos Supabase:**
   - Development: `lqwyyyttjamirccdtlvl`
   - Staging: `lopdwrsmkmtboeczxotj`
   - Production: `oeofdvkilcuidxainuow`

2. **Configurar Auth:**
   - Email/password provider
   - Redirect URLs
   - Email templates

3. **Diseñar esquema de BD:**
   - Tablas con RLS
   - Helper functions
   - Triggers

4. **Implementar Edge Functions:**
   - wizard_submit
   - whoami
   - manage_lodger

5. **Configurar Storage:**
   - Buckets con RLS
   - Políticas de acceso

**Criterios de Aceptación:**
- [x] Proyectos Supabase creados
- [x] Auth funcional
- [x] BD con RLS implementada
- [x] Edge Functions desplegadas
- [x] Storage configurado

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Vendor lock-in | Alta | Alto | Supabase es open source, posibilidad de self-host |
| Límites de plan gratuito | Media | Medio | Monitorear uso, upgrade a plan de pago cuando sea necesario |
| Downtime de Supabase | Baja | Alto | Monitorear status page, tener plan de contingencia |
| Cambios en pricing | Media | Medio | Revisar pricing regularmente, considerar alternativas |

---

## Referencias

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase GitHub](https://github.com/supabase/supabase)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

---

## Notas Adicionales

**Decisión tomada en:** Fase de diseño del proyecto (Feb 2026)

**Resultado:** Supabase ha permitido desarrollar el MVP en tiempo récord. La integración con React y Vercel ha sido excelente. RLS ha simplificado el multi-tenancy.

**Lecciones aprendidas:**
- Edge Functions en Deno tienen limitaciones vs Node.js
- Plan gratuito suficiente para desarrollo y staging
- Dashboard de Supabase muy útil para debugging

---

**Creado por:** Staff Engineer  
**Última actualización:** 2026-03-28  
**Revisores:** Product Owner, Tech Lead
