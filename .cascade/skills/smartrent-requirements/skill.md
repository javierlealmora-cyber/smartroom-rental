# SmartRent System Requirements Agent

## Description
Expert agent for the SmartRent rental management SaaS platform. Provides authoritative guidance on system architecture, database schema, business rules, role permissions, UI/UX patterns, and implementation standards based on the official requirements document v1.3.

## When to use this skill
This skill should be invoked when:
- Writing or reviewing code for SmartRent features
- Questions about database schema, table columns, or relationships
- Implementing role-based permissions (superadmin/admin/api/lodger/viewer)
- Working with multi-tenant architecture and client_account_id filtering
- Implementing plan-based restrictions (Basic/Investor/Business/Agency)
- Building UI components for admin or lodger portals
- Working with energy consumption module (readings/bills/settlements/bulletins)
- Questions about authentication, Supabase integration, or RLS policies
- Validating that implementation follows project standards
- Onboarding to the project or understanding system architecture

## Triggers
- SmartRent, smartroom, rental management
- client_account, tenant, multi-tenant
- lodger, inquilino, student, accommodation, alojamiento
- energy consumption, consumo, energy_readings, energy_bills
- plan restrictions, Basic plan, Investor, Business, Agency
- Supabase, auth.users, RLS, row level security
- legal_companies, internal_companies, fiscal
- room_occupancies, lodger_room_assignments
- role permissions, superadmin, admin, api, viewer
- UI layout, topbar, V2Layout, Ant Design

## Key Knowledge Areas

### Stack & Technologies
- **Frontend:** React + Vite, Ant Design (antd), @ant-design/icons, Recharts, dayjs
- **Backend:** Supabase (PostgreSQL), Supabase Auth (GoTrue), Supabase Storage
- **Edge Functions:** Deno
- **Automation:** n8n (energy readings, notifications)
- **Deploy:** Netlify
- **Production URL:** https://smartroomrentalplatform.com
- **Supabase Project ID:** lqwyyyttjamirccdtlvl

### Critical Database Schema Rules
- **rooms table:** Has `square_meters`, `bathroom_type`, `kitchen_type`, `number`. Does NOT have `floor`, `type`, `capacity`, `area_m2`.
- **accommodations table:** Has `address_line1` (NOT `address`), `city`, `owner_entity_id`, `split_electricity`, `split_mode_electricity`.
- **entities table:** NO direct `name` column. Use `legal_name` (juridica) or `first_name`+`last_name1`+`last_name2` (fisica/autonomo). Field `legal_type`: `persona_juridica` | `persona_fisica` | `autonomo`.
- **energy_bills table:** Has `amount_energy`, `amount_power`, `amount_meter`, `amount_taxes`, `amount_total`. Does NOT have `total_amount`, `amount_fixed`, `amount_variable`.
- **lodgers table:** Email field links to `auth.users.email` for login.
- **lodger_room_assignments:** Links lodger to room with `move_in_date`, `move_out_date`, `billing_start_date`, `monthly_rent`, `status`.

### Authentication Critical Rules
When inserting users manually into `auth.users`:
1. MUST insert record in `auth.identities` with `provider='email'`
2. MUST set string fields to empty `''` (not NULL): `email_change`, `email_change_token_new`, `email_change_token_current`, `recovery_token`, `confirmation_token`
3. DO NOT touch `phone` field if unique constraint exists

### UI/Layout Standards
- **Topbar height:** 48px (not 64px)
- **Header marginBottom:** 12px (not 24 or 32)
- **Filter section marginBottom:** 12px
- **Entity/Accommodation cards:** Grid `xs={24} sm={12} md={8} xl={6}` (max 4 columns)
- **Card image height:** 180px
- **Standard filters:** Search bar + Checkbox "Mostrar desactivados" + Button "Limpiar" with ReloadOutlined icon

### Role Permissions Matrix
- **superadmin:** Manages SaaS, creates client_accounts, cannot do daily operations
- **admin:** Manages tenant operations (accommodations, rooms, lodgers), cannot change plan/status
- **api:** Creates lodgers, assigns rooms, manages check-ins/outs, cannot create accommodations
- **lodger/student:** Views own room, consumption (always), bulletins, services (if active)
- **viewer (Agency only):** Read-only access to 1 internal_company_id

### Plan-Based Restrictions
| Plan | Accommodations | Internal Companies | Fiscal Companies | Theming |
|------|---------------|-------------------|-----------------|---------|
| Basic | 1-3 | 1 (hidden) | Optional | Standard |
| Investor | 1-8 | 1 (hidden) | 1..N | Custom |
| Business | Unlimited | 1 (hidden) | 1..N | Custom + services |
| Agency | Unlimited | 1..N (visible) | 1..N | Custom + viewer role |

### Energy Module Flow
```
IoT Meter → n8n → energy_readings (accommodation_id, room_id, kwh, reading_date)
                        ↓
                  energy_bills (monthly, per accommodation)
                        ↓
                  energy_settlements (per room/lodger, prorated or shared)
                        ↓
                  bulletins (sent to lodger, status: draft/published)
```

**Split modes:**
- `prorated`: proportional to measured kWh per room
- `shared`: equal split (total / active rooms)

### Visor de Consumos (Admin)
- Always shows last 12 months grouped by month
- NO month/year filters (removed)
- Filter by room (all or specific)
- LineChart with one line per room
- X-axis: `MMM YY` format
- Y-axis: kWh

### Demo Data Loaded
- **Accommodation:** Residencia Dycsa Madrid Sur (ID: `aa515883-6b3a-4d36-ac58-9f5806f6a111`)
- **Lodgers:** carlos.demo, lucia.demo, ahmed.demo, sofia.demo (password: `Demo1234!`)
- **Energy data:** 36 readings (Sep 2025 - Feb 2026), 6 bills, 20 settlements, 24 bulletins

## Implementation Guidelines

### Code Style
- Use existing patterns from codebase
- Follow Ant Design component conventions
- Use `formatEntityName(entity)` helper for displaying entity names
- Always filter by `client_account_id` in queries (multi-tenant)
- Use `supabase.from('table').select('...')` pattern
- Verify column names with `information_schema.columns` before coding

### Common Pitfalls to Avoid
- ❌ Using `address` instead of `address_line1` in accommodations
- ❌ Querying `floor`, `type`, `capacity`, `area_m2` from rooms (don't exist)
- ❌ Using `entity.name` directly (use formatEntityName helper)
- ❌ Setting auth.users fields to NULL instead of empty strings
- ❌ Forgetting to create auth.identities when manually inserting auth.users
- ❌ Using LIKE operator on UUID columns without cast
- ❌ Hardcoding column names without verifying schema first

### Testing Checklist
- Verify queries return expected data structure
- Test with demo users (carlos.demo@smartroom.es, etc.)
- Check RLS policies filter by client_account_id correctly
- Validate role permissions (admin can't see other tenants)
- Test plan restrictions (Basic can't create >3 accommodations)
- Verify UI layout matches standards (48px topbar, 12px margins)

## Reference Document
All information in this skill is derived from:
`Requisitos_smartrent_system_para_claude_v1.3.md` (655 lines, updated 2026-02-25)

For detailed specifications on any topic, refer to the full requirements document.
