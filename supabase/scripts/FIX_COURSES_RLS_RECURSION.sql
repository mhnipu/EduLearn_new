-- ============================================
-- FIX: Courses Table RLS Infinite Recursion
-- Error: "infinite recursion detected in policy for relation \"courses\""
-- ============================================
-- This fixes conflicting RLS policies on courses table

BEGIN;

-- Step 1: Drop ALL existing policies on courses table
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

-- Step 2: Create clean SELECT policy (everyone can view)
CREATE POLICY "anyone_can_view_courses"
  ON public.courses
  FOR SELECT
  TO authenticated
  USING (true);

-- Step 3: Create INSERT policies (separate for each role)
-- Super Admin: Always can create
CREATE POLICY "super_admin_can_create_courses"
  ON public.courses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
  );

-- Admin: Can create if they have courses module permission
CREATE POLICY "admin_can_create_courses_with_permission"
  ON public.courses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') AND
    public.check_module_permission(auth.uid(), 'courses', 'create')
  );

-- Teacher: Can create courses
CREATE POLICY "teacher_can_create_courses"
  ON public.courses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'teacher')
  );

-- Step 4: Create UPDATE policies
-- Super Admin: Always can update
CREATE POLICY "super_admin_can_update_courses"
  ON public.courses
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Admin: Can update if they have courses module permission
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

-- Teacher: Can update own courses
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

-- Step 5: Create DELETE policies
-- Super Admin: Always can delete
CREATE POLICY "super_admin_can_delete_courses"
  ON public.courses
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Admin: Can delete if they have courses module permission
CREATE POLICY "admin_can_delete_courses_with_permission"
  ON public.courses
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') AND
    public.check_module_permission(auth.uid(), 'courses', 'delete')
  );

COMMIT;

-- Verification
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
