-- ============================================
-- ENHANCE ASSIGNMENTS WITH ASSESSMENT TYPES
-- ============================================
-- This migration adds assessment types (quiz, exam, assignment, presentation)
-- and guidelines field to assignments table

BEGIN;

-- ============================================
-- STEP 1: Add assessment_type column
-- ============================================
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS assessment_type TEXT DEFAULT 'assignment' 
  CHECK (assessment_type IN ('quiz', 'exam', 'assignment', 'presentation', 'project'));

-- Create index
CREATE INDEX IF NOT EXISTS idx_assignments_assessment_type ON public.assignments(assessment_type);

-- ============================================
-- STEP 2: Add guidelines/instructions field
-- ============================================
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS guidelines TEXT;

-- ============================================
-- STEP 3: Ensure course_id exists (from migration 036)
-- ============================================
-- This is already added in migration 036, but ensure it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assignments' 
    AND column_name = 'course_id'
  ) THEN
    ALTER TABLE public.assignments
    ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_assignments_course ON public.assignments(course_id);
  END IF;
END $$;

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Assignments Enhanced with Assessment Types';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ assessment_type column added';
  RAISE NOTICE '✅ guidelines column added';
  RAISE NOTICE '✅ course_id verified';
  RAISE NOTICE '============================================';
END $$;
