# Tools - SmartRoom Rental

**Propósito:** Herramientas de debug, testing y utilidades de desarrollo.

---

## 📁 Estructura

```
tools/
├── debug/                      # Herramientas de debug
│   ├── debug-auth.html        # Debug de autenticación
│   └── maintenance.html       # Página de mantenimiento
└── README.md                  # Este archivo
```

---

## 🔧 Herramientas Disponibles

### Debug

#### `debug/debug-auth.html`
**Propósito:** Herramienta de debug para autenticación  
**Uso:** Abrir en navegador para probar flujos de auth  
**Entorno:** Solo desarrollo/staging  

#### `debug/maintenance.html`
**Propósito:** Página de mantenimiento  
**Uso:** Mostrar durante mantenimiento programado  
**Entorno:** Producción (cuando sea necesario)  

---

## 🚫 Restricciones

- ❌ **NO usar en producción** (excepto maintenance.html)
- ❌ **NO commitear credenciales** en archivos de debug
- ❌ **NO exponer** herramientas de debug públicamente

---

## 📝 Convenciones

### Nombres de Archivos
- **debug-*.html** - Herramientas de debug
- **test-*.html** - Páginas de test
- **util-*.js** - Utilidades de desarrollo

---

**Última actualización:** 2026-03-28  
**Responsable:** DevOps / Staff Engineer
