-- ============================================
-- FINAL FIX FOR ENROLLMENT - RUN THIS ENTIRE FILE
-- ============================================

-- Step 1: Create teacher_course_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.teacher_course_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(teacher_id, course_id)
);

-- Enable RLS
ALTER TABLE public.teacher_course_assignments ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_teacher_course_assignments_teacher ON public.teacher_course_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_course_assignments_course ON public.teacher_course_assignments(course_id);

-- Step 2: Drop conflicting policies on course_enrollments
DROP POLICY IF EXISTS "Admins can insert enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins can insert for others" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins full access" ON public.course_enrollments;

-- Step 3: Create admin insert policy using existing is_admin_or_higher function
CREATE POLICY "Admins full access" ON public.course_enrollments
FOR ALL USING (
  is_admin_or_higher(auth.uid())
) WITH CHECK (
  is_admin_or_higher(auth.uid())
);

-- Step 4: Drop conflicting policies on teacher_course_assignments
DROP POLICY IF EXISTS "Admins can manage teacher assignments" ON public.teacher_course_assignments;
DROP POLICY IF EXISTS "Teachers can view their assignments" ON public.teacher_course_assignments;

-- Step 5: Create policies for teacher_course_assignments
CREATE POLICY "Admins can manage teacher assignments" ON public.teacher_course_assignments
FOR ALL USING (
  is_admin_or_higher(auth.uid())
) WITH CHECK (
  is_admin_or_higher(auth.uid())
);

CREATE POLICY "Teachers can view their assignments" ON public.teacher_course_assignments
FOR SELECT USING (
  teacher_id = auth.uid()
);

-- Step 6: Create helper function for admin enrollment (bypasses RLS)
CREATE OR REPLACE FUNCTION public.admin_enroll_student(
  _student_id UUID,
  _course_id UUID,
  _admin_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _enrollment_id UUID;
BEGIN
  -- Verify caller is admin
  IF NOT is_admin_or_higher(_admin_id) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Check duplicate
  IF EXISTS (SELECT 1 FROM course_enrollments WHERE user_id = _student_id AND course_id = _course_id) THEN
    RETURN json_build_object('success', false, 'error', 'Already enrolled');
  END IF;

  -- Insert
  INSERT INTO course_enrollments (user_id, course_id, enrolled_at)
  VALUES (_student_id, _course_id, NOW())
  RETURNING id INTO _enrollment_id;

  RETURN json_build_object('success', true, 'enrollment_id', _enrollment_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Step 7: Create helper function for teacher assignment
CREATE OR REPLACE FUNCTION public.admin_assign_teacher(
  _teacher_id UUID,
  _course_id UUID,
  _admin_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _assignment_id UUID;
BEGIN
  -- Verify caller is admin
  IF NOT is_admin_or_higher(_admin_id) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Check duplicate
  IF EXISTS (SELECT 1 FROM teacher_course_assignments WHERE teacher_id = _teacher_id AND course_id = _course_id) THEN
    RETURN json_build_object('success', true, 'message', 'Already assigned');
  END IF;

  -- Insert
  INSERT INTO teacher_course_assignments (teacher_id, course_id, assigned_by, assigned_at)
  VALUES (_teacher_id, _course_id, _admin_id, NOW())
  RETURNING id INTO _assignment_id;

  RETURN json_build_object('success', true, 'assignment_id', _assignment_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Step 8: Grant permissions
GRANT EXECUTE ON FUNCTION public.admin_enroll_student TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_teacher TO authenticated;

-- Step 9: Verify setup (these should return true/counts)
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Function admin_enroll_student created: %', (SELECT COUNT(*) FROM pg_proc WHERE proname = 'admin_enroll_student');
  RAISE NOTICE 'Function admin_assign_teacher created: %', (SELECT COUNT(*) FROM pg_proc WHERE proname = 'admin_assign_teacher');
  RAISE NOTICE 'Table teacher_course_assignments exists: %', (SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'teacher_course_assignments'));
END $$;

