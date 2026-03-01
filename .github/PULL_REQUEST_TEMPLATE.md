## 📝 Descripción

<!-- Describe brevemente qué hace este PR y por qué es necesario -->



---

## 🔗 Issue Relacionado

Closes #<!-- número del issue -->

<!-- Si NO hay issue asociado, explica el motivo del PR -->

---

## 🎯 Tipo de Cambio

- [ ] 🐛 Bug fix (cambio que soluciona un problema)
- [ ] ✨ Nueva feature (cambio que añade funcionalidad)
- [ ] 💥 Breaking change (fix o feature que causa que funcionalidad existente deje de funcionar)
- [ ] 📝 Documentación (cambios solo en documentación)
- [ ] 🎨 Estilo/Refactor (cambios de formato, refactoring sin cambiar funcionalidad)
- [ ] ⚡ Performance (mejora de rendimiento)
- [ ] 🧪 Tests (añadir o corregir tests)

---

## 🧪 Tests Realizados

### Tests Automáticos
- [ ] Tests unitarios pasando (`npm test`)
- [ ] Tests BDD pasando (`npm run test:features`)
- [ ] Tests E2E smoke pasando (`npm run test:e2e:smoke`)
- [ ] Coverage >= 80% (`npm run test:coverage`)

### Tests Manuales
<!-- Describe qué tests manuales has realizado -->

- [ ] Probado en navegador: Chrome / Firefox / Safari
- [ ] Probado en móvil / tablet
- [ ] Validado en Preview Deploy
- [ ] Verificado que cumple criterios de aceptación del Issue

**Evidencia de tests:**
<!-- Screenshots, logs, o descripción de resultados -->



---

## 📸 Screenshots (si aplica)

<!-- Añade screenshots de cambios visuales -->

### Antes
<!-- Screenshot del estado anterior -->

### Después
<!-- Screenshot del nuevo estado -->

---

## ✅ Checklist Pre-Merge

### Code Quality
- [ ] El código sigue las convenciones del proyecto
- [ ] He revisado mi propio código (self-review)
- [ ] He comentado código complejo donde es necesario
- [ ] No hay console.logs, debuggers ni código comentado
- [ ] Imports están organizados
- [ ] No hay warnings de ESLint

### Testing
- [ ] He añadido tests para cubrir los cambios
- [ ] Todos los tests existentes siguen pasando
- [ ] He ejecutado tests localmente antes de crear el PR
- [ ] Coverage se mantiene >= 80%

### Database/Backend
- [ ] Migraciones incluidas (si aplica)
- [ ] Migraciones testeadas localmente
- [ ] Datos estáticos actualizados (si aplica)
- [ ] Edge Functions actualizadas (si aplica)
- [ ] RLS policies revisadas (si aplica)

### Documentation
- [ ] README actualizado (si aplica)
- [ ] Comentarios de código añadidos donde es complejo
- [ ] Documentación técnica actualizada (si aplica)

### Deploy
- [ ] Preview deploy revisado y funcional
- [ ] No hay conflictos con la rama base
- [ ] Variables de entorno documentadas (si se añaden nuevas)

---

## 🚀 Deploy Notes

<!-- Instrucciones especiales para el deploy, si las hay -->

### Migraciones a Ejecutar
<!-- Lista de migraciones que se deben aplicar -->

```bash
# Ejemplo:
# supabase db push
```

### Datos Estáticos a Aplicar
<!-- Scripts de static-data que se deben ejecutar -->

```bash
# Ejemplo:
# npx supabase db execute --file supabase/static-data/01_plans_catalog.sql
```

### Variables de Entorno Nuevas
<!-- Variables nuevas que se deben configurar en Vercel/Supabase -->

```env
# Ejemplo:
# VITE_NEW_FEATURE_FLAG=true
```

### Pasos Post-Deploy
<!-- Acciones manuales necesarias después del deploy -->

1. 
2. 

---

## 🔍 Revisión Adicional

<!-- Información adicional para el reviewer -->

### Áreas de Atención
<!-- Partes del código que requieren especial atención en el review -->



### Testing Manual Recomendado
<!-- Flujos específicos que el reviewer debería probar -->

1. 
2. 

### Decisiones de Diseño
<!-- Decisiones importantes tomadas durante la implementación -->



---

## 📊 Impact Analysis

### Performance
- [ ] No hay degradación de performance
- [ ] He medido el impacto (Lighthouse, bundle size, etc.)

### Security
- [ ] No hay vulnerabilidades introducidas
- [ ] Datos sensibles no se exponen
- [ ] RLS policies cubren nuevas tablas/columnas

### Accessibility
- [ ] Navegación por teclado funciona
- [ ] Contraste de colores es adecuado
- [ ] Screen readers funcionan correctamente

---

## 📌 Notas Adicionales

<!-- Cualquier otra información relevante para el reviewer -->
