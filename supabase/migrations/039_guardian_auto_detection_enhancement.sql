-- Migration: Guardian Auto-Detection Enhancement
-- Date: 2024-12-13
-- Description: Enhances guardian auto-detection to handle edge cases and improve reliability

-- ============================================
-- 1. Function: Auto-link guardian to students on signup
-- ============================================

CREATE OR REPLACE FUNCTION public.auto_link_guardian_to_students(_guardian_user_id UUID, _guardian_email TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _student_id UUID;
  _guardian_name TEXT;
  _guardian_phone TEXT;
  _guardian_address TEXT;
  _relationship TEXT;
  _linked_count INT := 0;
BEGIN
  -- Find all students where guardian_email matches
  FOR _student_id, _guardian_name, _guardian_phone, _guardian_address IN
    SELECT 
      p.id AS student_id,
      p.guardian_name,
      p.guardian_phone,
      p.guardian_address
    FROM public.profiles p
    WHERE LOWER(TRIM(p.guardian_email)) = LOWER(TRIM(_guardian_email))
      AND p.guardian_email IS NOT NULL
      AND p.guardian_email != ''
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p.id AND ur.role = 'student'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.student_guardians sg
        WHERE sg.student_id = p.id AND sg.guardian_id = _guardian_user_id
      )
  LOOP
    -- Create student-guardian relationship
    INSERT INTO public.student_guardians (student_id, guardian_id, relationship)
    VALUES (_student_id, _guardian_user_id, _relationship)
    ON CONFLICT (student_id, guardian_id) DO NOTHING;
    
    _linked_count := _linked_count + 1;
  END LOOP;
  
  RETURN _linked_count;
END;
$$;

-- ============================================
-- 2. Function: Check if email is a guardian email
-- ============================================

CREATE OR REPLACE FUNCTION public.is_guardian_email(_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE LOWER(TRIM(p.guardian_email)) = LOWER(TRIM(_email))
      AND p.guardian_email IS NOT NULL
      AND p.guardian_email != ''
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p.id AND ur.role = 'student'
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.student_guardians sg
    INNER JOIN public.profiles p ON sg.student_id = p.id
    WHERE LOWER(TRIM(p.guardian_email)) = LOWER(TRIM(_email))
      AND p.guardian_email IS NOT NULL
      AND p.guardian_email != ''
  )
$$;

-- ============================================
-- 3. Trigger: Auto-link guardian when student profile is updated with guardian email
-- ============================================

CREATE OR REPLACE FUNCTION public.trigger_auto_link_guardian_on_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _guardian_user_id UUID;
  _linked_count INT;
  _is_student BOOLEAN;
BEGIN
  -- Only process if guardian_email was added or changed
  IF (OLD.guardian_email IS DISTINCT FROM NEW.guardian_email) 
     AND NEW.guardian_email IS NOT NULL 
     AND NEW.guardian_email != '' THEN
    
    -- Check if this profile belongs to a student (moved from WHEN clause since subqueries aren't allowed there)
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = NEW.id AND ur.role = 'student'
    ) INTO _is_student;
    
    -- Only proceed if this is a student profile
    IF _is_student THEN
      -- Check if a user with this email exists
      SELECT id INTO _guardian_user_id
      FROM auth.users
      WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.guardian_email))
      LIMIT 1;
      
      -- If guardian user exists and has guardian role, link them
      IF _guardian_user_id IS NOT NULL THEN
        -- Ensure guardian role exists
        INSERT INTO public.user_roles (user_id, role)
        VALUES (_guardian_user_id, 'guardian')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Link to student
        INSERT INTO public.student_guardians (student_id, guardian_id, relationship)
        VALUES (NEW.id, _guardian_user_id, NULL)
        ON CONFLICT (student_id, guardian_id) DO NOTHING;
        
        -- Update guardian profile with info from student profile
        UPDATE public.profiles
        SET
          full_name = COALESCE(NULLIF(NEW.guardian_name, ''), full_name),
          email = COALESCE(NEW.guardian_email, email),
          phone = COALESCE(NULLIF(NEW.guardian_phone, ''), phone),
          address = COALESCE(NULLIF(NEW.guardian_address, ''), address)
        WHERE id = _guardian_user_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_link_guardian_on_profile_update ON public.profiles;
CREATE TRIGGER auto_link_guardian_on_profile_update
  AFTER UPDATE OF guardian_email, guardian_name, guardian_phone, guardian_address ON public.profiles
  FOR EACH ROW
  WHEN (
    OLD.guardian_email IS DISTINCT FROM NEW.guardian_email
    AND NEW.guardian_email IS NOT NULL
    AND NEW.guardian_email != ''
  )
  EXECUTE FUNCTION public.trigger_auto_link_guardian_on_profile_update();

-- ============================================
-- 4. Comments for documentation
-- ============================================

COMMENT ON FUNCTION public.auto_link_guardian_to_students IS 
  'Automatically links a guardian user to all students where guardian_email matches';

COMMENT ON FUNCTION public.is_guardian_email IS 
  'Checks if an email address is registered as a guardian email for any student';

-- ============================================
-- 4. View: Comprehensive guardian student data (courses, assignments, quizzes, results)
-- ============================================

CREATE OR REPLACE VIEW public.guardian_student_comprehensive_data
WITH (security_invoker = true) AS
SELECT DISTINCT
  -- Guardian info
  g.id AS guardian_id,
  g.full_name AS guardian_name,
  g.email AS guardian_email,
  -- Student info
  s.id AS student_id,
  s.full_name AS student_name,
  s.email AS student_email,
  s.phone AS student_phone,
  s.avatar_url AS student_avatar,
  sg.relationship,
  -- Course info
  ce.course_id,
  c.title AS course_title,
  c.description AS course_description,
  ce.enrolled_at AS course_enrolled_at,
  ce.completed_at AS course_completed_at,
  -- Assignment info
  a.id AS assignment_id,
  a.title AS assignment_title,
  a.description AS assignment_description,
  a.due_date AS assignment_due_date,
  a.max_score AS assignment_max_score,
  -- Assignment submission info
  sub.id AS submission_id,
  sub.score AS assignment_score,
  sub.submitted_at AS assignment_submitted_at,
  sub.graded_at AS assignment_graded_at,
  sub.feedback AS assignment_feedback,
  -- Quiz info
  q.id AS quiz_id,
  q.title AS quiz_title,
  q.passing_score AS quiz_passing_score,
  -- Quiz submission info
  qs.id AS quiz_submission_id,
  qs.score AS quiz_score,
  qs.passed AS quiz_passed,
  qs.submitted_at AS quiz_submitted_at,
  -- Progress info
  lp.progress_percentage,
  lp.completed AS lesson_completed,
  lp.last_accessed_at
FROM public.student_guardians sg
INNER JOIN public.profiles s ON sg.student_id = s.id
INNER JOIN public.profiles g ON sg.guardian_id = g.id
LEFT JOIN public.course_enrollments ce ON s.id = ce.user_id
LEFT JOIN public.courses c ON ce.course_id = c.id
LEFT JOIN public.assignments a ON c.id = a.course_id
LEFT JOIN public.assignment_submissions sub ON a.id = sub.assignment_id AND s.id = sub.student_id
LEFT JOIN public.quizzes q ON c.id = q.course_id
LEFT JOIN public.quiz_submissions qs ON q.id = qs.quiz_id AND s.id = qs.student_id
LEFT JOIN public.learning_progress lp ON s.id = lp.student_id AND c.id = lp.content_id
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = s.id AND ur.role = 'student'
)
AND EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = g.id AND ur.role = 'guardian'
);

COMMENT ON VIEW public.guardian_student_comprehensive_data IS 
  'Comprehensive view for guardians to see all student data: courses, assignments, quizzes, results, and progress';

-- ============================================
-- Verification
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Guardian Auto-Detection Enhancement migration completed';
  RAISE NOTICE '🔗 Created functions: auto_link_guardian_to_students, is_guardian_email';
  RAISE NOTICE '🔄 Created trigger: auto_link_guardian_on_profile_update';
  RAISE NOTICE '👁️ Created view: guardian_student_comprehensive_data';
END $$;

