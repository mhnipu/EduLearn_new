-- ============================================
-- FIX LIBRARY ADMIN ACCESS
-- ============================================
-- This migration ensures that admins can only access/modify library content
-- if they have explicit module permissions, not just because they are admins.

-- ============================================
-- STEP 1: Drop old policies that allow all admins
-- ============================================

DROP POLICY IF EXISTS "Teachers can update own books" ON public.books;
DROP POLICY IF EXISTS "Admins can delete books" ON public.books;
DROP POLICY IF EXISTS "Teachers can update own videos" ON public.videos;
DROP POLICY IF EXISTS "Admins can delete videos" ON public.videos;

-- ============================================
-- STEP 2: Ensure INSERT policy checks permissions
-- ============================================

-- Drop old insert policies if they exist
DROP POLICY IF EXISTS "Only admins can upload books" ON public.books;
DROP POLICY IF EXISTS "Only admins can upload videos" ON public.videos;
DROP POLICY IF EXISTS "Teachers and admins can upload books" ON public.books;
DROP POLICY IF EXISTS "Teachers and admins can upload videos" ON public.videos;

-- Create new insert policies that check module permissions
-- Note: has_module_permission() checks both user-specific and role-based permissions
CREATE POLICY "users_with_library_create_permission_can_insert_books"
  ON public.books
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'library', 'create')
  );

CREATE POLICY "users_with_library_create_permission_can_insert_videos"
  ON public.videos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'library', 'create')
  );

-- ============================================
-- STEP 3: Verify UPDATE policies are correct
-- ============================================
-- Migration 025 already has correct UPDATE policies, but let's ensure they use has_module_permission

-- Drop and recreate to ensure consistency
DROP POLICY IF EXISTS "admins_with_library_permission_can_update_books" ON public.books;
DROP POLICY IF EXISTS "admins_with_library_permission_can_update_videos" ON public.videos;

CREATE POLICY "users_with_library_update_permission_can_update_books"
  ON public.books
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    (public.has_module_permission(auth.uid(), 'library', 'update') AND (
      public.has_role(auth.uid(), 'admin') OR
      (public.has_role(auth.uid(), 'teacher') AND uploaded_by = auth.uid())
    ))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    (public.has_module_permission(auth.uid(), 'library', 'update') AND (
      public.has_role(auth.uid(), 'admin') OR
      (public.has_role(auth.uid(), 'teacher') AND uploaded_by = auth.uid())
    ))
  );

CREATE POLICY "users_with_library_update_permission_can_update_videos"
  ON public.videos
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    (public.has_module_permission(auth.uid(), 'library', 'update') AND (
      public.has_role(auth.uid(), 'admin') OR
      (public.has_role(auth.uid(), 'teacher') AND uploaded_by = auth.uid())
    ))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    (public.has_module_permission(auth.uid(), 'library', 'update') AND (
      public.has_role(auth.uid(), 'admin') OR
      (public.has_role(auth.uid(), 'teacher') AND uploaded_by = auth.uid())
    ))
  );

-- ============================================
-- STEP 4: Verify DELETE policies are correct
-- ============================================

-- Drop and recreate to ensure consistency
DROP POLICY IF EXISTS "admins_with_library_permission_can_delete_books" ON public.books;
DROP POLICY IF EXISTS "admins_with_library_permission_can_delete_videos" ON public.videos;

CREATE POLICY "users_with_library_delete_permission_can_delete_books"
  ON public.books
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    (public.has_role(auth.uid(), 'admin') AND public.has_module_permission(auth.uid(), 'library', 'delete'))
  );

CREATE POLICY "users_with_library_delete_permission_can_delete_videos"
  ON public.videos
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    (public.has_role(auth.uid(), 'admin') AND public.has_module_permission(auth.uid(), 'library', 'delete'))
  );

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Old library policies dropped';
  RAISE NOTICE '✅ New permission-based policies created';
  RAISE NOTICE '✅ INSERT policies now check library.create permission';
  RAISE NOTICE '✅ UPDATE policies now check library.update permission';
  RAISE NOTICE '✅ DELETE policies now check library.delete permission';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Admins can only access/modify library content if they have explicit module permissions.';
  RAISE NOTICE '⚠️  Super Admin has full access. Regular admins need permissions granted by Super Admin.';
END $$;
