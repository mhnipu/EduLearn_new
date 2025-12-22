# 📋 Migration Files - Complete Index

> **Total Migrations:** 50  
> **Last Updated:** 2025-01-XX

---

## 🚀 Quick Start: Automated Sequential Execution

**Recommended Method** - Apply all migrations automatically in sequential order:

### Option 1: PowerShell Script (Windows)
```powershell
.\scripts\apply-migrations-sequential.ps1 -ProjectRef YOUR_PROJECT_REF
```

### Option 2: Bash Script (Linux/Mac)
```bash
chmod +x scripts/apply-migrations-sequential.sh
./scripts/apply-migrations-sequential.sh --project-ref YOUR_PROJECT_REF
```

### Option 3: Node.js Script (Cross-platform)
```bash
npm run migrate -- --project-ref YOUR_PROJECT_REF
```

### Option 4: Supabase CLI Direct
```bash
supabase db push
```

📚 **Full Automation Guide**: [`docs/migrations/SEQUENTIAL_MIGRATION_AUTOMATION.md`](../../docs/migrations/SEQUENTIAL_MIGRATION_AUTOMATION.md)

---

## 📋 Complete Migration List (All 50 Files)

### Core Schema (001-013)
| # | File | Description |
|---|------|-------------|
| 001 | `001_initial_schema.sql` | Initial database schema (profiles, courses, enums, core tables) |
| 002 | `002_schema_updates.sql` | Schema updates and modifications |
| 003 | `003_additional_tables.sql` | Additional tables for extended functionality |
| 004 | `004_schema_changes.sql` | Schema changes (categories, books, videos, quizzes, assignments) |
| 005 | `005_updates.sql` | Updates (lessons, course_enrollments) |
| 006 | `006_schema_updates.sql` | Schema updates (modules, user_module_permissions) |
| 007 | `007_updates.sql` | Updates (course_assignments, book_assignments, video_assignments) |
| 008 | `008_updates.sql` | Additional updates |
| 009 | `009_updates.sql` | Additional updates |
| 010 | `010_updates.sql` | Additional updates |
| 011 | `011_updates.sql` | Additional updates |
| 012 | `012_updates.sql` | Additional updates |
| 013 | `013_updates.sql` | Additional updates |

### Role & Permissions System (014-024)
| # | File | Description | Status |
|---|------|-------------|--------|
| 014 | `014_create_custom_roles_table.sql` | Custom roles table creation |
| 015 | `015_admin_enroll_function.sql` | Admin enrollment function |
| 016 | `016_fix_enrollment_rls.sql` | Fix enrollment Row-Level Security |
| 017 | `017_teacher_course_assignments.sql` | Teacher course assignments system |
| 018 | `018_fix_security_definer_view.sql` | ⚠️ **CRITICAL**: Security definer view fix |
| 019 | `019_add_phone_authentication.sql` | ⚠️ **CRITICAL**: Phone authentication support |
| 020 | `020_final_fix_enrollment.sql` | Final enrollment fixes |
| 021 | `021_bootstrap_super_admin.sql` | Bootstrap function for super admin self-promotion |
| 022 | `022_update_handle_new_user_default_student.sql` | ⚠️ **SKIP**: Auto student role (conflicts with pending approval) |
| 023 | `023_create_site_settings_cms.sql` | Landing page CMS table creation |
| 024 | `024_enforce_strict_rbac.sql` | ⚠️ **CRITICAL**: Strict RBAC enforcement (Super Admin can assign roles) |

### Library & CMS System (025-027)
| # | File | Description | Status |
|---|------|-------------|--------|
| 025 | `025_library_edit_enhancement.sql` | Library edit enhancement features |
| 026 | `026_fix_student_course_access.sql` | Fix student course access permissions |
| 027 | `027_comprehensive_cms_system.sql` | Comprehensive CMS system (themes, page sections, site configurations) |

### Permissions & Access Control (028-032)
| # | File | Description | Status |
|---|------|-------------|--------|
| 028 | `028_library_permission_system.sql` | ⚠️ **CRITICAL**: Library permission-based access control |
| 029 | `029_role_based_permissions.sql` | ⚠️ **CRITICAL**: Role-based permissions system |
| 030 | `030_fix_library_admin_access.sql` | Fix library admin access (module permission checks) |
| 031 | `031_fix_library_permissions_management.sql` | Fix library permissions management (RLS policies for permission tables) |
| 032 | `032_unified_permission_system.sql` | ⚠️ **CRITICAL**: Unified permission system for ALL modules |

### Session & User Management (033)
| # | File | Description | Status |
|---|------|-------------|--------|
| 033 | `033_login_history_and_session_persistence.sql` | Login history and session persistence system |

### RLS & Security Fixes (034, 042, 043, 046, 047)
| # | File | Description | Status |
|---|------|-------------|--------|
| 034 | `034_fix_courses_rls_recursion.sql` | Fix courses RLS recursion issue |
| 042 | `042_fix_assignment_submission_rls.sql` | Fix assignment submission RLS policies |
| 043 | `043_fix_storage_submissions_policy.sql` | Fix storage submissions policy |
| 046 | `046_fix_courses_rls_recursion_guardian.sql` | Fix courses RLS recursion for guardian access |
| 047 | `047_fix_avatar_upload_policy.sql` | Fix avatar upload policy |

### Attendance & Assessment System (035, 036, 037, 041)
| # | File | Description | Status |
|---|------|-------------|--------|
| 035 | `035_teacher_attendance_system.sql` | Teacher attendance management system |
| 036 | `036_link_assignments_to_courses.sql` | Link assignments to courses |
| 037 | `037_enhance_assignments_with_types.sql` | Enhance assignments with types |
| 041 | `041_assessment_system_enhancements.sql` | Assessment system enhancements |

### Guardian System (038-040, 043-045)
| # | File | Description | Status |
|---|------|-------------|--------|
| 038 | `038_student_guardian_teacher_relationships.sql` | Student-guardian-teacher relationships system |
| 039 | `039_guardian_auto_detection_enhancement.sql` | Guardian auto-detection enhancement |
| 040 | `040_guardian_course_enrollments_access.sql` | Guardian course enrollments access |
| 043 | `043_guardian_readonly_enforcement.sql` | Guardian read-only enforcement (RLS policies) |
| 044 | `044_guardian_attendance_access.sql` | Guardian attendance access (read-only) |
| 045 | `045_guardian_courses_readonly.sql` | Guardian courses read-only access |

### CMS & Landing Page (042, 044)
| # | File | Description | Status |
|---|------|-------------|--------|
| 042 | `042_landing_page_cms_super_admin_only.sql` | Landing page CMS super admin only access |
| 044 | `044_landing_page_cms_upgrade.sql` | Landing page CMS upgrade |

---

## 🎯 Execution Methods

### Method 1: Automated Sequential Execution (Recommended) ⭐

**Best for:** Automated execution with progress tracking

```powershell
# Windows
.\scripts\apply-migrations-sequential.ps1 -ProjectRef YOUR_PROJECT_REF

# Linux/Mac
./scripts/apply-migrations-sequential.sh --project-ref YOUR_PROJECT_REF

# Node.js (Cross-platform)
npm run migrate -- --project-ref YOUR_PROJECT_REF
```

**Features:**
- ✅ Executes migrations sequentially (001 → 002 → 003... → 047)
- ✅ Automatic project linking
- ✅ Progress tracking
- ✅ Error handling
- ✅ Summary reports

### Method 2: Supabase CLI

**Best for:** Direct CLI usage

```bash
# Link project (first time only)
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations (executes sequentially)
supabase db push
```

### Method 3: Manual Execution (One by One)

**Best for:** Manual control, testing individual migrations

1. Open Supabase Dashboard → SQL Editor
2. For each migration file (in numerical order):
   - Copy SQL content
   - Paste into SQL Editor
   - Click **RUN**
   - Verify success message
3. Repeat for next migration

**Generate Manual Guide:**
```powershell
.\scripts\apply-migrations-manual-guide.ps1
```

### Method 4: Combined SQL File (Legacy)

```powershell
.\scripts\APPLY_ALL_MIGRATIONS_SCRIPT.ps1
# Creates: ALL_MIGRATIONS_COMBINED.sql
```

---

## ⚠️ Critical Migrations

These migrations are **essential** and should be applied:

| # | File | Reason |
|---|------|--------|
| 018 | `018_fix_security_definer_view.sql` | Security fix for views |
| 019 | `019_add_phone_authentication.sql` | Phone authentication support |
| 024 | `024_enforce_strict_rbac.sql` | RBAC enforcement |
| 028 | `028_library_permission_system.sql` | Library permissions |
| 029 | `029_role_based_permissions.sql` | Role-based permissions |
| 032 | `032_unified_permission_system.sql` | Unified permission system |

---

## 🚫 Skip This Migration

| # | File | Reason |
|---|------|--------|
| 022 | `022_update_handle_new_user_default_student.sql` | Conflicts with pending approval system - **DO NOT USE** |

---

## 📊 Migration Summary by Category

### Authentication & Users (4 migrations)
- **019**: Phone authentication
- **021**: Super admin bootstrap
- **022**: Default student role (⚠️ **SKIP**)
- **033**: Login history & session persistence

### Permissions & RBAC (9 migrations)
- **006**: Module permissions system
- **014**: Custom roles
- **024**: Strict RBAC enforcement
- **028**: Library permissions
- **029**: Role-based permissions
- **030**: Library admin access fix
- **031**: Library permissions management
- **032**: Unified permission system
- **043**: Guardian read-only enforcement

### Library System (4 migrations)
- **025**: Library edit enhancement
- **028**: Library permission system
- **030**: Library admin access fix
- **031**: Library permissions management

### CMS & Content Management (4 migrations)
- **023**: Site settings CMS
- **027**: Comprehensive CMS system
- **042**: Landing page CMS super admin only
- **044**: Landing page CMS upgrade

### Enrollment & Courses (6 migrations)
- **015**: Admin enroll function
- **016**: Enrollment RLS fix
- **017**: Teacher course assignments
- **020**: Final enrollment fix
- **026**: Student course access fix
- **034**: Courses RLS recursion fix
- **046**: Courses RLS recursion guardian fix

### Guardian System (5 migrations)
- **038**: Student-guardian-teacher relationships
- **039**: Guardian auto-detection enhancement
- **040**: Guardian course enrollments access
- **044**: Guardian attendance access
- **045**: Guardian courses read-only

### Attendance System (1 migration)
- **035**: Teacher attendance management system

### Assessment & Assignments (4 migrations)
- **036**: Link assignments to courses
- **037**: Enhance assignments with types
- **041**: Assessment system enhancements
- **042**: Fix assignment submission RLS

### Security & RLS Fixes (6 migrations)
- **018**: Security definer view fix
- **024**: RBAC enforcement
- **032**: Unified permission system
- **043**: Fix storage submissions policy
- **047**: Fix avatar upload policy
- **048**: ⚠️ **CRITICAL**: Fix RBAC to pure role-based system (permissions from roles only, removes user-level permission assignments)

---

## 🔄 Migration Dependencies

Some migrations depend on others. Always run in **numerical order** to satisfy dependencies:

```
001-013 (Core Schema)
  └─ 014 (Custom Roles)
      └─ 024 (RBAC Enforcement)

006 (Modules)
  └─ 028 (Library Permissions)
      └─ 030 (Library Admin Access)
      └─ 031 (Library Permissions Management)

006 (Modules)
  └─ 029 (Role-based Permissions)
      └─ 032 (Unified Permission System)

017 (Teacher Course Assignments)
  └─ 035 (Teacher Attendance System)

038 (Guardian Relationships)
  └─ 039 (Guardian Auto-detection)
  └─ 040 (Guardian Course Access)
  └─ 043 (Guardian Read-only)
  └─ 044 (Guardian Attendance)
  └─ 045 (Guardian Courses Read-only)
  └─ 046 (Guardian RLS Fix)
```

**Key Dependency Rules:**
- **032** requires **029** (role-based permissions)
- **031** requires **028** (library permissions)
- **030** requires **028** (library permissions)
- **029** requires **006** (modules table)
- **024** requires **014** (custom roles)
- Guardian migrations (043-046) require **038** (relationships)
- **048** requires **029** and **032** (role-based permissions system must exist first)

---

## ✅ Verification Checklist

After running all migrations, verify the following:

### Database Tables
- [ ] **~37+ tables** created in Table Editor
- [ ] `profiles` table has `phone` column (from 019)
- [ ] `user_roles` table exists (from 014)
- [ ] `modules` table exists with all modules (from 006)
- [ ] `library_user_permissions` and `library_role_permissions` exist (from 028)
- [ ] `role_module_permissions` table exists (from 029)
- [ ] `login_history` table exists (from 033)
- [ ] `student_guardians` table exists (from 038)
- [ ] `attendance_records` table exists (from 035)

### Database Functions
- [ ] **~30+ functions** in Database → Functions
- [ ] `has_role` function exists
- [ ] `has_module_permission` function exists (now role-based only, from 048)
- [ ] `get_user_effective_permissions` function exists (from 048)
- [ ] `is_user_enrolled_in_course` function exists
- [ ] `is_teacher_assigned_to_course` function exists
- [ ] `is_guardian_has_student_enrolled_in_course` function exists (from 046)
- [ ] `bootstrap_super_admin` function exists (from 021)

### RLS Policies
- [ ] Multiple policies exist in Authentication → Policies
- [ ] Courses table has proper RLS policies (from 034, 046)
- [ ] Guardian read-only policies exist (from 043, 044, 045)
- [ ] Assignment submission policies exist (from 042)

### Quick SQL Verification

```sql
-- Count tables (should be ~37)
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- Count functions (should be ~30+)
SELECT COUNT(*) as function_count
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace;

-- Count policies (should be multiple)
SELECT COUNT(*) as policy_count 
FROM pg_policies 
WHERE schemaname = 'public';

-- Check critical tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'profiles', 'user_roles', 'modules', 
  'student_guardians', 'attendance_records',
  'library_user_permissions', 'role_module_permissions'
)
ORDER BY table_name;
```

---

## 📍 File Locations

- **Migration Files**: `supabase/migrations/`
- **Automation Scripts**: `scripts/`
  - `apply-migrations-sequential.ps1` (Windows)
  - `apply-migrations-sequential.sh` (Linux/Mac)
  - `apply-migrations-sequential.js` (Node.js)
  - `apply-migrations-manual-guide.ps1` (Manual guide generator)
- **Documentation**: 
  - [`docs/migrations/SEQUENTIAL_MIGRATION_AUTOMATION.md`](../../docs/migrations/SEQUENTIAL_MIGRATION_AUTOMATION.md)
  - [`README.md`](../../README.md) (Migration section)

---

## ⚠️ Important Notes

1. **Execution Order**: Always run migrations in **numerical order** (001 → 002 → 003... → 047)
2. **Safe to Rerun**: Most migrations use `IF NOT EXISTS` / `IF EXISTS` so safe to rerun
3. **Dependencies**: Check dependency section above - some migrations depend on others
4. **Skip Migration 022**: Do not apply `022_update_handle_new_user_default_student.sql` (conflicts with pending approval)
5. **Backup First**: Supabase auto-backups, but create manual backup if needed
6. **Test Environment**: Test migrations on development project first
7. **Error Handling**: If a migration fails, fix the issue before continuing

---

## 🔍 Troubleshooting

### Error: Migration Already Applied
- **Solution**: Supabase CLI automatically skips already-applied migrations

### Error: Dependency Missing
- **Solution**: Ensure previous migrations (especially 001-013) are applied first

### Error: RLS Policy Conflict
- **Solution**: Check if policy already exists - migrations use `DROP POLICY IF EXISTS`

### Error: Function Already Exists
- **Solution**: Migrations use `CREATE OR REPLACE FUNCTION` - safe to rerun

### Error: Table Already Exists
- **Solution**: Most migrations use `IF NOT EXISTS` - safe to rerun

### Need Help?
- Check [`docs/migrations/SEQUENTIAL_MIGRATION_AUTOMATION.md`](../../docs/migrations/SEQUENTIAL_MIGRATION_AUTOMATION.md)
- Review error messages in Supabase SQL Editor
- Verify migration file syntax
- Check Supabase CLI version: `supabase --version`

---

## 📈 Migration Statistics

- **Total Migrations**: 50
- **Core Schema**: 13 migrations (001-013)
- **Permissions & RBAC**: 9 migrations
- **Guardian System**: 5 migrations
- **Assessment & Attendance**: 5 migrations
- **Security Fixes**: 5 migrations
- **CMS & Content**: 4 migrations
- **Other**: 9 migrations

---

### RBAC System Fix (048)
| # | File | Description | Status |
|---|------|-------------|--------|
| 048 | `048_fix_rbac_pure_role_based.sql` | ⚠️ **CRITICAL**: Fixes RBAC to pure role-based system (permissions from roles only) |

---

## 🎉 Quick Reference

### Apply All Migrations (Automated)
```powershell
.\scripts\apply-migrations-sequential.ps1 -ProjectRef YOUR_REF
```

### Apply Critical Migrations Only
Execute these in order:
- 018, 019, 024, 028, 029, 032, **048**

### Verify After Migration
```sql
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Should return ~37
```

### Verify RBAC Fix (Migration 048)
```sql
-- Check that get_user_effective_permissions function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'get_user_effective_permissions';
-- Should return 1 row

-- Verify has_module_permission uses role permissions only
SELECT pg_get_functiondef(oid) FROM pg_proc 
WHERE proname = 'has_module_permission';
-- Should show role_module_permissions check, NOT user_module_permissions

-- Test: Two users with same role should have same permissions
-- 1. Create Teacher_1, assign Teacher role, grant role permissions
-- 2. Create Teacher_2, assign same Teacher role (no separate permissions)
-- 3. Both should have identical effective permissions from roles
SELECT 
  u.id,
  u.email,
  r.role,
  rmp.module_id,
  m.name as module_name,
  rmp.can_read,
  rmp.can_create,
  rmp.can_update,
  rmp.can_delete
FROM auth.users u
JOIN public.user_roles r ON r.user_id = u.id
JOIN public.role_module_permissions rmp ON rmp.role = r.role::text
JOIN public.modules m ON m.id = rmp.module_id
WHERE r.role = 'teacher'
ORDER BY u.email, m.name;
-- Both Teacher_1 and Teacher_2 should show same permissions
```

---

**Last Updated**: 2025-01-XX  
**Maintained By**: EduLearn Development Team  
**For Issues**: Check documentation or contact support
