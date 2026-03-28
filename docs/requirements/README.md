# Requisitos del Sistema

Documentación de requisitos funcionales y cambios del sistema SmartRoom Rental.

---

## Fuente de verdad

Solo son válidos como requisitos:
- docs/requirements/current/
- docs/requirements/changes/

Cualquier otro documento:
- no es fuente de verdad
- puede estar obsoleto

## Regla de Oro
No implementar NUNCA cambios basados en documentos fuera de estas carpetas: current y changes.

## 📁 Estructura

```
requirements/
├── README.md              # Este archivo
├── current/               # Requisitos actuales consolidados
│   ├── REQ-001-auth-portals.md
│   ├── REQ-002-tenants-lifecycle.md
│   ├── REQ-003-room-assignment.md
│   └── REQ-004-energy-billing.md
└── changes/               # Cambios propuestos/en curso
    └── 2026/
        ├── CHG-2026-03-28-add-no-overlap-assignment.md
        └── CHG-2026-03-28-energy-settlement-rules.md
```

---

## 🎯 Tipos de Documentos

### REQ (Requisitos Actuales)
**Propósito:** Documentar funcionalidad consolidada y estable del sistema.

**Ubicación:** `current/`

**Cuándo crear:**
- Nueva funcionalidad core que se convierte en parte permanente del sistema
- Consolidación de múltiples CHG relacionados
- Refactorización de requisitos legacy

**Estructura obligatoria:**
```markdown
# REQ-XXX: Título Descriptivo

## Objetivo
Qué problema resuelve este requisito

## Alcance
Qué incluye y qué NO incluye

## Reglas Actuales
Reglas de negocio implementadas

## Casos Válidos
Escenarios que el sistema debe manejar correctamente

## Casos Inválidos
Escenarios que el sistema debe rechazar

## Impacto Frontend
Componentes, páginas y flujos afectados

## Impacto Base de Datos
Tablas, vistas, funciones, triggers involucrados

## Tests Asociados
Tests E2E, unitarios e integración que validan este requisito

## Issues Relacionados
Links a issues de GitHub

## Observaciones
Notas técnicas, limitaciones conocidas, mejoras futuras
```

### CHG (Cambios)
**Propósito:** Documentar cambios específicos en desarrollo o propuestos.

**Ubicación:** `changes/YYYY/`

**Cuándo crear:**
- Bug fix
- Mejora técnica
- Nueva feature en desarrollo
- Cambio en requisito existente
- Refactorización

**Estructura obligatoria:**
```markdown
# CHG-YYYY-MM-DD: Título Descriptivo

## Issue Origen
Link al issue de GitHub o "N/A" si no aplica

## Contexto
Situación actual y por qué se necesita el cambio

## Problema
Descripción específica del problema a resolver

## Cambio Requerido
Solución propuesta con detalles técnicos

## Impacto Funcional
Qué cambia desde el punto de vista del usuario

## Impacto Base de Datos
Migraciones SQL necesarias

## Impacto Frontend
Componentes y páginas a modificar

## Tests Requeridos
Tests nuevos o a actualizar

## Migración Esperada
Nombre y tipo de migración SQL

## Criterios de Aceptación
Condiciones para considerar el cambio completo
```

---

## 🔄 Ciclo de Vida de un Cambio

### 1. Propuesta (CHG creado)
```
Estado: 🟡 Propuesto
Ubicación: changes/YYYY/CHG-YYYY-MM-DD-xxx.md
```

### 2. En Desarrollo (Issue asignado)
```
Estado: 🔵 En Desarrollo
Issue: #123
Branch: feature/issue-123-xxx
```

### 3. En Review (PR abierto)
```
Estado: 🟣 En Review
PR: #456
Tests: ✅ Pasando
```

### 4. Merged (En staging)
```
Estado: 🟢 Merged
Branch: main
Env: staging
```

### 5. En Producción
```
Estado: ✅ Producción
Env: production
Fecha: YYYY-MM-DD
```

### 6. Consolidado (Integrado en REQ)
```
Estado: 📦 Consolidado
CHG → REQ-XXX
Archivo CHG marcado como consolidado
```

---

## 📝 Convenciones de Nomenclatura

### REQ (Requisitos)
```
REQ-XXX-nombre-descriptivo.md

XXX = número secuencial de 3 dígitos (001, 002, 003...)
nombre-descriptivo = kebab-case, máximo 4 palabras
```

**Ejemplos:**
- `REQ-001-auth-portals.md`
- `REQ-002-tenants-lifecycle.md`
- `REQ-003-room-assignment.md`

### CHG (Cambios)
```
CHG-YYYY-MM-DD-descripcion-corta.md

YYYY-MM-DD = fecha de creación
descripcion-corta = kebab-case, máximo 5 palabras
```

**Ejemplos:**
- `CHG-2026-03-28-add-no-overlap-assignment.md`
- `CHG-2026-03-28-fix-energy-calculation.md`
- `CHG-2026-03-29-refactor-lodger-status.md`

---

## 🔗 Relación con Otros Sistemas

### Con Base de Datos
- **REQ/CHG** documenta el "qué" y "por qué"
- **Migración SQL** implementa el "cómo"
- **MIGRATION-INDEX.md** conecta ambos

### Con QA
- **REQ/CHG** define criterios de aceptación
- **Tests** validan cumplimiento
- **TRACEABILITY-MATRIX.md** conecta ambos

### Con Código
- **REQ/CHG** define funcionalidad
- **Código** implementa lógica
- **PR** vincula issue → código → REQ/CHG

---

## ✅ Checklist para Crear REQ

- [ ] Número secuencial correcto (revisar último REQ)
- [ ] Nombre descriptivo en kebab-case
- [ ] Todas las secciones obligatorias completadas
- [ ] Al menos 1 caso válido documentado
- [ ] Impacto en BD documentado (si aplica)
- [ ] Impacto en frontend documentado
- [ ] Tests asociados identificados
- [ ] Vinculado en TRACEABILITY-MATRIX.md

---

## ✅ Checklist para Crear CHG

- [ ] Fecha correcta (YYYY-MM-DD)
- [ ] Issue de GitHub vinculado (o marcado N/A)
- [ ] Problema claramente descrito
- [ ] Solución propuesta detallada
- [ ] Impactos identificados (BD, frontend, tests)
- [ ] Criterios de aceptación definidos
- [ ] Vinculado en TRACEABILITY-MATRIX.md

---

## 🔍 Búsqueda y Consulta

### Buscar por funcionalidad
```bash
grep -r "palabra clave" current/
```

### Buscar cambios recientes
```bash
ls -lt changes/2026/ | head -10
```

### Buscar por issue
```bash
grep -r "#123" changes/
```

### Buscar por tabla de BD
```bash
grep -r "tabla_nombre" current/ changes/
```

---

## 📊 Estadísticas Actuales

### Requisitos Consolidados
- **Total:** 4 REQ
- **Categorías:** Auth (1), Tenants (1), Rooms (1), Billing (1)

### Cambios Activos
- **Total:** 2 CHG
- **En desarrollo:** 2
- **Consolidados:** 0

---

## 🚀 Inicio Rápido

### Crear Nuevo Requisito
```bash
# 1. Identificar número secuencial
ls current/ | tail -1

# 2. Crear archivo
touch current/REQ-005-nombre-descriptivo.md

# 3. Copiar template y completar
# 4. Actualizar TRACEABILITY-MATRIX.md
```

### Crear Nuevo Cambio
```bash
# 1. Crear archivo con fecha actual
touch changes/2026/CHG-2026-03-28-descripcion.md

# 2. Copiar template y completar
# 3. Vincular issue de GitHub
# 4. Actualizar TRACEABILITY-MATRIX.md
```

---

## 📚 Referencias

- **Flujo completo:** `../README.md`
- **Matriz de trazabilidad:** `../qa/TRACEABILITY-MATRIX.md`
- **Reglas de migraciones:** `../database/MIGRATION-RULES.md`
- **Estrategia de testing:** `../qa/TEST-STRATEGY.md`

---

**Última actualización:** 2026-03-28
