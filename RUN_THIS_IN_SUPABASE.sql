-- ============================================
-- COMPLETE ENROLLMENT FIX - ALL IN ONE
-- ============================================
-- INSTRUCTIONS:
-- 1. Copy this ENTIRE file
-- 2. Go to Supabase Dashboard > SQL Editor
-- 3. Paste and click RUN
-- 4. You should see success messages at the end
-- ============================================

-- STEP 1: Create teacher_course_assignments table
CREATE TABLE IF NOT EXISTS public.teacher_course_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(teacher_id, course_id)
);

ALTER TABLE public.teacher_course_assignments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tca_teacher ON public.teacher_course_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_tca_course ON public.teacher_course_assignments(course_id);

-- STEP 2: Drop ALL conflicting RLS policies
DROP POLICY IF EXISTS "Admins can insert enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins can insert for others" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins full access" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins can update enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins can delete enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins can manage teacher assignments" ON public.teacher_course_assignments;
DROP POLICY IF EXISTS "Teachers can view their assignments" ON public.teacher_course_assignments;

-- STEP 3: Create simple RLS policies
CREATE POLICY "Admins full access" ON public.course_enrollments
FOR ALL USING (is_admin_or_higher(auth.uid())) WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Teachers view assignments" ON public.teacher_course_assignments
FOR SELECT USING (teacher_id = auth.uid() OR is_admin_or_higher(auth.uid()));

CREATE POLICY "Admins manage assignments" ON public.teacher_course_assignments
FOR ALL USING (is_admin_or_higher(auth.uid())) WITH CHECK (is_admin_or_higher(auth.uid()));

-- STEP 4: Create secure functions
CREATE OR REPLACE FUNCTION public.admin_enroll_student(_student_id UUID, _course_id UUID, _admin_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _enrollment_id UUID; _is_admin BOOLEAN;
BEGIN
  SELECT is_admin_or_higher(_admin_id) INTO _is_admin;
  IF NOT _is_admin THEN RETURN json_build_object('success', false, 'error', 'Unauthorized'); END IF;
  IF EXISTS (SELECT 1 FROM course_enrollments WHERE user_id = _student_id AND course_id = _course_id) THEN
    RETURN json_build_object('success', false, 'error', 'Already enrolled');
  END IF;
  INSERT INTO course_enrollments (user_id, course_id, enrolled_at) VALUES (_student_id, _course_id, NOW()) RETURNING id INTO _enrollment_id;
  RETURN json_build_object('success', true, 'enrollment_id', _enrollment_id);
EXCEPTION WHEN OTHERS THEN RETURN json_build_object('success', false, 'error', SQLERRM);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_assign_teacher(_teacher_id UUID, _course_id UUID, _admin_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _assignment_id UUID; _is_admin BOOLEAN;
BEGIN
  SELECT is_admin_or_higher(_admin_id) INTO _is_admin;
  IF NOT _is_admin THEN RETURN json_build_object('success', false, 'error', 'Unauthorized'); END IF;
  IF EXISTS (SELECT 1 FROM teacher_course_assignments WHERE teacher_id = _teacher_id AND course_id = _course_id) THEN
    RETURN json_build_object('success', true, 'message', 'Already assigned');
  END IF;
  INSERT INTO teacher_course_assignments (teacher_id, course_id, assigned_by, assigned_at) VALUES (_teacher_id, _course_id, _admin_id, NOW()) RETURNING id INTO _assignment_id;
  RETURN json_build_object('success', true, 'assignment_id', _assignment_id);
EXCEPTION WHEN OTHERS THEN RETURN json_build_object('success', false, 'error', SQLERRM);
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_enroll_student TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_teacher TO authenticated;

-- STEP 5: Verification (you should see success messages)
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Table teacher_course_assignments exists: %', EXISTS(SELECT FROM pg_tables WHERE tablename = 'teacher_course_assignments');
  RAISE NOTICE 'Function admin_enroll_student exists: %', EXISTS(SELECT FROM pg_proc WHERE proname = 'admin_enroll_student');
  RAISE NOTICE 'Function admin_assign_teacher exists: %', EXISTS(SELECT FROM pg_proc WHERE proname = 'admin_assign_teacher');
  RAISE NOTICE '========================================';
  RAISE NOTICE 'You can now create enrollments!';
  RAISE NOTICE '========================================';
END $$;

