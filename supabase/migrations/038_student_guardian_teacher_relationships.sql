-- Migration: Student-Guardian-Teacher Relationships System
-- Date: 2024-12-13
-- Description: Implements structured relationships between Students, Teachers, and Guardians
--              with profile completion tracking and role-based access views

-- ============================================
-- 1. Add missing fields to profiles table
-- ============================================

-- Add email field (if not exists - may already be in auth.users)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add address field for guardian information
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add profile_completed flag to track if student has completed profile setup
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;

-- Add guardian_name, guardian_email, guardian_phone, guardian_address for students
-- These fields store guardian info when provided during enrollment
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS guardian_name TEXT,
ADD COLUMN IF NOT EXISTS guardian_email TEXT,
ADD COLUMN IF NOT EXISTS guardian_phone TEXT,
ADD COLUMN IF NOT EXISTS guardian_address TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_profile_completed ON public.profiles(profile_completed);

-- ============================================
-- 2. Helper function to check if profile is complete
-- ============================================

CREATE OR REPLACE FUNCTION public.is_profile_complete(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = _user_id AND ur.role = 'student'
      ) THEN
        -- For students, check if profile and guardian info is complete
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = _user_id
          AND p.full_name IS NOT NULL
          AND p.full_name != ''
          AND (
            -- Either guardian info in profile OR guardian relationship exists
            (p.guardian_name IS NOT NULL AND p.guardian_name != '' 
             AND p.guardian_email IS NOT NULL AND p.guardian_email != ''
             AND p.guardian_phone IS NOT NULL AND p.guardian_phone != '')
            OR EXISTS (
              SELECT 1 FROM public.student_guardians sg
              WHERE sg.student_id = _user_id
            )
          )
        )
      ELSE
        -- For non-students, just check basic profile
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = _user_id
          AND p.full_name IS NOT NULL
          AND p.full_name != ''
        )
    END
$$;

-- ============================================
-- 3. View: Teachers can see their students with guardian info
-- ============================================

CREATE OR REPLACE VIEW public.teacher_students_with_guardians
WITH (security_invoker = true) AS
SELECT DISTINCT
  s.id AS student_id,
  s.full_name AS student_name,
  s.email AS student_email,
  s.phone AS student_phone,
  s.avatar_url AS student_avatar,
  ce.course_id,
  c.title AS course_title,
  t.id AS teacher_id,
  -- Guardian information from student_guardians relationship
  g.id AS guardian_id,
  g.full_name AS guardian_name,
  g.email AS guardian_email,
  g.phone AS guardian_phone,
  g.address AS guardian_address,
  sg.relationship AS guardian_relationship,
  -- Fallback to profile guardian fields if no relationship exists
  COALESCE(g.full_name, p.guardian_name) AS effective_guardian_name,
  COALESCE(g.email, p.guardian_email) AS effective_guardian_email,
  COALESCE(g.phone, p.guardian_phone) AS effective_guardian_phone,
  COALESCE(g.address, p.guardian_address) AS effective_guardian_address,
  ce.enrolled_at,
  ce.completed_at
FROM public.course_enrollments ce
INNER JOIN public.teacher_course_assignments tca ON ce.course_id = tca.course_id
INNER JOIN public.profiles s ON ce.user_id = s.id
INNER JOIN public.profiles t ON tca.teacher_id = t.id
INNER JOIN public.courses c ON ce.course_id = c.id
LEFT JOIN public.student_guardians sg ON s.id = sg.student_id
LEFT JOIN public.profiles g ON sg.guardian_id = g.id
LEFT JOIN public.profiles p ON s.id = p.id
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = s.id AND ur.role = 'student'
)
AND EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = t.id AND ur.role = 'teacher'
);

COMMENT ON VIEW public.teacher_students_with_guardians IS 
  'View for teachers to see their assigned students with guardian information';

-- ============================================
-- 4. View: Guardians can see their students with teacher info
-- ============================================

CREATE OR REPLACE VIEW public.guardian_students_with_teachers
WITH (security_invoker = true) AS
SELECT DISTINCT
  s.id AS student_id,
  s.full_name AS student_name,
  s.email AS student_email,
  s.phone AS student_phone,
  s.avatar_url AS student_avatar,
  g.id AS guardian_id,
  g.full_name AS guardian_name,
  sg.relationship AS relationship,
  -- Teacher information
  t.id AS teacher_id,
  t.full_name AS teacher_name,
  t.email AS teacher_email,
  t.phone AS teacher_phone,
  t.avatar_url AS teacher_avatar,
  ce.course_id,
  c.title AS course_title,
  ce.enrolled_at,
  ce.completed_at
FROM public.student_guardians sg
INNER JOIN public.profiles s ON sg.student_id = s.id
INNER JOIN public.profiles g ON sg.guardian_id = g.id
INNER JOIN public.course_enrollments ce ON s.id = ce.user_id
INNER JOIN public.teacher_course_assignments tca ON ce.course_id = tca.course_id
INNER JOIN public.profiles t ON tca.teacher_id = t.id
INNER JOIN public.courses c ON ce.course_id = c.id
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = s.id AND ur.role = 'student'
)
AND EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = t.id AND ur.role = 'teacher'
);

COMMENT ON VIEW public.guardian_students_with_teachers IS 
  'View for guardians to see their linked students with teacher information';

-- ============================================
-- 5. Note on Security
-- ============================================
-- Views use security_invoker = true, which means they respect RLS policies
-- of the underlying tables. Security is enforced through:
-- 1. RLS policies on underlying tables (profiles, course_enrollments, student_guardians, etc.)
-- 2. WHERE clauses in the view definitions (filter by role)
-- 3. Application-level filtering: When querying these views, add WHERE clauses:
--    - For teachers: WHERE teacher_id = auth.uid()
--    - For guardians: WHERE guardian_id = auth.uid()
--    - For admins: No additional filter needed (can see all)

-- ============================================
-- 6. Function: Create guardian user and link to student
-- ============================================

CREATE OR REPLACE FUNCTION public.create_guardian_for_student(
  _student_id UUID,
  _guardian_name TEXT,
  _guardian_email TEXT,
  _guardian_phone TEXT,
  _guardian_address TEXT,
  _admin_id UUID,
  _relationship TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _guardian_user_id UUID;
  _existing_guardian_id UUID;
  _result JSON;
BEGIN
  -- Verify admin
  IF NOT is_admin_or_higher(_admin_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Only admins can create guardians'
    );
  END IF;

  -- Check if guardian email already exists
  SELECT id INTO _existing_guardian_id
  FROM auth.users
  WHERE email = _guardian_email
  LIMIT 1;

  IF _existing_guardian_id IS NOT NULL THEN
    -- Guardian user already exists, just link them
    _guardian_user_id := _existing_guardian_id;
    
    -- Ensure guardian role exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_guardian_user_id, 'guardian')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Update guardian profile info
    UPDATE public.profiles
    SET 
      full_name = COALESCE(NULLIF(_guardian_name, ''), full_name),
      email = COALESCE(NULLIF(_guardian_email, ''), email),
      phone = COALESCE(NULLIF(_guardian_phone, ''), phone),
      address = COALESCE(NULLIF(_guardian_address, ''), address)
    WHERE id = _guardian_user_id;
  ELSE
    -- Create new guardian user (this would typically be done via auth.signUp in the frontend)
    -- For now, we'll return an error suggesting to create the user first
    RETURN json_build_object(
      'success', false,
      'error', 'Guardian user does not exist. Please create the guardian account first.',
      'requires_user_creation', true
    );
  END IF;

  -- Create or update student-guardian relationship
  INSERT INTO public.student_guardians (student_id, guardian_id, relationship)
  VALUES (_student_id, _guardian_user_id, _relationship)
  ON CONFLICT (student_id, guardian_id) 
  DO UPDATE SET relationship = COALESCE(EXCLUDED.relationship, student_guardians.relationship);

  -- Update student profile with guardian info (as backup)
  UPDATE public.profiles
  SET 
    guardian_name = _guardian_name,
    guardian_email = _guardian_email,
    guardian_phone = _guardian_phone,
    guardian_address = _guardian_address
  WHERE id = _student_id;

  RETURN json_build_object(
    'success', true,
    'guardian_id', _guardian_user_id,
    'message', 'Guardian linked to student successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- ============================================
-- 7. Function: Update student profile completion status
-- ============================================

CREATE OR REPLACE FUNCTION public.update_profile_completion(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_complete BOOLEAN;
BEGIN
  -- Check if profile exists (might not exist yet during signup)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    RETURN false;
  END IF;
  
  -- Get completion status
  _is_complete := is_profile_complete(_user_id);
  
  -- Only update if the value would change (prevents unnecessary trigger recursion)
  UPDATE public.profiles
  SET profile_completed = _is_complete
  WHERE id = _user_id
  AND (profile_completed IS DISTINCT FROM _is_complete);
  
  RETURN _is_complete;
END;
$$;

-- ============================================
-- 8. Trigger: Auto-update profile_completed when profile changes
-- ============================================

CREATE OR REPLACE FUNCTION public.trigger_update_profile_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Skip if profile_completed is already being set (prevents recursion)
  IF OLD.profile_completed IS DISTINCT FROM NEW.profile_completed THEN
    RETURN NEW;
  END IF;
  
  -- Only update if relevant fields changed
  IF (OLD.full_name IS DISTINCT FROM NEW.full_name OR
      OLD.guardian_name IS DISTINCT FROM NEW.guardian_name OR
      OLD.guardian_email IS DISTINCT FROM NEW.guardian_email OR
      OLD.guardian_phone IS DISTINCT FROM NEW.guardian_phone) THEN
    -- Update completion status (this will set profile_completed)
    PERFORM update_profile_completion(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profile_completion_trigger ON public.profiles;
-- Only trigger on UPDATE (not INSERT) to avoid recursion during signup
-- The WHEN clause ensures we only fire when relevant fields change
CREATE TRIGGER update_profile_completion_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.full_name IS DISTINCT FROM NEW.full_name OR
        OLD.guardian_name IS DISTINCT FROM NEW.guardian_name OR
        OLD.guardian_email IS DISTINCT FROM NEW.guardian_email OR
        OLD.guardian_phone IS DISTINCT FROM NEW.guardian_phone)
  EXECUTE FUNCTION public.trigger_update_profile_completion();

-- ============================================
-- 9. Update RLS policies for profiles to allow students to update their own profile
-- ============================================

-- Allow students to update their own profile including guardian fields
DROP POLICY IF EXISTS "Students can update own profile with guardian info" ON public.profiles;
CREATE POLICY "Students can update own profile with guardian info"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND (
    -- Students can update their own profile
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'student'
    )
    OR
    -- Admins can update any profile
    is_admin_or_higher(auth.uid())
  )
);

-- ============================================
-- 10. Comments for documentation
-- ============================================

COMMENT ON COLUMN public.profiles.email IS 'User email (may duplicate auth.users.email for convenience)';
COMMENT ON COLUMN public.profiles.address IS 'User physical address';
COMMENT ON COLUMN public.profiles.profile_completed IS 'Flag indicating if student has completed profile and guardian information';
COMMENT ON COLUMN public.profiles.guardian_name IS 'Guardian name stored in student profile (backup to student_guardians relationship)';
COMMENT ON COLUMN public.profiles.guardian_email IS 'Guardian email stored in student profile';
COMMENT ON COLUMN public.profiles.guardian_phone IS 'Guardian phone stored in student profile';
COMMENT ON COLUMN public.profiles.guardian_address IS 'Guardian address stored in student profile';

-- ============================================
-- Verification
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Student-Guardian-Teacher Relationships migration completed';
  RAISE NOTICE '📋 Added fields: email, address, profile_completed, guardian_* fields';
  RAISE NOTICE '👁️ Created views: teacher_students_with_guardians, guardian_students_with_teachers';
  RAISE NOTICE '🔧 Created functions: is_profile_complete, create_guardian_for_student, update_profile_completion';
END $$;

