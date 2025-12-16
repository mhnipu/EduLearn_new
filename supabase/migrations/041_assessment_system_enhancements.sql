-- ============================================
-- ASSESSMENT SYSTEM ENHANCEMENTS
-- ============================================
-- This migration adds:
-- 1. Result publishing system (draft/reviewed/published)
-- 2. Late submission penalty tracking
-- 3. Plagiarism detection flag
-- 4. Rubric-based grading support
-- 5. Quiz attempt tracking and answer persistence
-- 6. Performance indexes
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Result Publishing System
-- ============================================

-- Add result_status to assignment_submissions
ALTER TABLE public.assignment_submissions
ADD COLUMN IF NOT EXISTS result_status TEXT DEFAULT 'draft' 
  CHECK (result_status IN ('draft', 'reviewed', 'published'));

ALTER TABLE public.assignment_submissions
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Add result_status to quiz_submissions
ALTER TABLE public.quiz_submissions
ADD COLUMN IF NOT EXISTS result_status TEXT DEFAULT 'draft' 
  CHECK (result_status IN ('draft', 'reviewed', 'published'));

ALTER TABLE public.quiz_submissions
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Create indexes for result_status queries
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_result_status 
  ON public.assignment_submissions(result_status, assignment_id);

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_result_status 
  ON public.quiz_submissions(result_status, quiz_id);

-- ============================================
-- STEP 2: Late Submission Penalty
-- ============================================

-- Add late submission tracking to assignment_submissions
ALTER TABLE public.assignment_submissions
ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT false;

ALTER TABLE public.assignment_submissions
ADD COLUMN IF NOT EXISTS late_penalty_percentage INTEGER DEFAULT 0 
  CHECK (late_penalty_percentage >= 0 AND late_penalty_percentage <= 100);

ALTER TABLE public.assignment_submissions
ADD COLUMN IF NOT EXISTS final_score INTEGER; -- Score after penalty

-- Add late submission policy to assignments
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS late_submission_allowed BOOLEAN DEFAULT true;

ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS late_penalty_per_day INTEGER DEFAULT 0 
  CHECK (late_penalty_per_day >= 0 AND late_penalty_per_day <= 100);

-- ============================================
-- STEP 3: Plagiarism Detection
-- ============================================

-- Add plagiarism flag to assignment_submissions
ALTER TABLE public.assignment_submissions
ADD COLUMN IF NOT EXISTS plagiarism_flag BOOLEAN DEFAULT false;

ALTER TABLE public.assignment_submissions
ADD COLUMN IF NOT EXISTS plagiarism_score NUMERIC(5, 2); -- Similarity percentage (0-100)

ALTER TABLE public.assignment_submissions
ADD COLUMN IF NOT EXISTS plagiarism_checked_at TIMESTAMPTZ;

ALTER TABLE public.assignment_submissions
ADD COLUMN IF NOT EXISTS plagiarism_checked_by UUID;

-- Create index for plagiarism queries
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_plagiarism 
  ON public.assignment_submissions(plagiarism_flag, assignment_id);

-- ============================================
-- STEP 4: Rubric-Based Grading
-- ============================================

-- Create rubric_criteria table
CREATE TABLE IF NOT EXISTS public.rubric_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  criterion_name TEXT NOT NULL,
  description TEXT,
  max_points INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create rubric_scores table (stores scores per criterion per submission)
CREATE TABLE IF NOT EXISTS public.rubric_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.assignment_submissions(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES public.rubric_criteria(id) ON DELETE CASCADE,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  feedback TEXT,
  graded_by UUID,
  graded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(submission_id, criterion_id)
);

-- Create indexes for rubric tables
CREATE INDEX IF NOT EXISTS idx_rubric_criteria_assignment 
  ON public.rubric_criteria(assignment_id);

CREATE INDEX IF NOT EXISTS idx_rubric_scores_submission 
  ON public.rubric_scores(submission_id);

CREATE INDEX IF NOT EXISTS idx_rubric_scores_criterion 
  ON public.rubric_scores(criterion_id);

-- ============================================
-- STEP 5: Quiz Attempt Tracking & Answer Persistence
-- ============================================

-- Add attempt tracking to quizzes
ALTER TABLE public.quizzes
ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 1 
  CHECK (max_attempts > 0);

ALTER TABLE public.quizzes
ADD COLUMN IF NOT EXISTS allow_multiple_attempts BOOLEAN DEFAULT false;

-- Add attempt tracking to quiz_submissions
ALTER TABLE public.quiz_submissions
ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1;

ALTER TABLE public.quiz_submissions
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

ALTER TABLE public.quiz_submissions
ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER; -- Total time spent

-- Create quiz_attempts table for tracking in-progress attempts
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  answers JSONB NOT NULL DEFAULT '{}', -- Current answers
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_remaining_seconds INTEGER, -- Remaining time in seconds
  is_submitted BOOLEAN DEFAULT false,
  UNIQUE(quiz_id, student_id, attempt_number)
);

-- Create indexes for quiz attempts
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_student 
  ON public.quiz_attempts(quiz_id, student_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_submitted 
  ON public.quiz_attempts(is_submitted, quiz_id);

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_attempt 
  ON public.quiz_submissions(quiz_id, student_id, attempt_number);

-- ============================================
-- STEP 6: Additional Performance Indexes
-- ============================================

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_assignment 
  ON public.assignment_submissions(student_id, assignment_id);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_graded 
  ON public.assignment_submissions(graded_at, assignment_id) 
  WHERE graded_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student_quiz 
  ON public.quiz_submissions(student_id, quiz_id);

CREATE INDEX IF NOT EXISTS idx_assignments_course_type 
  ON public.assignments(course_id, assessment_type) 
  WHERE course_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_due_date 
  ON public.assignments(due_date) 
  WHERE due_date IS NOT NULL;

-- ============================================
-- STEP 7: RLS Policies for New Tables
-- ============================================

-- Enable RLS on new tables
ALTER TABLE public.rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rubric_criteria
CREATE POLICY "Teachers can manage rubric criteria"
  ON public.rubric_criteria FOR ALL
  USING (
    public.has_role(auth.uid(), 'teacher') OR 
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'quizzes', 'update')
  );

-- RLS Policies for rubric_scores
CREATE POLICY "Students can view own rubric scores"
  ON public.rubric_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.assignment_submissions
      WHERE id = rubric_scores.submission_id 
      AND student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage rubric scores"
  ON public.rubric_scores FOR ALL
  USING (
    public.has_role(auth.uid(), 'teacher') OR 
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'quizzes', 'update')
  );

-- RLS Policies for quiz_attempts
CREATE POLICY "Students can manage own quiz attempts"
  ON public.quiz_attempts FOR ALL
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view quiz attempts"
  ON public.quiz_attempts FOR SELECT
  USING (
    public.has_role(auth.uid(), 'teacher') OR 
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'quizzes', 'read')
  );

-- ============================================
-- STEP 8: Update RLS for Result Publishing
-- ============================================

-- Update assignment_submissions SELECT policy to respect result_status
-- Students can only see published results
DROP POLICY IF EXISTS "Students can view own assignment submissions" ON public.assignment_submissions;

CREATE POLICY "Students can view own assignment submissions"
  ON public.assignment_submissions FOR SELECT
  USING (
    auth.uid() = student_id AND (
      result_status = 'published' OR
      graded_at IS NULL -- Can see their own ungraded submissions
    )
  );

-- Update quiz_submissions SELECT policy to respect result_status
DROP POLICY IF EXISTS "Students can view own submissions" ON public.quiz_submissions;

CREATE POLICY "Students can view own quiz submissions"
  ON public.quiz_submissions FOR SELECT
  USING (
    auth.uid() = student_id AND (
      result_status = 'published' OR
      graded_at IS NULL -- Can see their own ungraded submissions
    )
  );

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Assessment System Enhancements Complete';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Result publishing system added';
  RAISE NOTICE '✅ Late submission penalty tracking added';
  RAISE NOTICE '✅ Plagiarism detection fields added';
  RAISE NOTICE '✅ Rubric-based grading tables created';
  RAISE NOTICE '✅ Quiz attempt tracking added';
  RAISE NOTICE '✅ Performance indexes created';
  RAISE NOTICE '✅ RLS policies updated';
  RAISE NOTICE '============================================';
END $$;
