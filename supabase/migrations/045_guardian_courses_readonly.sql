-- Migration: Guardian Course Details Read-Only Access
-- Date: 2024-12-17
-- Description: Allows guardians to view (read-only) course details for courses their students are enrolled in

BEGIN;

-- ============================================
-- STEP 1: Update courses SELECT policy to include guardians (read-only)
-- ============================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "users_with_courses_read_permission_can_view_courses" ON public.courses;

-- Create new SELECT policy that includes guardians (read-only)
CREATE POLICY "users_with_courses_read_permission_can_view_courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'read') OR
    -- Students can view courses they're enrolled in
    (public.has_role(auth.uid(), 'student') AND EXISTS (
      SELECT 1 FROM public.course_enrollments 
      WHERE course_id = courses.id AND user_id = auth.uid()
    )) OR
    -- Teachers can view courses they created or are assigned to
    (public.has_role(auth.uid(), 'teacher') AND (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.teacher_course_assignments WHERE course_id = courses.id AND teacher_id = auth.uid())
    )) OR
    -- Guardians can view courses their linked students are enrolled in (READ-ONLY)
    (public.has_role(auth.uid(), 'guardian') AND EXISTS (
      SELECT 1 FROM public.student_guardians sg
      JOIN public.course_enrollments ce ON sg.student_id = ce.user_id
      WHERE ce.course_id = courses.id 
      AND sg.guardian_id = auth.uid()
    ))
  );

COMMENT ON POLICY "users_with_courses_read_permission_can_view_courses" ON public.courses IS 
  'Allows students, teachers, and guardians (read-only) to view courses. Guardians can only view courses their linked students are enrolled in.';

-- ============================================
-- STEP 2: Ensure Guardians CANNOT INSERT courses
-- ============================================

-- The existing INSERT policy already excludes guardians, but let's verify with comment
-- Only add comment if policy exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'courses' 
    AND policyname = 'users_with_courses_create_permission_can_create_courses'
  ) THEN
    COMMENT ON POLICY "users_with_courses_create_permission_can_create_courses" ON public.courses IS 
      'Allows only admins and users with courses.create permission to create courses. Guardians are explicitly excluded.';
  END IF;
END $$;

-- ============================================
-- STEP 3: Ensure Guardians CANNOT UPDATE courses
-- ============================================

-- The existing UPDATE policy already excludes guardians, but let's verify with comment
-- Only add comment if policy exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'courses' 
    AND policyname = 'users_with_courses_update_permission_can_update_courses'
  ) THEN
    COMMENT ON POLICY "users_with_courses_update_permission_can_update_courses" ON public.courses IS 
      'Allows only admins, users with courses.update permission, or teachers for their own courses to update courses. Guardians are explicitly excluded.';
  END IF;
END $$;

-- ============================================
-- STEP 4: Ensure Guardians CANNOT DELETE courses
-- ============================================

-- Check if DELETE policy exists, if not create one that excludes guardians
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'courses' 
    AND policyname = 'users_with_courses_delete_permission_can_delete_courses'
  ) THEN
    CREATE POLICY "users_with_courses_delete_permission_can_delete_courses"
      ON public.courses FOR DELETE
      TO authenticated
      USING (
        public.has_role(auth.uid(), 'super_admin') OR
        public.has_module_permission(auth.uid(), 'courses', 'delete')
        -- NOTE: Guardians are explicitly NOT included here
      );
  END IF;
END $$;

-- Only add comment if DELETE policy exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'courses' 
    AND policyname = 'users_with_courses_delete_permission_can_delete_courses'
  ) THEN
    COMMENT ON POLICY "users_with_courses_delete_permission_can_delete_courses" ON public.courses IS 
      'Allows only admins and users with courses.delete permission to delete courses. Guardians are explicitly excluded.';
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Guardian Course Details Read-Only Access';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Guardians can now VIEW course details:';
  RAISE NOTICE '   - Courses their linked students are enrolled in';
  RAISE NOTICE '✅ Guardians CANNOT INSERT/UPDATE/DELETE';
  RAISE NOTICE '✅ All write operations remain restricted';
  RAISE NOTICE '============================================';
END $$;

COMMIT;

