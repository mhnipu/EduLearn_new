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