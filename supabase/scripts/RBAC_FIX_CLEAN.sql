-- ============================================
-- RBAC FIX - CLEAN VERSION (No Syntax Errors)
-- Project: pcpiigyuafdzgokiosve
-- ============================================

BEGIN;

-- Step 1: Promote super@gmail.com
DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'super@gmail.com';
  
  IF v_uid IS NOT NULL THEN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    DELETE FROM public.user_roles WHERE user_id = v_uid AND role = 'student';
    
    RAISE NOTICE 'super@gmail.com promoted to super_admin';
  END IF;
END $$;

-- Step 2: Drop ALL existing policies on user_roles
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'user_roles' AND schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.user_roles';
  END LOOP;
END $$;

-- Step 3: Create Super Admin policy
CREATE POLICY "super_admin_full_access"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Step 4: Create Users view own roles policy
CREATE POLICY "users_view_own_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Step 5: Create Admin view all roles policy
CREATE POLICY "admin_view_all_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 6: Create Admin INSERT policy (restricted)
CREATE POLICY "admin_insert_limited_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') 
  AND role::text NOT IN ('admin', 'super_admin')
);

-- Step 7: Create Admin UPDATE policy (restricted)
CREATE POLICY "admin_update_limited_roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND role::text NOT IN ('admin', 'super_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND role::text NOT IN ('admin', 'super_admin')
);

-- Step 8: Create Admin DELETE policy (restricted)
CREATE POLICY "admin_delete_limited_roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND role::text NOT IN ('admin', 'super_admin')
);

-- Step 9: Drop ALL existing policies on user_module_permissions
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'user_module_permissions' AND schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.user_module_permissions';
  END LOOP;
END $$;

-- Step 10: Create Super Admin permissions policy
CREATE POLICY "super_admin_manage_permissions"
ON public.user_module_permissions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Step 11: Create Users view own permissions policy
CREATE POLICY "users_view_own_permissions"
ON public.user_module_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Step 12: Create Admin view all permissions policy
CREATE POLICY "admin_view_all_permissions"
ON public.user_module_permissions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 13: Create check_module_permission function
CREATE OR REPLACE FUNCTION public.check_module_permission(
  _user_id uuid,
  _module_name text,
  _permission text
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
  IF public.has_role(_user_id, 'super_admin') THEN
    RETURN true;
  END IF;

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
  WHERE ump.user_id = _user_id AND m.name = _module_name
  LIMIT 1;

  RETURN COALESCE(_has_permission, false);
END;
$$;

-- Step 14: Create bootstrap function
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
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  
  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = v_uid;
  IF v_email IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  IF lower(v_email) <> 'super@gmail.com' THEN RAISE EXCEPTION 'only super@gmail.com can bootstrap'; END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  DELETE FROM public.user_roles WHERE user_id = v_uid AND role = 'student';
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_super_admin() TO authenticated;

-- Step 15: Create site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_read_all" ON public.site_settings;
CREATE POLICY "site_settings_read_all"
ON public.site_settings
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "site_settings_write_admin" ON public.site_settings;
CREATE POLICY "site_settings_write_admin"
ON public.site_settings
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

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

-- Step 16: Update handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

  RETURN NEW;
END;
$$;

-- Step 17: Fix courses table RLS (prevent infinite recursion)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'courses' AND schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.courses';
  END LOOP;
END $$;

CREATE POLICY "anyone_can_view_courses"
  ON public.courses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "super_admin_can_create_courses"
  ON public.courses
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "admin_can_create_courses_with_permission"
  ON public.courses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') AND
    public.check_module_permission(auth.uid(), 'courses', 'create')
  );

CREATE POLICY "teacher_can_create_courses"
  ON public.courses
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "super_admin_can_update_courses"
  ON public.courses
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "admin_can_update_courses_with_permission"
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

CREATE POLICY "teacher_can_update_own_courses"
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

COMMIT;

-- Verification
DO $$
DECLARE
  policies_count int;
BEGIN
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE tablename = 'user_roles' AND schemaname = 'public';
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RBAC FIX APPLIED SUCCESSFULLY';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'user_roles policies: %', policies_count;
  RAISE NOTICE 'Super Admin: Can assign ALL roles';
  RAISE NOTICE 'Admin: Can assign teacher, student, guardian only';
  RAISE NOTICE '============================================';
END $$;
