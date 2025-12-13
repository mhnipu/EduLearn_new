-- Migration 025: Library Content Edit Enhancement
-- Purpose: Add audit trails, version control, and enhanced edit capabilities for books/videos

-- ============================================
-- PART 1: Create Audit Trail Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.library_edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('book', 'video')),
  content_id uuid NOT NULL,
  edited_by uuid NOT NULL REFERENCES auth.users(id),
  edited_at timestamptz NOT NULL DEFAULT now(),
  
  -- Store previous values as JSONB
  previous_values jsonb NOT NULL,
  new_values jsonb NOT NULL,
  
  -- What fields were changed
  changed_fields text[] NOT NULL,
  
  -- Optional edit reason/notes
  edit_reason text,
  
  -- Track edit session (for grouping related edits)
  edit_session_id uuid DEFAULT gen_random_uuid(),
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_library_edit_history_content ON public.library_edit_history(content_type, content_id);
CREATE INDEX idx_library_edit_history_edited_by ON public.library_edit_history(edited_by);
CREATE INDEX idx_library_edit_history_edited_at ON public.library_edit_history(edited_at DESC);

ALTER TABLE public.library_edit_history ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can view all edit history
CREATE POLICY "admins_view_edit_history"
  ON public.library_edit_history
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

-- RLS: System automatically inserts (via trigger)
CREATE POLICY "system_insert_edit_history"
  ON public.library_edit_history
  FOR INSERT
  TO authenticated
  WITH CHECK (edited_by = auth.uid());

-- ============================================
-- PART 2: Create Concurrent Edit Lock Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.library_edit_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('book', 'video')),
  content_id uuid NOT NULL,
  locked_by uuid NOT NULL REFERENCES auth.users(id),
  locked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  
  UNIQUE(content_type, content_id)
);

CREATE INDEX idx_library_edit_locks_expires ON public.library_edit_locks(expires_at);

ALTER TABLE public.library_edit_locks ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can view locks
CREATE POLICY "admins_view_locks"
  ON public.library_edit_locks
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

-- RLS: Admins can create locks
CREATE POLICY "admins_create_locks"
  ON public.library_edit_locks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
    AND locked_by = auth.uid()
  );

-- RLS: Own locks can be deleted
CREATE POLICY "admins_delete_own_locks"
  ON public.library_edit_locks
  FOR DELETE
  TO authenticated
  USING (locked_by = auth.uid());

-- ============================================
-- PART 3: Enhanced RLS Policies for Books/Videos
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Only admins can update books" ON public.books;
DROP POLICY IF EXISTS "Only admins can update videos" ON public.videos;

-- Enhanced book update policy with module permission check
CREATE POLICY "admins_with_library_permission_can_update_books"
  ON public.books
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    (public.has_role(auth.uid(), 'admin') AND public.check_module_permission(auth.uid(), 'library', 'update'))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    (public.has_role(auth.uid(), 'admin') AND public.check_module_permission(auth.uid(), 'library', 'update'))
  );

-- Enhanced video update policy with module permission check
CREATE POLICY "admins_with_library_permission_can_update_videos"
  ON public.videos
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    (public.has_role(auth.uid(), 'admin') AND public.check_module_permission(auth.uid(), 'library', 'update'))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    (public.has_role(auth.uid(), 'admin') AND public.check_module_permission(auth.uid(), 'library', 'update'))
  );

-- Admin delete policies (soft delete via is_active flag)
CREATE POLICY "admins_with_library_permission_can_delete_books"
  ON public.books
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    (public.has_role(auth.uid(), 'admin') AND public.check_module_permission(auth.uid(), 'library', 'delete'))
  );

CREATE POLICY "admins_with_library_permission_can_delete_videos"
  ON public.videos
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    (public.has_role(auth.uid(), 'admin') AND public.check_module_permission(auth.uid(), 'library', 'delete'))
  );

-- ============================================
-- PART 4: Audit Trail Triggers
-- ============================================

-- Function to log book edits
CREATE OR REPLACE FUNCTION public.log_book_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_fields text[] := ARRAY[]::text[];
  previous_vals jsonb;
  new_vals jsonb;
BEGIN
  -- Detect which fields changed
  IF OLD.title IS DISTINCT FROM NEW.title THEN changed_fields := array_append(changed_fields, 'title'); END IF;
  IF OLD.description IS DISTINCT FROM NEW.description THEN changed_fields := array_append(changed_fields, 'description'); END IF;
  IF OLD.author IS DISTINCT FROM NEW.author THEN changed_fields := array_append(changed_fields, 'author'); END IF;
  IF OLD.pdf_url IS DISTINCT FROM NEW.pdf_url THEN changed_fields := array_append(changed_fields, 'pdf_url'); END IF;
  IF OLD.thumbnail_url IS DISTINCT FROM NEW.thumbnail_url THEN changed_fields := array_append(changed_fields, 'thumbnail_url'); END IF;
  IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN changed_fields := array_append(changed_fields, 'category_id'); END IF;
  IF OLD.tags IS DISTINCT FROM NEW.tags THEN changed_fields := array_append(changed_fields, 'tags'); END IF;
  IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN changed_fields := array_append(changed_fields, 'is_active'); END IF;
  
  -- Only log if something changed
  IF array_length(changed_fields, 1) > 0 THEN
    previous_vals := to_jsonb(OLD);
    new_vals := to_jsonb(NEW);
    
    INSERT INTO public.library_edit_history (
      content_type,
      content_id,
      edited_by,
      previous_values,
      new_values,
      changed_fields
    ) VALUES (
      'book',
      NEW.id,
      auth.uid(),
      previous_vals,
      new_vals,
      changed_fields
    );
  END IF;
  
  -- Update updated_at timestamp
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$;

-- Function to log video edits
CREATE OR REPLACE FUNCTION public.log_video_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_fields text[] := ARRAY[]::text[];
  previous_vals jsonb;
  new_vals jsonb;
BEGIN
  -- Detect which fields changed
  IF OLD.title IS DISTINCT FROM NEW.title THEN changed_fields := array_append(changed_fields, 'title'); END IF;
  IF OLD.description IS DISTINCT FROM NEW.description THEN changed_fields := array_append(changed_fields, 'description'); END IF;
  IF OLD.youtube_url IS DISTINCT FROM NEW.youtube_url THEN changed_fields := array_append(changed_fields, 'youtube_url'); END IF;
  IF OLD.thumbnail_url IS DISTINCT FROM NEW.thumbnail_url THEN changed_fields := array_append(changed_fields, 'thumbnail_url'); END IF;
  IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN changed_fields := array_append(changed_fields, 'category_id'); END IF;
  IF OLD.tags IS DISTINCT FROM NEW.tags THEN changed_fields := array_append(changed_fields, 'tags'); END IF;
  IF OLD.duration_minutes IS DISTINCT FROM NEW.duration_minutes THEN changed_fields := array_append(changed_fields, 'duration_minutes'); END IF;
  IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN changed_fields := array_append(changed_fields, 'is_active'); END IF;
  
  -- Only log if something changed
  IF array_length(changed_fields, 1) > 0 THEN
    previous_vals := to_jsonb(OLD);
    new_vals := to_jsonb(NEW);
    
    INSERT INTO public.library_edit_history (
      content_type,
      content_id,
      edited_by,
      previous_values,
      new_values,
      changed_fields
    ) VALUES (
      'video',
      NEW.id,
      auth.uid(),
      previous_vals,
      new_vals,
      changed_fields
    );
  END IF;
  
  -- Update updated_at timestamp
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_log_book_edit ON public.books;
CREATE TRIGGER trigger_log_book_edit
  BEFORE UPDATE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.log_book_edit();

DROP TRIGGER IF EXISTS trigger_log_video_edit ON public.videos;
CREATE TRIGGER trigger_log_video_edit
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.log_video_edit();

-- ============================================
-- PART 5: Helper Functions for Frontend
-- ============================================

-- Function to acquire edit lock
CREATE OR REPLACE FUNCTION public.acquire_edit_lock(
  _content_type text,
  _content_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing_lock record;
  _lock_id uuid;
BEGIN
  -- Check for existing lock
  SELECT * INTO _existing_lock
  FROM public.library_edit_locks
  WHERE content_type = _content_type
    AND content_id = _content_id
    AND expires_at > now();
  
  -- If locked by someone else
  IF _existing_lock IS NOT NULL AND _existing_lock.locked_by != auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Content is currently being edited by another user',
      'locked_by', _existing_lock.locked_by,
      'locked_at', _existing_lock.locked_at,
      'expires_at', _existing_lock.expires_at
    );
  END IF;
  
  -- If already locked by current user, extend lock
  IF _existing_lock IS NOT NULL AND _existing_lock.locked_by = auth.uid() THEN
    UPDATE public.library_edit_locks
    SET expires_at = now() + interval '15 minutes'
    WHERE id = _existing_lock.id
    RETURNING id INTO _lock_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'lock_id', _lock_id,
      'message', 'Lock extended'
    );
  END IF;
  
  -- Clean up expired locks
  DELETE FROM public.library_edit_locks
  WHERE expires_at < now();
  
  -- Create new lock
  INSERT INTO public.library_edit_locks (content_type, content_id, locked_by)
  VALUES (_content_type, _content_id, auth.uid())
  RETURNING id INTO _lock_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'lock_id', _lock_id,
    'message', 'Lock acquired'
  );
END;
$$;

-- Function to release edit lock
CREATE OR REPLACE FUNCTION public.release_edit_lock(
  _content_type text,
  _content_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.library_edit_locks
  WHERE content_type = _content_type
    AND content_id = _content_id
    AND locked_by = auth.uid();
  
  RETURN jsonb_build_object('success', true, 'message', 'Lock released');
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.acquire_edit_lock TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_edit_lock TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Library Edit Enhancement Applied';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Audit trail table created';
  RAISE NOTICE '✅ Edit lock system created';
  RAISE NOTICE '✅ Enhanced RLS policies with module permissions';
  RAISE NOTICE '✅ Auto-logging triggers created';
  RAISE NOTICE '✅ Helper functions for concurrent edit prevention';
  RAISE NOTICE '============================================';
END $$;
