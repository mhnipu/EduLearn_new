-- Migration 023: Basic CMS settings for landing page
-- Everyone can read; only admin/super_admin can update.

CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Read access for everyone (landing page)
DROP POLICY IF EXISTS "site_settings_read_all" ON public.site_settings;
CREATE POLICY "site_settings_read_all"
  ON public.site_settings
  FOR SELECT
  USING (true);

-- Write access only for admin/super_admin
DROP POLICY IF EXISTS "site_settings_write_admin" ON public.site_settings;
CREATE POLICY "site_settings_write_admin"
  ON public.site_settings
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
  );

-- Seed default landing content (safe upsert)
INSERT INTO public.site_settings (key, value)
VALUES (
  'landing',
  jsonb_build_object(
    'badge', 'Modern E-Learning Platform',
    'title_line_1', 'Learn Anything,',
    'title_line_2', 'Anytime, Anywhere',
    'subtitle', 'Access high-quality courses, watch engaging video lessons, and download comprehensive study materials. Your journey to knowledge starts here.',
    'cta_title', 'Ready to Start Learning?',
    'cta_subtitle', 'Join thousands of students already learning on our platform. Sign up now and get access to all courses.'
  )
)
ON CONFLICT (key) DO NOTHING;

