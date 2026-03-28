# Claude — Agent Work

**Propósito:** Almacenar outputs generados por Claude en sesiones de trabajo con este proyecto.

⚠️ **IMPORTANTE:** Este directorio **NO es fuente de verdad** del proyecto.
Los documentos aquí son outputs de IA — análisis, auditorías y reportes generados automáticamente.

---

## Estructura

```
agent-work/claude/
├── actions/        # Acciones ejecutadas: refactorings, migraciones, reorganizaciones
├── audits/         # Auditorías de código, documentación o arquitectura
└── reports/        # Reportes de implementación o resúmenes de sesión
```

---

## Convenciones de nombres

```
{TIPO}-{DESCRIPCION}-{FECHA}.md

Ejemplos:
- AUDIT-QA-documentation-2026-03-28.md
- REPORT-qa-setup-session-2026-03-28.md
- ACTION-qa-restructure-2026-03-28.md
```

---

## Qué contiene cada carpeta

### `actions/`
Documentos que registran **qué se hizo** en una sesión:
- Reorganizaciones de estructura
- Migraciones de documentación
- Cambios masivos ejecutados

### `audits/`
**Análisis y clasificaciones** de estado del proyecto:
- Auditorías de documentación QA
- Clasificaciones de archivos
- Detección de gaps y duplicados

### `reports/`
**Resúmenes** de sesiones de trabajo:
- Qué se implementó
- Qué tests se crearon
- Métricas del estado actual

---

## Documentación oficial

Para la fuente de verdad del proyecto, consultar:

| Área | Directorio |
|------|-----------|
| Estrategia QA | `docs/qa/` |
| Tests ejecutables | `qa/` |
| Defectos abiertos | `defects/OPEN-DEFECTS.md` |
| Reportes de estado | `reports/` |
| Requisitos | `docs/requirements/` |

---

**Última actualización:** 2026-03-28
