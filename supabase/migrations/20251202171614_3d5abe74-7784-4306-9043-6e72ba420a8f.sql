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