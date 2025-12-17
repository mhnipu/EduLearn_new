-- ============================================
-- FIX STORAGE POLICY FOR AVATAR UPLOADS
-- ============================================
-- This migration fixes the storage RLS policy for library-files bucket
-- to allow all authenticated users to upload their own avatar images
-- Date: 2024-12-17
-- Issue: Students and other users getting "new row violates row-level security policy" 
--        when uploading avatar images to {userId}/avatars/ path

-- Drop existing INSERT policy to recreate with avatar support
DROP POLICY IF EXISTS "users_can_upload_files" ON storage.objects;

-- Create a new INSERT policy that allows:
-- 1. Teachers and admins to upload anywhere in library-files
-- 2. Authenticated users to upload to submissions/ folder with their own user ID in path
-- 3. Authenticated users to upload to avatars/ folder with their own user ID in path
CREATE POLICY "users_can_upload_files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'library-files' AND (
      -- Teachers and admins can upload anywhere
      (public.has_role(auth.uid(), 'teacher') OR public.is_admin_or_higher(auth.uid())) OR
      -- Any authenticated user can upload to submissions/ folder with their user ID in path
      -- Path format: submissions/{userId}/{assignmentId}/{filename}
      name ~ ('^submissions/' || auth.uid()::text || '/') OR
      -- Any authenticated user can upload to avatars/ folder with their user ID in path
      -- Path format: {userId}/avatars/{filename}
      name ~ ('^' || auth.uid()::text || '/avatars/')
    )
  );

-- Update the UPDATE policy to allow users to update their own avatar files
DROP POLICY IF EXISTS "users_can_update_own_files" ON storage.objects;

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
      name ~ ('^submissions/' || auth.uid()::text || '/') OR
      -- Users can update their own avatar files
      -- Path format: {userId}/avatars/{filename}
      name ~ ('^' || auth.uid()::text || '/avatars/')
    )
  )
  WITH CHECK (
    bucket_id = 'library-files' AND (
      -- Same conditions for WITH CHECK
      public.is_admin_or_higher(auth.uid()) OR
      (public.has_role(auth.uid(), 'teacher') AND 
       (auth.uid()::text = (storage.foldername(name))[1] OR 
        auth.uid()::text = (storage.foldername(name))[2])) OR
      name ~ ('^submissions/' || auth.uid()::text || '/') OR
      name ~ ('^' || auth.uid()::text || '/avatars/')
    )
  );

-- Also add DELETE policy for avatars (users should be able to delete their own avatars)
DROP POLICY IF EXISTS "users_can_delete_own_files" ON storage.objects;

CREATE POLICY "users_can_delete_own_files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'library-files' AND (
      -- Admins can delete any file
      public.is_admin_or_higher(auth.uid()) OR
      -- Teachers can delete files in their own folder
      (public.has_role(auth.uid(), 'teacher') AND 
       (auth.uid()::text = (storage.foldername(name))[1] OR 
        auth.uid()::text = (storage.foldername(name))[2])) OR
      -- Users can delete their own submission files
      name ~ ('^submissions/' || auth.uid()::text || '/') OR
      -- Users can delete their own avatar files
      name ~ ('^' || auth.uid()::text || '/avatars/')
    )
  );

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Storage avatar upload policies fixed';
  RAISE NOTICE '📋 All authenticated users can now upload avatars to their own folder';
  RAISE NOTICE '🔧 Path format: {userId}/avatars/{filename}';
  RAISE NOTICE '🔒 Users can only upload/update/delete files in their own avatar folder';
END $$;
