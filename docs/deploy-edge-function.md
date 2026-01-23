# Cómo Desplegar la Edge Function provision_company

La Edge Function `provision_company` está creada en el proyecto local en:
```
supabase/functions/provision_company/index.ts
```

Sin embargo, para que funcione el alta de empresas, **debes desplegarla manualmente en Supabase**.

## Opción 1: Desplegar desde Supabase Dashboard (Recomendado)

1. **Accede al Dashboard de Supabase**
   - Ve a: https://supabase.com/dashboard/project/lqwyyyttjamirccdtlvl
   - Navega a: **Edge Functions** (menú lateral)

2. **Crear Nueva Función**
   - Click en **"Create a new function"** o **"New Function"**
   - Nombre: `provision_company`
   - Click en **"Create function"**

3. **Copiar el código**
   - Abre el archivo local: `supabase/functions/provision_company/index.ts`
   - Copia TODO el contenido del archivo
   - Pégalo en el editor del Dashboard
   - Click en **"Deploy"**

4. **Verificar el despliegue**
   - La función debería aparecer en la lista de Edge Functions
   - Estado: "Deployed" (verde)

## Opción 2: Desplegar con Supabase CLI (Requiere instalación)

Si prefieres usar el CLI:

### Instalar Supabase CLI (Windows)

```bash
# Con npm (recomendado)
npm install -g supabase

# Con chocolatey
choco install supabase

# Con scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Hacer Login y Desplegar

```bash
# 1. Login en Supabase CLI
supabase login

# 2. Enlazar el proyecto
supabase link --project-ref lqwyyyttjamirccdtlvl

# 3. Desplegar la función
supabase functions deploy provision_company

# 4. Verificar el despliegue
supabase functions list
```

## Verificar que funciona

Una vez desplegada, prueba crear una empresa desde el formulario:

1. Ve a: http://localhost:5173/superadmin/companies/new
2. Rellena los datos
3. Click en "Registrar Empresa"
4. Si hay error, revisa la consola del navegador y los logs de Supabase

## Variables de entorno requeridas

La Edge Function necesita estas variables de entorno (ya deberían estar configuradas en Supabase):

- `SUPABASE_URL`: URL de tu proyecto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key (con permisos de admin)

Estas variables se configuran automáticamente en Supabase, **no necesitas hacer nada adicional**.

## Solución de problemas

### Error: "Missing authorization"
- Verifica que estés logueado correctamente
- Revisa que el token de autenticación se esté enviando

### Error: "Forbidden: Only superadmin can provision companies"
- Tu usuario debe tener el rol "superadmin" en la tabla `profiles`
- Verifica con: `SELECT * FROM profiles WHERE id = '<tu-user-id>'`

### Error: "Error creating company"
- Revisa los logs de la Edge Function en el Dashboard
- Ve a: Edge Functions > provision_company > Logs
- Busca detalles del error

### Error: "Error creating admin user"
- El email del admin puede estar ya registrado
- Verifica que el email sea válido y único

## Estado actual

✅ Edge Function creada localmente
⏳ **Pendiente: Desplegar en Supabase**
⏳ Probar alta de empresa end-to-end

## Próximos pasos después del despliegue

1. Probar crear una empresa desde el formulario
2. Verificar que se crea correctamente en la tabla `companies`
3. Verificar que se crea el usuario admin en Supabase Auth
4. Verificar que se crea el perfil del admin en la tabla `profiles`
5. Implementar upload de logos a Storage (futuro)
