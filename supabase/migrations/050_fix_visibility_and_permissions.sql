-- ============================================
-- MIGRATION 050: Fix Visibility Isolation & Restore Hybrid Permission System
-- ============================================
-- Purpose: 
-- 1. Fix courses and library visibility to be strictly assignment-based (no global exposure)
-- 2. Restore hybrid role+user permission system with user overrides taking priority
--
-- Key Changes:
-- - Remove courses.read permission bypass that allows global course access
-- - Add teacher access to libraries linked to their assigned courses
-- - Add guardian access to courses via student_guardians relationship
-- - Restore user_module_permissions as override layer (higher priority than role permissions)
-- ============================================

BEGIN;

-- ============================================
-- PART 1: FIX VISIBILITY ISOLATION
-- ============================================

-- ============================================
-- STEP 1: Create helper function for guardian course access
-- ============================================
CREATE OR REPLACE FUNCTION public.is_guardian_has_child_in_course(_guardian_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.course_enrollments ce
    JOIN public.student_guardians sg ON sg.student_id = ce.user_id
    WHERE ce.course_id = _course_id 
      AND sg.guardian_id = _guardian_id
  );
$$;

COMMENT ON FUNCTION public.is_guardian_has_child_in_course IS 
'Check if a guardian has a child enrolled in a specific course. Used for RLS policies.';

-- ============================================
-- STEP 2: Fix Courses RLS SELECT Policy
-- ============================================
-- Remove the courses.read permission bypass that allows global access
-- Enforce strict assignment-based filtering

-- Drop ALL existing SELECT policies that might be permissive
DROP POLICY IF EXISTS "courses_select_authenticated" ON public.courses;
DROP POLICY IF EXISTS "users_with_courses_read_permission_can_view_courses" ON public.courses;
DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;
DROP POLICY IF EXISTS "Users can view courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can view their courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can view assigned courses" ON public.courses;

-- Create new strict SELECT policy
-- CRITICAL: Do NOT include has_module_permission('courses', 'read') as it allows global access
-- Only super_admin should see all courses. All others must be filtered by assignments/enrollments.
CREATE POLICY "courses_select_authenticated"
  ON public.courses
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins can view all (ONLY exception)
    public.has_role(auth.uid(), 'super_admin') OR
    -- Students can view courses they're enrolled in (strict enrollment check)
    (public.has_role(auth.uid(), 'student') AND public.is_user_enrolled_in_course(auth.uid(), courses.id)) OR
    -- Teachers can view courses they created OR are assigned to (strict assignment check)
    (public.has_role(auth.uid(), 'teacher') AND (
      created_by = auth.uid() OR
      public.is_teacher_assigned_to_course(auth.uid(), courses.id)
    )) OR
    -- Guardians can view courses where their children are enrolled (strict relationship check)
    (public.has_role(auth.uid(), 'guardian') AND public.is_guardian_has_child_in_course(auth.uid(), courses.id))
    -- NOTE: Removed admin with courses.read permission - admins should use super_admin role or be assigned to courses
  );

COMMENT ON POLICY "courses_select_authenticated" ON public.courses IS 
'Strict assignment-based course visibility. Users can only see courses they are assigned to, enrolled in, or (for guardians) their children are enrolled in.';

-- ============================================
-- STEP 3: Update has_book_access() to include teacher course-linked access
-- ============================================
CREATE OR REPLACE FUNCTION public.has_book_access(_user_id uuid, _book_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Only super admins have full access (no library.read bypass)
    is_super_admin(_user_id) OR
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
      JOIN user_roles ur ON ur.role = lrp.role::app_role AND ur.user_id = _user_id
      WHERE lrp.content_type = 'book' 
        AND lrp.content_id = _book_id
    ) OR
    -- Teacher: access to books linked to their assigned courses
    (has_role(_user_id, 'teacher') AND EXISTS (
      SELECT 1 FROM course_library_books clb
      JOIN teacher_course_assignments tca ON tca.course_id = clb.course_id
      WHERE clb.book_id = _book_id 
        AND tca.teacher_id = _user_id
    )) OR
    -- Student: access to books assigned directly OR linked to enrolled courses
    (has_role(_user_id, 'student') AND EXISTS (
      SELECT 1 FROM book_assignments
      WHERE book_id = _book_id AND user_id = _user_id
    )) OR
    (has_role(_user_id, 'student') AND EXISTS (
      SELECT 1 FROM course_library_books clb
      JOIN course_enrollments ce ON ce.course_id = clb.course_id
      WHERE clb.book_id = _book_id AND ce.user_id = _user_id
    )) OR
    -- Guardian: check if their children have access
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
        SELECT ur.user_id FROM user_roles ur WHERE ur.role = lrp.role::app_role
      )
      WHERE lrp.content_type = 'book' 
        AND lrp.content_id = _book_id
        AND sg.guardian_id = _user_id
    )) OR
    (has_role(_user_id, 'guardian') AND EXISTS (
      SELECT 1 FROM course_library_books clb
      JOIN course_enrollments ce ON ce.course_id = clb.course_id
      JOIN student_guardians sg ON sg.student_id = ce.user_id
      WHERE clb.book_id = _book_id 
        AND sg.guardian_id = _user_id
    ))
$$;

COMMENT ON FUNCTION public.has_book_access IS 
'Check if user has access to a book. Only super_admin has full access. Others must have explicit permissions, role permissions, teacher course-linked access, student enrollment access, or guardian child access.';

-- ============================================
-- STEP 4: Update has_video_access() to include teacher course-linked access
-- ============================================
CREATE OR REPLACE FUNCTION public.has_video_access(_user_id uuid, _video_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Only super admins have full access (no library.read bypass)
    is_super_admin(_user_id) OR
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
      JOIN user_roles ur ON ur.role = lrp.role::app_role AND ur.user_id = _user_id
      WHERE lrp.content_type = 'video' 
        AND lrp.content_id = _video_id
    ) OR
    -- Teacher: access to videos linked to their assigned courses
    (has_role(_user_id, 'teacher') AND EXISTS (
      SELECT 1 FROM course_library_videos clv
      JOIN teacher_course_assignments tca ON tca.course_id = clv.course_id
      WHERE clv.video_id = _video_id 
        AND tca.teacher_id = _user_id
    )) OR
    -- Student: access to videos assigned directly OR linked to enrolled courses
    (has_role(_user_id, 'student') AND EXISTS (
      SELECT 1 FROM video_assignments
      WHERE video_id = _video_id AND user_id = _user_id
    )) OR
    (has_role(_user_id, 'student') AND EXISTS (
      SELECT 1 FROM course_library_videos clv
      JOIN course_enrollments ce ON ce.course_id = clv.course_id
      WHERE clv.video_id = _video_id AND ce.user_id = _user_id
    )) OR
    -- Guardian: check if their children have access
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
        SELECT ur.user_id FROM user_roles ur WHERE ur.role = lrp.role::app_role
      )
      WHERE lrp.content_type = 'video' 
        AND lrp.content_id = _video_id
        AND sg.guardian_id = _user_id
    )) OR
    (has_role(_user_id, 'guardian') AND EXISTS (
      SELECT 1 FROM course_library_videos clv
      JOIN course_enrollments ce ON ce.course_id = clv.course_id
      JOIN student_guardians sg ON sg.student_id = ce.user_id
      WHERE clv.video_id = _video_id 
        AND sg.guardian_id = _user_id
    ))
$$;

COMMENT ON FUNCTION public.has_video_access IS 
'Check if user has access to a video. Only super_admin has full access. Others must have explicit permissions, role permissions, teacher course-linked access, student enrollment access, or guardian child access.';

-- ============================================
-- STEP 4.5: Ensure Books and Videos RLS Policies are Restrictive
-- ============================================
-- Drop any permissive policies that might still exist
DROP POLICY IF EXISTS "Everyone can view active books" ON public.books;
DROP POLICY IF EXISTS "Everyone can view active videos" ON public.videos;
DROP POLICY IF EXISTS "Users can view assigned books" ON public.books;
DROP POLICY IF EXISTS "Users can view assigned videos" ON public.videos;

-- Create/Replace restrictive SELECT policies for books
CREATE POLICY "Users can view assigned books"
  ON public.books FOR SELECT
  TO authenticated
  USING (public.has_book_access(auth.uid(), id));

COMMENT ON POLICY "Users can view assigned books" ON public.books IS 
'Restrictive book visibility. Users can only see books they have access to via has_book_access() function.';

-- Create/Replace restrictive SELECT policies for videos
CREATE POLICY "Users can view assigned videos"
  ON public.videos FOR SELECT
  TO authenticated
  USING (public.has_video_access(auth.uid(), id));

COMMENT ON POLICY "Users can view assigned videos" ON public.videos IS 
'Restrictive video visibility. Users can only see videos they have access to via has_video_access() function.';

-- ============================================
-- PART 2: RESTORE HYBRID PERMISSION SYSTEM
-- ============================================

-- ============================================
-- STEP 5: Fix has_module_permission() to restore user override priority
-- ============================================
-- Priority: Super Admin > User Override > Role Permission > Default (false)
-- Uses plpgsql for clearer logic flow

CREATE OR REPLACE FUNCTION public.has_module_permission(
  _user_id uuid,
  _module_name text,
  _permission text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_override boolean;
BEGIN
  -- 1. Super admins have all permissions (HIGHEST PRIORITY)
  IF public.is_super_admin(_user_id) THEN
    RETURN true;
  END IF;

  -- 2. Check user_module_permissions (USER OVERRIDES - HIGHER PRIORITY THAN ROLE)
  -- Check if user has an override for this module and permission
  SELECT 
    CASE _permission
      WHEN 'create' THEN ump.can_create
      WHEN 'read' THEN ump.can_read
      WHEN 'update' THEN ump.can_update
      WHEN 'delete' THEN ump.can_delete
      WHEN 'assign' THEN COALESCE(ump.can_assign, 
        CASE WHEN ump.can_update = true OR ump.can_create = true THEN true ELSE false END)
      WHEN 'approve' THEN COALESCE(ump.can_approve,
        CASE WHEN ump.can_update = true OR ump.can_delete = true THEN true ELSE false END)
      ELSE false
    END
  INTO _user_override
  FROM public.user_module_permissions ump
  JOIN public.modules m ON m.id = ump.module_id
  WHERE ump.user_id = _user_id
    AND m.name = _module_name
  LIMIT 1;

  -- If user override exists (not NULL), return it (true OR false)
  -- This allows user overrides to grant OR deny access independently of role
  -- If override is explicitly false, deny even if role allows
  -- If override is true, grant even if role denies
  IF _user_override IS NOT NULL THEN
    RETURN _user_override;
  END IF;

  -- 3. Check role-based permissions (ROLE INHERITANCE - FALLBACK IF NO USER OVERRIDE)
  -- Check standard roles
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_module_permissions rmp ON rmp.role = ur.role::text
    JOIN public.modules m ON m.id = rmp.module_id
    WHERE ur.user_id = _user_id
      AND m.name = _module_name
      AND (
        (_permission = 'create' AND rmp.can_create = true) OR
        (_permission = 'read' AND rmp.can_read = true) OR
        (_permission = 'update' AND rmp.can_update = true) OR
        (_permission = 'delete' AND rmp.can_delete = true) OR
        (_permission = 'assign' AND COALESCE(rmp.can_assign, false) = true) OR
        (_permission = 'approve' AND COALESCE(rmp.can_approve, false) = true) OR
        -- Fallback: assign can use update/create, approve can use update/delete
        (_permission = 'assign' AND (rmp.can_update = true OR rmp.can_create = true)) OR
        (_permission = 'approve' AND (rmp.can_update = true OR rmp.can_delete = true))
      )
  ) THEN
    RETURN true;
  END IF;

  -- Check custom role permissions
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.custom_roles cr ON cr.role_name = ur.role::text
    JOIN public.role_module_permissions rmp ON rmp.role = cr.role_name
    JOIN public.modules m ON m.id = rmp.module_id
    WHERE ur.user_id = _user_id
      AND m.name = _module_name
      AND (
        (_permission = 'create' AND rmp.can_create = true) OR
        (_permission = 'read' AND rmp.can_read = true) OR
        (_permission = 'update' AND rmp.can_update = true) OR
        (_permission = 'delete' AND rmp.can_delete = true) OR
        (_permission = 'assign' AND COALESCE(rmp.can_assign, false) = true) OR
        (_permission = 'approve' AND COALESCE(rmp.can_approve, false) = true) OR
        -- Fallback
        (_permission = 'assign' AND (rmp.can_update = true OR rmp.can_create = true)) OR
        (_permission = 'approve' AND (rmp.can_update = true OR rmp.can_delete = true))
      )
  ) THEN
    RETURN true;
  END IF;

  -- 4. Default: no permission found
  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.has_module_permission IS 
'Check if user has specific module permission. HYBRID SYSTEM: 
1. Super Admin always returns true
2. User overrides (user_module_permissions) take HIGHEST priority - can grant or deny
3. Role permissions (role_module_permissions) are fallback if no user override exists
4. If no permission found, returns false';

-- ============================================
-- STEP 6: Update get_user_effective_permissions() to show role + user sources
-- ============================================
-- Drop existing function first since we're changing the return type
DROP FUNCTION IF EXISTS public.get_user_effective_permissions(uuid);

CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(_user_id uuid)
RETURNS TABLE (
  module_name text,
  can_create boolean,
  can_read boolean,
  can_update boolean,
  can_delete boolean,
  can_assign boolean,
  can_approve boolean,
  source text -- 'role' or 'user_override'
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Get user overrides first (highest priority)
  SELECT 
    m.name as module_name,
    COALESCE(ump.can_create, false) as can_create,
    COALESCE(ump.can_read, false) as can_read,
    COALESCE(ump.can_update, false) as can_update,
    COALESCE(ump.can_delete, false) as can_delete,
    COALESCE(ump.can_assign, false) as can_assign,
    COALESCE(ump.can_approve, false) as can_approve,
    'user_override'::text as source
  FROM public.user_module_permissions ump
  JOIN public.modules m ON m.id = ump.module_id
  WHERE ump.user_id = _user_id
  
  UNION
  
  -- Get role permissions for modules without user overrides
  SELECT 
    m.name as module_name,
    BOOL_OR(COALESCE(rmp.can_create, false)) as can_create,
    BOOL_OR(COALESCE(rmp.can_read, false)) as can_read,
    BOOL_OR(COALESCE(rmp.can_update, false)) as can_update,
    BOOL_OR(COALESCE(rmp.can_delete, false)) as can_delete,
    BOOL_OR(COALESCE(rmp.can_assign, false)) as can_assign,
    BOOL_OR(COALESCE(rmp.can_approve, false)) as can_approve,
    'role'::text as source
  FROM public.user_roles ur
  JOIN public.role_module_permissions rmp ON rmp.role = ur.role::text
  JOIN public.modules m ON m.id = rmp.module_id
  WHERE ur.user_id = _user_id
    -- Only include modules that don't have user overrides
    AND NOT EXISTS (
      SELECT 1 FROM public.user_module_permissions ump2
      WHERE ump2.user_id = _user_id AND ump2.module_id = m.id
    )
  GROUP BY m.name
  
  ORDER BY module_name
$$;

COMMENT ON FUNCTION public.get_user_effective_permissions IS 
'Returns effective permissions for a user with source indicator.
Shows user overrides (source: user_override) and role permissions (source: role).
User overrides take priority and are shown separately from role permissions.';

-- ============================================
-- STEP 7: Re-enable user_module_permissions table
-- ============================================
-- Remove deprecation comment and ensure proper RLS policies

COMMENT ON TABLE public.user_module_permissions IS 
'User-specific module permissions that override role permissions.
These permissions take HIGHEST priority over role_module_permissions.
If a user has a permission override (true or false), it is used instead of role permissions.
Used for granular per-user permission control.';

-- Ensure RLS policies exist for user_module_permissions
-- Check if policies exist, create if not
DO $$
BEGIN
  -- Check if SELECT policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_module_permissions' 
    AND policyname = 'Users can view their own permissions'
  ) THEN
    CREATE POLICY "Users can view their own permissions"
    ON public.user_module_permissions FOR SELECT
    USING (auth.uid() = user_id OR is_admin_or_higher(auth.uid()));
  END IF;

  -- Check if INSERT/UPDATE/DELETE policy exists for admins
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_module_permissions' 
    AND policyname = 'Admins can manage user permissions'
  ) THEN
    CREATE POLICY "Admins can manage user permissions"
    ON public.user_module_permissions FOR ALL
    USING (is_admin_or_higher(auth.uid()))
    WITH CHECK (is_admin_or_higher(auth.uid()));
  END IF;
END $$;

-- ============================================
-- STEP 8: Add indexes for performance
-- ============================================

-- Indexes for user_module_permissions
CREATE INDEX IF NOT EXISTS idx_user_module_permissions_user_module 
  ON public.user_module_permissions(user_id, module_id);

CREATE INDEX IF NOT EXISTS idx_user_module_permissions_user 
  ON public.user_module_permissions(user_id);

-- Indexes for course-library relationships (for teacher access)
CREATE INDEX IF NOT EXISTS idx_course_library_books_course 
  ON public.course_library_books(course_id);

CREATE INDEX IF NOT EXISTS idx_course_library_books_book 
  ON public.course_library_books(book_id);

CREATE INDEX IF NOT EXISTS idx_course_library_videos_course 
  ON public.course_library_videos(course_id);

CREATE INDEX IF NOT EXISTS idx_course_library_videos_video 
  ON public.course_library_videos(video_id);

-- Index for guardian course access
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_course 
  ON public.course_enrollments(user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_student_guardians_guardian 
  ON public.student_guardians(guardian_id);

CREATE INDEX IF NOT EXISTS idx_student_guardians_student 
  ON public.student_guardians(student_id);

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Migration 050: Visibility & Permissions Fix';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Courses RLS policy updated - strict assignment-based filtering';
  RAISE NOTICE '✅ Guardian course access added via student_guardians';
  RAISE NOTICE '✅ has_book_access() updated - teacher course-linked access added';
  RAISE NOTICE '✅ has_video_access() updated - teacher course-linked access added';
  RAISE NOTICE '✅ has_module_permission() restored - user overrides take priority';
  RAISE NOTICE '✅ get_user_effective_permissions() updated - shows role + user sources';
  RAISE NOTICE '✅ user_module_permissions table re-enabled with proper RLS';
  RAISE NOTICE '✅ Performance indexes added';
  RAISE NOTICE '';
  RAISE NOTICE '📋 KEY CHANGES:';
  RAISE NOTICE '   1. Courses now filtered strictly by assignments (no global exposure)';
  RAISE NOTICE '   2. Libraries accessible via course relationships for teachers';
  RAISE NOTICE '   3. Hybrid permission system: User overrides > Role permissions';
  RAISE NOTICE '   4. User overrides can grant OR deny access independently';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Test visibility isolation for all user types';
  RAISE NOTICE '⚠️  IMPORTANT: Verify user permission overrides work correctly';
  RAISE NOTICE '============================================';
END $$;

