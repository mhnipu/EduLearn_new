-- ============================================
-- FIX LIBRARY PERMISSIONS MANAGEMENT ACCESS
-- ============================================
-- This migration ensures that only admins with library permissions
-- can manage library permissions for other users.

-- ============================================
-- STEP 1: Update RLS policies to check library permissions
-- ============================================

-- Drop old policies that allow all admins
DROP POLICY IF EXISTS "Admins can manage user library permissions" ON public.library_user_permissions;
DROP POLICY IF EXISTS "Admins can manage role library permissions" ON public.library_role_permissions;

-- Create new policies that check library permissions
-- Only super admins or admins with library.update permission can manage library permissions
CREATE POLICY "Admins with library permission can manage user library permissions"
ON public.library_user_permissions FOR ALL
USING (
  public.has_role(auth.uid(), 'super_admin') OR
  (public.has_role(auth.uid(), 'admin') AND public.has_module_permission(auth.uid(), 'library', 'update'))
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR
  (public.has_role(auth.uid(), 'admin') AND public.has_module_permission(auth.uid(), 'library', 'update'))
);

CREATE POLICY "Admins with library permission can manage role library permissions"
ON public.library_role_permissions FOR ALL
USING (
  public.has_role(auth.uid(), 'super_admin') OR
  (public.has_role(auth.uid(), 'admin') AND public.has_module_permission(auth.uid(), 'library', 'update'))
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR
  (public.has_role(auth.uid(), 'admin') AND public.has_module_permission(auth.uid(), 'library', 'update'))
);

-- ============================================
-- STEP 2: Update grant/revoke functions to check library permissions
-- ============================================

-- Update grant_library_access function
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
  -- Verify caller is super admin or has library.update permission
  IF NOT (
    public.has_role(_admin_id, 'super_admin') OR
    (public.has_role(_admin_id, 'admin') AND public.has_module_permission(_admin_id, 'library', 'update'))
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: You need library.update permission to grant library access');
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

-- Update grant_library_access_to_role function
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
  -- Verify caller is super admin or has library.update permission
  IF NOT (
    public.has_role(_admin_id, 'super_admin') OR
    (public.has_role(_admin_id, 'admin') AND public.has_module_permission(_admin_id, 'library', 'update'))
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: You need library.update permission to grant library access');
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

-- Update revoke_library_access function
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
  -- Verify caller is super admin or has library.update permission
  IF NOT (
    public.has_role(_admin_id, 'super_admin') OR
    (public.has_role(_admin_id, 'admin') AND public.has_module_permission(_admin_id, 'library', 'update'))
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: You need library.update permission to revoke library access');
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

-- Update revoke_library_access_from_role function
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
  -- Verify caller is super admin or has library.update permission
  IF NOT (
    public.has_role(_admin_id, 'super_admin') OR
    (public.has_role(_admin_id, 'admin') AND public.has_module_permission(_admin_id, 'library', 'update'))
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: You need library.update permission to revoke library access');
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
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Library permissions management policies updated';
  RAISE NOTICE '✅ Only admins with library.update permission can manage library permissions';
  RAISE NOTICE '✅ Grant/revoke functions updated to check permissions';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Admins need library.update permission to grant/revoke library access to users.';
  RAISE NOTICE '⚠️  Admins also need users module permission to view/manage other users.';
END $$;
