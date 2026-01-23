# Estructura de Storage en Supabase

## Organización de Logos por Empresa

### Buckets de Storage

Se recomienda crear **un bucket público** llamado `company-assets` para almacenar todos los recursos relacionados con las empresas.

```
company-assets/ (bucket - PUBLIC)
├── logos/
│   ├── {company-slug}/
│   │   ├── logo.png
│   │   ├── logo-dark.png (opcional)
│   │   └── favicon.ico (opcional)
```

### Alternativa: Un bucket por empresa

Si prefieres mayor aislamiento, puedes crear un bucket por empresa:

```
{company-slug}-assets/ (bucket - PUBLIC)
├── logo.png
├── logo-dark.png
├── favicon.ico
└── otros-recursos/
```

### Recomendación: Bucket único con carpetas

**Recomendamos usar un solo bucket público con carpetas organizadas por empresa** porque:

1. ✅ Más fácil de gestionar
2. ✅ Menos overhead de configuración
3. ✅ Las URLs son más predecibles
4. ✅ Permisos más simples de mantener

### Ejemplo de URLs

Con la estructura recomendada:

```
https://lqwyyyttjamirccdtlvl.supabase.co/storage/v1/object/public/company-assets/logos/housing-space-solutions/logo.png
https://lqwyyyttjamirccdtlvl.supabase.co/storage/v1/object/public/company-assets/logos/acme-corp/logo.png
```

### Configuración del Bucket

1. **Crear el bucket en Supabase:**
   - Nombre: `company-assets`
   - Público: ✅ Sí
   - File size limit: 5 MB (suficiente para logos)
   - Allowed MIME types: `image/png, image/jpeg, image/svg+xml, image/webp`

2. **Políticas de Storage (RLS):**

```sql
-- Permitir lectura pública de todos los assets de empresas
CREATE POLICY "Public read access to company assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-assets');

-- Solo superadmin y admin de la empresa pueden subir/actualizar logos
CREATE POLICY "Superadmin can upload company assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  )
);

CREATE POLICY "Superadmin can update company assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  )
);

CREATE POLICY "Superadmin can delete company assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  )
);
```

### Implementación en el código

#### Al crear una empresa nueva

```javascript
// En la Edge Function provision_company o en el frontend

// 1. Crear la empresa en la BD
const { data: company, error } = await supabase
  .from('companies')
  .insert({
    name: 'Housing Space Solutions',
    slug: 'housing-space-solutions',
    // ... otros campos
  })
  .select()
  .single();

// 2. Si el usuario sube un logo, guardarlo en Storage
if (logoFile) {
  const filePath = `logos/${company.slug}/logo.png`;

  const { data, error: uploadError } = await supabase
    .storage
    .from('company-assets')
    .upload(filePath, logoFile, {
      cacheControl: '3600',
      upsert: true, // Reemplazar si ya existe
    });

  if (!uploadError) {
    // Actualizar la empresa con la URL del logo
    const logoUrl = `${supabaseUrl}/storage/v1/object/public/company-assets/${filePath}`;

    await supabase
      .from('companies')
      .update({ logo_url: logoUrl })
      .eq('id', company.id);
  }
}
```

#### Al mostrar el logo en el frontend

```javascript
// En CompaniesList.jsx (ya implementado)

<div style={styles.companyIcon}>
  {company.logo_url ? (
    <img src={company.logo_url} alt={company.name} style={styles.companyLogo} />
  ) : (
    company.name?.[0]?.toUpperCase() || "E"
  )}
</div>
```

### Nomenclatura recomendada

- **Slug de empresa:** `housing-space-solutions` (lowercase, separado por guiones)
- **Archivo de logo:** `logo.png` o `logo.svg`
- **Ruta completa:** `logos/housing-space-solutions/logo.png`

### Consideraciones técnicas

1. **Optimización de imágenes:**
   - Comprimir logos antes de subirlos (usar herramientas como TinyPNG)
   - Tamaño recomendado: 400x400px o 512x512px
   - Formato: PNG con transparencia o SVG

2. **Cache:**
   - Supabase Storage incluye CDN con cache
   - Header `Cache-Control: 3600` = 1 hora de cache

3. **Fallback:**
   - Si no hay logo, mostrar las iniciales de la empresa en un círculo de color

### Próximos pasos

1. ✅ Crear el bucket `company-assets` en Supabase
2. ✅ Aplicar las políticas de RLS
3. ⏳ Implementar upload de logos en CompanyCreate.jsx
4. ⏳ Permitir actualización de logos en la edición de empresas
