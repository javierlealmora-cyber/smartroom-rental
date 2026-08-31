# Modelo de autenticación — Add-ons (Fase 11C5)

**Patrón:** Backend-to-backend (B2B)  
**Entidades:** SmartConversations (SC) como cliente → Add-on como servidor

---

## 1. Tokens por add-on

| Add-on | Variable de entorno | Tipo |
|--------|---------------------|------|
| Incidencias | `INCIDENTS_ADDON_SERVICE_TOKEN` | Bearer token |
| Publicaciones / Leads | `LISTINGS_ADDON_SERVICE_TOKEN` | Bearer token |

---

## 2. Cómo se usa

```
Authorization: Bearer ${INCIDENTS_ADDON_SERVICE_TOKEN}
```

- El token es de entorno (env var) — nunca hardcodeado
- Solo disponible en Edge Functions server-side — nunca en frontend
- No se usa `SUPABASE_SERVICE_ROLE_KEY` para acceder a add-ons externos
- Cada add-on tiene su propio token independiente

---

## 3. Lo que NO se hace

| Prohibido | Motivo |
|-----------|--------|
| Compartir `service_role` entre proyectos | Violación de aislamiento |
| Exponer token en variables `VITE_*` | Frontend-facing, no seguro |
| Usar mismo token para todos los add-ons | Single point of failure |
| Hardcodear token en código | Compromiso en repositorio |
| Crear FK entre tablas SC y add-ons | Acoplamiento de base de datos |

---

## 4. Aislamiento multi-tenant

La autenticación es idéntica para todos los tenants (mismo token B2B).  
El aislamiento de datos por tenant es responsabilidad del campo `client_account_id` que va en cada request, no del token de autenticación.

---

## 5. Configuración para DEV

1. El equipo del add-on de incidencias provisiona `INCIDENTS_ADDON_SERVICE_TOKEN` para el entorno DEV.
2. El token se añade a los secrets de Supabase DEV (no en `.env` de repositorio).
3. Se configura `INCIDENTS_ADDON_BASE_URL` con la URL DEV del add-on.
4. Se verifica con `npm run test:smoke:dev:incidents-addon` (requiere endpoint real).
