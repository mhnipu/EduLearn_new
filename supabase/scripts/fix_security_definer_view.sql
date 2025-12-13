-- Fix: Remove SECURITY DEFINER from student_overview view
-- Run this in Supabase SQL Editor

-- Step 1: Check if view exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views 
    WHERE viewname = 'student_overview' 
    AND schemaname = 'public'
  ) THEN
    RAISE NOTICE 'View student_overview exists - proceeding with fix';
    
    -- Step 2: Drop the view
    DROP VIEW IF EXISTS public.student_overview CASCADE;
    RAISE NOTICE 'View dropped successfully';
  ELSE
    RAISE NOTICE 'View student_overview does not exist - no action needed';
  END IF;
END $$;

-- If you need to recreate the view (uncomment and modify as needed):
/*
CREATE VIEW public.student_overview AS
SELECT 
  s.id as student_id,
  p.full_name,
  p.avatar_url,
  p.created_at
FROM students s
LEFT JOIN profiles p ON p.id = s.user_id;

-- Grant permissions
GRANT SELECT ON public.student_overview TO authenticated;

-- Add comment
COMMENT ON VIEW public.student_overview IS 
'Student overview without SECURITY DEFINER - enforces proper RLS';
*/

-- Verify the fix
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_views 
      WHERE viewname = 'student_overview' 
      AND schemaname = 'public'
    ) THEN 'View still exists - check if it has SECURITY DEFINER'
    ELSE 'View removed successfully ✅'
  END as status;
