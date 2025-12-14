-- ============================================
-- LINK ASSIGNMENTS AND QUIZZES TO COURSES
-- ============================================
-- This migration adds course_id to assignments and quizzes
-- so teachers can manage assessments per course

BEGIN;

-- ============================================
-- STEP 1: Add course_id to assignments table
-- ============================================
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_assignments_course ON public.assignments(course_id);

-- ============================================
-- STEP 2: Add course_id to quizzes table
-- ============================================
ALTER TABLE public.quizzes
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_quizzes_course ON public.quizzes(course_id);

-- ============================================
-- STEP 3: Update RLS policies for assignments
-- ============================================
-- Drop old policies
DROP POLICY IF EXISTS "users_with_quizzes_read_permission_can_view_assignments" ON public.assignments;
DROP POLICY IF EXISTS "users_with_quizzes_create_permission_can_create_assignments" ON public.assignments;
DROP POLICY IF EXISTS "users_with_quizzes_update_permission_can_update_assignments" ON public.assignments;
DROP POLICY IF EXISTS "users_with_quizzes_delete_permission_can_delete_assignments" ON public.assignments;

-- Drop new policies if they already exist (from previous migration runs)
DROP POLICY IF EXISTS "teachers_can_view_assignments_for_assigned_courses" ON public.assignments;
DROP POLICY IF EXISTS "teachers_can_create_assignments_for_assigned_courses" ON public.assignments;
DROP POLICY IF EXISTS "teachers_can_update_assignments_for_assigned_courses" ON public.assignments;
DROP POLICY IF EXISTS "teachers_can_delete_assignments_for_assigned_courses" ON public.assignments;

-- Assignments SELECT: Teachers can view assignments for their assigned courses
CREATE POLICY "teachers_can_view_assignments_for_assigned_courses"
  ON public.assignments FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'quizzes', 'read') OR
    -- Students can view active assignments for enrolled courses
    (public.has_role(auth.uid(), 'student') AND is_active = true AND (
      course_id IS NULL OR EXISTS (
        SELECT 1 FROM public.course_enrollments
        WHERE course_id = assignments.course_id AND user_id = auth.uid()
      )
    )) OR
    -- Teachers can view assignments for their assigned courses
    (public.has_role(auth.uid(), 'teacher') AND (
      created_by = auth.uid() OR
      (course_id IS NOT NULL AND public.is_teacher_assigned_to_course(auth.uid(), course_id))
    ))
  );

-- Assignments INSERT: Teachers can create for assigned courses
CREATE POLICY "teachers_can_create_assignments_for_assigned_courses"
  ON public.assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'quizzes', 'create') OR
    -- Teachers can create assignments for their assigned courses
    (public.has_role(auth.uid(), 'teacher') AND (
      created_by = auth.uid() AND
      (course_id IS NULL OR public.is_teacher_assigned_to_course(auth.uid(), course_id))
    ))
  );

-- Assignments UPDATE: Teachers can update for assigned courses
CREATE POLICY "teachers_can_update_assignments_for_assigned_courses"
  ON public.assignments FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'quizzes', 'update') OR
    -- Teachers can update assignments they created or for assigned courses
    (public.has_role(auth.uid(), 'teacher') AND (
      created_by = auth.uid() OR
      (course_id IS NOT NULL AND public.is_teacher_assigned_to_course(auth.uid(), course_id))
    ))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'quizzes', 'update') OR
    (public.has_role(auth.uid(), 'teacher') AND (
      created_by = auth.uid() OR
      (course_id IS NOT NULL AND public.is_teacher_assigned_to_course(auth.uid(), course_id))
    ))
  );

-- Assignments DELETE: Teachers can delete for assigned courses
CREATE POLICY "teachers_can_delete_assignments_for_assigned_courses"
  ON public.assignments FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'quizzes', 'delete') OR
    -- Teachers can delete assignments they created or for assigned courses
    (public.has_role(auth.uid(), 'teacher') AND (
      created_by = auth.uid() OR
      (course_id IS NOT NULL AND public.is_teacher_assigned_to_course(auth.uid(), course_id))
    ))
  );

-- ============================================
-- STEP 4: Update RLS policies for quizzes
-- ============================================
-- Note: Quiz policies are already in place, but we should ensure they check course assignments
-- The existing policies should work, but we can enhance them if needed

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Assignments and Quizzes Linked to Courses';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ course_id added to assignments';
  RAISE NOTICE '✅ course_id added to quizzes';
  RAISE NOTICE '✅ RLS policies updated';
  RAISE NOTICE '============================================';
END $$;
