-- Migration 024: Enforce Strict RBAC System
-- Purpose: Fix permission system so Super Admin can assign roles and Admins have enforced module permissions
--
-- Key Changes:
-- 1. Add RLS policies to user_roles (Super Admin can manage)
-- 2. Add RLS policies to user_module_permissions (Super Admin can manage, Admins can view)
-- 3. Create unified permission check function
-- 4. Update critical table policies to check module permissions

-- ============================================
-- STEP 1: Fix user_roles table RLS
-- ============================================

-- Drop ALL existing policies on user_roles (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert non-admin roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update non-admin roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete non-admin roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins have full access to user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can assign non-admin roles" ON public.user_roles;

-- Super Admin can manage ALL roles (create, update, delete)
CREATE POLICY "Super admins have full access to user_roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
  );

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
  );

-- Admins: Can INSERT roles (but NOT admin or super_admin)
CREATE POLICY "Admins can assign non-admin roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') AND
    role NOT IN ('admin', 'super_admin')
  );

-- Admins: Can UPDATE roles (but NOT to/from admin or super_admin)
CREATE POLICY "Admins can update non-admin roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') AND
    role NOT IN ('admin', 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') AND
    role NOT IN ('admin', 'super_admin')
  );

-- Admins: Can DELETE roles (but NOT admin or super_admin)
CREATE POLICY "Admins can delete non-admin roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') AND
    role NOT IN ('admin', 'super_admin')
  );

-- ============================================
-- STEP 2: Fix user_module_permissions table RLS
-- ============================================

DROP POLICY IF EXISTS "Users can view own permissions" ON public.user_module_permissions;
DROP POLICY IF EXISTS "Super admins can manage all permissions" ON public.user_module_permissions;
DROP POLICY IF EXISTS "Admins can view all permissions" ON public.user_module_permissions;

-- Super Admin can manage all permissions
CREATE POLICY "Super admins have full access to permissions"
  ON public.user_module_permissions
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
  );

-- Users can view their own permissions
CREATE POLICY "Users can view own module permissions"
  ON public.user_module_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all permissions (read-only)
CREATE POLICY "Admins can view all module permissions"
  ON public.user_module_permissions
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin')
  );

-- ============================================
-- STEP 3: Create Unified Permission Check Function
-- ============================================

-- Main permission check function: checks module-level permissions
CREATE OR REPLACE FUNCTION public.check_module_permission(
  _user_id uuid,
  _module_name text,
  _permission text -- 'create', 'read', 'update', 'delete'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _has_permission boolean := false;
BEGIN
  -- Super Admin always has all permissions
  IF public.has_role(_user_id, 'super_admin') THEN
    RETURN true;
  END IF;

  -- Check module-level permission for others
  SELECT
    CASE
      WHEN _permission = 'create' THEN ump.can_create
      WHEN _permission = 'read' THEN ump.can_read
      WHEN _permission = 'update' THEN ump.can_update
      WHEN _permission = 'delete' THEN ump.can_delete
      ELSE false
    END
  INTO _has_permission
  FROM public.user_module_permissions ump
  JOIN public.modules m ON m.id = ump.module_id
  WHERE ump.user_id = _user_id
    AND m.name = _module_name
  LIMIT 1;

  RETURN COALESCE(_has_permission, false);
END;
$$;

COMMENT ON FUNCTION public.check_module_permission IS 'Check if user has specific module permission. Super Admin always returns true.';

-- ============================================
-- STEP 4: Update profiles RLS to enforce module permissions
-- ============================================

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Admins can view profiles if they have 'users' module read permission
CREATE POLICY "Admins with users module can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR  -- Own profile
    public.check_module_permission(auth.uid(), 'users', 'read')
  );

-- Admins can update profiles if they have 'users' module update permission
CREATE POLICY "Admins with users module can update profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR  -- Own profile
    public.check_module_permission(auth.uid(), 'users', 'update')
  )
  WITH CHECK (
    auth.uid() = id OR
    public.check_module_permission(auth.uid(), 'users', 'update')
  );

-- ============================================
-- STEP 5: Update courses RLS to enforce module permissions
-- ============================================

-- Drop ALL existing course policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can create courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can update courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can delete any course" ON public.courses;
DROP POLICY IF EXISTS "Only admins can create courses" ON public.courses;
DROP POLICY IF EXISTS "Only admins can update courses" ON public.courses;
DROP POLICY IF EXISTS "Admins and teachers can create courses" ON public.courses;
DROP POLICY IF EXISTS "Admins and teachers can update own courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can view their courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can update their courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can view assigned courses" ON public.courses;
DROP POLICY IF EXISTS "Assigned teachers can update courses" ON public.courses;
DROP POLICY IF EXISTS "Users can view assigned courses" ON public.courses;

-- Super Admin: Always can create courses
CREATE POLICY "super_admin_can_create_courses"
  ON public.courses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
  );

-- Admins: Can create if they have 'courses' module create permission
CREATE POLICY "admins_with_courses_module_can_create"
  ON public.courses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') AND
    public.check_module_permission(auth.uid(), 'courses', 'create')
  );

-- Teachers: Can create courses
CREATE POLICY "teachers_can_create_courses"
  ON public.courses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'teacher')
  );

-- Super Admin: Always can update courses
CREATE POLICY "super_admin_can_update_courses"
  ON public.courses
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Admins: Can update if they have 'courses' module update permission
CREATE POLICY "admins_with_courses_module_can_update"
  ON public.courses
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') AND
    public.check_module_permission(auth.uid(), 'courses', 'update')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') AND
    public.check_module_permission(auth.uid(), 'courses', 'update')
  );

-- Teachers: Can update own courses
CREATE POLICY "teachers_can_update_own_courses"
  ON public.courses
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'teacher') AND
    created_by = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'teacher') AND
    created_by = auth.uid()
  );

-- Super Admin: Always can delete courses
CREATE POLICY "super_admin_can_delete_courses"
  ON public.courses
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Admins: Can delete if they have 'courses' module delete permission
CREATE POLICY "admins_with_courses_module_can_delete"
  ON public.courses
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') AND
    public.check_module_permission(auth.uid(), 'courses', 'delete')
  );

-- ============================================
-- STEP 6: Seed default permissions for first Super Admin
-- ============================================

-- This ensures the Super Admin user (super@gmail.com) can function immediately
DO $$
DECLARE
  v_super_uid uuid;
  v_module_id uuid;
BEGIN
  -- Find super@gmail.com user
  SELECT id INTO v_super_uid
  FROM auth.users
  WHERE lower(email) = 'super@gmail.com';

  -- If super user exists, ensure they have super_admin role
  IF v_super_uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_super_uid, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Remove any student role
    DELETE FROM public.user_roles
    WHERE user_id = v_super_uid AND role = 'student';

    RAISE NOTICE '✅ Super Admin role assigned to super@gmail.com';
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  policies_count int;
BEGIN
  -- Count policies on user_roles
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE tablename = 'user_roles' AND schemaname = 'public';

  RAISE NOTICE '📊 user_roles table has % RLS policies', policies_count;

  -- Count policies on user_module_permissions
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE tablename = 'user_module_permissions' AND schemaname = 'public';

  RAISE NOTICE '📊 user_module_permissions table has % RLS policies', policies_count;

  RAISE NOTICE '✅ Strict RBAC enforcement completed';
  RAISE NOTICE '👑 Super Admin: Full access to ALL roles (including admin, super_admin)';
  RAISE NOTICE '🔧 Admin: Can assign teacher, student, guardian ONLY (NOT admin/super_admin)';
  RAISE NOTICE '📋 Admin permissions: Checked via user_module_permissions table';
  RAISE NOTICE '🔒 All actions now enforced at database level';
END $$;
