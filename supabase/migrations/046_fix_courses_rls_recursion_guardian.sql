-- Migration: Fix Courses RLS Infinite Recursion (Guardian Access)
-- Date: 2024-12-17
-- Description: Fixes infinite recursion caused by migration 045 by using SECURITY DEFINER functions

BEGIN;

-- ============================================
-- STEP 1: Create SECURITY DEFINER function for guardian course access
-- ============================================
-- This function bypasses RLS to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.is_guardian_has_student_enrolled_in_course(_guardian_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_guardians sg
    JOIN public.course_enrollments ce ON sg.student_id = ce.user_id
    WHERE ce.course_id = _course_id 
    AND sg.guardian_id = _guardian_id
  );
$$;

COMMENT ON FUNCTION public.is_guardian_has_student_enrolled_in_course IS 
  'Check if a guardian has a linked student enrolled in a course. Uses SECURITY DEFINER to bypass RLS and avoid infinite recursion.';

-- ============================================
-- STEP 2: Drop and recreate courses SELECT policy using SECURITY DEFINER functions
-- ============================================

-- Drop ALL conflicting SELECT policies that might cause recursion
DROP POLICY IF EXISTS "users_with_courses_read_permission_can_view_courses" ON public.courses;
DROP POLICY IF EXISTS "courses_select_authenticated" ON public.courses;

-- Recreate SELECT policy using SECURITY DEFINER functions to avoid recursion
CREATE POLICY "users_with_courses_read_permission_can_view_courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'read') OR
    -- Students can view courses they're enrolled in (using SECURITY DEFINER function)
    (public.has_role(auth.uid(), 'student') AND public.is_user_enrolled_in_course(auth.uid(), courses.id)) OR
    -- Teachers can view courses they created or are assigned to (using SECURITY DEFINER function)
    (public.has_role(auth.uid(), 'teacher') AND (
      created_by = auth.uid() OR
      public.is_teacher_assigned_to_course(auth.uid(), courses.id)
    )) OR
    -- Guardians can view courses their linked students are enrolled in (using SECURITY DEFINER function)
    (public.has_role(auth.uid(), 'guardian') AND public.is_guardian_has_student_enrolled_in_course(auth.uid(), courses.id))
  );

COMMENT ON POLICY "users_with_courses_read_permission_can_view_courses" ON public.courses IS 
  'Allows students, teachers, and guardians (read-only) to view courses. Uses SECURITY DEFINER functions to avoid infinite recursion.';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Courses RLS Recursion Fix Applied';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Created SECURITY DEFINER function for guardian access';
  RAISE NOTICE '✅ Recreated courses SELECT policy using functions';
  RAISE NOTICE '✅ Infinite recursion issue resolved';
  RAISE NOTICE '============================================';
END $$;

COMMIT;
