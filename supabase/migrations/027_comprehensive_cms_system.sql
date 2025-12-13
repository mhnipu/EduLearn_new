-- Migration 027: Comprehensive CMS System
-- Purpose: Full CMS with themes, drag-and-drop sections, and settings management
--
-- Key Features:
-- 1. Theme management (core/custom themes)
-- 2. Page sections with drag-and-drop ordering
-- 3. Site-wide configurations
-- 4. Content blocks management

BEGIN;

-- ============================================
-- STEP 1: Create themes table
-- ============================================

CREATE TABLE IF NOT EXISTS public.themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  type text NOT NULL CHECK (type IN ('core', 'custom')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for themes
CREATE POLICY "Everyone can view active themes"
ON public.themes FOR SELECT
USING (is_active = true OR type = 'core');

CREATE POLICY "Admins can view all themes"
ON public.themes FOR SELECT
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can manage themes"
ON public.themes FOR ALL
USING (is_admin_or_higher(auth.uid()))
WITH CHECK (is_admin_or_higher(auth.uid()));

-- ============================================
-- STEP 2: Create page_sections table
-- ============================================

CREATE TABLE IF NOT EXISTS public.page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type text NOT NULL DEFAULT 'landing',
  section_type text NOT NULL, -- 'hero', 'features', 'testimonials', 'cta', 'custom'
  title text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  theme_config jsonb DEFAULT '{}'::jsonb, -- Section-specific theme overrides
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_page_sections_page_type ON public.page_sections(page_type, order_index);
CREATE INDEX IF NOT EXISTS idx_page_sections_active ON public.page_sections(page_type, is_active, order_index);

ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for page_sections
CREATE POLICY "Everyone can view active page sections"
ON public.page_sections FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all page sections"
ON public.page_sections FOR SELECT
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can manage page sections"
ON public.page_sections FOR ALL
USING (is_admin_or_higher(auth.uid()))
WITH CHECK (is_admin_or_higher(auth.uid()));

-- ============================================
-- STEP 3: Create site_configurations table
-- ============================================

CREATE TABLE IF NOT EXISTS public.site_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL, -- 'general', 'appearance', 'seo', 'social', 'email', 'custom'
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  is_public boolean NOT NULL DEFAULT false, -- Can be accessed without auth
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(category, key)
);

CREATE INDEX IF NOT EXISTS idx_site_configurations_category ON public.site_configurations(category);
CREATE INDEX IF NOT EXISTS idx_site_configurations_public ON public.site_configurations(is_public);

ALTER TABLE public.site_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for site_configurations
CREATE POLICY "Everyone can view public configurations"
ON public.site_configurations FOR SELECT
USING (is_public = true);

CREATE POLICY "Admins can view all configurations"
ON public.site_configurations FOR SELECT
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can manage configurations"
ON public.site_configurations FOR ALL
USING (is_admin_or_higher(auth.uid()))
WITH CHECK (is_admin_or_higher(auth.uid()));

-- ============================================
-- STEP 4: Add theme_id to site_settings (for active theme)
-- ============================================

-- Add theme reference to site_settings if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'site_settings' 
    AND column_name = 'theme_id'
  ) THEN
    ALTER TABLE public.site_settings 
    ADD COLUMN theme_id uuid REFERENCES public.themes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- STEP 5: Create triggers for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Themes trigger
DROP TRIGGER IF EXISTS update_themes_updated_at ON public.themes;
CREATE TRIGGER update_themes_updated_at
  BEFORE UPDATE ON public.themes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Page sections trigger
DROP TRIGGER IF EXISTS update_page_sections_updated_at ON public.page_sections;
CREATE TRIGGER update_page_sections_updated_at
  BEFORE UPDATE ON public.page_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Site configurations trigger
DROP TRIGGER IF EXISTS update_site_configurations_updated_at ON public.site_configurations;
CREATE TRIGGER update_site_configurations_updated_at
  BEFORE UPDATE ON public.site_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- STEP 6: Seed default core themes
-- ============================================

-- First, ensure default theme exists and is active
INSERT INTO public.themes (name, display_name, type, config, is_active)
VALUES 
  (
    'default',
    'Default Theme',
    'core',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'primary', '#3b82f6',
        'secondary', '#8b5cf6',
        'accent', '#10b981',
        'background', '#ffffff',
        'foreground', '#0f172a'
      ),
      'fonts', jsonb_build_object(
        'heading', 'Inter',
        'body', 'Inter'
      ),
      'spacing', jsonb_build_object(
        'section', 'py-20',
        'container', 'max-w-7xl'
      )
    ),
    true
  )
ON CONFLICT (name) DO UPDATE
SET 
  is_active = true,
  config = EXCLUDED.config,
  display_name = EXCLUDED.display_name;

-- Deactivate all other themes first
UPDATE public.themes SET is_active = false WHERE name != 'default';

-- Insert other core themes
INSERT INTO public.themes (name, display_name, type, config, is_active)
VALUES 
  (
    'dark',
    'Dark Theme',
    'core',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'primary', '#60a5fa',
        'secondary', '#a78bfa',
        'accent', '#34d399',
        'background', '#0f172a',
        'foreground', '#f1f5f9'
      ),
      'fonts', jsonb_build_object(
        'heading', 'Inter',
        'body', 'Inter'
      ),
      'spacing', jsonb_build_object(
        'section', 'py-20',
        'container', 'max-w-7xl'
      )
    ),
    false
  ),
  (
    'minimal',
    'Minimal Theme',
    'core',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'primary', '#000000',
        'secondary', '#666666',
        'accent', '#000000',
        'background', '#ffffff',
        'foreground', '#000000'
      ),
      'fonts', jsonb_build_object(
        'heading', 'Georgia',
        'body', 'Georgia'
      ),
      'spacing', jsonb_build_object(
        'section', 'py-16',
        'container', 'max-w-5xl'
      )
    ),
    false
  )
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- STEP 7: Seed default page sections for landing page
-- ============================================

INSERT INTO public.page_sections (page_type, section_type, title, content, order_index, is_active)
VALUES 
  (
    'landing',
    'hero',
    'Hero Section',
    jsonb_build_object(
      'badge', 'Modern E-Learning Platform',
      'title_line_1', 'Learn Anything,',
      'title_line_2', 'Anytime, Anywhere',
      'subtitle', 'Access high-quality courses, watch engaging video lessons, and download comprehensive study materials.',
      'cta_primary', jsonb_build_object('text', 'Get Started Free', 'link', '/auth'),
      'cta_secondary', jsonb_build_object('text', 'Browse Courses', 'link', '/courses')
    ),
    0,
    true
  ),
  (
    'landing',
    'features',
    'Features Section',
    jsonb_build_object(
      'title', 'Why Choose EduLearn?',
      'subtitle', 'Everything you need to succeed in your learning journey',
      'features', jsonb_build_array(
        jsonb_build_object('icon', 'BookOpen', 'title', 'Comprehensive Courses', 'description', 'Access thousands of courses across various subjects'),
        jsonb_build_object('icon', 'Video', 'title', 'Video Lessons', 'description', 'Learn from expert instructors through engaging video content'),
        jsonb_build_object('icon', 'FileText', 'title', 'Study Materials', 'description', 'Download PDFs, notes, and resources to enhance your learning'),
        jsonb_build_object('icon', 'Users', 'title', 'Expert Instructors', 'description', 'Learn from industry professionals and experienced educators'),
        jsonb_build_object('icon', 'Award', 'title', 'Certificates', 'description', 'Earn certificates upon course completion'),
        jsonb_build_object('icon', 'Zap', 'title', 'Flexible Learning', 'description', 'Learn at your own pace, anytime, anywhere')
      )
    ),
    1,
    true
  ),
  (
    'landing',
    'cta',
    'Call to Action Section',
    jsonb_build_object(
      'title', 'Ready to Start Learning?',
      'subtitle', 'Join thousands of students already learning on our platform. Sign up now and get access to all courses.',
      'cta_text', 'Get Started Free',
      'cta_link', '/auth'
    ),
    2,
    true
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 8: Seed default site configurations
-- ============================================

INSERT INTO public.site_configurations (category, key, value, description, is_public)
VALUES 
  (
    'general',
    'site_name',
    jsonb_build_object('value', 'EduLearn'),
    'Site name displayed in header and meta tags',
    true
  ),
  (
    'general',
    'site_tagline',
    jsonb_build_object('value', 'Learn Anything, Anytime, Anywhere'),
    'Site tagline/slogan',
    true
  ),
  (
    'appearance',
    'active_theme',
    jsonb_build_object('value', 'default'),
    'Currently active theme',
    true
  ),
  (
    'seo',
    'meta_description',
    jsonb_build_object('value', 'EduLearn - Modern E-Learning Platform. Access courses, videos, and study materials.'),
    'Default meta description for SEO',
    true
  ),
  (
    'social',
    'facebook_url',
    jsonb_build_object('value', ''),
    'Facebook page URL',
    true
  ),
  (
    'social',
    'twitter_url',
    jsonb_build_object('value', ''),
    'Twitter profile URL',
    true
  ),
  (
    'social',
    'linkedin_url',
    jsonb_build_object('value', ''),
    'LinkedIn page URL',
    true
  ),
  (
    'email',
    'contact_email',
    jsonb_build_object('value', 'contact@edulearn.com'),
    'Contact email address',
    true
  )
ON CONFLICT (category, key) DO UPDATE
SET 
  value = CASE 
    WHEN (category, key) = ('appearance', 'active_theme') THEN jsonb_build_object('value', 'default')
    ELSE EXCLUDED.value
  END,
  description = EXCLUDED.description,
  is_public = EXCLUDED.is_public;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  themes_count int;
  sections_count int;
  configs_count int;
BEGIN
  SELECT COUNT(*) INTO themes_count FROM public.themes;
  SELECT COUNT(*) INTO sections_count FROM public.page_sections;
  SELECT COUNT(*) INTO configs_count FROM public.site_configurations;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'CMS System Created Successfully';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Themes: %', themes_count;
  RAISE NOTICE 'Page Sections: %', sections_count;
  RAISE NOTICE 'Site Configurations: %', configs_count;
  RAISE NOTICE '✅ Database schema ready for CMS';
  RAISE NOTICE '✅ Default themes seeded';
  RAISE NOTICE '✅ Default page sections created';
  RAISE NOTICE '✅ Default configurations added';
  RAISE NOTICE '============================================';
END $$;

COMMIT;
