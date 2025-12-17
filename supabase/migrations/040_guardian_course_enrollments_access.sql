-- Migration: Guardian Access to Course Enrollments
-- Date: 2024-12-13
-- Description: Allows guardians to view course enrollments for their linked students

-- ============================================
-- 1. Update RLS policy for course_enrollments to include guardians
-- ============================================

-- Drop existing policy
DROP POLICY IF EXISTS "users_with_enrollment_read_permission_can_view_enrollments" ON public.course_enrollments;

-- Create new policy that includes guardians
CREATE POLICY "users_with_enrollment_read_permission_can_view_enrollments"
  ON public.course_enrollments FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'read') OR
    public.has_module_permission(auth.uid(), 'enrollments', 'read') OR
    -- Users can view their own enrollments
    user_id = auth.uid() OR
    -- Teachers can view enrollments for their courses
    (public.has_role(auth.uid(), 'teacher') AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_enrollments.course_id AND c.created_by = auth.uid()
    )) OR
    -- Guardians can view enrollments for their linked students
    (public.has_role(auth.uid(), 'guardian') AND EXISTS (
      SELECT 1 FROM public.student_guardians sg
      WHERE sg.student_id = course_enrollments.user_id 
      AND sg.guardian_id = auth.uid()
    ))
  );

COMMENT ON POLICY "users_with_enrollment_read_permission_can_view_enrollments" ON public.course_enrollments IS 
  'Allows users to view enrollments: own enrollments, teachers for their courses, guardians for their linked students, or users with proper permissions';

-- ============================================
-- 2. Update RLS policy for assignments to include guardians
-- ============================================

DROP POLICY IF EXISTS "Guardians can view their students' assignment submissions" ON public.assignment_submissions;

CREATE POLICY "Guardians can view their students' assignment submissions"
  ON public.assignment_submissions FOR SELECT
  TO authenticated
  USING (
    -- Admins can view all
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'quizzes', 'read') OR
    -- Students can view their own submissions
    student_id = auth.uid() OR
    -- Guardians can view their linked students' submissions
    (public.has_role(auth.uid(), 'guardian') AND EXISTS (
      SELECT 1 FROM public.student_guardians sg
      WHERE sg.student_id = assignment_submissions.student_id 
      AND sg.guardian_id = auth.uid()
    ))
  );

-- ============================================
-- 3. Update RLS policy for quiz_submissions to include guardians
-- ============================================

DROP POLICY IF EXISTS "Guardians can view their students' quiz submissions" ON public.quiz_submissions;

CREATE POLICY "Guardians can view their students' quiz submissions"
  ON public.quiz_submissions FOR SELECT
  TO authenticated
  USING (
    -- Admins can view all
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'quizzes', 'read') OR
    -- Students can view their own submissions
    student_id = auth.uid() OR
    -- Guardians can view their linked students' submissions
    (public.has_role(auth.uid(), 'guardian') AND EXISTS (
      SELECT 1 FROM public.student_guardians sg
      WHERE sg.student_id = quiz_submissions.student_id 
      AND sg.guardian_id = auth.uid()
    ))
  );

-- ============================================
-- 4. Update RLS policy for learning_progress to include guardians
-- ============================================

DROP POLICY IF EXISTS "Guardians can view their students' learning progress" ON public.learning_progress;

CREATE POLICY "Guardians can view their students' learning progress"
  ON public.learning_progress FOR SELECT
  TO authenticated
  USING (
    -- Admins can view all
    public.has_role(auth.uid(), 'super_admin') OR
    -- Students can view their own progress
    student_id = auth.uid() OR
    -- Guardians can view their linked students' progress
    (public.has_role(auth.uid(), 'guardian') AND EXISTS (
      SELECT 1 FROM public.student_guardians sg
      WHERE sg.student_id = learning_progress.student_id 
      AND sg.guardian_id = auth.uid()
    ))
  );

-- ============================================
-- 5. Update RLS policy for certificates to include guardians
-- ============================================

DROP POLICY IF EXISTS "Guardians can view their students' certificates" ON public.certificates;

CREATE POLICY "Guardians can view their students' certificates"
  ON public.certificates FOR SELECT
  TO authenticated
  USING (
    -- Admins can view all
    public.has_role(auth.uid(), 'super_admin') OR
    -- Users can view their own certificates
    user_id = auth.uid() OR
    -- Guardians can view their linked students' certificates
    (public.has_role(auth.uid(), 'guardian') AND EXISTS (
      SELECT 1 FROM public.student_guardians sg
      WHERE sg.student_id = certificates.user_id 
      AND sg.guardian_id = auth.uid()
    ))
  );

-- ============================================
-- Verification
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Guardian access to course enrollments and related data enabled';
  RAISE NOTICE '📋 Updated policies for: course_enrollments, assignment_submissions, quiz_submissions, learning_progress, certificates';
  RAISE NOTICE '👁️ Guardians can now view all academic data for their linked students';
END $$;


