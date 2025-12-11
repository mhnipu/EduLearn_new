-- Add instructor_id column to courses for teacher assignment
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS instructor_id uuid REFERENCES auth.users(id);

-- Add estimated_duration_minutes column to courses
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer DEFAULT 0;

-- Create index for faster instructor lookups
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON public.courses(instructor_id);

-- Update RLS policy to allow teachers to view courses they instruct
DROP POLICY IF EXISTS "Teachers can view their courses" ON public.courses;
CREATE POLICY "Teachers can view their courses" ON public.courses
FOR SELECT USING (
  has_course_access(auth.uid(), id) OR 
  instructor_id = auth.uid()
);

-- Allow teachers to update courses they instruct
DROP POLICY IF EXISTS "Teachers can update their courses" ON public.courses;
CREATE POLICY "Teachers can update their courses" ON public.courses
FOR UPDATE USING (
  is_admin_or_higher(auth.uid()) OR 
  instructor_id = auth.uid()
);