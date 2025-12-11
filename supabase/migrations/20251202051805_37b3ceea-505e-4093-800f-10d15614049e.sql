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
  ('Science', 'Science and technology related content', '🔬'),
  ('Mathematics', 'Math and quantitative studies', '📐'),
  ('Literature', 'Books and literary works', '📚'),
  ('History', 'Historical content and studies', '📜'),
  ('Programming', 'Coding and software development', '💻'),
  ('Languages', 'Language learning resources', '🗣️'),
  ('Arts', 'Creative arts and design', '🎨'),
  ('Business', 'Business and entrepreneurship', '💼');