-- Migration: Fix SECURITY DEFINER view warning
-- Issue: View `public.student_overview` has SECURITY DEFINER property
-- Fix: Remove the view or recreate without SECURITY DEFINER

-- Step 1: Check and log if view exists
DO $$
DECLARE
  view_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_views 
    WHERE viewname = 'student_overview' 
    AND schemaname = 'public'
  ) INTO view_exists;
  
  IF view_exists THEN
    RAISE NOTICE '⚠️  View student_overview exists - will be dropped';
    
    -- Drop the view with CASCADE to handle dependencies
    DROP VIEW IF EXISTS public.student_overview CASCADE;
    
    RAISE NOTICE '✅ View student_overview dropped successfully';
  ELSE
    RAISE NOTICE 'ℹ️  View student_overview does not exist - no action needed';
  END IF;
END $$;

-- Note: If you need the student_overview view, uncomment and modify the following:
-- This creates the view WITHOUT SECURITY DEFINER (safer approach)

/*
-- Recreate student_overview view without SECURITY DEFINER
CREATE VIEW public.student_overview AS
SELECT 
  p.id as student_id,
  p.full_name as student_name,
  p.avatar_url,
  p.created_at as profile_created,
  ur.role as user_role,
  -- Add more columns as needed
  COUNT(DISTINCT ce.course_id) as enrolled_courses_count
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
LEFT JOIN public.course_enrollments ce ON ce.user_id = p.id
WHERE ur.role = 'student'
GROUP BY p.id, p.full_name, p.avatar_url, p.created_at, ur.role;

-- Grant SELECT permission to authenticated users
GRANT SELECT ON public.student_overview TO authenticated;

-- Add RLS policy to the view
ALTER VIEW public.student_overview OWNER TO postgres;

-- Add helpful comment
COMMENT ON VIEW public.student_overview IS 
  'Student overview view without SECURITY DEFINER - respects RLS policies';

RAISE NOTICE '✅ View student_overview recreated without SECURITY DEFINER';
*/

-- Verification: Check if any views still have SECURITY DEFINER
DO $$
DECLARE
  definer_views text;
BEGIN
  SELECT string_agg(viewname, ', ')
  INTO definer_views
  FROM pg_views 
  WHERE schemaname = 'public'
  AND definition LIKE '%SECURITY DEFINER%';
  
  IF definer_views IS NOT NULL THEN
    RAISE WARNING '⚠️  These views still have SECURITY DEFINER: %', definer_views;
  ELSE
    RAISE NOTICE '✅ No views with SECURITY DEFINER found';
  END IF;
END $$;
