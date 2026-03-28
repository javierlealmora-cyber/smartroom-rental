# Agent Work Directory

**Propósito:** Almacenar outputs, reportes y auditorías generados por agentes de IA (Cascade, etc.)

⚠️ **IMPORTANTE:** Este directorio **NO es fuente de verdad** del proyecto.

---

## 📁 Estructura

```
agent-work/
├── cascade/                    # Outputs de Cascade AI
│   ├── actions/               # Acciones ejecutadas (refactorings, migraciones)
│   ├── audits/                # Auditorías de código/documentación
│   └── reports/               # Reportes de implementación/consolidación
└── README.md                  # Este archivo
```

---

## 🎯 Qué contiene

### `cascade/actions/`
Documentos que registran **acciones ejecutadas** por el agente:
- Refactorings de código
- Migraciones de estructura
- Cambios masivos automatizados

**Ejemplos:**
- `REFACTORING-COMPONENTS-2026-03-28.md`
- `MIGRATION-TAILWIND-TO-ANTD.md`

### `cascade/audits/`
**Auditorías** de código, documentación o arquitectura:
- Análisis de archivos existentes
- Clasificación de documentos
- Detección de duplicados
- Identificación de gaps

**Ejemplos:**
- `AUDIT-RESULT.md` - Auditoría de 45 archivos .md
- `CODE-AUDIT-2026-03-28.md`

### `cascade/reports/`
**Reportes** de implementación, consolidación o resúmenes:
- Resúmenes de trabajo completado
- Reportes de consolidación
- Métricas de cambios

**Ejemplos:**
- `CONSOLIDATION-COMPLETED-SUMMARY.md`
- `FINAL-CONSOLIDATION-SUMMARY.md`
- `DOCUMENTATION-IMPLEMENTATION-SUMMARY.md`

---

## ⚠️ Qué NO es

- ❌ **NO es documentación oficial** del proyecto
- ❌ **NO es fuente de verdad** para requisitos
- ❌ **NO debe referenciarse** en código de producción
- ❌ **NO debe usarse** para onboarding de nuevos desarrolladores

---

## ✅ Qué SÍ es

- ✅ **Registro histórico** de trabajo de agentes
- ✅ **Contexto** para futuras sesiones de IA
- ✅ **Trazabilidad** de cambios automatizados
- ✅ **Referencia temporal** para entender decisiones

---

## 🔗 Documentación Oficial

Para documentación oficial del proyecto, consultar:

- **Requisitos:** `docs/requirements/`
- **Arquitectura:** `docs/architecture/`
- **DevOps:** `docs/devops/`
- **QA:** `docs/qa/`
- **Base de Datos:** `docs/database/`

---

## 🗑️ Política de Limpieza

**Retención:**
- Mantener outputs de los últimos 3 meses
- Archivar o eliminar outputs antiguos trimestralmente

**Criterio de eliminación:**
- Reportes obsoletos (consolidaciones completadas hace >3 meses)
- Auditorías superadas por nuevas versiones
- Acciones ya integradas en documentación oficial

---

## 📝 Convenciones de Nombres

**Formato recomendado:**
```
{TIPO}-{DESCRIPCION}-{FECHA}.md

Ejemplos:
- AUDIT-documentation-2026-03-28.md
- REPORT-consolidation-completed-2026-03-28.md
- ACTION-refactor-components-2026-03-28.md
```

**Tipos:**
- `AUDIT` - Auditorías
- `REPORT` - Reportes
- `ACTION` - Acciones ejecutadas
- `SUMMARY` - Resúmenes

---

## 🚫 Qué NO debe estar aquí

Archivos que **SÍ son fuente de verdad** y deben estar en `docs/`:
- REQ-XXX.md (requisitos funcionales)
- ADR-XXX.md (decisiones de arquitectura)
- TEST-*.md (estrategias de testing)
- MIGRATION-*.md (índices de migraciones)
- README.md de módulos

---

**Última actualización:** 2026-03-28  
**Responsable:** Staff Engineer / Tech Lead
