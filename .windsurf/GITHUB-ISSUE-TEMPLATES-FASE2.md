# 📋 GitHub Issue Templates - FASE 2 SDLC

Templates para GitHub Issues implementados en SmartRoom Rental.

---

## 🗂️ Estructura de Templates

```
.github/
└── ISSUE_TEMPLATE/
    ├── feature.md          # 🚀 Feature Request
    ├── bug.md             # 🐛 Bug Report
    └── config.yml         # ⚙️ Configuración
```

---

## 🚀 Feature Request Template

**Archivo:** `.github/ISSUE_TEMPLATE/feature.md`

### Características Principales

#### 📋 User Story
- Formato estándar: **Como [rol], quiero [acción], para [beneficio]**
- Claridad en el objetivo de negocio
- Identificación del usuario final

#### 🎯 Criterios de Aceptación
- **Formato Given-When-Then** para BDD
- Escenarios claros y medibles
- Facilita la creación de tests automatizados

#### 🔧 Consideraciones Técnicas
- **Migrations**: ¿Necesita cambios en la base de datos?
- **Frontend**: ¿Qué componentes se modifican?
- **Backend**: ¿Qué APIs o Edge Functions?
- **Tests**: ¿Qué tests se deben crear?

#### ✅ Definition of Done
- Checklist completo para validación
- Tests BDD definidos por Claude
- Código implementado por Cascade
- Tests pasando (100%)
- Code review aprobado
- Preview deploy funcionando
- Documentación actualizada

### Ejemplo de Uso

```markdown
---
name: Feature Request
about: Nueva funcionalidad o mejora
title: '[FEATURE] '
labels: feature, needs-review
---

## 📋 User Story
Como **administrador de inmuebles**, quiero **gestionar los servicios adicionales de un alojamiento**, para **ofrecer un mejor servicio a los inquilinos y optimizar los ingresos**

## 🎯 Criterios de Aceptación

### Scenario: Añadir servicio a alojamiento
**Given** que soy un administrador autenticado
**When** accedo a la página de detalles de un alojamiento
**Then** puedo ver una sección "Servicios Adicionales"
**And** puedo añadir nuevos servicios con nombre y precio

### Scenario: Editar servicio existente
**Given** que un alojamiento tiene servicios configurados
**When** hago clic en "Editar" en un servicio
**Then** puedo modificar nombre y precio
**And** los cambios se guardan correctamente

## 🔧 Consideraciones Técnicas

### Migrations
- [ ] Crear tabla `accommodation_services`
- [ ] Añadir RLS policies

### Frontend
- [ ] Componente `ServiceManager`
- [ ] Formulario de añadir/editar servicios

### Backend
- [ ] Edge Function `manage_service`
- [ ] Validaciones de negocio

## ✅ Definition of Done
- [ ] Tests BDD definidos por Claude
- [ ] Código implementado por Cascade
- [ ] Tests pasando (100%)
- [ ] Code review aprobado
- [ ] Preview deploy funcionando
- [ ] Documentación actualizada
```

---

## 🐛 Bug Report Template

**Archivo:** `.github/ISSUE_TEMPLATE/bug.md`

### Características Principales

#### 📝 Descripción Clara
- Título descriptivo del problema
- Explicación concisa del error
- Contexto de cuándo ocurre

#### 🔄 Pasos para Reproducir
- Secuencia paso a paso
- Datos de prueba necesarios
- Condiciones específicas

#### ✅ Comportamiento Esperado vs Actual
- Diferencia clara entre lo esperado y lo real
- Impacto en el usuario
- Severidad del problema

#### 🌍 Información de Entorno
- **Browser**: Chrome, Firefox, Safari
- **OS**: Windows, macOS, Linux
- **Dispositivo**: Desktop, Mobile, Tablet
- **Environment**: DEV, Staging, Production

#### 🚨 Severidad
- **Crítico**: Bloquea funcionalidad principal
- **Alto**: Afecta flujo importante
- **Medio**: Funcionalidad alternativa disponible
- **Bajo**: Problema menor o cosmético

#### 📋 Logs y Evidencia
- Mensajes de error exactos
- Screenshots del problema
- Consola del navegador
- Logs del servidor

### Ejemplo de Uso

```markdown
---
name: Bug Report
about: Reportar un defecto
title: '[BUG] '
labels: bug, needs-triage
---

## 🐛 Descripción del Bug
El formulario de login no redirige correctamente al dashboard después de un login exitoso

## 🔄 Pasos para Reproducir
1. Ir a /v2/auth/login
2. Ingresar email: admin@test.com
3. Ingresar contraseña: password123
4. Hacer clic en "Iniciar Sesión"
5. Observar que la página se queda cargando

## ✅ Comportamiento Esperado
Después del login exitoso, el usuario debería ser redirigido al dashboard principal

## ❌ Comportamiento Actual
La página muestra un spinner de carga infinito y nunca redirige

## 📸 Screenshots
![Login stuck](https://i.imgur.com/example.png)

## 🌍 Entorno
- **Environment**: Staging
- **Browser**: Chrome 120.0
- **OS**: Windows 11
- **Dispositivo**: Desktop

## 🚨 Severidad
**Alto** - Bloquea el acceso de usuarios al sistema

## 📋 Logs
```
Console Error:
GET https://api.staging.com/auth/session 401 (Unauthorized)
```

## ✅ Definition of Done
- [ ] Bug identificado y corregido
- [ ] Tests E2E actualizados para cubrir el caso
- [ ] Validación en Staging
- [ ] Deploy a Production
```

---

## ⚙️ Configuración de Templates

**Archivo:** `.github/ISSUE_TEMPLATE/config.yml`

### Configuración Actual

```yaml
blank_issues_enabled: false
contact_links:
  - name: 📚 Documentación
    url: https://github.com/javierlealmora-cyber/smartroom-rental/wiki
    about: Consulta la documentación del proyecto
  - name: 💬 Discusiones
    url: https://github.com/javierlealmora-cyber/smartroom-rental/discussions
    about: Para preguntas generales o discusiones
```

### Características

#### 🚫 Issues en Blanco Deshabilitados
- `blank_issues_enabled: false`
- Fuerza a los usuarios a usar templates
- Mejora la calidad de los issues

#### 🔗 Enlaces de Contacto
- **Documentación**: Acceso rápido a la wiki
- **Discusiones**: Para preguntas no-bug/no-feature
- Soporte directo para usuarios

---

## 🔄 Workflow de Issues

### 1. Creación del Issue
- Usuario selecciona template apropiado
- Completa todos los campos requeridos
- GitHub asigna labels automáticamente

### 2. Triage (Product Owner)
- Revisa prioridad y severidad
- Asigna a milestone/sprint
- Define Definition of Done

### 3. Desarrollo (Claude + Cascade)
- **Claude**: Define tests BDD basados en criterios
- **Cascade**: Implementa la funcionalidad
- Validación continua

### 4. Review y Merge
- Code review del Product Owner
- Tests pasando (100%)
- Deploy automático a Staging

### 5. Validación Final
- Product Owner valida en Staging
- Merge a main
- Deploy automático a Production

---

## 📊 Métricas y Labels

### Labels Automáticas

#### Features
- `feature` - Todas las nuevas funcionalidades
- `needs-review` - Esperando revisión
- `in-progress` - En desarrollo
- `ready-for-testing` - Listo para QA

#### Bugs
- `bug` - Todos los defectos
- `needs-triage` - Esperando clasificación
- `critical` - Severidad crítica
- `high` - Alta prioridad
- `medium` - Prioridad media
- `low` - Baja prioridad

### Métricas de Seguimiento
- **Time to triage**: Tiempo hasta clasificación
- **Time to resolution**: Tiempo hasta resolución
- **Bug rate**: Ratio bugs vs features
- **Test coverage**: Cobertura de tests por issue

---

## ✅ FASE 2 Completada

### Implementación
- ✅ Templates creados y configurados
- ✅ Labels automáticos funcionando
- ✅ Workflow definido
- ✅ Validación en GitHub completada

### Beneficios
- 📋 Issues consistentes y completos
- 🎯 Criterios BDD listos para Claude
- 🔄 Workflow estandarizado
- 📊 Métricas de seguimiento

### Próximo Paso
**FASE 3**: Pull Request Template para estandarizar el proceso de merge y review.

---

## 📝 Notas para Claude AI

1. **Leer User Stories** atentamente para entender el contexto
2. **Extraer Criterios de Aceptación** en formato Given-When-Then
3. **Crear Tests BDD** que cubran todos los escenarios
4. **Considerar Edge Cases** basados en la descripción
5. **Validar Definition of Done** antes de pasar a Cascade

---

## 🔗 Referencias

- [GitHub Issue Templates Documentation](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-issue-templates)
- [BDD Best Practices](https://cucumber.io/docs/bdd/)
- [SmartRoom SDLC Plan](./sdlc-enterprise-saas-9f1066.md)
- [Testing Structure](./ESTRUCTURA-TESTING-FASE1.md)
