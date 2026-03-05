# 🚨 Aplicar Migraciones en PRODUCCIÓN

**Proyecto**: Smart Room Rental DB Pro (`oeofdvkilcuidxainuow`)  
**URL SQL Editor**: https://supabase.com/dashboard/project/oeofdvkilcuidxainuow/sql/new

---

## ⚠️ IMPORTANTE: Ejecutar EN ORDEN

Copia y ejecuta cada archivo SQL **uno por uno** en el orden indicado:

### 1. `20260122_fix_rls_recursion.sql`
### 2. `20260126_add_contact_fields_companies.sql`
### 3. `20260211120000_create_plans_catalog.sql`
### 4. `20260211120001_create_client_accounts.sql`
### 5. `20260211120002_create_entities.sql`
### 6. `20260211120003_alter_profiles.sql`
### 7. `20260211120004_rls_new_tables.sql`
### 8. `20260213120000_adapt_plans_add_stripe_events.sql`
### 9. `20260214120000_rename_student_to_lodger.sql`
### 10. `20260226_complete_rls_policies.sql`
### 11. **`20260301000000_create_accommodations_rooms_lodgers.sql`** ⬅️ NUEVA

---

## ✅ Después de aplicar migraciones:

Producción tendrá todas las tablas necesarias:
- ✅ `plans_catalog`
- ✅ `client_accounts`
- ✅ `entities`
- ✅ `profiles`
- ✅ `accommodations`
- ✅ `rooms`
- ✅ `lodgers`

---

## 🔄 Siguiente paso:

Copiar datos de DEV a Producción (igual que hicimos con Staging).
