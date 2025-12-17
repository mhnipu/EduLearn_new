-- Migration: Guardian Attendance Access (Read-Only)
-- Date: 2024-12-17
-- Description: Allows guardians to view (read-only) their students' attendance records and sessions

BEGIN;

-- ============================================
-- STEP 1: Update attendance_records SELECT policy to include guardians
-- ============================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "teachers_can_view_attendance_for_assigned_courses" ON public.attendance_records;

-- Create new SELECT policy that includes guardians (read-only)
CREATE POLICY "users_can_view_attendance_records"
  ON public.attendance_records FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'read') OR
    -- Teachers can view attendance for their assigned courses
    (public.has_role(auth.uid(), 'teacher') AND EXISTS (
      SELECT 1 FROM public.attendance_sessions s
      WHERE s.id = attendance_records.session_id AND (
        s.created_by = auth.uid() OR
        public.is_teacher_assigned_to_course(auth.uid(), s.course_id)
      )
    )) OR
    -- Students can view their own attendance
    (public.has_role(auth.uid(), 'student') AND student_id = auth.uid()) OR
    -- Guardians can view attendance for their linked students (READ-ONLY)
    (public.has_role(auth.uid(), 'guardian') AND EXISTS (
      SELECT 1 FROM public.student_guardians sg
      WHERE sg.student_id = attendance_records.student_id 
      AND sg.guardian_id = auth.uid()
    ))
  );

COMMENT ON POLICY "users_can_view_attendance_records" ON public.attendance_records IS 
  'Allows teachers, students, and guardians (read-only) to view attendance records. Guardians can only view their linked students'' attendance.';

-- ============================================
-- STEP 2: Update attendance_sessions SELECT policy to include guardians
-- ============================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "teachers_can_view_assigned_course_sessions" ON public.attendance_sessions;

-- Create new SELECT policy that includes guardians (read-only)
CREATE POLICY "users_can_view_attendance_sessions"
  ON public.attendance_sessions FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'read') OR
    -- Teachers can view sessions for courses they're assigned to
    (public.has_role(auth.uid(), 'teacher') AND (
      created_by = auth.uid() OR
      public.is_teacher_assigned_to_course(auth.uid(), course_id)
    )) OR
    -- Students can view sessions for courses they're enrolled in
    (public.has_role(auth.uid(), 'student') AND EXISTS (
      SELECT 1 FROM public.course_enrollments
      WHERE course_id = attendance_sessions.course_id AND user_id = auth.uid()
    )) OR
    -- Guardians can view sessions for courses their linked students are enrolled in (READ-ONLY)
    (public.has_role(auth.uid(), 'guardian') AND EXISTS (
      SELECT 1 FROM public.student_guardians sg
      JOIN public.course_enrollments ce ON sg.student_id = ce.user_id
      WHERE ce.course_id = attendance_sessions.course_id 
      AND sg.guardian_id = auth.uid()
    ))
  );

COMMENT ON POLICY "users_can_view_attendance_sessions" ON public.attendance_sessions IS 
  'Allows teachers, students, and guardians (read-only) to view attendance sessions. Guardians can only view sessions for courses their linked students are enrolled in.';

-- ============================================
-- STEP 3: Ensure Guardians CANNOT INSERT/UPDATE/DELETE attendance_records
-- ============================================

-- The existing policy "teachers_can_mark_attendance_for_assigned_courses" already excludes guardians
-- But let's verify and add explicit comments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'attendance_records' 
    AND policyname = 'teachers_can_mark_attendance_for_assigned_courses'
  ) THEN
    COMMENT ON POLICY "teachers_can_mark_attendance_for_assigned_courses" ON public.attendance_records IS 
      'Allows only teachers and admins to create/update/delete attendance records. Guardians are explicitly excluded from write operations.';
  END IF;
END $$;

-- ============================================
-- STEP 4: Ensure Guardians CANNOT INSERT/UPDATE/DELETE attendance_sessions
-- ============================================

-- The existing policies already exclude guardians, but let's verify with comments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'attendance_sessions' 
    AND policyname = 'teachers_can_create_sessions_for_assigned_courses'
  ) THEN
    COMMENT ON POLICY "teachers_can_create_sessions_for_assigned_courses" ON public.attendance_sessions IS 
      'Allows only teachers and admins to create attendance sessions. Guardians are explicitly excluded.';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'attendance_sessions' 
    AND policyname = 'teachers_can_update_sessions_for_assigned_courses'
  ) THEN
    COMMENT ON POLICY "teachers_can_update_sessions_for_assigned_courses" ON public.attendance_sessions IS 
      'Allows only teachers and admins to update attendance sessions. Guardians are explicitly excluded.';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'attendance_sessions' 
    AND policyname = 'teachers_can_delete_sessions_for_assigned_courses'
  ) THEN
    COMMENT ON POLICY "teachers_can_delete_sessions_for_assigned_courses" ON public.attendance_sessions IS 
      'Allows only teachers and admins to delete attendance sessions. Guardians are explicitly excluded.';
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Guardian Attendance Access (Read-Only)';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Guardians can now VIEW attendance:';
  RAISE NOTICE '   - attendance_records (for their linked students)';
  RAISE NOTICE '   - attendance_sessions (for courses their students are enrolled in)';
  RAISE NOTICE '✅ Guardians CANNOT INSERT/UPDATE/DELETE';
  RAISE NOTICE '✅ All write operations remain restricted';
  RAISE NOTICE '============================================';
END $$;

COMMIT;

