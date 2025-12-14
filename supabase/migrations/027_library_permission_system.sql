-- ============================================
-- LIBRARY PERMISSION-BASED ACCESS CONTROL
-- ============================================
-- This migration implements strict permission-based access control
-- where students and teachers have NO automatic access to library content.
-- Access must be explicitly granted by administrators.

-- ============================================
-- STEP 1: Create library permission tables
-- ============================================

-- User-level library permissions (specific users)
CREATE TABLE IF NOT EXISTS public.library_user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('book', 'video')),
  content_id UUID NOT NULL,
  granted_by UUID NOT NULL REFERENCES public.profiles(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, content_type, content_id)
);

-- Role-level library permissions (all users with a specific role)
CREATE TABLE IF NOT EXISTS public.library_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'guardian')),
  content_type TEXT NOT NULL CHECK (content_type IN ('book', 'video')),
  content_id UUID NOT NULL,
  granted_by UUID NOT NULL REFERENCES public.profiles(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role, content_type, content_id)
);

-- Enable RLS on permission tables
ALTER TABLE public.library_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_role_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Create RLS policies for permission tables
-- ============================================

-- Admins can manage all permissions
CREATE POLICY "Admins can manage user library permissions"
ON public.library_user_permissions FOR ALL
USING (is_admin_or_higher(auth.uid()))
WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can manage role library permissions"
ON public.library_role_permissions FOR ALL
USING (is_admin_or_higher(auth.uid()))
WITH CHECK (is_admin_or_higher(auth.uid()));

-- Users can view their own permissions
CREATE POLICY "Users can view their own library permissions"
ON public.library_user_permissions FOR SELECT
USING (user_id = auth.uid() OR is_admin_or_higher(auth.uid()));

-- Users can view role permissions for their role
CREATE POLICY "Users can view role library permissions"
ON public.library_role_permissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = library_role_permissions.role
  ) OR is_admin_or_higher(auth.uid())
);

-- ============================================
-- STEP 3: Update access functions to use permissions ONLY
-- ============================================

-- Update has_book_access to check permissions only (remove course-based access)
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
    -- User has explicit permission (user-level)
    EXISTS (
      SELECT 1 FROM library_user_permissions
      WHERE user_id = _user_id 
        AND content_type = 'book' 
        AND content_id = _book_id
    ) OR
    -- User has permission through their role (role-level)
    EXISTS (
      SELECT 1 FROM library_role_permissions lrp
      JOIN user_roles ur ON ur.role = lrp.role AND ur.user_id = _user_id
      WHERE lrp.content_type = 'book' 
        AND lrp.content_id = _book_id
    ) OR
    -- Guardian: check if their children have permission
    (has_role(_user_id, 'guardian') AND EXISTS (
      SELECT 1 FROM library_user_permissions lup
      JOIN student_guardians sg ON sg.student_id = lup.user_id
      WHERE lup.content_type = 'book' 
        AND lup.content_id = _book_id
        AND sg.guardian_id = _user_id
    )) OR
    (has_role(_user_id, 'guardian') AND EXISTS (
      SELECT 1 FROM library_role_permissions lrp
      JOIN student_guardians sg ON sg.student_id IN (
        SELECT ur.user_id FROM user_roles ur WHERE ur.role = lrp.role
      )
      WHERE lrp.content_type = 'book' 
        AND lrp.content_id = _book_id
        AND sg.guardian_id = _user_id
    ))
$$;

-- Update has_video_access to check permissions only (remove course-based access)
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
    -- User has explicit permission (user-level)
    EXISTS (
      SELECT 1 FROM library_user_permissions
      WHERE user_id = _user_id 
        AND content_type = 'video' 
        AND content_id = _video_id
    ) OR
    -- User has permission through their role (role-level)
    EXISTS (
      SELECT 1 FROM library_role_permissions lrp
      JOIN user_roles ur ON ur.role = lrp.role AND ur.user_id = _user_id
      WHERE lrp.content_type = 'video' 
        AND lrp.content_id = _video_id
    ) OR
    -- Guardian: check if their children have permission
    (has_role(_user_id, 'guardian') AND EXISTS (
      SELECT 1 FROM library_user_permissions lup
      JOIN student_guardians sg ON sg.student_id = lup.user_id
      WHERE lup.content_type = 'video' 
        AND lup.content_id = _video_id
        AND sg.guardian_id = _user_id
    )) OR
    (has_role(_user_id, 'guardian') AND EXISTS (
      SELECT 1 FROM library_role_permissions lrp
      JOIN student_guardians sg ON sg.student_id IN (
        SELECT ur.user_id FROM user_roles ur WHERE ur.role = lrp.role
      )
      WHERE lrp.content_type = 'video' 
        AND lrp.content_id = _video_id
        AND sg.guardian_id = _user_id
    ))
$$;

-- ============================================
-- STEP 4: Create helper functions for admin operations
-- ============================================

-- Function to grant library access to a user
CREATE OR REPLACE FUNCTION public.grant_library_access(
  _user_id uuid,
  _content_type text,
  _content_id uuid,
  _admin_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _permission_id uuid;
BEGIN
  -- Verify caller is admin
  IF NOT is_admin_or_higher(_admin_id) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Only admins can grant library access');
  END IF;

  -- Validate content type
  IF _content_type NOT IN ('book', 'video') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid content type. Must be "book" or "video"');
  END IF;

  -- Check if content exists
  IF _content_type = 'book' AND NOT EXISTS (SELECT 1 FROM books WHERE id = _content_id) THEN
    RETURN json_build_object('success', false, 'error', 'Book not found');
  END IF;

  IF _content_type = 'video' AND NOT EXISTS (SELECT 1 FROM videos WHERE id = _content_id) THEN
    RETURN json_build_object('success', false, 'error', 'Video not found');
  END IF;

  -- Insert or update permission
  INSERT INTO library_user_permissions (user_id, content_type, content_id, granted_by)
  VALUES (_user_id, _content_type, _content_id, _admin_id)
  ON CONFLICT (user_id, content_type, content_id) DO NOTHING
  RETURNING id INTO _permission_id;

  IF _permission_id IS NULL THEN
    RETURN json_build_object('success', true, 'message', 'Permission already exists');
  END IF;

  RETURN json_build_object('success', true, 'permission_id', _permission_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to grant library access to a role
CREATE OR REPLACE FUNCTION public.grant_library_access_to_role(
  _role text,
  _content_type text,
  _content_id uuid,
  _admin_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _permission_id uuid;
BEGIN
  -- Verify caller is admin
  IF NOT is_admin_or_higher(_admin_id) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Only admins can grant library access');
  END IF;

  -- Validate role
  IF _role NOT IN ('student', 'teacher', 'guardian') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid role. Must be "student", "teacher", or "guardian"');
  END IF;

  -- Validate content type
  IF _content_type NOT IN ('book', 'video') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid content type. Must be "book" or "video"');
  END IF;

  -- Check if content exists
  IF _content_type = 'book' AND NOT EXISTS (SELECT 1 FROM books WHERE id = _content_id) THEN
    RETURN json_build_object('success', false, 'error', 'Book not found');
  END IF;

  IF _content_type = 'video' AND NOT EXISTS (SELECT 1 FROM videos WHERE id = _content_id) THEN
    RETURN json_build_object('success', false, 'error', 'Video not found');
  END IF;

  -- Insert or update permission
  INSERT INTO library_role_permissions (role, content_type, content_id, granted_by)
  VALUES (_role, _content_type, _content_id, _admin_id)
  ON CONFLICT (role, content_type, content_id) DO NOTHING
  RETURNING id INTO _permission_id;

  IF _permission_id IS NULL THEN
    RETURN json_build_object('success', true, 'message', 'Permission already exists');
  END IF;

  RETURN json_build_object('success', true, 'permission_id', _permission_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to revoke library access from a user
CREATE OR REPLACE FUNCTION public.revoke_library_access(
  _user_id uuid,
  _content_type text,
  _content_id uuid,
  _admin_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT is_admin_or_higher(_admin_id) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Only admins can revoke library access');
  END IF;

  -- Delete permission
  DELETE FROM library_user_permissions
  WHERE user_id = _user_id 
    AND content_type = _content_type 
    AND content_id = _content_id;

  RETURN json_build_object('success', true, 'message', 'Permission revoked');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to revoke library access from a role
CREATE OR REPLACE FUNCTION public.revoke_library_access_from_role(
  _role text,
  _content_type text,
  _content_id uuid,
  _admin_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT is_admin_or_higher(_admin_id) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Only admins can revoke library access');
  END IF;

  -- Delete permission
  DELETE FROM library_role_permissions
  WHERE role = _role 
    AND content_type = _content_type 
    AND content_id = _content_id;

  RETURN json_build_object('success', true, 'message', 'Permission revoked');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- STEP 5: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_library_user_permissions_user ON library_user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_library_user_permissions_content ON library_user_permissions(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_library_role_permissions_role ON library_role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_library_role_permissions_content ON library_role_permissions(content_type, content_id);

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Library permission tables created';
  RAISE NOTICE '✅ RLS policies created for permission tables';
  RAISE NOTICE '✅ has_book_access() updated to use permissions only';
  RAISE NOTICE '✅ has_video_access() updated to use permissions only';
  RAISE NOTICE '✅ Admin helper functions created';
  RAISE NOTICE '✅ Indexes created for performance';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: All students and teachers now have NO automatic access to library content.';
  RAISE NOTICE '⚠️  Administrators must explicitly grant access using the admin interface.';
  RAISE NOTICE '⚠️  Course-based access has been removed for students and teachers.';
END $$;

-- LIBRARY PERMISSION-BASED ACCESS CONTROL
-- ============================================
-- This migration implements strict permission-based access control
-- where students and teachers have NO automatic access to library content.
-- Access must be explicitly granted by administrators.

-- ============================================
-- STEP 1: Create library permission tables
-- ============================================

-- User-level library permissions (specific users)
CREATE TABLE IF NOT EXISTS public.library_user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('book', 'video')),
  content_id UUID NOT NULL,
  granted_by UUID NOT NULL REFERENCES public.profiles(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, content_type, content_id)
);

-- Role-level library permissions (all users with a specific role)
CREATE TABLE IF NOT EXISTS public.library_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'guardian')),
  content_type TEXT NOT NULL CHECK (content_type IN ('book', 'video')),
  content_id UUID NOT NULL,
  granted_by UUID NOT NULL REFERENCES public.profiles(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role, content_type, content_id)
);

-- Enable RLS on permission tables
ALTER TABLE public.library_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_role_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Create RLS policies for permission tables
-- ============================================

-- Admins can manage all permissions
CREATE POLICY "Admins can manage user library permissions"
ON public.library_user_permissions FOR ALL
USING (is_admin_or_higher(auth.uid()))
WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can manage role library permissions"
ON public.library_role_permissions FOR ALL
USING (is_admin_or_higher(auth.uid()))
WITH CHECK (is_admin_or_higher(auth.uid()));

-- Users can view their own permissions
CREATE POLICY "Users can view their own library permissions"
ON public.library_user_permissions FOR SELECT
USING (user_id = auth.uid() OR is_admin_or_higher(auth.uid()));

-- Users can view role permissions for their role
CREATE POLICY "Users can view role library permissions"
ON public.library_role_permissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = library_role_permissions.role
  ) OR is_admin_or_higher(auth.uid())
);

-- ============================================
-- STEP 3: Update access functions to use permissions ONLY
-- ============================================

-- Update has_book_access to check permissions only (remove course-based access)
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
    -- User has explicit permission (user-level)
    EXISTS (
      SELECT 1 FROM library_user_permissions
      WHERE user_id = _user_id 
        AND content_type = 'book' 
        AND content_id = _book_id
    ) OR
    -- User has permission through their role (role-level)
    EXISTS (
      SELECT 1 FROM library_role_permissions lrp
      JOIN user_roles ur ON ur.role = lrp.role AND ur.user_id = _user_id
      WHERE lrp.content_type = 'book' 
        AND lrp.content_id = _book_id
    ) OR
    -- Guardian: check if their children have permission
    (has_role(_user_id, 'guardian') AND EXISTS (
      SELECT 1 FROM library_user_permissions lup
      JOIN student_guardians sg ON sg.student_id = lup.user_id
      WHERE lup.content_type = 'book' 
        AND lup.content_id = _book_id
        AND sg.guardian_id = _user_id
    )) OR
    (has_role(_user_id, 'guardian') AND EXISTS (
      SELECT 1 FROM library_role_permissions lrp
      JOIN student_guardians sg ON sg.student_id IN (
        SELECT ur.user_id FROM user_roles ur WHERE ur.role = lrp.role
      )
      WHERE lrp.content_type = 'book' 
        AND lrp.content_id = _book_id
        AND sg.guardian_id = _user_id
    ))
$$;

-- Update has_video_access to check permissions only (remove course-based access)
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
    -- User has explicit permission (user-level)
    EXISTS (
      SELECT 1 FROM library_user_permissions
      WHERE user_id = _user_id 
        AND content_type = 'video' 
        AND content_id = _video_id
    ) OR
    -- User has permission through their role (role-level)
    EXISTS (
      SELECT 1 FROM library_role_permissions lrp
      JOIN user_roles ur ON ur.role = lrp.role AND ur.user_id = _user_id
      WHERE lrp.content_type = 'video' 
        AND lrp.content_id = _video_id
    ) OR
    -- Guardian: check if their children have permission
    (has_role(_user_id, 'guardian') AND EXISTS (
      SELECT 1 FROM library_user_permissions lup
      JOIN student_guardians sg ON sg.student_id = lup.user_id
      WHERE lup.content_type = 'video' 
        AND lup.content_id = _video_id
        AND sg.guardian_id = _user_id
    )) OR
    (has_role(_user_id, 'guardian') AND EXISTS (
      SELECT 1 FROM library_role_permissions lrp
      JOIN student_guardians sg ON sg.student_id IN (
        SELECT ur.user_id FROM user_roles ur WHERE ur.role = lrp.role
      )
      WHERE lrp.content_type = 'video' 
        AND lrp.content_id = _video_id
        AND sg.guardian_id = _user_id
    ))
$$;

-- ============================================
-- STEP 4: Create helper functions for admin operations
-- ============================================

-- Function to grant library access to a user
CREATE OR REPLACE FUNCTION public.grant_library_access(
  _user_id uuid,
  _content_type text,
  _content_id uuid,
  _admin_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _permission_id uuid;
BEGIN
  -- Verify caller is admin
  IF NOT is_admin_or_higher(_admin_id) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Only admins can grant library access');
  END IF;

  -- Validate content type
  IF _content_type NOT IN ('book', 'video') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid content type. Must be "book" or "video"');
  END IF;

  -- Check if content exists
  IF _content_type = 'book' AND NOT EXISTS (SELECT 1 FROM books WHERE id = _content_id) THEN
    RETURN json_build_object('success', false, 'error', 'Book not found');
  END IF;

  IF _content_type = 'video' AND NOT EXISTS (SELECT 1 FROM videos WHERE id = _content_id) THEN
    RETURN json_build_object('success', false, 'error', 'Video not found');
  END IF;

  -- Insert or update permission
  INSERT INTO library_user_permissions (user_id, content_type, content_id, granted_by)
  VALUES (_user_id, _content_type, _content_id, _admin_id)
  ON CONFLICT (user_id, content_type, content_id) DO NOTHING
  RETURNING id INTO _permission_id;

  IF _permission_id IS NULL THEN
    RETURN json_build_object('success', true, 'message', 'Permission already exists');
  END IF;

  RETURN json_build_object('success', true, 'permission_id', _permission_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to grant library access to a role
CREATE OR REPLACE FUNCTION public.grant_library_access_to_role(
  _role text,
  _content_type text,
  _content_id uuid,
  _admin_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _permission_id uuid;
BEGIN
  -- Verify caller is admin
  IF NOT is_admin_or_higher(_admin_id) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Only admins can grant library access');
  END IF;

  -- Validate role
  IF _role NOT IN ('student', 'teacher', 'guardian') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid role. Must be "student", "teacher", or "guardian"');
  END IF;

  -- Validate content type
  IF _content_type NOT IN ('book', 'video') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid content type. Must be "book" or "video"');
  END IF;

  -- Check if content exists
  IF _content_type = 'book' AND NOT EXISTS (SELECT 1 FROM books WHERE id = _content_id) THEN
    RETURN json_build_object('success', false, 'error', 'Book not found');
  END IF;

  IF _content_type = 'video' AND NOT EXISTS (SELECT 1 FROM videos WHERE id = _content_id) THEN
    RETURN json_build_object('success', false, 'error', 'Video not found');
  END IF;

  -- Insert or update permission
  INSERT INTO library_role_permissions (role, content_type, content_id, granted_by)
  VALUES (_role, _content_type, _content_id, _admin_id)
  ON CONFLICT (role, content_type, content_id) DO NOTHING
  RETURNING id INTO _permission_id;

  IF _permission_id IS NULL THEN
    RETURN json_build_object('success', true, 'message', 'Permission already exists');
  END IF;

  RETURN json_build_object('success', true, 'permission_id', _permission_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to revoke library access from a user
CREATE OR REPLACE FUNCTION public.revoke_library_access(
  _user_id uuid,
  _content_type text,
  _content_id uuid,
  _admin_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT is_admin_or_higher(_admin_id) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Only admins can revoke library access');
  END IF;

  -- Delete permission
  DELETE FROM library_user_permissions
  WHERE user_id = _user_id 
    AND content_type = _content_type 
    AND content_id = _content_id;

  RETURN json_build_object('success', true, 'message', 'Permission revoked');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to revoke library access from a role
CREATE OR REPLACE FUNCTION public.revoke_library_access_from_role(
  _role text,
  _content_type text,
  _content_id uuid,
  _admin_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT is_admin_or_higher(_admin_id) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Only admins can revoke library access');
  END IF;

  -- Delete permission
  DELETE FROM library_role_permissions
  WHERE role = _role 
    AND content_type = _content_type 
    AND content_id = _content_id;

  RETURN json_build_object('success', true, 'message', 'Permission revoked');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- STEP 5: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_library_user_permissions_user ON library_user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_library_user_permissions_content ON library_user_permissions(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_library_role_permissions_role ON library_role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_library_role_permissions_content ON library_role_permissions(content_type, content_id);

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Library permission tables created';
  RAISE NOTICE '✅ RLS policies created for permission tables';
  RAISE NOTICE '✅ has_book_access() updated to use permissions only';
  RAISE NOTICE '✅ has_video_access() updated to use permissions only';
  RAISE NOTICE '✅ Admin helper functions created';
  RAISE NOTICE '✅ Indexes created for performance';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: All students and teachers now have NO automatic access to library content.';
  RAISE NOTICE '⚠️  Administrators must explicitly grant access using the admin interface.';
  RAISE NOTICE '⚠️  Course-based access has been removed for students and teachers.';
END $$;

