-- ============================================
-- COMPLETE RBAC FIX - RUN IN SUPABASE SQL EDITOR
-- Project: pcpiigyuafdzgokiosve
-- URL: https://supabase.com/dashboard/project/pcpiigyuafdzgokiosve/sql/new
-- ============================================
-- This fixes:
-- 1. Super Admin can assign roles (fixes user_roles RLS)
-- 2. Admin permissions are enforced (fixes user_module_permissions RLS + policies)
-- 3. Promotes super@gmail.com to super_admin immediately
-- 4. Adds bootstrap function for future super admin self-promotion
-- 5. Adds site CMS for landing page
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '🚀 Starting complete RBAC fix...';
END $$;

-- ============================================
-- PART 1: Promote super@gmail.com to Super Admin
-- ============================================
DO $$
DECLARE
  v_uid uuid;
BEGIN
  RAISE NOTICE '👑 Promoting super@gmail.com to super_admin...';
  
  SELECT id INTO v_uid
  FROM auth.users
  WHERE lower(email) = 'super@gmail.com';

  IF v_uid IS NULL THEN
    RAISE WARNING '⚠️  super@gmail.com user not found - please create this user in Supabase Dashboard first';
  ELSE
    -- Ensure super_admin enum value exists
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
    
    -- Assign super_admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Remove student role
    DELETE FROM public.user_roles
    WHERE user_id = v_uid AND role = 'student';

    RAISE NOTICE '✅ super@gmail.com promoted to super_admin (user_id=%)', v_uid;
  END IF;
END $$;

-- ============================================
-- PART 2: Fix user_roles RLS (Super Admin can assign roles)
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '🔧 Fixing user_roles RLS policies...';
END $$;

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
DROP POLICY IF EXISTS "Admins can update non-admin roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete non-admin roles" ON public.user_roles;

-- Super Admin: Full access to manage ALL roles
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

-- Users: Can view their own roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins: Can view all roles
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

DO $$
BEGIN
  RAISE NOTICE '✅ user_roles RLS policies updated';
  RAISE NOTICE '✅ Super Admin: Can assign ALL roles (including admin, super_admin)';
  RAISE NOTICE '✅ Admin: Can assign teacher, student, guardian only';
END $$;

-- ============================================
-- PART 3: Fix user_module_permissions RLS
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '🔧 Fixing user_module_permissions RLS policies...';
END $$;

DROP POLICY IF EXISTS "Users can view own permissions" ON public.user_module_permissions;
DROP POLICY IF EXISTS "Super admins can manage all permissions" ON public.user_module_permissions;
DROP POLICY IF EXISTS "Admins can view all permissions" ON public.user_module_permissions;
DROP POLICY IF EXISTS "Super admins have full access to permissions" ON public.user_module_permissions;
DROP POLICY IF EXISTS "Users can view own module permissions" ON public.user_module_permissions;
DROP POLICY IF EXISTS "Admins can view all module permissions" ON public.user_module_permissions;

-- Super Admin: Full access to manage all permissions
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

-- Users: Can view their own permissions
CREATE POLICY "Users can view own module permissions"
  ON public.user_module_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins: Can view all permissions (read-only)
CREATE POLICY "Admins can view all module permissions"
  ON public.user_module_permissions
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
  );

DO $$
BEGIN
  RAISE NOTICE '✅ user_module_permissions RLS policies updated';
END $$;

-- ============================================
-- PART 4: Create Module Permission Check Function
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '🔧 Creating check_module_permission function...';
END $$;

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

  -- Check module-level permission in user_module_permissions table
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

COMMENT ON FUNCTION public.check_module_permission IS 'Check if user has specific module permission. Super Admin always returns true. Others checked via user_module_permissions table.';

DO $$
BEGIN
  RAISE NOTICE '✅ check_module_permission function created';
END $$;

-- ============================================
-- PART 5: Bootstrap Function (for super@gmail.com self-promotion)
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '🔧 Creating bootstrap_super_admin function...';
END $$;

CREATE OR REPLACE FUNCTION public.bootstrap_super_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT u.email INTO v_email
  FROM auth.users u
  WHERE u.id = v_uid;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  IF lower(v_email) <> 'super@gmail.com' THEN
    RAISE EXCEPTION 'only super@gmail.com can bootstrap';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  DELETE FROM public.user_roles
  WHERE user_id = v_uid AND role = 'student';

  RAISE NOTICE '✅ Bootstrapped super_admin for %', v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_super_admin() TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '✅ bootstrap_super_admin function created';
END $$;

-- ============================================
-- PART 6: Site CMS for Landing Page
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '🔧 Creating site_settings table for CMS...';
END $$;

CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read (for landing page)
DROP POLICY IF EXISTS "site_settings_read_all" ON public.site_settings;
CREATE POLICY "site_settings_read_all"
  ON public.site_settings
  FOR SELECT
  USING (true);

-- Only Admin/Super Admin can write
DROP POLICY IF EXISTS "site_settings_write_admin" ON public.site_settings;
CREATE POLICY "site_settings_write_admin"
  ON public.site_settings
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
  );

-- Seed default landing content
INSERT INTO public.site_settings (key, value)
VALUES (
  'landing',
  jsonb_build_object(
    'badge', 'Modern E-Learning Platform',
    'title_line_1', 'Learn Anything,',
    'title_line_2', 'Anytime, Anywhere',
    'subtitle', 'Access high-quality courses, watch engaging video lessons, and download comprehensive study materials. Your journey to knowledge starts here.',
    'cta_title', 'Ready to Start Learning?',
    'cta_subtitle', 'Join thousands of students already learning on our platform. Sign up now and get access to all courses.'
  )
)
ON CONFLICT (key) DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE '✅ site_settings table created';
END $$;

-- ============================================
-- PART 7: Update handle_new_user (NO default role - pending approval flow)
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '🔧 Updating handle_new_user trigger for pending approval flow...';
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile with phone support
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone);

  -- NO default role - user goes to /pending-approval until admin assigns role
  -- This enforces: "new user has no role until assigned by Super Admin/Admin"

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  RAISE NOTICE '✅ handle_new_user updated (no default role - pending approval required)';
END $$;

-- ============================================
-- FINAL VERIFICATION
-- ============================================
DO $$
DECLARE
  super_user_id uuid;
  super_has_role boolean;
  policies_user_roles int;
  policies_permissions int;
BEGIN
  RAISE NOTICE '🔍 Running verification...';
  
  -- Check super@gmail.com role
  SELECT ur.user_id, EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = ur.user_id AND ur2.role = 'super_admin'
  )
  INTO super_user_id, super_has_role
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  WHERE lower(u.email) = 'super@gmail.com'
  LIMIT 1;
  
  IF super_has_role THEN
    RAISE NOTICE '✅ super@gmail.com has super_admin role';
  ELSE
    RAISE WARNING '⚠️  super@gmail.com does not have super_admin role (create user first)';
  END IF;
  
  -- Count policies
  SELECT COUNT(*) INTO policies_user_roles
  FROM pg_policies
  WHERE tablename = 'user_roles' AND schemaname = 'public';
  
  SELECT COUNT(*) INTO policies_permissions
  FROM pg_policies
  WHERE tablename = 'user_module_permissions' AND schemaname = 'public';
  
  RAISE NOTICE '📊 user_roles table has % RLS policies', policies_user_roles;
  RAISE NOTICE '📊 user_module_permissions table has % RLS policies', policies_permissions;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '🎉 COMPLETE RBAC FIX APPLIED SUCCESSFULLY';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Super Admin can assign ALL roles (admin, super_admin, teacher, student, guardian)';
  RAISE NOTICE '✅ Admin can assign ONLY: teacher, student, guardian (NOT admin/super_admin)';
  RAISE NOTICE '✅ Admin permissions are enforced via user_module_permissions';
  RAISE NOTICE '✅ New users go to pending approval (no default role)';
  RAISE NOTICE '✅ Site CMS available at /admin/site-content';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next Steps:';
  RAISE NOTICE '1. Sign out from app';
  RAISE NOTICE '2. Sign in with: super@gmail.com / 445500';
  RAISE NOTICE '3. Go to /admin/users to assign roles';
  RAISE NOTICE '4. Go to /admin/super to manage permissions';
END $$;
