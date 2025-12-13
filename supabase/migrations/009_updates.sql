-- Add difficulty level to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'beginner';

-- Create index for filtering by difficulty
CREATE INDEX IF NOT EXISTS idx_courses_difficulty ON public.courses(difficulty);