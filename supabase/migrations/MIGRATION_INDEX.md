# Migration Files - Execution Order

## Migration Sequence

Run these migrations in **numerical order** (001, 002, 003...) in Supabase SQL Editor:

1. **001_initial_schema.sql** - Initial database schema (profiles, courses, etc.)
2. **002_schema_updates.sql** - Schema updates
3. **003_additional_tables.sql** - Additional tables
4. **004_schema_changes.sql** - Schema changes
5. **005_updates.sql** - Updates
6. **006_schema_updates.sql** - Schema updates
7. **007_updates.sql** - Updates
8. **008_updates.sql** - Updates
9. **009_updates.sql** - Updates
10. **010_updates.sql** - Updates
11. **011_updates.sql** - Updates
12. **012_updates.sql** - Updates
13. **013_updates.sql** - Updates
14. **014_create_custom_roles_table.sql** - Custom roles table
15. **015_admin_enroll_function.sql** - Admin enrollment function
16. **016_fix_enrollment_rls.sql** - Fix enrollment RLS
17. **017_teacher_course_assignments.sql** - Teacher course assignments
18. **018_fix_security_definer_view.sql** - ⚠️ **CRITICAL**: Security fix
19. **019_add_phone_authentication.sql** - ⚠️ **CRITICAL**: Phone authentication
20. **020_final_fix_enrollment.sql** - Final enrollment fixes
21. **021_bootstrap_super_admin.sql** - Bootstrap function for super admin self-promotion
22. **022_update_handle_new_user_default_student.sql** - ⚠️ **DON'T USE** (auto student role - conflicts with pending approval)
23. **023_create_site_settings_cms.sql** - Landing page CMS table
24. **024_enforce_strict_rbac.sql** - ⚠️ **CRITICAL**: RBAC enforcement (Super Admin can assign roles, Admin permissions enforced)
21. **021_bootstrap_super_admin.sql** - Bootstrap super admin role for `super@gmail.com`
22. **022_update_handle_new_user_default_student.sql** - Default student role + phone saved on signup
23. **023_create_site_settings_cms.sql** - Landing page CMS (site_settings)

## 🚀 Quick Apply

### Option 1: Apply RBAC Fix NOW (Most Important)
Use this to fix role assignment and permissions:
```
supabase/scripts/COMPLETE_RBAC_FIX.sql
```
This includes migrations 021, 023, 024 + promotes super@gmail.com

### Option 2: All Migrations Combined
Use the combined file:
```
supabase/scripts/ALL_MIGRATIONS_COMBINED.sql
```

### Option 3: One by One
Run each file in sequence (001, 002, 003...) in Supabase SQL Editor.

## 📍 Location
All migration files are in: `supabase/migrations/`

## ⚠️ Important Notes
- Run migrations in **numerical order** (001 → 002 → 003...)
- Most migrations use `IF NOT EXISTS` so safe to rerun
- **Critical migrations**: 018 (security) and 019 (phone auth)
- **New required migrations for your new requests**: 021, 022, 023

## 📋 How to Run in Supabase SQL Editor

1. Open: https://supabase.com/dashboard/project/alazrdburoobipmofypc/sql/new
2. Open migration file: `supabase/migrations/001_initial_schema.sql`
3. Copy all content (Ctrl+A, Ctrl+C)
4. Paste in SQL Editor (Ctrl+V)
5. Click **RUN**
6. Repeat for 002, 003, 004... up to 020

## ✅ Verification

After running all migrations, verify:
- Phone column exists in profiles table
- Security definer view is fixed
- All tables created successfully
