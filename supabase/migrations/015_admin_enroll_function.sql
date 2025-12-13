-- Create a secure function for admins to enroll students
-- This function bypasses RLS using SECURITY DEFINER

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
  _is_admin BOOLEAN;
BEGIN
  -- Verify the calling user is an admin
  SELECT is_admin_or_higher(_admin_id) INTO _is_admin;
  
  IF NOT _is_admin THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Only admins can enroll students'
    );
  END IF;

  -- Check if already enrolled
  IF EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE user_id = _student_id AND course_id = _course_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Student is already enrolled in this course'
    );
  END IF;

  -- Insert enrollment
  INSERT INTO public.course_enrollments (user_id, course_id, enrolled_at)
  VALUES (_student_id, _course_id, NOW())
  RETURNING id INTO _enrollment_id;

  RETURN json_build_object(
    'success', true,
    'enrollment_id', _enrollment_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Create a secure function for admins to assign teachers to courses
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
  _is_admin BOOLEAN;
BEGIN
  -- Verify the calling user is an admin
  SELECT is_admin_or_higher(_admin_id) INTO _is_admin;
  
  IF NOT _is_admin THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Only admins can assign teachers'
    );
  END IF;

  -- Check if already assigned
  IF EXISTS (
    SELECT 1 FROM public.teacher_course_assignments
    WHERE teacher_id = _teacher_id AND course_id = _course_id
  ) THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Teacher already assigned to this course'
    );
  END IF;

  -- Insert teacher assignment
  INSERT INTO public.teacher_course_assignments (teacher_id, course_id, assigned_by, assigned_at)
  VALUES (_teacher_id, _course_id, _admin_id, NOW())
  RETURNING id INTO _assignment_id;

  RETURN json_build_object(
    'success', true,
    'assignment_id', _assignment_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.admin_enroll_student TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_teacher TO authenticated;

