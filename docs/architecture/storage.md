# Storage - SmartRoom Rental

**Consolidado desde:** `docs/storage-structure.md`  
**Última actualización:** 2026-03-28  
**Versión:** 1.0

---

## 📁 Estructura de Storage en Supabase

### Buckets Principales

SmartRoom Rental utiliza **un bucket público** y **un bucket privado**:

```
Supabase Storage
├── company-assets (PUBLIC)          ← Logos y assets públicos
└── smartrent-systems (PRIVATE)      ← Documentos privados por tenant
```

---

## 🌐 Bucket Público: `company-assets`

### Propósito
Almacenar recursos públicos de las empresas (logos, favicons).

### Estructura

```
company-assets/ (bucket - PUBLIC)
└── logos/
    └── {company-slug}/
        ├── logo.png
        ├── logo-dark.png (opcional)
        └── favicon.ico (opcional)
```

### Ejemplo de URLs

```
https://lqwyyyttjamirccdtlvl.supabase.co/storage/v1/object/public/company-assets/logos/housing-space-solutions/logo.png
https://lqwyyyttjamirccdtlvl.supabase.co/storage/v1/object/public/company-assets/logos/acme-corp/logo.png
```

### Configuración del Bucket

**Propiedades:**
- **Nombre:** `company-assets`
- **Público:** ✅ Sí
- **File size limit:** 5 MB
- **Allowed MIME types:** `image/png, image/jpeg, image/svg+xml, image/webp`

### Políticas de Storage (RLS)

```sql
-- Permitir lectura pública de todos los assets
CREATE POLICY "Public read access to company assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-assets');

-- Solo superadmin puede subir/actualizar logos
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

---

## 🔒 Bucket Privado: `smartrent-systems`

### Propósito
Almacenar documentos privados por tenant (contratos, facturas, documentos de entidades).

### Estructura Completa

```
smartrent-systems/ (bucket - PRIVATE)
└── {client_account_id}/
    ├── entities/
    │   └── {entity_id}/
    │       └── docs/                    ← Documentos de la entidad
    │           ├── escrituras/
    │           ├── poderes/
    │           └── contratos/
    │
    └── accommodations/
        └── {accommodation_id}/
            ├── bills/                   ← Facturas de consumo
            │   ├── electricity/
            │   │   └── {bill_id}.pdf
            │   ├── water/
            │   │   └── {bill_id}.pdf
            │   └── gas/
            │       └── {bill_id}.pdf
            ├── docs/                    ← Documentos del alojamiento
            │   ├── licenses/
            │   ├── insurance/
            │   └── certificates/
            └── rooms/
                └── {room_id}/
                    └── contracts/       ← Contratos de inquilinos
                        └── {lodger_id}_{date}.pdf
```

### Ejemplo de Paths

```
smartrent-systems/
  └── 550e8400-e29b-41d4-a716-446655440000/          ← client_account_id
      ├── entities/
      │   └── 660e8400-e29b-41d4-a716-446655440001/  ← entity_id
      │       └── docs/
      │           └── escritura_propiedad.pdf
      │
      └── accommodations/
          └── 770e8400-e29b-41d4-a716-446655440002/  ← accommodation_id
              ├── bills/
              │   └── electricity/
              │       └── 2026-03-factura-luz.pdf
              └── rooms/
                  └── 880e8400-e29b-41d4-a716-446655440003/  ← room_id
                      └── contracts/
                          └── lodger-123_2026-01-15.pdf
```

### Políticas de Storage (RLS)

```sql
-- Los usuarios solo pueden ver archivos de su tenant
CREATE POLICY "Users can view their tenant files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'smartrent-systems'
  AND (storage.foldername(name))[1] = (
    SELECT client_account_id::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Los usuarios pueden subir archivos a su tenant
CREATE POLICY "Users can upload to their tenant"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'smartrent-systems'
  AND (storage.foldername(name))[1] = (
    SELECT client_account_id::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Los usuarios pueden actualizar archivos de su tenant
CREATE POLICY "Users can update their tenant files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'smartrent-systems'
  AND (storage.foldername(name))[1] = (
    SELECT client_account_id::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Los usuarios pueden eliminar archivos de su tenant
CREATE POLICY "Users can delete their tenant files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'smartrent-systems'
  AND (storage.foldername(name))[1] = (
    SELECT client_account_id::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Superadmin puede acceder a todo
CREATE POLICY "Superadmin full access"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'smartrent-systems'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  )
);
```

---

## 💻 Implementación en Código

### Upload de Logo (Superadmin)

```javascript
// En la Edge Function provision_company o en el frontend

// 1. Crear la empresa en la BD
const { data: company, error } = await supabase
  .from('client_accounts')
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
      .from('client_accounts')
      .update({ logo_url: logoUrl })
      .eq('id', company.id);
  }
}
```

### Upload de Documento Privado (Tenant)

```javascript
// En TenantEdit.jsx o similar

const uploadDocument = async (file, lodgerId, roomId) => {
  const clientAccountId = profile.client_account_id;
  const accommodationId = room.accommodation_id;
  const fileName = `${lodgerId}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  const filePath = `${clientAccountId}/accommodations/${accommodationId}/rooms/${roomId}/contracts/${fileName}`;

  const { data, error } = await supabase
    .storage
    .from('smartrent-systems')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false, // No reemplazar
    });

  if (error) {
    console.error('Error uploading:', error);
    return null;
  }

  return filePath;
};
```

### Download de Documento Privado (Signed URL)

```javascript
// Generar URL firmada para descarga

const downloadDocument = async (filePath) => {
  const { data, error } = await supabase
    .storage
    .from('smartrent-systems')
    .createSignedUrl(filePath, 60); // 60 segundos de validez

  if (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }

  return data.signedUrl;
};

// Uso
const signedUrl = await downloadDocument(filePath);
if (signedUrl) {
  window.open(signedUrl, '_blank');
}
```

### Mostrar Logo en Frontend

```javascript
// En CompaniesList.jsx o similar

<div style={styles.companyIcon}>
  {company.logo_url ? (
    <img 
      src={company.logo_url} 
      alt={company.name} 
      style={styles.companyLogo} 
    />
  ) : (
    company.name?.[0]?.toUpperCase() || "E"
  )}
</div>
```

---

## 📝 Nomenclatura Recomendada

### Slugs de Empresa
- **Formato:** lowercase, separado por guiones
- **Ejemplo:** `housing-space-solutions`

### Archivos de Logo
- **Formato:** `logo.png` o `logo.svg`
- **Ruta completa:** `logos/housing-space-solutions/logo.png`

### Documentos Privados
- **Contratos:** `{lodger_id}_{YYYY-MM-DD}.pdf`
- **Facturas:** `{YYYY-MM}-factura-{tipo}.pdf`
- **Documentos entidad:** `{tipo}_{descripcion}.pdf`

---

## 🎨 Consideraciones Técnicas

### 1. Optimización de Imágenes

**Logos:**
- Comprimir antes de subir (TinyPNG, ImageOptim)
- Tamaño recomendado: 400x400px o 512x512px
- Formato: PNG con transparencia o SVG

**Documentos:**
- PDF optimizados (< 5MB por archivo)
- Comprimir PDFs grandes antes de subir

### 2. Cache

**Supabase Storage incluye CDN con cache:**
- Header `Cache-Control: 3600` = 1 hora de cache
- Logos públicos se cachean automáticamente
- Documentos privados no se cachean (signed URLs)

### 3. Fallback

**Si no hay logo:**
- Mostrar iniciales de la empresa en un círculo de color
- Color generado a partir del nombre (hash)

```javascript
const getColorFromName = (name) => {
  const hash = name.split('').reduce((acc, char) => 
    char.charCodeAt(0) + ((acc << 5) - acc), 0
  );
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
};
```

### 4. Seguridad

**Validaciones obligatorias:**
- Verificar tipo MIME del archivo
- Verificar tamaño del archivo
- Sanitizar nombres de archivo
- Validar permisos del usuario

```javascript
const validateFile = (file, maxSizeMB = 5) => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'application/pdf'];
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Tipo de archivo no permitido');
  }
  
  if (file.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`Archivo demasiado grande (máx ${maxSizeMB}MB)`);
  }
  
  return true;
};
```

---

## 🔄 Migración de Storage

### Crear Buckets

```sql
-- Ejecutar en Supabase Dashboard > Storage

-- 1. Crear bucket público
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true);

-- 2. Crear bucket privado
INSERT INTO storage.buckets (id, name, public)
VALUES ('smartrent-systems', 'smartrent-systems', false);
```

### Aplicar Políticas RLS

```sql
-- Ver secciones anteriores para políticas completas
-- Aplicar en: Supabase Dashboard > Storage > Policies
```

---

## 📊 Límites de Storage

### Plan Gratuito de Supabase
- **Storage total:** 1 GB
- **Bandwidth:** 2 GB/mes
- **File uploads:** Ilimitados

### Plan Pro de Supabase
- **Storage total:** 100 GB (+ $0.021/GB adicional)
- **Bandwidth:** 200 GB/mes (+ $0.09/GB adicional)
- **File uploads:** Ilimitados

**Recomendación:** Monitorear uso de storage y bandwidth regularmente.

---

## 🔗 Referencias

- **Modelo de Datos:** `docs/architecture/data-model.md`
- **Seguridad:** `docs/architecture/security.md`
- **Supabase Storage Docs:** https://supabase.com/docs/guides/storage

---

**Consolidado desde:** `docs/storage-structure.md`  
**Última actualización:** 2026-03-28  
**Versión:** 1.0
