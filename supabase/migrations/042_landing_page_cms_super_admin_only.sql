-- Migration 042: Landing Page CMS - SUPER ADMIN Only Control
-- Purpose: Restrict landing page section management to SUPER ADMIN only
-- Other roles can only view the landing page

BEGIN;

-- ============================================
-- STEP 1: Update RLS policies for page_sections
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Everyone can view active page sections" ON public.page_sections;
DROP POLICY IF EXISTS "Admins can view all page sections" ON public.page_sections;
DROP POLICY IF EXISTS "Admins can manage page sections" ON public.page_sections;

-- Create new policies: Only SUPER ADMIN can manage sections
-- Everyone can view active sections (for landing page display)
CREATE POLICY "Everyone can view active page sections"
ON public.page_sections FOR SELECT
USING (is_active = true);

-- SUPER ADMIN can view all sections (including inactive)
CREATE POLICY "Super admins can view all page sections"
ON public.page_sections FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

-- SUPER ADMIN can insert new sections
CREATE POLICY "Super admins can insert page sections"
ON public.page_sections FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- SUPER ADMIN can update sections
CREATE POLICY "Super admins can update page sections"
ON public.page_sections FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- SUPER ADMIN can delete sections
CREATE POLICY "Super admins can delete page sections"
ON public.page_sections FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'));

-- ============================================
-- STEP 2: Ensure page_sections has proper structure for landing page
-- ============================================

-- Add image_url column if it doesn't exist (for section images)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'page_sections' 
    AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.page_sections 
    ADD COLUMN image_url text;
  END IF;
END $$;

-- ============================================
-- STEP 3: Update existing sections to ensure they have proper structure
-- ============================================

-- Ensure hero section has all required fields
UPDATE public.page_sections
SET content = jsonb_build_object(
  'badge', COALESCE(content->>'badge', 'Modern E-Learning Platform'),
  'title_line_1', COALESCE(content->>'title_line_1', 'Learn Anything,'),
  'title_line_2', COALESCE(content->>'title_line_2', 'Anytime, Anywhere'),
  'subtitle', COALESCE(content->>'subtitle', 'Access high-quality courses, watch engaging video lessons, and download comprehensive study materials.'),
  'cta_primary', COALESCE(content->'cta_primary', jsonb_build_object('text', 'Get Started Free', 'link', '/auth')),
  'cta_secondary', COALESCE(content->'cta_secondary', jsonb_build_object('text', 'Browse Courses', 'link', '/courses'))
)
WHERE section_type = 'hero' AND page_type = 'landing'
AND (content->>'badge' IS NULL OR content->>'title_line_1' IS NULL);

-- Ensure features section has proper structure
UPDATE public.page_sections
SET content = jsonb_build_object(
  'title', COALESCE(content->>'title', 'Why Choose EduLearn?'),
  'subtitle', COALESCE(content->>'subtitle', 'Everything you need to succeed in your learning journey'),
  'features', COALESCE(content->'features', jsonb_build_array(
    jsonb_build_object('icon', 'Video', 'title', 'Video Lessons', 'description', 'Watch high-quality video tutorials from expert instructors at your own pace'),
    jsonb_build_object('icon', 'FileText', 'title', 'Study Materials', 'description', 'Download comprehensive PDF resources and notes for offline study'),
    jsonb_build_object('icon', 'Users', 'title', 'Expert Teachers', 'description', 'Learn from experienced educators and industry professionals'),
    jsonb_build_object('icon', 'BookOpen', 'title', 'Rich Course Library', 'description', 'Access a growing collection of courses across multiple subjects'),
    jsonb_build_object('icon', 'Award', 'title', 'Track Progress', 'description', 'Monitor your learning journey and celebrate your achievements'),
    jsonb_build_object('icon', 'Zap', 'title', 'Easy to Use', 'description', 'Simple, intuitive interface designed for seamless learning')
  ))
)
WHERE section_type = 'features' AND page_type = 'landing'
AND (content->>'title' IS NULL OR content->'features' IS NULL);

-- Ensure CTA section has proper structure
UPDATE public.page_sections
SET content = jsonb_build_object(
  'title', COALESCE(content->>'title', 'Ready to Start Learning?'),
  'subtitle', COALESCE(content->>'subtitle', 'Join thousands of students already learning on our platform. Sign up now and get access to all courses.'),
  'cta_text', COALESCE(content->>'cta_text', 'Get Started Free'),
  'cta_link', COALESCE(content->>'cta_link', '/auth')
)
WHERE section_type = 'cta' AND page_type = 'landing'
AND (content->>'title' IS NULL OR content->>'cta_text' IS NULL);

COMMIT;
