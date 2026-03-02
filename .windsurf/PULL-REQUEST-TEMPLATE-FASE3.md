# 📋 Pull Request Template - FASE 3 SDLC

Template para Pull Requests implementado en SmartRoom Rental.

---

## 🗂️ Estructura del Template

**Archivo:** `.github/PULL_REQUEST_TEMPLATE.md`

El template se carga automáticamente cuando se crea un Pull Request en GitHub.

---

## 📝 Secciones del Template

### 1. Descripción
- **Propósito**: Breve explicación del cambio
- **Issue Relacionado**: Referencia al issue original (Closes #XXX)
- **Contexto**: Por qué es necesario este cambio

### 2. Tipo de Cambio
Clasificación del PR para facilitar el review:
- 🐛 **Bug fix**: Soluciona un problema
- ✨ **Nueva feature**: Añade funcionalidad
- 💥 **Breaking change**: Cambios que rompen compatibilidad
- 📝 **Documentación**: Solo cambios en docs
- 🎨 **Estilo/Refactor**: Limpieza de código
- ⚡ **Performance**: Mejoras de rendimiento
- 🧪 **Tests**: Añadir o corregir tests

### 3. Tests Realizados
#### Tests Automáticos
- Unitarios (`npm test`)
- BDD (`npm run test:features`)
- E2E smoke (`npm run test:e2e:smoke`)
- Coverage >= 80% (`npm run test:coverage`)

#### Tests Manuales
- Validación en navegadores (Chrome/Firefox/Safari)
- Testing móvil/tablet
- Preview deploy funcional
- Cumplimiento de criterios de aceptación

### 4. Screenshots
Para cambios visuales:
- **Antes**: Estado original
- **Después**: Nuevo estado
- Facilita la validación de UI/UX

### 5. Checklist Pre-Merge
#### Code Quality
- Convenciones del proyecto
- Self-review realizado
- Código complejo comentado
- Sin console.logs o debuggers
- Imports organizados
- Sin warnings de ESLint

#### Testing
- Tests añadidos para nuevos cambios
- Tests existentes pasando
- Ejecutado localmente antes del PR
- Coverage mantenido >= 80%

#### Database/Backend
- Migraciones incluidas (si aplica)
- Migraciones testeadas localmente
- Datos estáticos actualizados
- Edge Functions actualizadas
- RLS policies revisadas

#### Documentation
- README actualizado
- Comentarios en código complejo
- Documentación técnica actualizada

#### Deploy
- Preview deploy revisado
- Sin conflictos con rama base
- Variables de entorno documentadas

### 6. Deploy Notes
Instrucciones específicas para el deploy:
- **Migraciones**: Scripts SQL a ejecutar
- **Datos Estáticos**: Scripts de parámetros
- **Variables de Entorno**: Nuevas configuraciones
- **Pasos Post-Deploy**: Acciones manuales

### 7. Revisión Adicional
- **Áreas de Atención**: Código complejo o crítico
- **Testing Manual Recomendado**: Flujos específicos a probar
- **Decisiones de Diseño**: Explicación de elecciones técnicas

### 8. Impact Analysis
- **Performance**: Sin degradación, mediciones incluidas
- **Security**: Sin vulnerabilidades, datos protegidos
- **Accessibility**: Navegación por teclado, contraste, screen readers

### 9. Notas Adicionales
Cualquier información relevante para el reviewer.

---

## 🔄 Workflow de Pull Requests

### 1. Creación del PR
- Developer crea PR desde feature branch a main
- Template se carga automáticamente
- Developer completa todas las secciones relevantes

### 2. Automated Checks
- **CI/CD**: Build, lint, tests
- **Code Coverage**: Verificación >= 80%
- **Security Scan**: Vulnerabilities check
- **Preview Deploy**: Despliegue automático

### 3. Review Process
- **Peer Review**: Otro developer revisa código
- **Product Owner Review**: Validación de negocio
- **Testing Review**: Validación de tests

### 4. Merge Process
- Todos los checks pasando
- Reviews aprobados
- Conflictos resueltos
- Merge a main

### 5. Post-Merge
- Deploy automático a Staging
- Validación final
- Deploy automático a Production

---

## 📋 Ejemplo Completo de PR

```markdown
## 📝 Descripción
Implementar gestión de servicios adicionales para alojamientos, permitiendo a los administradores añadir, editar y eliminar servicios con pricing dinámico.

---

## 🔗 Issue Relacionado
Closes #123

---

## 🎯 Tipo de Cambio
- [x] ✨ Nueva feature (cambio que añade funcionalidad)
- [ ] 🐛 Bug fix (cambio que soluciona un problema)
- [ ] 💥 Breaking change (fix o feature que causa que funcionalidad existente deje de funcionar)
- [ ] 📝 Documentación (cambios solo en documentación)
- [ ] 🎨 Estilo/Refactor (cambios de formato, refactoring sin cambiar funcionalidad)
- [ ] ⚡ Performance (mejora de rendimiento)
- [ ] 🧪 Tests (añadir o corregir tests)

---

## 🧪 Tests Realizados

### Tests Automáticos
- [x] Tests unitarios pasando (`npm test`)
- [x] Tests BDD pasando (`npm run test:features`)
- [x] Tests E2E smoke pasando (`npm run test:e2e:smoke`)
- [x] Coverage >= 80% (`npm run test:coverage`)

### Tests Manuales
- [x] Probado en navegador: Chrome / Firefox / Safari
- [x] Probado en móvil / tablet
- [x] Validado en Preview Deploy
- [x] Verificado que cumple criterios de aceptación del Issue

**Evidencia de tests:**
- Screenshots de flujo completo
- Tests E2E ejecutados exitosamente

---

## 📸 Screenshots (si aplica)

### Antes
![Antes](https://i.imgur.com/before.png)

### Después
![Después](https://i.imgur.com/after.png)

---

## ✅ Checklist Pre-Merge

### Code Quality
- [x] El código sigue las convenciones del proyecto
- [x] He revisado mi propio código (self-review)
- [x] He comentado código complejo donde es necesario
- [x] No hay console.logs, debuggers ni código comentado
- [x] Imports están organizados
- [x] No hay warnings de ESLint

### Testing
- [x] He añadido tests para cubrir los cambios
- [x] Todos los tests existentes siguen pasando
- [x] He ejecutado tests localmente antes de crear el PR
- [x] Coverage se mantiene >= 80%

### Database/Backend
- [x] Migraciones incluidas
- [x] Migraciones testeadas localmente
- [x] Datos estáticos actualizados
- [x] Edge Functions actualizadas
- [x] RLS policies revisadas

### Documentation
- [x] README actualizado
- [x] Comentarios de código añadidos donde es complejo
- [x] Documentación técnica actualizada

### Deploy
- [x] Preview deploy revisado y funcional
- [x] No hay conflictos con la rama base
- [x] Variables de entorno documentadas

---

## 🚀 Deploy Notes

### Migraciones a Ejecutar
```bash
# Nueva tabla de servicios
supabase db push
```

### Datos Estáticos a Aplicar
```bash
# Tipos de servicios por defecto
npx supabase db execute --file supabase/static-data/02_service_types.sql
```

### Variables de Entorno Nuevas
```env
# Feature flag para servicios
VITE_ENABLE_SERVICES=true
```

### Pasos Post-Deploy
1. Verificar que los servicios aparecen en UI
2. Validar pricing dinámico
3. Probar flujo completo de añadir/editar

---

## 🔍 Revisión Adicional

### Áreas de Atención
- Lógica de pricing dinámico en `ServiceManager.jsx`
- Validaciones de negocio en Edge Function `manage_service`

### Testing Manual Recomendado
1. Crear alojamiento nuevo y añadir servicios
2. Editar servicios existentes
3. Eliminar servicios y verificar impacto

### Decisiones de Diseño
- Usar pricing dinámico para flexibilidad futura
- Implementar soft delete para servicios

---

## 📊 Impact Analysis

### Performance
- [x] No hay degradación de performance
- [x] He medido el impacto (Lighthouse score: 95)

### Security
- [x] No hay vulnerabilidades introducidas
- [x] Datos sensibles no se exponen
- [x] RLS policies cubren nuevas tablas/columnas

### Accessibility
- [x] Navegación por teclado funciona
- [x] Contraste de colores es adecuado
- [x] Screen readers funcionan correctamente

---

## 📌 Notas Adicionales
Esta feature es crítica para el MVP de Q2. Los servicios adicionales representan un 15% del revenue esperado.
```

---

## 🎯 Mejores Prácticas

### Para el Developer
1. **Completar todas las secciones** relevantes
2. **Ser específico** en descripciones
3. **Incluir evidencia** de tests
4. **Mencionar breaking changes** si aplica
5. **Probar localmente** antes de crear PR

### Para el Reviewer
1. **Verificar checklist** completo
2. **Ejecutar tests manualmente**
3. **Validar preview deploy**
4. **Revisar impacto** en performance
5. **Aprobar con comentarios** constructivos

### Para el Product Owner
1. **Validar criterios de aceptación**
2. **Probar en staging**
3. **Verificar valor de negocio**
4. **Aprobar merge** con confianza

---

## 📊 Métricas de Pull Requests

### KPIs Importantes
- **Time to Merge**: Tiempo desde creación hasta merge
- **Review Time**: Tiempo de revisión
- **Merge Success Rate**: % de PRs que se mergearon
- **Rollback Rate**: % de PRs que necesitaron rollback
- **Test Coverage**: Cobertura de tests por PR

### Alerts y Thresholds
- **PR > 3 días sin merge**: Alerta al Product Owner
- **Coverage < 80%**: Bloqueo automático
- **Tests failing**: Bloqueo automático
- **Conflicts > 2 días**: Requiere intervención

---

## 🔗 Integración con CI/CD

### GitHub Actions
- **pr-checks.yml**: Validación automática
- **deploy-staging.yml**: Deploy automático a staging
- **deploy-production.yml**: Deploy automático a production

### Quality Gates
- **Lint**: ESLint y Prettier
- **Tests**: Unitarios, BDD, E2E
- **Security**: Snyk scan
- **Performance**: Lighthouse CI

### Preview Deploy
- **Vercel**: Deploy automático por PR
- **URL única**: Cada PR tiene su preview
- **Comentarios**: Bot comenta con URL de preview

---

## ✅ FASE 3 Completada

### Implementación
- ✅ Template creado y configurado
- ✅ Workflow estandarizado
- ✅ Checklists exhaustivos
- ✅ Integración con CI/CD
- ✅ Validación en GitHub completada

### Beneficios
- 📋 PRs consistentes y completos
- 🔄 Proceso de review estandarizado
- 🚀 Deploy notes claros
- 📊 Métricas de seguimiento
- 🛡️ Quality gates automáticos

### Próximo Paso
**FASE 4**: GitHub Workflows (CI/CD) para automatizar todo el proceso de build, test y deploy.

---

## 📝 Notas para Claude AI

1. **Revisar Issue Relacionado** para entender contexto
2. **Validar Tests** en checklist del PR
3. **Verificar Deploy Notes** para migraciones necesarias
4. **Revisar Impact Analysis** para efectos secundarios
5. **Asegurar Coverage** >= 80% antes de aprobar

---

## 🔗 Referencias

- [GitHub Pull Request Templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository)
- [SmartRoom SDLC Plan](./sdlc-enterprise-saas-9f1066.md)
- [Testing Structure](./ESTRUCTURA-TESTING-FASE1.md)
- [Issue Templates](./GITHUB-ISSUE-TEMPLATES-FASE2.md)
