-- ============================================
-- FIX: Courses Table RLS Infinite Recursion
-- Error: "infinite recursion detected in policy for relation \"courses\""
-- ============================================
-- This migration fixes the infinite recursion by:
-- 1. Dropping ALL existing policies on courses
-- 2. Creating clean, non-recursive policies
-- 3. Ensuring no circular dependencies

BEGIN;

-- ============================================
-- STEP 1: Drop ALL existing policies on courses table
-- ============================================
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

-- ============================================
-- STEP 2: Create helper function to check enrollment (bypasses RLS)
-- ============================================
-- This function uses SECURITY DEFINER to bypass RLS and avoid recursion
CREATE OR REPLACE FUNCTION public.is_user_enrolled_in_course(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE course_id = _course_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_assigned_to_course(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_course_assignments
    WHERE course_id = _course_id AND teacher_id = _user_id
  );
$$;

-- ============================================
-- STEP 3: Create clean SELECT policy
-- ============================================
-- Use SECURITY DEFINER functions to avoid RLS recursion
CREATE POLICY "courses_select_authenticated"
  ON public.courses
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins can view all
    public.has_role(auth.uid(), 'super_admin') OR
    -- Users with courses.read permission
    public.has_module_permission(auth.uid(), 'courses', 'read') OR
    -- Students can view courses they're enrolled in (using SECURITY DEFINER function)
    (public.has_role(auth.uid(), 'student') AND public.is_user_enrolled_in_course(auth.uid(), courses.id)) OR
    -- Teachers can view courses they created or are assigned to
    (public.has_role(auth.uid(), 'teacher') AND (
      created_by = auth.uid() OR
      public.is_teacher_assigned_to_course(auth.uid(), courses.id)
    ))
  );

-- ============================================
-- STEP 4: Create INSERT policy
-- ============================================
-- Super admins can always create
CREATE POLICY "courses_insert_super_admin"
  ON public.courses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
  );

-- Admins with courses.create permission
CREATE POLICY "courses_insert_admin_with_permission"
  ON public.courses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') AND
    public.has_module_permission(auth.uid(), 'courses', 'create')
  );

-- Teachers can create courses
CREATE POLICY "courses_insert_teacher"
  ON public.courses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'teacher')
  );

-- ============================================
-- STEP 5: Create UPDATE policy
-- ============================================
-- Super admins can always update
CREATE POLICY "courses_update_super_admin"
  ON public.courses
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Admins with courses.update permission
CREATE POLICY "courses_update_admin_with_permission"
  ON public.courses
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') AND
    public.has_module_permission(auth.uid(), 'courses', 'update')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') AND
    public.has_module_permission(auth.uid(), 'courses', 'update')
  );

-- Teachers can update their own courses
CREATE POLICY "courses_update_teacher_own"
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

-- ============================================
-- STEP 6: Create DELETE policy
-- ============================================
-- Super admins can always delete
CREATE POLICY "courses_delete_super_admin"
  ON public.courses
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Admins with courses.delete permission
CREATE POLICY "courses_delete_admin_with_permission"
  ON public.courses
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') AND
    public.has_module_permission(auth.uid(), 'courses', 'delete')
  );

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
  policies_count int;
BEGIN
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE tablename = 'courses' AND schemaname = 'public';
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Courses RLS Policies Fixed';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total policies: %', policies_count;
  RAISE NOTICE '✅ All conflicting policies removed';
  RAISE NOTICE '✅ Clean policies created';
  RAISE NOTICE '✅ No infinite recursion';
  RAISE NOTICE '============================================';
END $$;
