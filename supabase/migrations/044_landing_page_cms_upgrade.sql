-- Migration 044: Landing Page CMS Upgrade
-- Purpose: Add version history, drafts, schemas, and enhanced section management
-- Features:
-- 1. Version history with rollback support (last 5 versions)
-- 2. Draft state management
-- 3. Section schemas for predefined layouts
-- 4. Enhanced page_sections with locking, SEO, and layout variants
-- 5. Improved RLS policies

BEGIN;

-- ============================================
-- STEP 1: Create page_section_versions table
-- ============================================

CREATE TABLE IF NOT EXISTS public.page_section_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.page_sections(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(section_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_page_section_versions_section 
  ON public.page_section_versions(section_id, version_number DESC);

ALTER TABLE public.page_section_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for versions
CREATE POLICY "Everyone can view versions of active sections"
ON public.page_section_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.page_sections 
    WHERE id = section_id AND is_active = true
  )
);

CREATE POLICY "Super admins can view all versions"
ON public.page_section_versions FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can create versions"
ON public.page_section_versions FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============================================
-- STEP 2: Create page_section_drafts table
-- ============================================

CREATE TABLE IF NOT EXISTS public.page_section_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.page_sections(id) ON DELETE CASCADE,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'preview', 'published')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(section_id)
);

CREATE INDEX IF NOT EXISTS idx_page_section_drafts_section 
  ON public.page_section_drafts(section_id);

ALTER TABLE public.page_section_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for drafts
CREATE POLICY "Super admins can view all drafts"
ON public.page_section_drafts FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage drafts"
ON public.page_section_drafts FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============================================
-- STEP 3: Create page_section_schemas table
-- ============================================

CREATE TABLE IF NOT EXISTS public.page_section_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_type text NOT NULL UNIQUE,
  schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  layout_variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_section_schemas_type 
  ON public.page_section_schemas(section_type);

ALTER TABLE public.page_section_schemas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schemas (public read, super admin write)
CREATE POLICY "Everyone can view schemas"
ON public.page_section_schemas FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage schemas"
ON public.page_section_schemas FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============================================
-- STEP 4: Enhance page_sections table
-- ============================================

-- Add layout_variant column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'page_sections' 
    AND column_name = 'layout_variant'
  ) THEN
    ALTER TABLE public.page_sections 
    ADD COLUMN layout_variant text;
  END IF;
END $$;

-- Add is_locked column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'page_sections' 
    AND column_name = 'is_locked'
  ) THEN
    ALTER TABLE public.page_sections 
    ADD COLUMN is_locked boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add visibility_rules column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'page_sections' 
    AND column_name = 'visibility_rules'
  ) THEN
    ALTER TABLE public.page_sections 
    ADD COLUMN visibility_rules jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add seo_meta column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'page_sections' 
    AND column_name = 'seo_meta'
  ) THEN
    ALTER TABLE public.page_sections 
    ADD COLUMN seo_meta jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add published_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'page_sections' 
    AND column_name = 'published_at'
  ) THEN
    ALTER TABLE public.page_sections 
    ADD COLUMN published_at timestamptz;
  END IF;
END $$;

-- Add published_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'page_sections' 
    AND column_name = 'published_by'
  ) THEN
    ALTER TABLE public.page_sections 
    ADD COLUMN published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- STEP 5: Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_page_sections_page_type_order 
  ON public.page_sections(page_type, order_index);

-- ============================================
-- STEP 6: Create helper function for versioning
-- ============================================

CREATE OR REPLACE FUNCTION public.create_section_version(
  p_section_id uuid,
  p_content jsonb,
  p_created_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_version integer;
  v_version_count integer;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
  FROM public.page_section_versions
  WHERE section_id = p_section_id;

  -- Insert new version
  INSERT INTO public.page_section_versions (section_id, version_number, content, created_by)
  VALUES (p_section_id, v_next_version, p_content, p_created_by);

  -- Keep only last 5 versions
  SELECT COUNT(*) INTO v_version_count
  FROM public.page_section_versions
  WHERE section_id = p_section_id;

  IF v_version_count > 5 THEN
    DELETE FROM public.page_section_versions
    WHERE section_id = p_section_id
    AND version_number < (
      SELECT MIN(version_number)
      FROM (
        SELECT version_number
        FROM public.page_section_versions
        WHERE section_id = p_section_id
        ORDER BY version_number DESC
        LIMIT 5
      ) latest_versions
    );
  END IF;
END;
$$;

-- ============================================
-- STEP 7: Create trigger for updated_at on drafts
-- ============================================

CREATE OR REPLACE FUNCTION public.update_draft_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_page_section_drafts_updated_at ON public.page_section_drafts;
CREATE TRIGGER update_page_section_drafts_updated_at
  BEFORE UPDATE ON public.page_section_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_draft_updated_at();

-- ============================================
-- STEP 8: Seed default section schemas
-- ============================================

-- Hero section schemas
INSERT INTO public.page_section_schemas (section_type, schema, layout_variants)
VALUES (
  'hero',
  '{"fields": [{"name": "badge", "type": "text", "label": "Badge Text"}, {"name": "title_line_1", "type": "text", "label": "Title Line 1"}, {"name": "title_line_2", "type": "text", "label": "Title Line 2"}, {"name": "subtitle", "type": "textarea", "label": "Subtitle"}, {"name": "cta_primary", "type": "button", "label": "Primary CTA"}, {"name": "cta_secondary", "type": "button", "label": "Secondary CTA"}, {"name": "background_image", "type": "image", "label": "Background Image"}]}',
  '["hero-1", "hero-2", "hero-3"]'
) ON CONFLICT (section_type) DO UPDATE
SET schema = EXCLUDED.schema, layout_variants = EXCLUDED.layout_variants;

-- Features section schemas
INSERT INTO public.page_section_schemas (section_type, schema, layout_variants)
VALUES (
  'features',
  '{"fields": [{"name": "title", "type": "text", "label": "Section Title"}, {"name": "subtitle", "type": "textarea", "label": "Section Subtitle"}, {"name": "features", "type": "array", "label": "Features", "itemSchema": {"icon": "text", "title": "text", "description": "textarea"}}]}',
  '["features-grid", "features-list", "features-icons"]'
) ON CONFLICT (section_type) DO UPDATE
SET schema = EXCLUDED.schema, layout_variants = EXCLUDED.layout_variants;

-- Services section schemas
INSERT INTO public.page_section_schemas (section_type, schema, layout_variants)
VALUES (
  'services',
  '{"fields": [{"name": "title", "type": "text", "label": "Section Title"}, {"name": "subtitle", "type": "textarea", "label": "Section Subtitle"}, {"name": "services", "type": "array", "label": "Services", "itemSchema": {"icon": "text", "title": "text", "description": "textarea", "image": "image"}}]}',
  '["services-grid", "services-tabs", "services-accordion"]'
) ON CONFLICT (section_type) DO UPDATE
SET schema = EXCLUDED.schema, layout_variants = EXCLUDED.layout_variants;

-- Stats section schemas
INSERT INTO public.page_section_schemas (section_type, schema, layout_variants)
VALUES (
  'stats',
  '{"fields": [{"name": "title", "type": "text", "label": "Section Title"}, {"name": "subtitle", "type": "textarea", "label": "Section Subtitle"}, {"name": "stats", "type": "array", "label": "Statistics", "itemSchema": {"value": "text", "label": "text", "icon": "text"}}]}',
  '["stats-4col", "stats-3col", "stats-carousel"]'
) ON CONFLICT (section_type) DO UPDATE
SET schema = EXCLUDED.schema, layout_variants = EXCLUDED.layout_variants;

-- Testimonials section schemas
INSERT INTO public.page_section_schemas (section_type, schema, layout_variants)
VALUES (
  'testimonials',
  '{"fields": [{"name": "title", "type": "text", "label": "Section Title"}, {"name": "subtitle", "type": "textarea", "label": "Section Subtitle"}, {"name": "testimonials", "type": "array", "label": "Testimonials", "itemSchema": {"name": "text", "role": "text", "content": "textarea", "avatar": "image", "rating": "number"}}]}',
  '["testimonials-grid", "testimonials-carousel", "testimonials-single"]'
) ON CONFLICT (section_type) DO UPDATE
SET schema = EXCLUDED.schema, layout_variants = EXCLUDED.layout_variants;

-- CTA section schemas
INSERT INTO public.page_section_schemas (section_type, schema, layout_variants)
VALUES (
  'cta',
  '{"fields": [{"name": "title", "type": "text", "label": "Title"}, {"name": "subtitle", "type": "textarea", "label": "Subtitle"}, {"name": "cta_text", "type": "text", "label": "CTA Text"}, {"name": "cta_link", "type": "text", "label": "CTA Link"}, {"name": "show_when_logged_in", "type": "boolean", "label": "Show When Logged In"}]}',
  '["cta-centered", "cta-split", "cta-banner"]'
) ON CONFLICT (section_type) DO UPDATE
SET schema = EXCLUDED.schema, layout_variants = EXCLUDED.layout_variants;

-- Pricing section schemas
INSERT INTO public.page_section_schemas (section_type, schema, layout_variants)
VALUES (
  'pricing',
  '{"fields": [{"name": "title", "type": "text", "label": "Section Title"}, {"name": "subtitle", "type": "textarea", "label": "Section Subtitle"}, {"name": "plans", "type": "array", "label": "Pricing Plans", "itemSchema": {"name": "text", "price": "text", "period": "text", "features": "array", "cta_text": "text", "cta_link": "text"}}]}',
  '["pricing-3col", "pricing-4col", "pricing-table"]'
) ON CONFLICT (section_type) DO UPDATE
SET schema = EXCLUDED.schema, layout_variants = EXCLUDED.layout_variants;

-- FAQ section schemas
INSERT INTO public.page_section_schemas (section_type, schema, layout_variants)
VALUES (
  'faq',
  '{"fields": [{"name": "title", "type": "text", "label": "Section Title"}, {"name": "subtitle", "type": "textarea", "label": "Section Subtitle"}, {"name": "faqs", "type": "array", "label": "FAQs", "itemSchema": {"question": "text", "answer": "textarea"}}]}',
  '["faq-accordion", "faq-grid", "faq-tabs"]'
) ON CONFLICT (section_type) DO UPDATE
SET schema = EXCLUDED.schema, layout_variants = EXCLUDED.layout_variants;

-- Timeline section schemas
INSERT INTO public.page_section_schemas (section_type, schema, layout_variants)
VALUES (
  'timeline',
  '{"fields": [{"name": "title", "type": "text", "label": "Section Title"}, {"name": "subtitle", "type": "textarea", "label": "Section Subtitle"}, {"name": "events", "type": "array", "label": "Timeline Events", "itemSchema": {"date": "text", "title": "text", "description": "textarea", "icon": "text"}}]}',
  '["timeline-vertical", "timeline-horizontal", "timeline-alternating"]'
) ON CONFLICT (section_type) DO UPDATE
SET schema = EXCLUDED.schema, layout_variants = EXCLUDED.layout_variants;

-- Gallery section schemas
INSERT INTO public.page_section_schemas (section_type, schema, layout_variants)
VALUES (
  'gallery',
  '{"fields": [{"name": "title", "type": "text", "label": "Section Title"}, {"name": "subtitle", "type": "textarea", "label": "Section Subtitle"}, {"name": "images", "type": "array", "label": "Gallery Images", "itemSchema": {"url": "image", "caption": "text", "alt": "text"}}]}',
  '["gallery-grid", "gallery-masonry", "gallery-carousel"]'
) ON CONFLICT (section_type) DO UPDATE
SET schema = EXCLUDED.schema, layout_variants = EXCLUDED.layout_variants;

-- Blog Preview section schemas
INSERT INTO public.page_section_schemas (section_type, schema, layout_variants)
VALUES (
  'blog',
  '{"fields": [{"name": "title", "type": "text", "label": "Section Title"}, {"name": "subtitle", "type": "textarea", "label": "Section Subtitle"}, {"name": "posts", "type": "array", "label": "Blog Posts", "itemSchema": {"title": "text", "excerpt": "textarea", "image": "image", "link": "text", "date": "text"}}]}',
  '["blog-grid", "blog-list", "blog-featured"]'
) ON CONFLICT (section_type) DO UPDATE
SET schema = EXCLUDED.schema, layout_variants = EXCLUDED.layout_variants;

-- Custom section schemas
INSERT INTO public.page_section_schemas (section_type, schema, layout_variants)
VALUES (
  'custom',
  '{"fields": [{"name": "html", "type": "textarea", "label": "HTML Content"}, {"name": "css", "type": "textarea", "label": "Custom CSS"}]}',
  '["custom-html"]'
) ON CONFLICT (section_type) DO UPDATE
SET schema = EXCLUDED.schema, layout_variants = EXCLUDED.layout_variants;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  versions_count int;
  drafts_count int;
  schemas_count int;
BEGIN
  SELECT COUNT(*) INTO versions_count FROM public.page_section_versions;
  SELECT COUNT(*) INTO drafts_count FROM public.page_section_drafts;
  SELECT COUNT(*) INTO schemas_count FROM public.page_section_schemas;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'CMS Upgrade Migration Complete';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Version History Table: % rows', versions_count;
  RAISE NOTICE 'Drafts Table: % rows', drafts_count;
  RAISE NOTICE 'Schemas Table: % rows', schemas_count;
  RAISE NOTICE '✅ Database schema upgraded';
  RAISE NOTICE '✅ Section schemas seeded';
  RAISE NOTICE '✅ Versioning system ready';
  RAISE NOTICE '✅ Draft system ready';
  RAISE NOTICE '============================================';
END $$;

COMMIT;
