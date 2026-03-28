# ADR-002: Usar Vercel para Deployment de Frontend

**Estado:** Aceptado  
**Fecha:** 2026-02-01 (estimado)  
**Decisores:** Staff Engineer, DevOps Lead  

---

## Contexto

SmartRoom Rental necesita una plataforma de hosting para el frontend React que:
- Soporte deployments automáticos desde GitHub
- Proporcione preview deployments para PRs
- Tenga CDN global para baja latencia
- Sea fácil de configurar y mantener
- Soporte variables de entorno por entorno

**Restricciones:**
- Presupuesto limitado
- Equipo pequeño sin DevOps dedicado
- Necesidad de múltiples entornos (dev, staging, prod)
- Integración con GitHub

---

## Decisión

**Usar Vercel como plataforma de hosting para el frontend de SmartRoom Rental.**

Vercel proporciona:
- **Auto-deploy:** Desde GitHub (push a rama → deploy automático)
- **Preview deployments:** URL única por PR
- **CDN global:** Edge network con baja latencia
- **Variables de entorno:** Por proyecto y entorno
- **Analytics:** Métricas de performance (opcional)
- **Dominios custom:** Soporte para dominios propios

---

## Consecuencias

### Positivas ✅

- **Zero-config deployment:** Push a GitHub → deploy automático
- **Preview deployments:** Testing de PRs antes de merge
- **CDN global:** Baja latencia en todo el mundo
- **HTTPS automático:** Certificados SSL gratis
- **Rollback fácil:** Un click para volver a versión anterior
- **Integración con GitHub:** Seamless
- **Plan gratuito generoso:** Suficiente para desarrollo
- **Build optimization:** Optimización automática de assets

### Negativas ❌

- **Vendor lock-in:** Dependencia de Vercel
- **Límites de plan gratuito:**
  - 100GB bandwidth/mes
  - 100 deployments/mes
  - 6000 minutos de build/mes
- **Costo en producción:** Plan Pro necesario para features avanzadas
- **Menos control:** Sobre infraestructura vs self-hosted
- **Serverless functions:** Limitadas a Vercel Edge Functions (no usado actualmente)

### Neutras ℹ️

- **Optimizado para Next.js:** Aunque usamos Vite, funciona bien
- **Comunidad activa:** Buen soporte
- **Integración con Supabase:** Funciona bien juntos

---

## Alternativas Consideradas

### Alternativa A: Netlify

**Descripción:** Plataforma de hosting similar a Vercel.

**Pros:**
- Features similares a Vercel
- Plan gratuito generoso
- Integración con GitHub
- Netlify Functions

**Contras:**
- Menos optimizado para React/Vite
- Build times ligeramente más lentos
- Menos momentum en la comunidad

**Por qué se descartó:** Vercel tiene mejor integración con React y más momentum. Ambos son similares, pero Vercel es la opción más popular.

---

### Alternativa B: AWS S3 + CloudFront

**Descripción:** Hosting estático en S3 con CDN de CloudFront.

**Pros:**
- Control total
- Escalabilidad ilimitada
- Pricing predecible

**Contras:**
- Configuración compleja (S3, CloudFront, Route53, ACM)
- No hay preview deployments nativos
- Requiere CI/CD manual (GitHub Actions)
- Mantenimiento de infraestructura

**Por qué se descartó:** Demasiado complejo para el tamaño del equipo. Vercel ofrece todo out-of-the-box.

---

### Alternativa C: GitHub Pages

**Descripción:** Hosting gratuito de GitHub.

**Pros:**
- Totalmente gratuito
- Integración nativa con GitHub
- Simple

**Contras:**
- No soporta variables de entorno
- No hay preview deployments
- Limitado a sitios estáticos simples
- No hay CDN global
- No soporta SPA routing bien

**Por qué se descartó:** Demasiado limitado para una aplicación SPA compleja con múltiples entornos.

---

## Impacto

### Equipos Afectados
- **Frontend:** Configuración de build en Vercel
- **DevOps:** Setup de proyectos y variables de entorno
- **QA:** Testing en preview deployments

### Sistemas Afectados
- Frontend (React + Vite)

### Esfuerzo Estimado
- **Implementación:** 1 día (setup inicial)
- **Migración:** N/A (proyecto nuevo)
- **Testing:** 1 día

---

## Plan de Implementación

1. **Crear cuenta Vercel:**
   - Conectar con GitHub

2. **Crear proyectos:**
   - Proyecto DEV (rama develop)
   - Proyecto STAGING (rama staging)
   - Proyecto PRODUCTION (rama main)

3. **Configurar variables de entorno:**
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
   - VITE_STRIPE_PUBLISHABLE_KEY

4. **Configurar dominios:**
   - smartroomrentalplatform.com → Production
   - staging.smartroomrentalplatform.com → Staging (opcional)

5. **Configurar GitHub Secrets:**
   - VERCEL_TOKEN
   - VERCEL_ORG_ID
   - DEV_VERCEL_PROJECT_ID
   - STAGING_VERCEL_PROJECT_ID

**Criterios de Aceptación:**
- [x] Proyectos Vercel creados
- [x] Auto-deploy funcional
- [x] Preview deployments funcionando
- [x] Variables de entorno configuradas
- [x] Dominio custom configurado

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Vendor lock-in | Alta | Medio | Mantener build scripts portables, usar Vite estándar |
| Límites de plan gratuito | Media | Bajo | Monitorear uso, upgrade cuando sea necesario |
| Downtime de Vercel | Baja | Alto | Monitorear status page, tener plan de contingencia |
| Cambios en pricing | Media | Medio | Revisar pricing regularmente |

---

## Referencias

- [Vercel Docs](https://vercel.com/docs)
- [Vercel Pricing](https://vercel.com/pricing)
- [Vercel + Vite](https://vercel.com/docs/frameworks/vite)
- [Vercel + Supabase](https://vercel.com/guides/using-supabase-with-vercel)

---

## Notas Adicionales

**Decisión tomada en:** Fase de diseño del proyecto (Feb 2026)

**Resultado:** Vercel ha simplificado enormemente el proceso de deployment. Preview deployments son invaluables para testing de PRs.

**Lecciones aprendidas:**
- Password protection debe desactivarse en staging para tests E2E
- Variables de entorno deben configurarse por proyecto (DEV vs STAGING)
- Build cache de Vercel acelera deployments significativamente

**Configuración actual:**
- **DEV:** Auto-deploy desde rama `develop`
- **STAGING:** Auto-deploy desde rama `staging`
- **PRODUCTION:** Auto-deploy desde rama `main`

---

**Creado por:** Staff Engineer  
**Última actualización:** 2026-03-28  
**Revisores:** DevOps Lead, Tech Lead
