# Defectos Abiertos — SmartRent Tests
Última actualización: 2026-02-26

---

## Instrucciones para Cascade

Este archivo contiene bugs detectados por Claude durante la ejecución de tests.
Cascade debe:
1. Leer este archivo para identificar bugs
2. Arreglar cada bug siguiendo el formato descrito
3. Mover el bug a CLOSED-DEFECTS.md cuando esté resuelto
4. Actualizar la fecha de "Última actualización"

---

## Formato de Defecto

```
## BUG-XXX [PRIORIDAD] — Título descriptivo
**Módulo:** ruta/al/archivo.js
**Test que falla:** nombre-del-test.test.js > describe > it
**Error obtenido:**
  Expected: valor esperado
  Received: valor recibido

**Comportamiento esperado:** Descripción clara del comportamiento correcto

**Pasos para reproducir:**
1. Paso 1
2. Paso 2
3. Observar error
```

---

## Defectos Pendientes

---

## BUG-002 [CERRADO] — ESLint falla en create-auth-users-staging.js por env Node no declarado
**Módulo:** supabase/scripts/create-auth-users-staging.js
**Test que falla:** CI deploy-staging.yml > Comprehensive Tests > Lint code
**Error obtenido:**
  'console' is not defined (lines 14, 125, 149, 152, 156, 160, 166)
  'process' is not defined (lines 10, 11, 15)

**Comportamiento esperado:** El script es un Node.js script y debe tener acceso a `console` y `process`. El ESLint debe reconocerlo como entorno Node (env: node: true) ya sea via configuración global o via comentario `/* eslint-env node */` al inicio del archivo.

**Pasos para reproducir:**
1. `gh workflow run deploy-staging.yml --ref develop`
2. El job "Comprehensive Tests" falla en el step "Lint code"
3. Observar anotaciones: `'console' is not defined` y `'process' is not defined` en supabase/scripts/create-auth-users-staging.js

---

## BUG-003 [CERRADO] — npm audit encuentra vulnerabilidades high-severity bloqueando el deploy
**Módulo:** package.json / dependencias del proyecto
**Test que falla:** CI deploy-staging.yml > Security & Performance > Security audit
**Error obtenido:**
  `npm audit --audit-level=high` sale con exit code 1

**Comportamiento esperado:** Las dependencias no deben tener vulnerabilidades de severidad alta. Revisar con `npm audit` localmente e identificar qué paquete las introduce. Actualizar o reemplazar el paquete afectado.

**Pasos para reproducir:**
1. `npm audit --audit-level=high`
2. Observar la lista de vulnerabilidades high/critical
3. Resolver con `npm audit fix` o actualización manual de la dependencia afectada

<!-- Última ejecución: 2026-03-08 — workflow deploy-staging run #17 falló en lint + audit -->
