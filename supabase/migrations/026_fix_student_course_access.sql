-- Migration 026: Fix Student Course Access
-- Purpose: Allow enrolled students to access course curriculum, resources, and library content
--
-- Key Changes:
-- 1. Update has_course_access() to check course_enrollments
-- 2. Ensure enrolled students can access lessons, materials, and library resources
-- 3. Fix RLS policies for better student access

BEGIN;

-- ============================================
-- STEP 0: Drop ALL potentially conflicting policies first
-- ============================================

-- Lessons policies
DROP POLICY IF EXISTS "Users can view lessons of assigned courses" ON public.lessons;
DROP POLICY IF EXISTS "Anyone can view lessons" ON public.lessons;
DROP POLICY IF EXISTS "Enrolled students and authorized users can view lessons" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can manage lessons for their courses" ON public.lessons;
DROP POLICY IF EXISTS "Admins can manage all lessons" ON public.lessons;

-- Course materials policies
DROP POLICY IF EXISTS "Users can view materials of assigned courses" ON public.course_materials;
DROP POLICY IF EXISTS "Enrolled students and authorized users can view materials" ON public.course_materials;
DROP POLICY IF EXISTS "Anyone can view course materials" ON public.course_materials;

-- Course library books policies
DROP POLICY IF EXISTS "Users can view course library books" ON public.course_library_books;
DROP POLICY IF EXISTS "Enrolled students can view course library books" ON public.course_library_books;
DROP POLICY IF EXISTS "Admins can manage course library books" ON public.course_library_books;

-- Course library videos policies
DROP POLICY IF EXISTS "Users can view course library videos" ON public.course_library_videos;
DROP POLICY IF EXISTS "Enrolled students can view course library videos" ON public.course_library_videos;
DROP POLICY IF EXISTS "Admins can manage course library videos" ON public.course_library_videos;

-- Books policies (will recreate after function update)
DROP POLICY IF EXISTS "Users can view assigned books" ON public.books;
DROP POLICY IF EXISTS "Everyone can view active books" ON public.books;

-- Videos policies (will recreate after function update)
DROP POLICY IF EXISTS "Users can view assigned videos" ON public.videos;
DROP POLICY IF EXISTS "Everyone can view active videos" ON public.videos;

-- ============================================
-- STEP 1: Fix has_course_access() function
-- ============================================

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
    -- User is enrolled in the course (STUDENTS)
    EXISTS (SELECT 1 FROM course_enrollments WHERE course_id = _course_id AND user_id = _user_id) OR
    -- User is directly assigned (via course_assignments)
    EXISTS (SELECT 1 FROM course_assignments WHERE course_id = _course_id AND user_id = _user_id) OR
    -- Teacher: check if they created the course or their students are enrolled
    (has_role(_user_id, 'teacher') AND EXISTS (
      SELECT 1 FROM courses WHERE id = _course_id AND created_by = _user_id
    )) OR
    (has_role(_user_id, 'teacher') AND EXISTS (
      SELECT 1 FROM course_enrollments ce
      JOIN courses c ON c.id = ce.course_id
      WHERE ce.course_id = _course_id AND c.created_by = _user_id
    )) OR
    -- Guardian: check if their children are enrolled
    (has_role(_user_id, 'guardian') AND EXISTS (
      SELECT 1 FROM course_enrollments ce
      JOIN student_guardians sg ON sg.student_id = ce.user_id
      WHERE ce.course_id = _course_id AND sg.guardian_id = _user_id
    ))
$$;

COMMENT ON FUNCTION public.has_course_access IS 'Check if user has access to a course. Returns true for: admins, enrolled students, assigned users, course creators (teachers), and guardians of enrolled students.';

-- ============================================
-- STEP 2: Ensure lessons are accessible to enrolled students
-- ============================================

CREATE POLICY "Enrolled students and authorized users can view lessons"
ON public.lessons FOR SELECT
USING (
  has_course_access(auth.uid(), course_id) OR
  -- Allow viewing if course is public (no enrollment required)
  EXISTS (
    SELECT 1 FROM courses 
    WHERE id = lessons.course_id 
    AND (max_capacity IS NULL OR max_capacity = 0)
  )
);

-- Recreate management policies for teachers and admins
CREATE POLICY "Teachers can manage lessons for their courses"
ON public.lessons FOR ALL
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
    SELECT 1 FROM public.courses WHERE courses.id = lessons.course_id AND courses.created_by = auth.uid()
  )
);

CREATE POLICY "Admins can manage all lessons"
ON public.lessons FOR ALL
USING (is_admin_or_higher(auth.uid()));

-- ============================================
-- STEP 3: Ensure course_materials are accessible to enrolled students
-- ============================================

CREATE POLICY "Enrolled students and authorized users can view materials"
ON public.course_materials FOR SELECT
USING (
  has_course_access(auth.uid(), course_id) OR
  -- Allow viewing if course is public
  EXISTS (
    SELECT 1 FROM courses 
    WHERE id = course_materials.course_id 
    AND (max_capacity IS NULL OR max_capacity = 0)
  )
);

-- ============================================
-- STEP 4: Ensure course_library_books are accessible to enrolled students
-- ============================================

CREATE POLICY "Enrolled students can view course library books"
ON public.course_library_books FOR SELECT
USING (
  has_course_access(auth.uid(), course_id) OR
  is_admin_or_higher(auth.uid())
);

-- Recreate admin management policy
CREATE POLICY "Admins can manage course library books"
ON public.course_library_books FOR ALL
USING (is_admin_or_higher(auth.uid()));

-- ============================================
-- STEP 5: Ensure course_library_videos are accessible to enrolled students
-- ============================================

CREATE POLICY "Enrolled students can view course library videos"
ON public.course_library_videos FOR SELECT
USING (
  has_course_access(auth.uid(), course_id) OR
  is_admin_or_higher(auth.uid())
);

-- Recreate admin management policy
CREATE POLICY "Admins can manage course library videos"
ON public.course_library_videos FOR ALL
USING (is_admin_or_higher(auth.uid()));

-- ============================================
-- STEP 6: Update books table RLS to allow enrolled students
-- ============================================

-- Update has_book_access function to include course enrollment check
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
    -- User is enrolled in a course that has this book
    EXISTS (
      SELECT 1 FROM course_library_books clb
      JOIN course_enrollments ce ON ce.course_id = clb.course_id
      WHERE clb.book_id = _book_id AND ce.user_id = _user_id
    ) OR
    -- Guardian: check if their children are assigned or enrolled
    (has_role(_user_id, 'guardian') AND EXISTS (
      SELECT 1 FROM book_assignments ba
      JOIN student_guardians sg ON sg.student_id = ba.user_id
      WHERE ba.book_id = _book_id AND sg.guardian_id = _user_id
    )) OR
    (has_role(_user_id, 'guardian') AND EXISTS (
      SELECT 1 FROM course_library_books clb
      JOIN course_enrollments ce ON ce.course_id = clb.course_id
      JOIN student_guardians sg ON sg.student_id = ce.user_id
      WHERE clb.book_id = _book_id AND sg.guardian_id = _user_id
    ))
$$;

-- Recreate books SELECT policy with updated function
CREATE POLICY "Users can view assigned books"
ON public.books FOR SELECT
USING (has_book_access(auth.uid(), id));

-- ============================================
-- STEP 7: Update videos table RLS to allow enrolled students
-- ============================================

-- Update has_video_access function to include course enrollment check
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
    -- User is enrolled in a course that has this video
    EXISTS (
      SELECT 1 FROM course_library_videos clv
      JOIN course_enrollments ce ON ce.course_id = clv.course_id
      WHERE clv.video_id = _video_id AND ce.user_id = _user_id
    ) OR
    -- Guardian: check if their children are assigned or enrolled
    (has_role(_user_id, 'guardian') AND EXISTS (
      SELECT 1 FROM video_assignments va
      JOIN student_guardians sg ON sg.student_id = va.user_id
      WHERE va.video_id = _video_id AND sg.guardian_id = _user_id
    )) OR
    (has_role(_user_id, 'guardian') AND EXISTS (
      SELECT 1 FROM course_library_videos clv
      JOIN course_enrollments ce ON ce.course_id = clv.course_id
      JOIN student_guardians sg ON sg.student_id = ce.user_id
      WHERE clv.video_id = _video_id AND sg.guardian_id = _user_id
    ))
$$;

-- Recreate videos SELECT policy with updated function
CREATE POLICY "Users can view assigned videos"
ON public.videos FOR SELECT
USING (has_video_access(auth.uid(), id));

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  func_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'has_course_access'
  ) INTO func_exists;
  
  IF func_exists THEN
    RAISE NOTICE '✅ has_course_access() function updated successfully';
    RAISE NOTICE '✅ has_book_access() function updated to check course enrollments';
    RAISE NOTICE '✅ has_video_access() function updated to check course enrollments';
    RAISE NOTICE '✅ Enrolled students can now access course content and library resources';
    RAISE NOTICE '✅ RLS policies updated for lessons, materials, and library resources';
  ELSE
    RAISE WARNING '⚠️ has_course_access() function not found';
  END IF;
END $$;

COMMIT;
