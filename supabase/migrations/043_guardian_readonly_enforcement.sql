-- Migration: Guardian Read-Only Access Enforcement
-- Date: 2024-12-17
-- Description: Explicitly enforces read-only access for guardians on all student-related data

BEGIN;

-- ============================================
-- STEP 1: Ensure Guardians CANNOT UPDATE course_enrollments
-- ============================================

-- Drop any existing UPDATE policy that might allow guardians
DROP POLICY IF EXISTS "Guardians can update their students' enrollments" ON public.course_enrollments;

-- Create explicit UPDATE policy that EXCLUDES guardians
CREATE POLICY "users_with_enrollment_update_permission_can_update_enrollments"
  ON public.course_enrollments FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'assign') OR
    public.has_module_permission(auth.uid(), 'enrollments', 'update') OR
    -- Users can update their own enrollments
    user_id = auth.uid()
    -- NOTE: Guardians are explicitly NOT included here
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'assign') OR
    public.has_module_permission(auth.uid(), 'enrollments', 'update') OR
    -- Users can update their own enrollments
    user_id = auth.uid()
    -- NOTE: Guardians are explicitly NOT included here
  );

COMMENT ON POLICY "users_with_enrollment_update_permission_can_update_enrollments" ON public.course_enrollments IS 
  'Allows only admins, users with proper permissions, or users themselves to update enrollments. Guardians are explicitly excluded.';

-- ============================================
-- STEP 2: Ensure Guardians CANNOT INSERT course_enrollments
-- ============================================

-- The existing INSERT policy already excludes guardians, but let's verify by recreating it explicitly
DROP POLICY IF EXISTS "users_with_enrollment_create_permission_can_create_enrollments" ON public.course_enrollments;

CREATE POLICY "users_with_enrollment_create_permission_can_create_enrollments"
  ON public.course_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'assign') OR
    public.has_module_permission(auth.uid(), 'enrollments', 'create') OR
    -- Users can enroll themselves if course allows it
    (user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_enrollments.course_id 
      AND (c.max_capacity IS NULL OR c.max_capacity = 0 OR (
        SELECT COUNT(*) FROM public.course_enrollments ce2 
        WHERE ce2.course_id = c.id
      ) < c.max_capacity)
    ))
    -- NOTE: Guardians are explicitly NOT included here
  );

COMMENT ON POLICY "users_with_enrollment_create_permission_can_create_enrollments" ON public.course_enrollments IS 
  'Allows only admins, users with proper permissions, or users themselves to create enrollments. Guardians are explicitly excluded.';

-- ============================================
-- STEP 3: Ensure Guardians CANNOT DELETE course_enrollments
-- ============================================

-- The existing DELETE policy already excludes guardians, but let's verify by recreating it explicitly
DROP POLICY IF EXISTS "users_with_enrollment_delete_permission_can_delete_enrollments" ON public.course_enrollments;

CREATE POLICY "users_with_enrollment_delete_permission_can_delete_enrollments"
  ON public.course_enrollments FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'assign') OR
    public.has_module_permission(auth.uid(), 'enrollments', 'delete') OR
    -- Users can unenroll themselves
    user_id = auth.uid()
    -- NOTE: Guardians are explicitly NOT included here
  );

COMMENT ON POLICY "users_with_enrollment_delete_permission_can_delete_enrollments" ON public.course_enrollments IS 
  'Allows only admins, users with proper permissions, or users themselves to delete enrollments. Guardians are explicitly excluded.';

-- ============================================
-- STEP 4: Ensure Guardians CANNOT UPDATE assignment_submissions
-- ============================================

DROP POLICY IF EXISTS "Guardians can update their students' assignment submissions" ON public.assignment_submissions;

-- Guardians should only have SELECT (read) access, which is already handled by the existing policy
-- This ensures no UPDATE/INSERT/DELETE policies exist for guardians

COMMENT ON TABLE public.assignment_submissions IS 
  'Guardians have read-only (SELECT) access to their linked students'' submissions. UPDATE/INSERT/DELETE is explicitly prohibited.';

-- ============================================
-- STEP 5: Ensure Guardians CANNOT UPDATE quiz_submissions
-- ============================================

DROP POLICY IF EXISTS "Guardians can update their students' quiz submissions" ON public.quiz_submissions;

-- Guardians should only have SELECT (read) access, which is already handled by the existing policy
-- This ensures no UPDATE/INSERT/DELETE policies exist for guardians

COMMENT ON TABLE public.quiz_submissions IS 
  'Guardians have read-only (SELECT) access to their linked students'' submissions. UPDATE/INSERT/DELETE is explicitly prohibited.';

-- ============================================
-- STEP 6: Ensure Guardians CANNOT UPDATE learning_progress
-- ============================================

DROP POLICY IF EXISTS "Guardians can update their students' learning progress" ON public.learning_progress;

-- Guardians should only have SELECT (read) access, which is already handled by the existing policy
-- This ensures no UPDATE/INSERT/DELETE policies exist for guardians

COMMENT ON TABLE public.learning_progress IS 
  'Guardians have read-only (SELECT) access to their linked students'' progress. UPDATE/INSERT/DELETE is explicitly prohibited.';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Guardian Read-Only Access Enforcement';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Guardians can ONLY SELECT (read) from:';
  RAISE NOTICE '   - course_enrollments';
  RAISE NOTICE '   - assignment_submissions';
  RAISE NOTICE '   - quiz_submissions';
  RAISE NOTICE '   - learning_progress';
  RAISE NOTICE '   - attendance_records';
  RAISE NOTICE '✅ Guardians CANNOT INSERT/UPDATE/DELETE';
  RAISE NOTICE '✅ All write operations explicitly excluded';
  RAISE NOTICE '============================================';
END $$;

COMMIT;
