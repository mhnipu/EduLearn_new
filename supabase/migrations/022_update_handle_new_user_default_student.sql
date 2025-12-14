-- Migration 022: Updated - Smart guardian auto-detection + NO default role assignment
-- Purpose:
--  - New signups get NO default role (pending approval flow)
--  - EXCEPTION: If signup email matches guardian_email in student profiles, auto-assign guardian role
--  - Auto-link guardian to students when email matches
--  - Save phone into profiles on signup
--  - Set profile_completed = false initially for students
--  - Admin must assign role (student/guardian/teacher) before user can access
--  - After admin assigns student role, user logs in again and sees profile completion form
--  - Be idempotent and safe to re-run

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _guardian_email TEXT;
  _guardian_phone TEXT;
  _guardian_name TEXT;
  _guardian_address TEXT;
  _student_id UUID;
  _relationship TEXT;
  _linked_students_count INT := 0;
BEGIN
  -- Create or update profile (include phone if present)
  -- Set profile_completed = false initially (students need to complete guardian info after role assignment)
  INSERT INTO public.profiles (id, full_name, phone, profile_completed, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', ''),
    false,
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
    email = COALESCE(EXCLUDED.email, profiles.email),
    profile_completed = COALESCE(profiles.profile_completed, false);

  -- ============================================
  -- SMART GUARDIAN AUTO-DETECTION
  -- ============================================
  -- Check if signup email matches any guardian_email in student profiles
  -- This allows guardians to sign up and automatically get linked to their students
  
  FOR _student_id, _guardian_email, _guardian_phone, _guardian_name, _guardian_address, _relationship IN
    SELECT 
      p.id AS student_id,
      p.guardian_email,
      p.guardian_phone,
      p.guardian_name,
      p.guardian_address,
      NULL::TEXT AS relationship
    FROM public.profiles p
    WHERE LOWER(TRIM(p.guardian_email)) = LOWER(TRIM(NEW.email))
      AND p.guardian_email IS NOT NULL
      AND p.guardian_email != ''
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p.id AND ur.role = 'student'
      )
  LOOP
    -- Auto-assign guardian role to this user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'guardian')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Update guardian profile with info from student profile
    UPDATE public.profiles
    SET
      full_name = COALESCE(NULLIF(_guardian_name, ''), full_name, NEW.raw_user_meta_data->>'full_name'),
      email = COALESCE(NEW.email, email),
      phone = COALESCE(NULLIF(_guardian_phone, ''), phone, COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', '')),
      address = COALESCE(NULLIF(_guardian_address, ''), address)
    WHERE id = NEW.id;
    
    -- Create student-guardian relationship
    INSERT INTO public.student_guardians (student_id, guardian_id, relationship)
    VALUES (_student_id, NEW.id, _relationship)
    ON CONFLICT (student_id, guardian_id) DO NOTHING;
    
    _linked_students_count := _linked_students_count + 1;
  END LOOP;
  
  -- Also check existing student_guardians table for guardian_id references
  -- (in case guardian was pre-linked but user didn't exist yet)
  FOR _student_id, _relationship IN
    SELECT 
      sg.student_id,
      sg.relationship
    FROM public.student_guardians sg
    INNER JOIN public.profiles p ON sg.student_id = p.id
    WHERE LOWER(TRIM(p.guardian_email)) = LOWER(TRIM(NEW.email))
      AND p.guardian_email IS NOT NULL
      AND p.guardian_email != ''
      AND sg.guardian_id IS NULL  -- Not yet linked
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = sg.student_id AND ur.role = 'student'
      )
  LOOP
    -- Auto-assign guardian role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'guardian')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Link guardian to student
    UPDATE public.student_guardians
    SET guardian_id = NEW.id
    WHERE student_id = _student_id
      AND guardian_id IS NULL;
    
    _linked_students_count := _linked_students_count + 1;
  END LOOP;
  
  -- If guardian was auto-detected and linked, log it
  IF _linked_students_count > 0 THEN
    RAISE NOTICE '✅ Guardian auto-detected: User % signed up with email % and was automatically assigned guardian role and linked to % student(s)', NEW.id, NEW.email, _linked_students_count;
  END IF;

  -- NO default role assignment for regular users - user goes to /pending-approval until admin assigns role
  -- EXCEPTION: Guardian role is auto-assigned if email matches (see above)
  -- This enforces: "new user has no role until assigned by Super Admin/Admin OR auto-detected as guardian"

  RETURN NEW;
END;
$$;

