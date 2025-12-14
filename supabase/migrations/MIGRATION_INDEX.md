# 📋 Migration Files - Complete Index

## Migration Execution Order

Run these migrations in **numerical order** (001, 002, 003...) in Supabase SQL Editor.

## Complete Migration List

### Core Schema (001-013)
1. **001_initial_schema.sql** - Initial database schema (profiles, courses, etc.)
2. **002_schema_updates.sql** - Schema updates
3. **003_additional_tables.sql** - Additional tables
4. **004_schema_changes.sql** - Schema changes (categories, books, videos, quizzes, assignments)
5. **005_updates.sql** - Updates (lessons, course_enrollments)
6. **006_schema_updates.sql** - Schema updates (modules, user_module_permissions)
7. **007_updates.sql** - Updates (course_assignments, book_assignments, video_assignments)
8. **008_updates.sql** - Updates
9. **009_updates.sql** - Updates
10. **010_updates.sql** - Updates
11. **011_updates.sql** - Updates
12. **012_updates.sql** - Updates
13. **013_updates.sql** - Updates

### Role & Permissions (014-024)
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

### Library & Permissions (025-030)
25. **025_library_edit_enhancement.sql** - Library edit enhancement
26. **026_fix_student_course_access.sql** - Fix student course access
27. **027_comprehensive_cms_system.sql** - Comprehensive CMS system (themes, page sections, site configurations)
28. **028_library_permission_system.sql** - ⚠️ **CRITICAL**: Library permission-based access control
29. **029_role_based_permissions.sql** - ⚠️ **CRITICAL**: Role-based permissions system
30. **030_fix_library_admin_access.sql** - Fix library admin access (module permission checks)

### Unified Permissions & Session (031-033)
31. **031_fix_library_permissions_management.sql** - Fix library permissions management (RLS policies for permission tables)
32. **032_unified_permission_system.sql** - ⚠️ **CRITICAL**: Unified permission system for ALL modules
33. **033_login_history_and_session_persistence.sql** - Login history and session persistence

## 🚀 Quick Apply Options

### Option 1: Apply All Migrations Sequentially
Run each file in sequence (001 → 002 → 003... → 033) in Supabase SQL Editor.

### Option 2: Critical Migrations Only
If you need to apply only critical fixes:
- 018_fix_security_definer_view.sql
- 019_add_phone_authentication.sql
- 024_enforce_strict_rbac.sql
- 028_library_permission_system.sql
- 029_role_based_permissions.sql
- 030_fix_library_admin_access.sql
- 031_fix_library_permissions_management.sql
- 032_unified_permission_system.sql
- 033_login_history_and_session_persistence.sql

### Option 3: Combined Script
Use the combined file (if available):
```
supabase/scripts/ALL_MIGRATIONS_COMBINED.sql
```

## 📍 Location
All migration files are in: `supabase/migrations/`

## ⚠️ Important Notes

1. **Execution Order**: Run migrations in **numerical order** (001 → 002 → 003...)
2. **Safe to Rerun**: Most migrations use `IF NOT EXISTS` so safe to rerun
3. **Critical Migrations**: 
   - 018: Security fix
   - 019: Phone authentication
   - 024: RBAC enforcement
   - 028: Library permissions
   - 029: Role-based permissions
   - 032: Unified permission system
4. **Skip Migration**: 022 (conflicts with pending approval system)

## 📋 How to Run in Supabase SQL Editor

1. Open Supabase Dashboard → SQL Editor
2. Open migration file: `supabase/migrations/001_initial_schema.sql`
3. Copy all content (Ctrl+A, Ctrl+C)
4. Paste in SQL Editor (Ctrl+V)
5. Click **RUN**
6. Repeat for 002, 003, 004... up to 033

## ✅ Verification Checklist

After running all migrations, verify:
- [ ] Phone column exists in profiles table
- [ ] Security definer view is fixed
- [ ] All tables created successfully
- [ ] Modules table has all modules (courses, lessons, users, analytics, library, quizzes, certificates, comments, enrollments)
- [ ] Library permission tables exist (library_user_permissions, library_role_permissions)
- [ ] Role-based permissions table exists (role_module_permissions)
- [ ] Login history table exists
- [ ] All RLS policies are in place
- [ ] Super admin bootstrap function works

## 📊 Migration Summary by Category

### Authentication & Users
- 019: Phone authentication
- 021: Super admin bootstrap
- 022: Default student role (⚠️ skip)
- 033: Login history & session persistence

### Permissions & RBAC
- 006: Module permissions system
- 014: Custom roles
- 024: Strict RBAC enforcement
- 028: Library permissions
- 029: Role-based permissions
- 030: Library admin access fix
- 031: Library permissions management
- 032: Unified permission system

### Library System
- 025: Library edit enhancement
- 028: Library permission system
- 030: Library admin access fix
- 031: Library permissions management

### CMS & Content
- 023: Site settings CMS
- 027: Comprehensive CMS system

### Enrollment & Courses
- 015: Admin enroll function
- 016: Enrollment RLS fix
- 017: Teacher course assignments
- 020: Final enrollment fix
- 026: Student course access fix

### Security
- 018: Security definer view fix
- 024: RBAC enforcement
- 032: Unified permission system

## 🔄 Migration Dependencies

Some migrations depend on others:
- **032** requires **029** (role-based permissions)
- **031** requires **028** (library permissions)
- **030** requires **028** (library permissions)
- **029** requires **006** (modules table)
- **024** requires **014** (custom roles)

Always run in numerical order to satisfy dependencies.
