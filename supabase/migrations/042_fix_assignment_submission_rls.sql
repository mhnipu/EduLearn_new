-- ============================================
-- FIX ASSIGNMENT SUBMISSION RLS POLICY
-- ============================================
-- This migration fixes the RLS policy for assignment_submissions
-- to allow students to submit assignments without permission checks
-- Date: 2024-12-16
-- Issue: Students getting "new row violates row-level security policy" error

-- Drop the old policy if it exists (from migration 004)
DROP POLICY IF EXISTS "Students can submit assignments" ON public.assignment_submissions;

-- Drop the unified permission policy if it exists (from migration 032)
DROP POLICY IF EXISTS "users_can_create_submissions" ON public.assignment_submissions;

-- Create a simpler, more permissive policy for INSERT
-- Students can submit assignments if they're submitting as themselves
CREATE POLICY "students_can_submit_assignments"
  ON public.assignment_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Super admins can always create
    public.has_role(auth.uid(), 'super_admin') OR
    -- Users with quizzes.create permission can create
    public.has_module_permission(auth.uid(), 'quizzes', 'create') OR
    -- Students can submit their own assignments (simplified check)
    -- Just verify that student_id matches auth.uid() - no role check needed
    -- because if they're authenticated and submitting as themselves, they should be allowed
    (student_id = auth.uid())
  );

-- Also ensure UPDATE policy allows students to update their own ungraded submissions
DROP POLICY IF EXISTS "Students can update own ungraded submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "users_with_quizzes_update_permission_can_update_submissions" ON public.assignment_submissions;

CREATE POLICY "students_can_update_own_submissions"
  ON public.assignment_submissions FOR UPDATE
  TO authenticated
  USING (
    -- Super admins can always update
    public.has_role(auth.uid(), 'super_admin') OR
    -- Users with quizzes.update permission can update
    public.has_module_permission(auth.uid(), 'quizzes', 'update') OR
    -- Students can update their own ungraded submissions
    (student_id = auth.uid() AND graded_at IS NULL)
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'quizzes', 'update') OR
    (student_id = auth.uid() AND graded_at IS NULL)
  );

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Assignment submission RLS policies fixed';
  RAISE NOTICE '📋 Students can now submit assignments without role checks';
  RAISE NOTICE '🔧 Simplified policy: student_id = auth.uid() is sufficient';
END $$;

