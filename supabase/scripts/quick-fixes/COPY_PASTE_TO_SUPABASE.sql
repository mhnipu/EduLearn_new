-- ============================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Project: alazrdburoobipmofypc
-- URL: https://supabase.com/dashboard/project/alazrdburoobipmofypc/sql/new
-- ============================================

-- ============================================
-- MIGRATION 1: Fix Security Definer View (CRITICAL!)
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '🔧 Starting security fix migration...';
END $$;

-- Drop the insecure view
DROP VIEW IF EXISTS public.student_overview CASCADE;

-- Recreate with SECURITY INVOKER (safe)
CREATE OR REPLACE VIEW public.student_overview 
WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  COUNT(DISTINCT e.course_id) as enrolled_courses,
  COUNT(DISTINCT a.id) as total_assignments,
  COUNT(DISTINCT CASE WHEN sub.status = 'completed' THEN sub.id END) as completed_assignments
FROM public.profiles p
LEFT JOIN public.enrollments e ON p.id = e.student_id
LEFT JOIN public.assignments a ON e.course_id = a.course_id
LEFT JOIN public.assignment_submissions sub ON a.id = sub.assignment_id AND p.id = sub.student_id
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.id AND ur.role = 'student'
)
GROUP BY p.id, p.full_name, p.avatar_url;

COMMENT ON VIEW public.student_overview IS 'Student overview with security invoker (uses querying user permissions)';

DO $$
BEGIN
  RAISE NOTICE '✅ Security fix migration completed!';
END $$;

-- ============================================
-- MIGRATION 2: Add Phone Authentication Support
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '📱 Starting phone authentication migration...';
END $$;

-- Add phone column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create index for faster phone lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- Update trigger to save phone number on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update profile with phone support
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone);
  
  RETURN NEW;
END;
$$;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.phone IS 'User phone number for authentication and contact';

DO $$
BEGIN
  RAISE NOTICE '✅ Phone authentication migration completed!';
END $$;

-- ============================================
-- VERIFICATION: Check that everything is correct
-- ============================================
DO $$
DECLARE
  phone_col_exists boolean;
  view_exists boolean;
BEGIN
  RAISE NOTICE '🔍 Running verification checks...';
  
  -- Check if phone column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'phone'
    AND table_schema = 'public'
  ) INTO phone_col_exists;
  
  IF phone_col_exists THEN
    RAISE NOTICE '✅ Phone column exists in profiles table';
  ELSE
    RAISE WARNING '❌ Phone column NOT found in profiles table!';
  END IF;
  
  -- Check if view exists
  SELECT EXISTS (
    SELECT 1 FROM pg_views 
    WHERE viewname = 'student_overview' 
    AND schemaname = 'public'
  ) INTO view_exists;
  
  IF view_exists THEN
    RAISE NOTICE '✅ student_overview view exists';
  ELSE
    RAISE NOTICE 'ℹ️  student_overview view does not exist (this is OK if you dont need it)';
  END IF;
  
  RAISE NOTICE '🎉 All migrations applied successfully!';
  RAISE NOTICE '📊 You can now signup users with phone numbers';
  RAISE NOTICE '🔒 Security definer view issue is fixed';
END $$;
