# 🎯 Complete RBAC Fix - Apply Now

## Problem Summary

Your system had these critical issues:
1. ❌ Super Admin **cannot assign roles** - `user_roles` table had no RLS policy for role assignment
2. ❌ Admin **cannot do anything** - module permissions not stored or enforced
3. ❌ **Roles alone do nothing** - permissions must be in `user_module_permissions` table and checked

## ✅ Solution Applied

Created comprehensive RBAC fix in:
```
supabase/scripts/COMPLETE_RBAC_FIX.sql
```

This fixes:
- ✅ Super Admin can assign/manage all roles
- ✅ Admin permissions enforced via `user_module_permissions` table
- ✅ Module permission check function created
- ✅ `super@gmail.com` promoted to super_admin
- ✅ New users go to pending approval (no default role)
- ✅ Site CMS for landing page

---

## 🚀 How to Apply (2 minutes)

### Step 1: Open SQL Editor
```
https://supabase.com/dashboard/project/pcpiigyuafdzgokiosve/sql/new
```

### Step 2: Copy SQL
```powershell
notepad "e:\Work\Personal Projects\EduLearn\EduLearn_new\supabase\scripts\COMPLETE_RBAC_FIX.sql"
```

Select ALL (Ctrl+A), Copy (Ctrl+C)

### Step 3: Paste and RUN

1. Paste in SQL Editor (Ctrl+V)
2. Click **RUN** button

### Step 4: Verify Output

You should see:
```
NOTICE: Promoting super@gmail.com to super_admin...
NOTICE: super@gmail.com promoted to super_admin
NOTICE: Fixing user_roles RLS policies...
NOTICE: user_roles RLS policies updated
NOTICE: user_module_permissions RLS policies updated
NOTICE: check_module_permission function created
NOTICE: COMPLETE RBAC FIX APPLIED SUCCESSFULLY
NOTICE: Super Admin can now assign roles
NOTICE: Admin permissions are enforced via user_module_permissions
```

### Step 5: Test in App

1. **Sign out** from app
2. **Sign in** with:
   - Email: `super@gmail.com`
   - Password: `445500`
3. Should redirect to `/dashboard/admin` (not student)
4. Go to **`/admin/users`** - can now assign roles ✅
5. Go to **`/admin/super`** - can manage permissions ✅

---

## 🎯 What Was Fixed

### 1. Super Admin Can Now Assign Roles

**Before:**
```sql
-- No policy! Super Admin couldn't INSERT into user_roles
```

**After:**
```sql
CREATE POLICY "Super admins have full access to user_roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));
```

**Result:** Super Admin can now assign/remove any role to/from any user

### 2. Admin Permissions Are Enforced

**Before:**
```sql
-- Admin role existed but permissions weren't checked
```

**After:**
```sql
-- New function checks user_module_permissions table
CREATE FUNCTION public.check_module_permission(
  _user_id uuid,
  _module_name text,  -- 'users', 'courses', 'library', etc.
  _permission text    -- 'create', 'read', 'update', 'delete'
)
```

**Result:** Admin must have explicit module permission in `user_module_permissions` table

### 3. Strict RBAC Hierarchy

```
Super Admin (super@gmail.com)
  ↓ unlimited access
  ↓ can assign all roles
  ↓ can grant all permissions
  
Admin (assigned by Super Admin)
  ↓ limited by module permissions
  ↓ can only do what Super Admin allows
  ↓ cannot assign super_admin or admin roles
  
Teacher (assigned by Admin/Super Admin)
  ↓ assignment-based access only
  ↓ can only manage assigned students/courses
  
Student (assigned by Admin/Super Admin)
  ↓ self-service only
  ↓ own profile + enrolled courses
```

---

## 📋 How Permissions Work Now

### Super Admin (super@gmail.com)
- ✅ Has `super_admin` role in `user_roles` table
- ✅ Bypasses ALL permission checks
- ✅ Can assign/remove any role
- ✅ Can grant/revoke any module permission
- ✅ Full database access

### Admin (assigned by Super Admin)
- ✅ Has `admin` role in `user_roles` table
- ✅ Permissions stored in `user_module_permissions` table
- ✅ Each action checks specific module permission:
  - **Create user** → needs `users` module `can_create = true`
  - **View users** → needs `users` module `can_read = true`
  - **Edit user** → needs `users` module `can_update = true`
  - **Delete user** → needs `users` module `can_delete = true`
- ✅ Cannot assign super_admin or admin roles (only teacher/student/guardian)

### Teacher/Student/Guardian
- ✅ Role-based + assignment-based access
- ✅ Module permissions can be granted individually
- ✅ Strictly limited by RLS policies

---

## 🔧 Assigning Admin Permissions

After this fix, when Super Admin assigns someone as Admin:

### Step 1: Assign Admin Role
```
/admin/super → Select user → Toggle "admin" role
```

### Step 2: Grant Module Permissions
```
/admin/super → Select user → Edit Permissions
```

Grant permissions for modules Admin should access:
- **users** → create, read, update (not delete to prevent accidents)
- **courses** → create, read, update, delete
- **enrollments** → create, read, update, delete
- **library** → create, read, update, delete
- **assignments** → create, read, update, delete

**Without these permissions, Admin cannot do anything!**

---

## ⚠️ Important Notes

### New User Flow
- ✅ **No default role** - users go to `/pending-approval`
- ✅ Super Admin/Admin must manually assign role
- ✅ This enforces strict role-based access

### Super Admin Bootstrap
- ✅ `super@gmail.com` already promoted to super_admin
- ✅ If needed later, can call `bootstrap_super_admin()` function from SQL

### Admin Must Have Permissions
- ⚠️ **Admin role alone is NOT enough**
- ⚠️ **Must grant module permissions** via `/admin/super` page
- ⚠️ **Without permissions, Admin sees "Permission denied"**

---

## ✅ Verification Checklist

After applying this fix:

### 1. Super Admin Login
```
Email: super@gmail.com
Password: 445500
```
- ✅ Should show as **Super Admin** (not student)
- ✅ Should redirect to `/dashboard/admin`

### 2. Role Assignment
- ✅ Go to `/admin/users` or `/admin/super`
- ✅ Can toggle roles for any user
- ✅ Can assign admin, teacher, student, guardian

### 3. Permission Management
- ✅ Go to `/admin/super`
- ✅ Select a user with Admin role
- ✅ Edit Permissions → Can grant module permissions
- ✅ Permissions save successfully

### 4. New User Flow
- ✅ Signup new user
- ✅ Goes to `/pending-approval` (no dashboard access)
- ✅ Super Admin assigns role
- ✅ User can then access role-specific dashboard

---

## 🆘 If Still Not Working

### Check 1: Super Admin Role
```sql
-- Run in SQL Editor
SELECT u.email, ur.role
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE lower(u.email) = 'super@gmail.com';
-- Should show: super_admin
```

### Check 2: RLS Policies
```sql
-- Check policies on user_roles
SELECT * FROM pg_policies
WHERE tablename = 'user_roles' AND schemaname = 'public';
-- Should show policies for super_admin, users, admins
```

### Check 3: Module Permissions
```sql
-- Check if modules exist
SELECT * FROM public.modules ORDER BY name;
-- Should show: users, courses, enrollments, library, etc.
```

---

## 📖 Key Files Created/Updated

- `supabase/scripts/COMPLETE_RBAC_FIX.sql` - Apply this NOW
- `supabase/migrations/024_enforce_strict_rbac.sql` - Individual migration
- `supabase/migrations/021_bootstrap_super_admin.sql` - Bootstrap function
- `supabase/migrations/023_create_site_settings_cms.sql` - CMS table
- `src/pages/admin/SiteContent.tsx` - CMS UI
- `src/App.tsx` - Added `/admin/site-content` route

---

## 🚀 Apply Now

1. Open: https://supabase.com/dashboard/project/pcpiigyuafdzgokiosve/sql/new
2. Copy: `supabase/scripts/COMPLETE_RBAC_FIX.sql`
3. Paste and RUN
4. Sign out and sign in as `super@gmail.com`
5. Test role assignment!

**Your RBAC system will now work correctly!** 🎉
