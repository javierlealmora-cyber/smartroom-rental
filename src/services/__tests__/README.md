# Tests BDD - Servicio de Planes

## 🧪 Ejecutar Tests

```bash
# Instalar dependencias (si no lo has hecho)
npm install

# Ejecutar todos los tests
npm test

# Ejecutar solo tests de planes
npm test plans.service.test.js

# Ejecutar tests en modo watch
npm test -- --watch

# Ejecutar tests con cobertura
npm test -- --coverage
```

## 📋 Escenarios Cubiertos

### ✅ Validación de Campos Requeridos (6 escenarios)
- Crear plan con campos mínimos requeridos
- Validar error sin campo `name`
- Validar error sin campo `code`
- Validar error sin campo `monthly_price`
- Crear plan con campos opcionales
- Crear plan sin campos opcionales

### ✅ Validación de Constraints (5 escenarios)
- Validar status con valor inválido
- Validar status con valores válidos
- Validar código único (UNIQUE)
- Validar monthly_price positivo
- Validar end_date posterior a start_date

### ✅ Campos Calculados (3 escenarios)
- Verificar cálculo automático de annual_price
- Verificar cálculo con diferentes descuentos
- Verificar que annual_price manual se ignora (GENERATED)

### ✅ CRUD Básico (6 escenarios)
- Listar todos los planes
- Filtrar planes activos
- Buscar plan por código
- Actualizar plan existente
- Desactivar plan
- Duplicar plan

### ✅ Utilidades (3 escenarios)
- calculateAnnualPrice
- isPlanActive
- validatePlanData

## 📊 Cobertura Esperada

- **Líneas:** > 80%
- **Funciones:** > 90%
- **Branches:** > 75%

## 🔧 Configuración

Los tests requieren:
- Vitest configurado
- Conexión a Supabase (dev)
- Variables de entorno correctas

## 🧹 Limpieza

Los tests limpian automáticamente los datos de prueba después de cada ejecución usando `afterEach(cleanupTestPlans)`.

## 📝 Notas

- Los tests usan códigos que empiezan con `test_` para facilitar limpieza
- Se verifica que `annual_price` se calcula automáticamente (campo GENERATED)
- Se validan todos los campos obligatorios vs opcionales según el schema de BD
