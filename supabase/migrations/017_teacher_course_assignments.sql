-- Create teacher_course_assignments table for multiple teachers per course
CREATE TABLE IF NOT EXISTS public.teacher_course_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(teacher_id, course_id)
);

-- Enable RLS
ALTER TABLE public.teacher_course_assignments ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_teacher_course_assignments_teacher ON public.teacher_course_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_course_assignments_course ON public.teacher_course_assignments(course_id);

-- RLS Policies for teacher_course_assignments

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can manage teacher assignments" ON public.teacher_course_assignments;
DROP POLICY IF EXISTS "Teachers can view their assignments" ON public.teacher_course_assignments;
DROP POLICY IF EXISTS "Students can view course teachers" ON public.teacher_course_assignments;

-- Admins can do anything
CREATE POLICY "Admins can manage teacher assignments" ON public.teacher_course_assignments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Teachers can view their own assignments
CREATE POLICY "Teachers can view their assignments" ON public.teacher_course_assignments
FOR SELECT USING (
  teacher_id = auth.uid()
);

-- Students can view teachers assigned to their enrolled courses
CREATE POLICY "Students can view course teachers" ON public.teacher_course_assignments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE user_id = auth.uid() AND course_id = teacher_course_assignments.course_id
  )
);

-- Function to get all teachers for a course
CREATE OR REPLACE FUNCTION public.get_course_teachers(_course_id UUID)
RETURNS TABLE (
  teacher_id UUID,
  teacher_name TEXT,
  assigned_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    tca.teacher_id,
    p.full_name as teacher_name,
    tca.assigned_at
  FROM public.teacher_course_assignments tca
  LEFT JOIN public.profiles p ON p.id = tca.teacher_id
  WHERE tca.course_id = _course_id
  ORDER BY tca.assigned_at ASC;
$$;

-- Function to get all courses assigned to a teacher
CREATE OR REPLACE FUNCTION public.get_teacher_assigned_courses(_teacher_id UUID)
RETURNS TABLE (
  course_id UUID,
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  assigned_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id as course_id,
    c.title,
    c.description,
    c.thumbnail_url,
    tca.assigned_at
  FROM public.teacher_course_assignments tca
  LEFT JOIN public.courses c ON c.id = tca.course_id
  WHERE tca.teacher_id = _teacher_id
  ORDER BY tca.assigned_at DESC;
$$;

-- Update courses RLS to include assigned teachers
DROP POLICY IF EXISTS "Teachers can view assigned courses" ON public.courses;
CREATE POLICY "Teachers can view assigned courses" ON public.courses
FOR SELECT USING (
  created_by = auth.uid() OR
  instructor_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.teacher_course_assignments
    WHERE teacher_id = auth.uid() AND course_id = courses.id
  )
);

-- Update courses RLS to allow assigned teachers to update
DROP POLICY IF EXISTS "Assigned teachers can update courses" ON public.courses;
CREATE POLICY "Assigned teachers can update courses" ON public.courses
FOR UPDATE USING (
  created_by = auth.uid() OR
  instructor_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.teacher_course_assignments
    WHERE teacher_id = auth.uid() AND course_id = courses.id
  )
);

