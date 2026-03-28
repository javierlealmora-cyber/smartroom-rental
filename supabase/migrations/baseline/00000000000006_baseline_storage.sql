-- ============================================================================
-- BASELINE CERO: Storage (Buckets y Políticas)
-- Descripción: Configuración de buckets de storage y políticas de acceso
-- ============================================================================

-- ============================================================================
-- BUCKETS
-- ============================================================================

-- Bucket: accommodation-invoices
-- Facturas de servicios (electricidad, agua, gas, otros) por alojamiento
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'accommodation-invoices',
  'accommodation-invoices',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket: room-contracts
-- Contratos y documentos por habitación
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'room-contracts',
  'room-contracts',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- POLÍTICAS DE STORAGE: accommodation-invoices
-- ============================================================================

-- SELECT: superadmin ve todo, admin ve archivos de su tenant
CREATE POLICY "accommodation_invoices_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'accommodation-invoices'
  AND (
    -- Superadmin puede ver todo
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
    OR
    -- Admin puede ver archivos de su client_account
    -- El path debe ser: {client_account_id}/{accommodation_id}/{filename}
    (SELECT client_account_id FROM public.profiles WHERE id = auth.uid()) = (storage.foldername(name))[1]::uuid
  )
);

-- INSERT: superadmin o admin de su tenant
CREATE POLICY "accommodation_invoices_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'accommodation-invoices'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
    OR
    (SELECT client_account_id FROM public.profiles WHERE id = auth.uid()) = (storage.foldername(name))[1]::uuid
  )
);

-- UPDATE: superadmin o admin de su tenant
CREATE POLICY "accommodation_invoices_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'accommodation-invoices'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
    OR
    (SELECT client_account_id FROM public.profiles WHERE id = auth.uid()) = (storage.foldername(name))[1]::uuid
  )
);

-- DELETE: superadmin o admin de su tenant
CREATE POLICY "accommodation_invoices_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'accommodation-invoices'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
    OR
    (SELECT client_account_id FROM public.profiles WHERE id = auth.uid()) = (storage.foldername(name))[1]::uuid
  )
);

-- ============================================================================
-- POLÍTICAS DE STORAGE: room-contracts
-- ============================================================================

-- SELECT: superadmin ve todo, admin ve archivos de su tenant
CREATE POLICY "room_contracts_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'room-contracts'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
    OR
    (SELECT client_account_id FROM public.profiles WHERE id = auth.uid()) = (storage.foldername(name))[1]::uuid
  )
);

-- INSERT: superadmin o admin de su tenant
CREATE POLICY "room_contracts_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'room-contracts'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
    OR
    (SELECT client_account_id FROM public.profiles WHERE id = auth.uid()) = (storage.foldername(name))[1]::uuid
  )
);

-- UPDATE: superadmin o admin de su tenant
CREATE POLICY "room_contracts_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'room-contracts'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
    OR
    (SELECT client_account_id FROM public.profiles WHERE id = auth.uid()) = (storage.foldername(name))[1]::uuid
  )
);

-- DELETE: superadmin o admin de su tenant
CREATE POLICY "room_contracts_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'room-contracts'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
    OR
    (SELECT client_account_id FROM public.profiles WHERE id = auth.uid()) = (storage.foldername(name))[1]::uuid
  )
);

-- ============================================================================
-- COMENTARIOS
-- ============================================================================
COMMENT ON POLICY "accommodation_invoices_select" ON storage.objects IS 
'Superadmin ve todas las facturas, admin ve facturas de su client_account';

COMMENT ON POLICY "room_contracts_select" ON storage.objects IS 
'Superadmin ve todos los contratos, admin ve contratos de su client_account';

-- Verificación
SELECT 'Storage buckets y políticas creados exitosamente' as status;
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id IN ('accommodation-invoices', 'room-contracts');
