
-- Create course assignments table
CREATE TABLE public.course_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

-- Create book assignments table
CREATE TABLE public.book_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(book_id, user_id)
);

-- Create video assignments table
CREATE TABLE public.video_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(video_id, user_id)
);

-- Enable RLS on assignment tables
ALTER TABLE public.course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_assignments ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has access to a course
CREATE OR REPLACE FUNCTION public.has_course_access(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Admins have full access
    is_admin_or_higher(_user_id) OR
    -- User is directly assigned
    EXISTS (SELECT 1 FROM course_assignments WHERE course_id = _course_id AND user_id = _user_id) OR
    -- Teacher: check if any of their students are assigned
    (has_role(_user_id, 'teacher') AND EXISTS (
      SELECT 1 FROM course_assignments ca
      JOIN course_enrollments ce ON ce.course_id = ca.course_id
      WHERE ca.course_id = _course_id AND ce.user_id IN (
        SELECT student_id FROM student_guardians WHERE guardian_id = _user_id
        UNION
        SELECT ca2.user_id FROM course_assignments ca2 
        JOIN user_roles ur ON ur.user_id = ca2.user_id AND ur.role = 'student'
        WHERE ca2.course_id IN (SELECT course_id FROM courses WHERE created_by = _user_id)
      )
    )) OR
    -- Guardian: check if their children are assigned
    (has_role(_user_id, 'guardian') AND EXISTS (
      SELECT 1 FROM course_assignments ca
      JOIN student_guardians sg ON sg.student_id = ca.user_id
      WHERE ca.course_id = _course_id AND sg.guardian_id = _user_id
    ))
$$;

-- Helper function to check if user has access to a book
CREATE OR REPLACE FUNCTION public.has_book_access(_user_id uuid, _book_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Admins have full access
    is_admin_or_higher(_user_id) OR
    -- User is directly assigned
    EXISTS (SELECT 1 FROM book_assignments WHERE book_id = _book_id AND user_id = _user_id) OR
    -- Guardian: check if their children are assigned
    (has_role(_user_id, 'guardian') AND EXISTS (
      SELECT 1 FROM book_assignments ba
      JOIN student_guardians sg ON sg.student_id = ba.user_id
      WHERE ba.book_id = _book_id AND sg.guardian_id = _user_id
    ))
$$;

-- Helper function to check if user has access to a video
CREATE OR REPLACE FUNCTION public.has_video_access(_user_id uuid, _video_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Admins have full access
    is_admin_or_higher(_user_id) OR
    -- User is directly assigned
    EXISTS (SELECT 1 FROM video_assignments WHERE video_id = _video_id AND user_id = _user_id) OR
    -- Guardian: check if their children are assigned
    (has_role(_user_id, 'guardian') AND EXISTS (
      SELECT 1 FROM video_assignments va
      JOIN student_guardians sg ON sg.student_id = va.user_id
      WHERE va.video_id = _video_id AND sg.guardian_id = _user_id
    ))
$$;

-- Drop existing permissive SELECT policies on courses
DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;

-- Create new restrictive course policies
CREATE POLICY "Users can view assigned courses"
ON public.courses FOR SELECT
USING (has_course_access(auth.uid(), id));

-- Update course creation to admin only
DROP POLICY IF EXISTS "Admins and teachers can create courses" ON public.courses;
CREATE POLICY "Only admins can create courses"
ON public.courses FOR INSERT
WITH CHECK (is_admin_or_higher(auth.uid()));

-- Update course update to admin only
DROP POLICY IF EXISTS "Admins and teachers can update own courses" ON public.courses;
CREATE POLICY "Only admins can update courses"
ON public.courses FOR UPDATE
USING (is_admin_or_higher(auth.uid()));

-- Drop existing permissive SELECT policies on books
DROP POLICY IF EXISTS "Everyone can view active books" ON public.books;

-- Create new restrictive book policies
CREATE POLICY "Users can view assigned books"
ON public.books FOR SELECT
USING (has_book_access(auth.uid(), id));

-- Update book creation to admin only
DROP POLICY IF EXISTS "Teachers and admins can upload books" ON public.books;
CREATE POLICY "Only admins can upload books"
ON public.books FOR INSERT
WITH CHECK (is_admin_or_higher(auth.uid()));

-- Update book update to admin only
DROP POLICY IF EXISTS "Teachers can update own books" ON public.books;
CREATE POLICY "Only admins can update books"
ON public.books FOR UPDATE
USING (is_admin_or_higher(auth.uid()));

-- Drop existing permissive SELECT policies on videos
DROP POLICY IF EXISTS "Everyone can view active videos" ON public.videos;

-- Create new restrictive video policies
CREATE POLICY "Users can view assigned videos"
ON public.videos FOR SELECT
USING (has_video_access(auth.uid(), id));

-- Update video creation to admin only
DROP POLICY IF EXISTS "Teachers and admins can upload videos" ON public.videos;
CREATE POLICY "Only admins can upload videos"
ON public.videos FOR INSERT
WITH CHECK (is_admin_or_higher(auth.uid()));

-- Update video update to admin only
DROP POLICY IF EXISTS "Teachers can update own videos" ON public.videos;
CREATE POLICY "Only admins can update videos"
ON public.videos FOR UPDATE
USING (is_admin_or_higher(auth.uid()));

-- RLS policies for course_assignments
CREATE POLICY "Admins can manage course assignments"
ON public.course_assignments FOR ALL
USING (is_admin_or_higher(auth.uid()))
WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Users can view their course assignments"
ON public.course_assignments FOR SELECT
USING (
  auth.uid() = user_id OR
  is_admin_or_higher(auth.uid()) OR
  -- Guardians can see their children's assignments
  (has_role(auth.uid(), 'guardian') AND EXISTS (
    SELECT 1 FROM student_guardians WHERE guardian_id = auth.uid() AND student_id = user_id
  ))
);

-- RLS policies for book_assignments
CREATE POLICY "Admins can manage book assignments"
ON public.book_assignments FOR ALL
USING (is_admin_or_higher(auth.uid()))
WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Users can view their book assignments"
ON public.book_assignments FOR SELECT
USING (
  auth.uid() = user_id OR
  is_admin_or_higher(auth.uid()) OR
  (has_role(auth.uid(), 'guardian') AND EXISTS (
    SELECT 1 FROM student_guardians WHERE guardian_id = auth.uid() AND student_id = user_id
  ))
);

-- RLS policies for video_assignments
CREATE POLICY "Admins can manage video assignments"
ON public.video_assignments FOR ALL
USING (is_admin_or_higher(auth.uid()))
WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Users can view their video assignments"
ON public.video_assignments FOR SELECT
USING (
  auth.uid() = user_id OR
  is_admin_or_higher(auth.uid()) OR
  (has_role(auth.uid(), 'guardian') AND EXISTS (
    SELECT 1 FROM student_guardians WHERE guardian_id = auth.uid() AND student_id = user_id
  ))
);

-- Update lessons to follow course access
DROP POLICY IF EXISTS "Anyone can view lessons" ON public.lessons;
CREATE POLICY "Users can view lessons of assigned courses"
ON public.lessons FOR SELECT
USING (has_course_access(auth.uid(), course_id));

-- Update course_materials to follow course access
DROP POLICY IF EXISTS "Anyone can view course materials" ON public.course_materials;
CREATE POLICY "Users can view materials of assigned courses"
ON public.course_materials FOR SELECT
USING (has_course_access(auth.uid(), course_id));
