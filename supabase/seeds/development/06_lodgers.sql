-- ============================================================================
-- SEED: Lodgers (Inquilinos)
-- Ambiente: development
-- Descripción: Inquilinos de ejemplo para testing
-- ============================================================================

-- Insertar inquilinos de ejemplo
INSERT INTO public.lodgers (
  id,
  client_account_id,
  full_name,
  first_name,
  last_name1,
  last_name2,
  email,
  phone,
  document_id,
  gender,
  status,
  notes,
  created_at,
  updated_at
)
VALUES
  (
    'l1111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Juan Pérez García',
    'Juan',
    'Pérez',
    'García',
    'juan.perez@email.com',
    '+34 600 200 001',
    '12345678A',
    'male',
    'active',
    'Inquilino desde hace 6 meses. Siempre puntual con pagos.',
    now(),
    now()
  ),
  (
    'l2222222-2222-2222-2222-222222222222',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'María García López',
    'María',
    'García',
    'López',
    'maria.garcia@email.com',
    '+34 600 200 002',
    '23456789B',
    'female',
    'active',
    'Estudiante de medicina. Muy responsable.',
    now(),
    now()
  ),
  (
    'l3333333-3333-3333-3333-333333333333',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Pedro Martínez Ruiz',
    'Pedro',
    'Martínez',
    'Ruiz',
    'pedro.martinez@email.com',
    '+34 600 200 003',
    '34567890C',
    'male',
    'active',
    'Trabajador en empresa tecnológica.',
    now(),
    now()
  ),
  (
    'l4444444-4444-4444-4444-444444444444',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Ana Rodríguez Sánchez',
    'Ana',
    'Rodríguez',
    'Sánchez',
    'ana.rodriguez@email.com',
    '+34 600 200 004',
    '45678901D',
    'female',
    'active',
    'Estudiante de arquitectura.',
    now(),
    now()
  ),
  (
    'l5555555-5555-5555-5555-555555555555',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Carlos López Fernández',
    'Carlos',
    'López',
    'Fernández',
    'carlos.lopez@email.com',
    '+34 600 200 005',
    '56789012E',
    'male',
    'active',
    'Profesor universitario.',
    now(),
    now()
  ),
  (
    'l6666666-6666-6666-6666-666666666666',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Laura Sánchez Díaz',
    'Laura',
    'Sánchez',
    'Díaz',
    'laura.sanchez@email.com',
    '+34 600 200 006',
    '67890123F',
    'female',
    'active',
    'Diseñadora gráfica freelance.',
    now(),
    now()
  ),
  (
    'l7777777-7777-7777-7777-777777777777',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Miguel Torres Moreno',
    'Miguel',
    'Torres',
    'Moreno',
    'miguel.torres@email.com',
    '+34 600 200 007',
    '78901234G',
    'male',
    'active',
    'Estudiante de ingeniería.',
    now(),
    now()
  ),
  (
    'l8888888-8888-8888-8888-888888888888',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Elena Jiménez Castro',
    'Elena',
    'Jiménez',
    'Castro',
    'elena.jimenez@email.com',
    '+34 600 200 008',
    '89012345H',
    'female',
    'invited',
    'Invitada pendiente de activación.',
    now(),
    now()
  ),
  (
    'l9999999-9999-9999-9999-999999999999',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'David Romero Gil',
    'David',
    'Romero',
    'Gil',
    'david.romero@email.com',
    '+34 600 200 009',
    '90123456I',
    'male',
    'inactive',
    'Ex-inquilino. Finalizó contrato el mes pasado.',
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  client_account_id = EXCLUDED.client_account_id,
  full_name = EXCLUDED.full_name,
  first_name = EXCLUDED.first_name,
  last_name1 = EXCLUDED.last_name1,
  last_name2 = EXCLUDED.last_name2,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  document_id = EXCLUDED.document_id,
  gender = EXCLUDED.gender,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  updated_at = now();

-- Verificación
SELECT 
  l.id,
  l.full_name,
  l.email,
  l.status,
  ca.name as client_account_name
FROM public.lodgers l
JOIN public.client_accounts ca ON l.client_account_id = ca.id
ORDER BY l.status, l.full_name;
