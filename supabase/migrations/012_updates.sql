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