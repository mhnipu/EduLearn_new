-- ============================================
-- FIX STORAGE POLICY FOR ASSIGNMENT SUBMISSIONS
-- ============================================
-- This migration fixes the storage RLS policy for library-files bucket
-- to allow students to upload assignment submission files
-- Date: 2024-12-16
-- Issue: Students getting "new row violates row-level security policy" when uploading submission files

-- Drop existing INSERT policy if it exists (we'll recreate it with student support)
DROP POLICY IF EXISTS "Teachers can upload files" ON storage.objects;

-- Create a new INSERT policy that allows:
-- 1. Teachers and admins to upload anywhere in library-files
-- 2. Authenticated users to upload to submissions/ folder with their own user ID in path
--    (No role check needed - if path contains their user ID, it's secure)
CREATE POLICY "users_can_upload_files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'library-files' AND (
      -- Teachers and admins can upload anywhere
      (public.has_role(auth.uid(), 'teacher') OR public.is_admin_or_higher(auth.uid())) OR
      -- Any authenticated user can upload to submissions/ folder with their user ID in path
      -- Path format: submissions/{userId}/{assignmentId}/{filename}
      -- This is secure because the path must contain their own user ID
      name ~ ('^submissions/' || auth.uid()::text || '/')
    )
  );

-- Also update the UPDATE policy to allow students to update their own submission files
DROP POLICY IF EXISTS "Teachers can update own files" ON storage.objects;

CREATE POLICY "users_can_update_own_files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'library-files' AND (
      -- Admins can update any file
      public.is_admin_or_higher(auth.uid()) OR
      -- Teachers can update files in their own folder
      (public.has_role(auth.uid(), 'teacher') AND 
       (auth.uid()::text = (storage.foldername(name))[1] OR 
        auth.uid()::text = (storage.foldername(name))[2])) OR
      -- Users can update their own submission files
      -- Path format: submissions/{userId}/{assignmentId}/{filename}
      -- No role check needed - path contains their user ID
      name ~ ('^submissions/' || auth.uid()::text || '/')
    )
  )
  WITH CHECK (
    bucket_id = 'library-files' AND (
      -- Same conditions for WITH CHECK
      public.is_admin_or_higher(auth.uid()) OR
      (public.has_role(auth.uid(), 'teacher') AND 
       (auth.uid()::text = (storage.foldername(name))[1] OR 
        auth.uid()::text = (storage.foldername(name))[2])) OR
      name ~ ('^submissions/' || auth.uid()::text || '/')
    )
  );

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Storage submission policies fixed';
  RAISE NOTICE '📋 Students can now upload files to submissions/ folder';
  RAISE NOTICE '🔧 Path must contain student user ID for security';
END $$;
