-- ============================================
-- Migration 049: Intelligent Auto-Assignment System
-- Purpose: Automatically assign library access and maintain relationships
-- when students enroll in courses, and sync changes when mappings update
-- ============================================

-- ============================================
-- STEP 1: Helper Function - Auto-assign Library Access for Enrollment
-- ============================================

CREATE OR REPLACE FUNCTION public.auto_assign_library_access_for_enrollment(
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
  _books_assigned INTEGER := 0;
  _videos_assigned INTEGER := 0;
  _books_errors INTEGER := 0;
  _videos_errors INTEGER := 0;
  _book_record RECORD;
  _video_record RECORD;
BEGIN
  -- Assign books linked to the course (using INSERT with ON CONFLICT)
  FOR _book_record IN
    SELECT book_id FROM course_library_books
    WHERE course_id = _course_id
  LOOP
    BEGIN
      INSERT INTO book_assignments (book_id, user_id, assigned_by, assigned_at)
      VALUES (_book_record.book_id, _student_id, _admin_id, NOW())
      ON CONFLICT (book_id, user_id) DO NOTHING;
    EXCEPTION
      WHEN OTHERS THEN
        _books_errors := _books_errors + 1;
        -- Continue with next book even if one fails
    END;
  END LOOP;
  
  -- Count total book assignments for this course (includes newly inserted and existing)
  SELECT COUNT(*) INTO _books_assigned
  FROM book_assignments ba
  INNER JOIN course_library_books clb ON ba.book_id = clb.book_id
  WHERE ba.user_id = _student_id AND clb.course_id = _course_id;

  -- Assign videos linked to the course (using INSERT with ON CONFLICT)
  FOR _video_record IN
    SELECT video_id FROM course_library_videos
    WHERE course_id = _course_id
  LOOP
    BEGIN
      INSERT INTO video_assignments (video_id, user_id, assigned_by, assigned_at)
      VALUES (_video_record.video_id, _student_id, _admin_id, NOW())
      ON CONFLICT (video_id, user_id) DO NOTHING;
    EXCEPTION
      WHEN OTHERS THEN
        _videos_errors := _videos_errors + 1;
        -- Continue with next video even if one fails
    END;
  END LOOP;
  
  -- Count total video assignments for this course (includes newly inserted and existing)
  SELECT COUNT(*) INTO _videos_assigned
  FROM video_assignments va
  INNER JOIN course_library_videos clv ON va.video_id = clv.video_id
  WHERE va.user_id = _student_id AND clv.course_id = _course_id;

  RETURN json_build_object(
    'success', true,
    'books_assigned', _books_assigned,
    'videos_assigned', _videos_assigned,
    'books_errors', _books_errors,
    'videos_errors', _videos_errors
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.auto_assign_library_access_for_enrollment IS 
  'Automatically assigns all books and videos linked to a course to a student when they enroll. Returns assignment counts and any errors.';

-- ============================================
-- STEP 2: Helper Function - Sync Library Access for All Course Students
-- ============================================

CREATE OR REPLACE FUNCTION public.sync_library_access_for_course_students(
  _course_id UUID,
  _admin_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _student_record RECORD;
  _total_students INTEGER := 0;
  _total_updated INTEGER := 0;
  _total_errors INTEGER := 0;
  _sync_result JSON;
  _effective_admin_id UUID;
BEGIN
  -- Use provided admin_id or try to get a system admin
  IF _admin_id IS NULL THEN
    SELECT ur.user_id INTO _effective_admin_id
    FROM user_roles ur
    WHERE ur.role = 'super_admin'
    LIMIT 1;
    
    IF _effective_admin_id IS NULL THEN
      SELECT ur.user_id INTO _effective_admin_id
      FROM user_roles ur
      WHERE ur.role = 'admin'
      LIMIT 1;
    END IF;
  ELSE
    _effective_admin_id := _admin_id;
  END IF;

  -- For each enrolled student, sync their library access
  FOR _student_record IN
    SELECT DISTINCT user_id FROM course_enrollments
    WHERE course_id = _course_id
  LOOP
    BEGIN
      _sync_result := auto_assign_library_access_for_enrollment(
        _student_record.user_id,
        _course_id,
        COALESCE(_effective_admin_id, '00000000-0000-0000-0000-000000000000'::UUID)
      );
      
      _total_students := _total_students + 1;
      
      IF (_sync_result->>'success')::boolean THEN
        _total_updated := _total_updated + 1;
      ELSE
        _total_errors := _total_errors + 1;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        _total_errors := _total_errors + 1;
        -- Continue with next student
    END;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'total_students', _total_students,
    'total_updated', _total_updated,
    'total_errors', _total_errors
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.sync_library_access_for_course_students IS 
  'Syncs library access for all students enrolled in a course. Used when course-library mappings change.';

-- ============================================
-- STEP 3: Helper Function - Get Primary Teacher for Course
-- ============================================

CREATE OR REPLACE FUNCTION public.get_course_primary_teacher(_course_id UUID)
RETURNS TABLE (
  teacher_id UUID,
  teacher_name TEXT,
  teacher_email TEXT,
  teacher_phone TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    tca.teacher_id,
    p.full_name as teacher_name,
    p.email as teacher_email,
    p.phone as teacher_phone
  FROM public.teacher_course_assignments tca
  LEFT JOIN public.profiles p ON p.id = tca.teacher_id
  WHERE tca.course_id = _course_id
  ORDER BY tca.assigned_at ASC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_course_primary_teacher IS 
  'Returns the primary (first assigned) teacher for a course with their profile information.';

-- ============================================
-- STEP 4: Enhance admin_enroll_student Function
-- ============================================

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
  _library_result JSON;
BEGIN
  -- Verify caller is admin
  IF NOT is_admin_or_higher(_admin_id) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Check duplicate
  IF EXISTS (SELECT 1 FROM course_enrollments WHERE user_id = _student_id AND course_id = _course_id) THEN
    RETURN json_build_object('success', false, 'error', 'Already enrolled');
  END IF;

  -- Insert enrollment
  INSERT INTO course_enrollments (user_id, course_id, enrolled_at)
  VALUES (_student_id, _course_id, NOW())
  RETURNING id INTO _enrollment_id;

  -- Auto-assign library access
  _library_result := auto_assign_library_access_for_enrollment(
    _student_id,
    _course_id,
    _admin_id
  );

  -- Return success with enrollment and library assignment details
  RETURN json_build_object(
    'success', true,
    'enrollment_id', _enrollment_id,
    'library_assignment', _library_result
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.admin_enroll_student IS 
  'Enrolls a student in a course and automatically assigns library access (books/videos) linked to that course.';

-- ============================================
-- STEP 5: Create Triggers for Course-Library Mapping Changes
-- ============================================

-- Trigger function for course_library_books changes
CREATE OR REPLACE FUNCTION public.handle_course_library_books_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _course_id UUID;
  _admin_user_id UUID;
BEGIN
  -- Get the course_id from the trigger
  IF TG_OP = 'DELETE' THEN
    _course_id := OLD.course_id;
  ELSE
    _course_id := NEW.course_id;
  END IF;

  -- Get an admin user_id for the sync function (or use current user if admin)
  -- Try to get first super_admin from user_roles
  SELECT ur.user_id INTO _admin_user_id
  FROM user_roles ur
  WHERE ur.role = 'super_admin'
  LIMIT 1;

  -- If no super_admin found, try regular admin
  IF _admin_user_id IS NULL THEN
    SELECT ur.user_id INTO _admin_user_id
    FROM user_roles ur
    WHERE ur.role = 'admin'
    LIMIT 1;
  END IF;

  -- If still no admin, use system (NULL will be handled gracefully by sync function)
  -- Sync library access for all enrolled students
  PERFORM sync_library_access_for_course_students(_course_id, COALESCE(_admin_user_id, auth.uid()));

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the operation
    RAISE WARNING 'Error syncing library access for course %: %', _course_id, SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger for course_library_books
DROP TRIGGER IF EXISTS on_course_library_books_change ON public.course_library_books;
CREATE TRIGGER on_course_library_books_change
  AFTER INSERT OR UPDATE OR DELETE
  ON public.course_library_books
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_course_library_books_change();

-- Trigger function for course_library_videos changes
CREATE OR REPLACE FUNCTION public.handle_course_library_videos_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _course_id UUID;
  _admin_user_id UUID;
BEGIN
  -- Get the course_id from the trigger
  IF TG_OP = 'DELETE' THEN
    _course_id := OLD.course_id;
  ELSE
    _course_id := NEW.course_id;
  END IF;

  -- Get an admin user_id for the sync function (or use current user if admin)
  -- Try to get first super_admin from user_roles
  SELECT ur.user_id INTO _admin_user_id
  FROM user_roles ur
  WHERE ur.role = 'super_admin'
  LIMIT 1;

  -- If no super_admin found, try regular admin
  IF _admin_user_id IS NULL THEN
    SELECT ur.user_id INTO _admin_user_id
    FROM user_roles ur
    WHERE ur.role = 'admin'
    LIMIT 1;
  END IF;

  -- If still no admin, use system (NULL will be handled gracefully by sync function)
  -- Sync library access for all enrolled students
  PERFORM sync_library_access_for_course_students(_course_id, COALESCE(_admin_user_id, auth.uid()));

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the operation
    RAISE WARNING 'Error syncing library access for course %: %', _course_id, SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger for course_library_videos
DROP TRIGGER IF EXISTS on_course_library_videos_change ON public.course_library_videos;
CREATE TRIGGER on_course_library_videos_change
  AFTER INSERT OR UPDATE OR DELETE
  ON public.course_library_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_course_library_videos_change();

-- ============================================
-- STEP 6: Grant Permissions
-- ============================================

GRANT EXECUTE ON FUNCTION public.auto_assign_library_access_for_enrollment TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_library_access_for_course_students TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_course_primary_teacher TO authenticated;

-- ============================================
-- END OF MIGRATION
-- ============================================

