-- Fix RLS policies for course_enrollments to allow admin insertions

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Admins can insert enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins can manage enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins can update enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins can delete enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins can insert for others" ON public.course_enrollments;

-- Allow admins and super_admins to insert enrollments for any user
CREATE POLICY "Admins can insert for others" ON public.course_enrollments
FOR INSERT WITH CHECK (
  is_admin_or_higher(auth.uid())
);

-- Allow admins and super_admins to update enrollments
CREATE POLICY "Admins can update enrollments" ON public.course_enrollments
FOR UPDATE USING (
  is_admin_or_higher(auth.uid())
);

-- Allow admins and super_admins to delete enrollments
CREATE POLICY "Admins can delete enrollments" ON public.course_enrollments
FOR DELETE USING (
  is_admin_or_higher(auth.uid())
);
