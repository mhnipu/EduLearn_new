-- ALL MIGRATIONS COMBINED
-- Generated: 12/13/2025 14:15:09

-- ============================================
-- MIGRATION: 20251201043306_7f2762a4-83a5-430f-b11b-8fe38374aaf4.sql
-- ============================================

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table (CRITICAL: roles must be separate from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Create courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Create course_materials table (videos and PDFs)
CREATE TABLE public.course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  material_type TEXT NOT NULL CHECK (material_type IN ('video', 'pdf')),
  video_url TEXT,
  pdf_url TEXT,
  duration_minutes INTEGER,
  order_index INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for courses
CREATE POLICY "Anyone can view courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and teachers can create courses"
  ON public.courses FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'teacher')
  );

CREATE POLICY "Admins and teachers can update own courses"
  ON public.courses FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    (public.has_role(auth.uid(), 'teacher') AND created_by = auth.uid())
  );

CREATE POLICY "Admins can delete any course"
  ON public.courses FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for course_materials
CREATE POLICY "Anyone can view course materials"
  ON public.course_materials FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and teachers can create materials"
  ON public.course_materials FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'teacher')
  );

CREATE POLICY "Admins and teachers can update own materials"
  ON public.course_materials FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    (public.has_role(auth.uid(), 'teacher') AND created_by = auth.uid())
  );

CREATE POLICY "Admins can delete any material"
  ON public.course_materials FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_materials_updated_at
  BEFORE UPDATE ON public.course_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-create profile and assign default student role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Assign default student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- MIGRATION: 20251201045320_82084b2b-9190-4851-be7e-3cd929608763.sql
-- ============================================

-- Add new roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'guardian';

-- ============================================
-- MIGRATION: 20251201045345_88ff8d90-fd4d-4567-8df5-630dfda8a93b.sql
-- ============================================

-- Create helper functions for role hierarchy
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_higher(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'admin')
  )
$$;

-- Create student_guardians table
CREATE TABLE public.student_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, guardian_id)
);

ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;

-- RLS policies for student_guardians
CREATE POLICY "Super admins and admins can manage guardian relationships"
ON public.student_guardians
FOR ALL
USING (is_admin_or_higher(auth.uid()))
WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Guardians can view their assigned students"
ON public.student_guardians
FOR SELECT
USING (auth.uid() = guardian_id);

CREATE POLICY "Students can view their guardians"
ON public.student_guardians
FOR SELECT
USING (auth.uid() = student_id);

-- Update user_roles policies
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Admins can insert non-admin roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update non-admin roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin') AND role NOT IN ('super_admin', 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin') AND role NOT IN ('super_admin', 'admin'));

CREATE POLICY "Admins can delete non-admin roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin') AND role NOT IN ('super_admin', 'admin'));

-- Update profiles policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- MIGRATION: 20251202051805_37b3ceea-505e-4093-800f-10d15614049e.sql
-- ============================================

-- Create enum for content types
CREATE TYPE content_type AS ENUM ('book', 'video');

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create books table (E-Library)
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  author TEXT,
  pdf_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category_id UUID REFERENCES public.categories(id),
  tags TEXT[],
  file_size_mb DECIMAL(10,2),
  page_count INTEGER,
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  uploaded_by UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create videos table (YouTube Library)
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  youtube_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category_id UUID REFERENCES public.categories(id),
  tags TEXT[],
  duration_minutes INTEGER,
  view_count INTEGER DEFAULT 0,
  uploaded_by UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create bookmarks table
CREATE TABLE public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content_type content_type NOT NULL,
  content_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, content_type, content_id)
);

-- Create recently viewed table
CREATE TABLE public.recently_viewed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content_type content_type NOT NULL,
  content_id UUID NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, content_type, content_id)
);

-- Create progress tracking table
CREATE TABLE public.learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  content_type content_type NOT NULL,
  content_id UUID NOT NULL,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  completed BOOLEAN DEFAULT false,
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(student_id, content_type, content_id)
);

-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  created_by UUID NOT NULL,
  time_limit_minutes INTEGER,
  passing_score INTEGER DEFAULT 70,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create quiz questions table
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  points INTEGER DEFAULT 1,
  order_index INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create quiz submissions table
CREATE TABLE public.quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  answers JSONB NOT NULL,
  score INTEGER,
  passed BOOLEAN,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  graded_at TIMESTAMPTZ,
  graded_by UUID
);

-- Create assignments table
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  created_by UUID NOT NULL,
  due_date TIMESTAMPTZ,
  max_score INTEGER DEFAULT 100,
  attachment_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create assignment submissions table
CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  submission_text TEXT,
  attachment_url TEXT,
  score INTEGER,
  feedback TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  graded_at TIMESTAMPTZ,
  graded_by UUID,
  UNIQUE(assignment_id, student_id)
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content_type content_type NOT NULL,
  content_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create ratings table
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content_type content_type NOT NULL,
  content_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, content_type, content_id)
);

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Everyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins and teachers can manage categories" ON public.categories FOR ALL USING (is_admin_or_higher(auth.uid()) OR has_role(auth.uid(), 'teacher'));

-- RLS Policies for books
CREATE POLICY "Everyone can view active books" ON public.books FOR SELECT USING (is_active = true);
CREATE POLICY "Teachers and admins can upload books" ON public.books FOR INSERT WITH CHECK (has_role(auth.uid(), 'teacher') OR is_admin_or_higher(auth.uid()));
CREATE POLICY "Teachers can update own books" ON public.books FOR UPDATE USING (uploaded_by = auth.uid() OR is_admin_or_higher(auth.uid()));
CREATE POLICY "Admins can delete books" ON public.books FOR DELETE USING (is_admin_or_higher(auth.uid()));

-- RLS Policies for videos
CREATE POLICY "Everyone can view active videos" ON public.videos FOR SELECT USING (is_active = true);
CREATE POLICY "Teachers and admins can upload videos" ON public.videos FOR INSERT WITH CHECK (has_role(auth.uid(), 'teacher') OR is_admin_or_higher(auth.uid()));
CREATE POLICY "Teachers can update own videos" ON public.videos FOR UPDATE USING (uploaded_by = auth.uid() OR is_admin_or_higher(auth.uid()));
CREATE POLICY "Admins can delete videos" ON public.videos FOR DELETE USING (is_admin_or_higher(auth.uid()));

-- RLS Policies for bookmarks
CREATE POLICY "Users can view own bookmarks" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own bookmarks" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for recently viewed
CREATE POLICY "Users can view own history" ON public.recently_viewed FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own history" ON public.recently_viewed FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own history" ON public.recently_viewed FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for learning progress
CREATE POLICY "Students can view own progress" ON public.learning_progress FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can update own progress" ON public.learning_progress FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Teachers and admins can view all progress" ON public.learning_progress FOR SELECT USING (has_role(auth.uid(), 'teacher') OR is_admin_or_higher(auth.uid()));
CREATE POLICY "Guardians can view assigned student progress" ON public.learning_progress FOR SELECT USING (
  has_role(auth.uid(), 'guardian') AND EXISTS (
    SELECT 1 FROM public.student_guardians 
    WHERE guardian_id = auth.uid() AND student_id = learning_progress.student_id
  )
);

-- RLS Policies for quizzes
CREATE POLICY "Students can view active quizzes" ON public.quizzes FOR SELECT USING (is_active = true);
CREATE POLICY "Teachers can manage quizzes" ON public.quizzes FOR ALL USING (has_role(auth.uid(), 'teacher') OR is_admin_or_higher(auth.uid()));

-- RLS Policies for quiz questions
CREATE POLICY "Students can view questions of active quizzes" ON public.quiz_questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quizzes WHERE id = quiz_id AND is_active = true)
);
CREATE POLICY "Teachers can manage quiz questions" ON public.quiz_questions FOR ALL USING (has_role(auth.uid(), 'teacher') OR is_admin_or_higher(auth.uid()));

-- RLS Policies for quiz submissions
CREATE POLICY "Students can view own submissions" ON public.quiz_submissions FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can create submissions" ON public.quiz_submissions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Teachers can view and grade submissions" ON public.quiz_submissions FOR ALL USING (has_role(auth.uid(), 'teacher') OR is_admin_or_higher(auth.uid()));
CREATE POLICY "Guardians can view assigned student submissions" ON public.quiz_submissions FOR SELECT USING (
  has_role(auth.uid(), 'guardian') AND EXISTS (
    SELECT 1 FROM public.student_guardians 
    WHERE guardian_id = auth.uid() AND student_id = quiz_submissions.student_id
  )
);

-- RLS Policies for assignments
CREATE POLICY "Students can view active assignments" ON public.assignments FOR SELECT USING (is_active = true);
CREATE POLICY "Teachers can manage assignments" ON public.assignments FOR ALL USING (has_role(auth.uid(), 'teacher') OR is_admin_or_higher(auth.uid()));

-- RLS Policies for assignment submissions
CREATE POLICY "Students can view own assignment submissions" ON public.assignment_submissions FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can submit assignments" ON public.assignment_submissions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update own ungraded submissions" ON public.assignment_submissions FOR UPDATE USING (auth.uid() = student_id AND graded_at IS NULL);
CREATE POLICY "Teachers can view and grade submissions" ON public.assignment_submissions FOR ALL USING (has_role(auth.uid(), 'teacher') OR is_admin_or_higher(auth.uid()));
CREATE POLICY "Guardians can view assigned student assignment submissions" ON public.assignment_submissions FOR SELECT USING (
  has_role(auth.uid(), 'guardian') AND EXISTS (
    SELECT 1 FROM public.student_guardians 
    WHERE guardian_id = auth.uid() AND student_id = assignment_submissions.student_id
  )
);

-- RLS Policies for comments
CREATE POLICY "Everyone can view comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id OR is_admin_or_higher(auth.uid()));

-- RLS Policies for ratings
CREATE POLICY "Everyone can view ratings" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can rate content" ON public.ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ratings" ON public.ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ratings" ON public.ratings FOR DELETE USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('library-files', 'library-files', true);

-- Storage policies for library files
CREATE POLICY "Anyone can view files" ON storage.objects FOR SELECT USING (bucket_id = 'library-files');
CREATE POLICY "Teachers can upload files" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'library-files' AND 
  (has_role(auth.uid(), 'teacher') OR is_admin_or_higher(auth.uid()))
);
CREATE POLICY "Teachers can update own files" ON storage.objects FOR UPDATE USING (
  bucket_id = 'library-files' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR is_admin_or_higher(auth.uid()))
);
CREATE POLICY "Teachers can delete own files" ON storage.objects FOR DELETE USING (
  bucket_id = 'library-files' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR is_admin_or_higher(auth.uid()))
);

-- Insert default categories
INSERT INTO public.categories (name, description, icon) VALUES
  ('Science', 'Science and technology related content', 'ðŸ”¬'),
  ('Mathematics', 'Math and quantitative studies', 'ðŸ“'),
  ('Literature', 'Books and literary works', 'ðŸ“š'),
  ('History', 'Historical content and studies', 'ðŸ“œ'),
  ('Programming', 'Coding and software development', 'ðŸ’»'),
  ('Languages', 'Language learning resources', 'ðŸ—£ï¸'),
  ('Arts', 'Creative arts and design', 'ðŸŽ¨'),
  ('Business', 'Business and entrepreneurship', 'ðŸ’¼');

-- ============================================
-- MIGRATION: 20251202151719_407949a7-ffd9-4cfc-ac7c-f1771959e142.sql
-- ============================================

-- Create lessons table (replaces course_materials for this new structure)
CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  video_url text,
  pdf_url text,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add dark_mode column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dark_mode boolean DEFAULT false;

-- Create certificates table
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  certificate_url text,
  issued_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, course_id)
);

-- Create course_enrollments table
CREATE TABLE public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  enrolled_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone,
  UNIQUE(user_id, course_id)
);

-- Create activity_feed table for realtime
CREATE TABLE public.activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on all new tables
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- Lessons policies
CREATE POLICY "Anyone can view lessons" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Teachers can manage lessons for their courses" ON public.lessons FOR ALL
  USING (
    has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
      SELECT 1 FROM public.courses WHERE courses.id = lessons.course_id AND courses.created_by = auth.uid()
    )
  );
CREATE POLICY "Admins can manage all lessons" ON public.lessons FOR ALL
  USING (is_admin_or_higher(auth.uid()));

-- Certificates policies
CREATE POLICY "Users can view own certificates" ON public.certificates FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all certificates" ON public.certificates FOR SELECT
  USING (is_admin_or_higher(auth.uid()));
CREATE POLICY "System can insert certificates" ON public.certificates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Course enrollments policies
CREATE POLICY "Users can view own enrollments" ON public.course_enrollments FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can enroll themselves" ON public.course_enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own enrollments" ON public.course_enrollments FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all enrollments" ON public.course_enrollments FOR SELECT
  USING (is_admin_or_higher(auth.uid()));
CREATE POLICY "Teachers can view enrollments for their courses" ON public.course_enrollments FOR SELECT
  USING (
    has_role(auth.uid(), 'teacher'::app_role) AND EXISTS (
      SELECT 1 FROM public.courses WHERE courses.id = course_enrollments.course_id AND courses.created_by = auth.uid()
    )
  );

-- Activity feed policies
CREATE POLICY "Users can view own activity" ON public.activity_feed FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create own activity" ON public.activity_feed FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all activity" ON public.activity_feed FOR SELECT
  USING (is_admin_or_higher(auth.uid()));

-- Enable realtime for activity feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;

-- Create updated_at trigger for lessons
CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- MIGRATION: 20251202153512_cd8f7d59-5b7e-4492-99e2-88e6302860fa.sql
-- ============================================

-- Create modules table for feature-level permissions
CREATE TABLE public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create user_module_permissions for granular CRUD access
CREATE TABLE public.user_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  can_create boolean DEFAULT false,
  can_read boolean DEFAULT false,
  can_update boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- Enable RLS
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

-- Seed default modules
INSERT INTO public.modules (name, description) VALUES
  ('courses', 'Course management'),
  ('lessons', 'Lesson content management'),
  ('users', 'User management'),
  ('analytics', 'Analytics and reporting'),
  ('library', 'E-Library content (books & videos)'),
  ('quizzes', 'Quiz and assignment management'),
  ('certificates', 'Certificate generation'),
  ('comments', 'Comments and ratings');

-- RLS policies for modules
CREATE POLICY "Everyone can view modules" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Super admins can manage modules" ON public.modules FOR ALL USING (is_super_admin(auth.uid()));

-- RLS policies for user_module_permissions
CREATE POLICY "Users can view own permissions" ON public.user_module_permissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins can manage all permissions" ON public.user_module_permissions FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Admins can view all permissions" ON public.user_module_permissions FOR SELECT USING (is_admin_or_higher(auth.uid()));

-- Create function to check module permission
CREATE OR REPLACE FUNCTION public.has_module_permission(
  _user_id uuid,
  _module_name text,
  _permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Super admins have all permissions
    is_super_admin(_user_id) OR
    -- Check specific module permission
    EXISTS (
      SELECT 1
      FROM public.user_module_permissions ump
      JOIN public.modules m ON m.id = ump.module_id
      WHERE ump.user_id = _user_id
        AND m.name = _module_name
        AND (
          (_permission = 'create' AND ump.can_create = true) OR
          (_permission = 'read' AND ump.can_read = true) OR
          (_permission = 'update' AND ump.can_update = true) OR
          (_permission = 'delete' AND ump.can_delete = true)
        )
    )
$$;

-- Create function to get all user roles (for multi-role support)
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS SETOF app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

-- Update handle_new_user to NOT assign default role (users signup without role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile only, no default role
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  RETURN NEW;
END;
$$;

-- ============================================
-- MIGRATION: 20251202165719_f463c1f5-c769-442f-82f5-894da9415d0d.sql
-- ============================================


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


-- ============================================
-- MIGRATION: 20251202171614_3d5abe74-7784-4306-9043-6e72ba420a8f.sql
-- ============================================

-- Course-Category junction table for multi-select categories
CREATE TABLE IF NOT EXISTS public.course_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, category_id)
);

-- Enable RLS
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for course_categories
CREATE POLICY "Everyone can view course categories"
ON public.course_categories FOR SELECT
USING (true);

CREATE POLICY "Admins can manage course categories"
ON public.course_categories FOR ALL
USING (is_admin_or_higher(auth.uid()));

-- Extend content_type enum to include 'course' if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'course' AND enumtypid = 'public.content_type'::regtype) THEN
    ALTER TYPE public.content_type ADD VALUE 'course';
  END IF;
END $$;

-- ============================================
-- MIGRATION: 20251202173109_97e5c8b4-07ca-4053-91cb-1e092ef79c55.sql
-- ============================================

-- Add difficulty level to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'beginner';

-- Create index for filtering by difficulty
CREATE INDEX IF NOT EXISTS idx_courses_difficulty ON public.courses(difficulty);

-- ============================================
-- MIGRATION: 20251202174404_7ad4d883-e31f-4bf0-86b2-3fa78634d07c.sql
-- ============================================

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

-- ============================================
-- MIGRATION: 20251202191706_34eb9875-76d5-4730-8273-2a66bcc4510b.sql
-- ============================================

-- Create course_waitlist table for enrollment waitlist functionality
CREATE TABLE public.course_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'enrolled', 'expired', 'cancelled')),
  UNIQUE (course_id, user_id)
);

-- Add capacity column to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT NULL;

-- Enable RLS
ALTER TABLE public.course_waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own waitlist entries"
ON public.course_waitlist
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all waitlist entries"
ON public.course_waitlist
FOR SELECT
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Users can join waitlist"
ON public.course_waitlist
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel their waitlist entry"
ON public.course_waitlist
FOR UPDATE
USING (auth.uid() = user_id AND status = 'waiting');

CREATE POLICY "Admins can manage all waitlist entries"
ON public.course_waitlist
FOR ALL
USING (is_admin_or_higher(auth.uid()));

-- Create function to get next waitlist position
CREATE OR REPLACE FUNCTION get_next_waitlist_position(p_course_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_pos INTEGER;
BEGIN
  SELECT COALESCE(MAX(position), 0) + 1 INTO next_pos
  FROM course_waitlist
  WHERE course_id = p_course_id AND status = 'waiting';
  RETURN next_pos;
END;
$$;

-- Create function to process waitlist when spot opens
CREATE OR REPLACE FUNCTION process_waitlist_on_unenroll()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_user RECORD;
  course_capacity INTEGER;
  current_enrolled INTEGER;
BEGIN
  -- Get course capacity
  SELECT max_capacity INTO course_capacity FROM courses WHERE id = OLD.course_id;
  
  -- If no capacity limit, skip
  IF course_capacity IS NULL THEN
    RETURN OLD;
  END IF;
  
  -- Get current enrollment count
  SELECT COUNT(*) INTO current_enrolled FROM course_enrollments WHERE course_id = OLD.course_id;
  
  -- If still at or over capacity, skip
  IF current_enrolled >= course_capacity THEN
    RETURN OLD;
  END IF;
  
  -- Get next person on waitlist
  SELECT * INTO next_user 
  FROM course_waitlist 
  WHERE course_id = OLD.course_id AND status = 'waiting'
  ORDER BY position ASC
  LIMIT 1;
  
  -- If someone is waiting, notify them
  IF next_user.id IS NOT NULL THEN
    UPDATE course_waitlist 
    SET status = 'notified', 
        notified_at = now(),
        expires_at = now() + INTERVAL '48 hours'
    WHERE id = next_user.id;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create trigger for when someone unenrolls
DROP TRIGGER IF EXISTS on_enrollment_deleted ON public.course_enrollments;
CREATE TRIGGER on_enrollment_deleted
AFTER DELETE ON public.course_enrollments
FOR EACH ROW
EXECUTE FUNCTION process_waitlist_on_unenroll();

-- ============================================
-- MIGRATION: 20251203040604_7b09963f-50e8-4072-a256-07411efec7b8.sql
-- ============================================

-- Create course_modules table for hierarchical structure
CREATE TABLE public.course_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add module_id to lessons table (optional reference for backward compatibility)
ALTER TABLE public.lessons ADD COLUMN module_id UUID REFERENCES public.course_modules(id) ON DELETE SET NULL;

-- Junction table for books attached to courses
CREATE TABLE public.course_library_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, book_id)
);

-- Junction table for videos attached to courses
CREATE TABLE public.course_library_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, video_id)
);

-- Junction table for books attached to modules
CREATE TABLE public.module_library_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(module_id, book_id)
);

-- Junction table for videos attached to modules
CREATE TABLE public.module_library_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(module_id, video_id)
);

-- Junction table for books attached to lessons
CREATE TABLE public.lesson_library_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, book_id)
);

-- Junction table for videos attached to lessons
CREATE TABLE public.lesson_library_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, video_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_library_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_library_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_library_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for course_modules
CREATE POLICY "Users can view modules of assigned courses" ON public.course_modules
FOR SELECT USING (has_course_access(auth.uid(), course_id));

CREATE POLICY "Admins can manage course modules" ON public.course_modules
FOR ALL USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Teachers can manage modules for their courses" ON public.course_modules
FOR ALL USING (
  has_role(auth.uid(), 'teacher') AND 
  EXISTS (SELECT 1 FROM courses WHERE courses.id = course_modules.course_id AND courses.instructor_id = auth.uid())
);

-- RLS Policies for course_library_books
CREATE POLICY "Users can view course library books" ON public.course_library_books
FOR SELECT USING (has_course_access(auth.uid(), course_id));

CREATE POLICY "Admins can manage course library books" ON public.course_library_books
FOR ALL USING (is_admin_or_higher(auth.uid()));

-- RLS Policies for course_library_videos
CREATE POLICY "Users can view course library videos" ON public.course_library_videos
FOR SELECT USING (has_course_access(auth.uid(), course_id));

CREATE POLICY "Admins can manage course library videos" ON public.course_library_videos
FOR ALL USING (is_admin_or_higher(auth.uid()));

-- RLS Policies for module_library_books
CREATE POLICY "Users can view module library books" ON public.module_library_books
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM course_modules cm 
    WHERE cm.id = module_library_books.module_id 
    AND has_course_access(auth.uid(), cm.course_id)
  )
);

CREATE POLICY "Admins can manage module library books" ON public.module_library_books
FOR ALL USING (is_admin_or_higher(auth.uid()));

-- RLS Policies for module_library_videos
CREATE POLICY "Users can view module library videos" ON public.module_library_videos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM course_modules cm 
    WHERE cm.id = module_library_videos.module_id 
    AND has_course_access(auth.uid(), cm.course_id)
  )
);

CREATE POLICY "Admins can manage module library videos" ON public.module_library_videos
FOR ALL USING (is_admin_or_higher(auth.uid()));

-- RLS Policies for lesson_library_books
CREATE POLICY "Users can view lesson library books" ON public.lesson_library_books
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM lessons l 
    WHERE l.id = lesson_library_books.lesson_id 
    AND has_course_access(auth.uid(), l.course_id)
  )
);

CREATE POLICY "Admins can manage lesson library books" ON public.lesson_library_books
FOR ALL USING (is_admin_or_higher(auth.uid()));

-- RLS Policies for lesson_library_videos
CREATE POLICY "Users can view lesson library videos" ON public.lesson_library_videos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM lessons l 
    WHERE l.id = lesson_library_videos.lesson_id 
    AND has_course_access(auth.uid(), l.course_id)
  )
);

CREATE POLICY "Admins can manage lesson library videos" ON public.lesson_library_videos
FOR ALL USING (is_admin_or_higher(auth.uid()));

-- Create trigger for updated_at on course_modules
CREATE TRIGGER update_course_modules_updated_at
  BEFORE UPDATE ON public.course_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- MIGRATION: 20251203044913_40bddb5e-cbd3-49fe-a8d1-fbee1660ffb3.sql
-- ============================================

-- Allow admins to view all user roles (needed for teacher selector)
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (is_admin_or_higher(auth.uid()));

-- ============================================
-- MIGRATION: 20251203084231_create_custom_roles_table.sql
-- ============================================

-- Create custom_roles table for SuperAdmin to create custom roles
CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_custom_roles_name ON custom_roles(role_name);
CREATE INDEX idx_custom_roles_created_by ON custom_roles(created_by);

-- Enable RLS
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can do everything
CREATE POLICY "Super admins have full access to custom roles"
  ON custom_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

-- Policy: Admins can only read custom roles
CREATE POLICY "Admins can read custom roles"
  ON custom_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_custom_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_roles_updated_at
  BEFORE UPDATE ON custom_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_roles_updated_at();

-- Comment on table
COMMENT ON TABLE custom_roles IS 'Custom roles created by super admins that can be assigned by admins';



-- ============================================
-- MIGRATION: 20251212_admin_enroll_function.sql
-- ============================================

-- Create a secure function for admins to enroll students
-- This function bypasses RLS using SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.admin_enroll_student(
  _student_id UUID,
  _course_id UUID,
  _admin_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _enrollment_id UUID;
  _is_admin BOOLEAN;
BEGIN
  -- Verify the calling user is an admin
  SELECT is_admin_or_higher(_admin_id) INTO _is_admin;
  
  IF NOT _is_admin THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Only admins can enroll students'
    );
  END IF;

  -- Check if already enrolled
  IF EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE user_id = _student_id AND course_id = _course_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Student is already enrolled in this course'
    );
  END IF;

  -- Insert enrollment
  INSERT INTO public.course_enrollments (user_id, course_id, enrolled_at)
  VALUES (_student_id, _course_id, NOW())
  RETURNING id INTO _enrollment_id;

  RETURN json_build_object(
    'success', true,
    'enrollment_id', _enrollment_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Create a secure function for admins to assign teachers to courses
CREATE OR REPLACE FUNCTION public.admin_assign_teacher(
  _teacher_id UUID,
  _course_id UUID,
  _admin_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _assignment_id UUID;
  _is_admin BOOLEAN;
BEGIN
  -- Verify the calling user is an admin
  SELECT is_admin_or_higher(_admin_id) INTO _is_admin;
  
  IF NOT _is_admin THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Only admins can assign teachers'
    );
  END IF;

  -- Check if already assigned
  IF EXISTS (
    SELECT 1 FROM public.teacher_course_assignments
    WHERE teacher_id = _teacher_id AND course_id = _course_id
  ) THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Teacher already assigned to this course'
    );
  END IF;

  -- Insert teacher assignment
  INSERT INTO public.teacher_course_assignments (teacher_id, course_id, assigned_by, assigned_at)
  VALUES (_teacher_id, _course_id, _admin_id, NOW())
  RETURNING id INTO _assignment_id;

  RETURN json_build_object(
    'success', true,
    'assignment_id', _assignment_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.admin_enroll_student TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_teacher TO authenticated;



-- ============================================
-- MIGRATION: 20251212_fix_enrollment_rls.sql
-- ============================================

-- Fix RLS policies for course_enrollments to allow admin insertions

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Admins can insert enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins can manage enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins can update enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins can delete enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins can insert for others" ON public.course_enrollments;

-- Allow admins and super_admins to insert enrollments for any user
CREATE POLICY "Admins can insert for others" ON public.course_enrollments
FOR INSERT WITH CHECK (
  is_admin_or_higher(auth.uid())
);

-- Allow admins and super_admins to update enrollments
CREATE POLICY "Admins can update enrollments" ON public.course_enrollments
FOR UPDATE USING (
  is_admin_or_higher(auth.uid())
);

-- Allow admins and super_admins to delete enrollments
CREATE POLICY "Admins can delete enrollments" ON public.course_enrollments
FOR DELETE USING (
  is_admin_or_higher(auth.uid())
);


-- ============================================
-- MIGRATION: 20251212_teacher_course_assignments.sql
-- ============================================

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



-- ============================================
-- MIGRATION: 20251212191752_fix_security_definer_view.sql
-- ============================================

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
    RAISE NOTICE 'âš ï¸  View student_overview exists - will be dropped';
    
    -- Drop the view with CASCADE to handle dependencies
    DROP VIEW IF EXISTS public.student_overview CASCADE;
    
    RAISE NOTICE 'âœ… View student_overview dropped successfully';
  ELSE
    RAISE NOTICE 'â„¹ï¸  View student_overview does not exist - no action needed';
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

RAISE NOTICE 'âœ… View student_overview recreated without SECURITY DEFINER';
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
    RAISE WARNING 'âš ï¸  These views still have SECURITY DEFINER: %', definer_views;
  ELSE
    RAISE NOTICE 'âœ… No views with SECURITY DEFINER found';
  END IF;
END $$;


-- ============================================
-- MIGRATION: 20251212194644_add_phone_authentication.sql
-- ============================================

-- Migration: Add phone authentication support
-- Date: 2024-12-12
-- Description: Add phone field to profiles and update trigger

-- Step 1: Add phone column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Step 2: Create index on phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- Step 3: Update handle_new_user function to include phone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile with phone support
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', '')
  );
  
  RETURN NEW;
END;
$$;

-- Step 4: Add comment
COMMENT ON COLUMN public.profiles.phone IS 'User phone number for authentication and contact';

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'âœ… Phone authentication migration completed';
  RAISE NOTICE 'ðŸ“± Phone column added to profiles table';
  RAISE NOTICE 'ðŸ”§ handle_new_user trigger updated';
END $$;


-- ============================================
-- MIGRATION: FINAL_FIX_ENROLLMENT.sql
-- ============================================

-- ============================================
-- FINAL FIX FOR ENROLLMENT - RUN THIS ENTIRE FILE
-- ============================================

-- Step 1: Create teacher_course_assignments table if it doesn't exist
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_teacher_course_assignments_teacher ON public.teacher_course_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_course_assignments_course ON public.teacher_course_assignments(course_id);

-- Step 2: Drop conflicting policies on course_enrollments
DROP POLICY IF EXISTS "Admins can insert enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins can insert for others" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins full access" ON public.course_enrollments;

-- Step 3: Create admin insert policy using existing is_admin_or_higher function
CREATE POLICY "Admins full access" ON public.course_enrollments
FOR ALL USING (
  is_admin_or_higher(auth.uid())
) WITH CHECK (
  is_admin_or_higher(auth.uid())
);

-- Step 4: Drop conflicting policies on teacher_course_assignments
DROP POLICY IF EXISTS "Admins can manage teacher assignments" ON public.teacher_course_assignments;
DROP POLICY IF EXISTS "Teachers can view their assignments" ON public.teacher_course_assignments;

-- Step 5: Create policies for teacher_course_assignments
CREATE POLICY "Admins can manage teacher assignments" ON public.teacher_course_assignments
FOR ALL USING (
  is_admin_or_higher(auth.uid())
) WITH CHECK (
  is_admin_or_higher(auth.uid())
);

CREATE POLICY "Teachers can view their assignments" ON public.teacher_course_assignments
FOR SELECT USING (
  teacher_id = auth.uid()
);

-- Step 6: Create helper function for admin enrollment (bypasses RLS)
CREATE OR REPLACE FUNCTION public.admin_enroll_student(
  _student_id UUID,
  _course_id UUID,
  _admin_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _enrollment_id UUID;
BEGIN
  -- Verify caller is admin
  IF NOT is_admin_or_higher(_admin_id) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Check duplicate
  IF EXISTS (SELECT 1 FROM course_enrollments WHERE user_id = _student_id AND course_id = _course_id) THEN
    RETURN json_build_object('success', false, 'error', 'Already enrolled');
  END IF;

  -- Insert
  INSERT INTO course_enrollments (user_id, course_id, enrolled_at)
  VALUES (_student_id, _course_id, NOW())
  RETURNING id INTO _enrollment_id;

  RETURN json_build_object('success', true, 'enrollment_id', _enrollment_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Step 7: Create helper function for teacher assignment
CREATE OR REPLACE FUNCTION public.admin_assign_teacher(
  _teacher_id UUID,
  _course_id UUID,
  _admin_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _assignment_id UUID;
BEGIN
  -- Verify caller is admin
  IF NOT is_admin_or_higher(_admin_id) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Check duplicate
  IF EXISTS (SELECT 1 FROM teacher_course_assignments WHERE teacher_id = _teacher_id AND course_id = _course_id) THEN
    RETURN json_build_object('success', true, 'message', 'Already assigned');
  END IF;

  -- Insert
  INSERT INTO teacher_course_assignments (teacher_id, course_id, assigned_by, assigned_at)
  VALUES (_teacher_id, _course_id, _admin_id, NOW())
  RETURNING id INTO _assignment_id;

  RETURN json_build_object('success', true, 'assignment_id', _assignment_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Step 8: Grant permissions
GRANT EXECUTE ON FUNCTION public.admin_enroll_student TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_teacher TO authenticated;

-- Step 9: Verify setup (these should return true/counts)
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Function admin_enroll_student created: %', (SELECT COUNT(*) FROM pg_proc WHERE proname = 'admin_enroll_student');
  RAISE NOTICE 'Function admin_assign_teacher created: %', (SELECT COUNT(*) FROM pg_proc WHERE proname = 'admin_assign_teacher');
  RAISE NOTICE 'Table teacher_course_assignments exists: %', (SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'teacher_course_assignments'));
END $$;



