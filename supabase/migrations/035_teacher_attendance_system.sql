-- ============================================
-- TEACHER ATTENDANCE MANAGEMENT SYSTEM
-- ============================================
-- This migration creates the attendance tracking system
-- for teachers to mark student attendance per class session

BEGIN;

-- ============================================
-- STEP 1: Create attendance_sessions table
-- ============================================
-- Tracks class sessions/meetings for courses
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  session_time TIME,
  title TEXT,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, session_date, session_time)
);

-- Enable RLS
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_course ON public.attendance_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON public.attendance_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_created_by ON public.attendance_sessions(created_by);

-- ============================================
-- STEP 2: Create attendance_records table
-- ============================================
-- Tracks individual student attendance per session
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT,
  marked_by UUID NOT NULL REFERENCES auth.users(id),
  marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

-- Enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON public.attendance_records(status);

-- ============================================
-- STEP 3: Update helper function to include course creation check
-- ============================================
-- Enhance existing function (from migration 034) to also check if teacher created the course
-- Using CREATE OR REPLACE since the signature matches and policies depend on it
CREATE OR REPLACE FUNCTION public.is_teacher_assigned_to_course(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_course_assignments
    WHERE teacher_id = _user_id AND course_id = _course_id
  ) OR EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = _course_id AND created_by = _user_id
  );
$$;

-- ============================================
-- STEP 4: RLS Policies for attendance_sessions
-- ============================================

-- Teachers can view sessions for their assigned courses
CREATE POLICY "teachers_can_view_assigned_course_sessions"
  ON public.attendance_sessions
  FOR SELECT
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
    ))
  );

-- Teachers can create sessions for their assigned courses
CREATE POLICY "teachers_can_create_sessions_for_assigned_courses"
  ON public.attendance_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'create') OR
    -- Teachers can create sessions for courses they're assigned to
    (public.has_role(auth.uid(), 'teacher') AND (
      created_by = auth.uid() OR
      public.is_teacher_assigned_to_course(auth.uid(), course_id)
    ))
  );

-- Teachers can update sessions for their assigned courses
CREATE POLICY "teachers_can_update_sessions_for_assigned_courses"
  ON public.attendance_sessions
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'update') OR
    -- Teachers can update sessions they created or for assigned courses
    (public.has_role(auth.uid(), 'teacher') AND (
      created_by = auth.uid() OR
      public.is_teacher_assigned_to_course(auth.uid(), course_id)
    ))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'update') OR
    (public.has_role(auth.uid(), 'teacher') AND (
      created_by = auth.uid() OR
      public.is_teacher_assigned_to_course(auth.uid(), course_id)
    ))
  );

-- Teachers can delete sessions for their assigned courses
CREATE POLICY "teachers_can_delete_sessions_for_assigned_courses"
  ON public.attendance_sessions
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'delete') OR
    -- Teachers can delete sessions they created or for assigned courses
    (public.has_role(auth.uid(), 'teacher') AND (
      created_by = auth.uid() OR
      public.is_teacher_assigned_to_course(auth.uid(), course_id)
    ))
  );

-- ============================================
-- STEP 5: RLS Policies for attendance_records
-- ============================================

-- Teachers can view attendance records for their assigned courses
CREATE POLICY "teachers_can_view_attendance_for_assigned_courses"
  ON public.attendance_records
  FOR SELECT
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
    (public.has_role(auth.uid(), 'student') AND student_id = auth.uid())
  );

-- Teachers can create/update attendance records for their assigned courses
CREATE POLICY "teachers_can_mark_attendance_for_assigned_courses"
  ON public.attendance_records
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'update') OR
    -- Teachers can mark attendance for their assigned courses
    (public.has_role(auth.uid(), 'teacher') AND EXISTS (
      SELECT 1 FROM public.attendance_sessions s
      WHERE s.id = attendance_records.session_id AND (
        s.created_by = auth.uid() OR
        public.is_teacher_assigned_to_course(auth.uid(), s.course_id)
      )
    ))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'update') OR
    (public.has_role(auth.uid(), 'teacher') AND EXISTS (
      SELECT 1 FROM public.attendance_sessions s
      WHERE s.id = attendance_records.session_id AND (
        s.created_by = auth.uid() OR
        public.is_teacher_assigned_to_course(auth.uid(), s.course_id)
      )
    ))
  );

-- ============================================
-- STEP 6: Create helper function to get enrolled students for a course
-- ============================================
CREATE OR REPLACE FUNCTION public.get_course_enrolled_students(_course_id uuid)
RETURNS TABLE (
  student_id uuid,
  full_name text,
  avatar_url text,
  enrolled_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ce.user_id as student_id,
    p.full_name,
    p.avatar_url,
    ce.enrolled_at
  FROM public.course_enrollments ce
  JOIN public.profiles p ON p.id = ce.user_id
  WHERE ce.course_id = _course_id
  ORDER BY ce.enrolled_at DESC;
$$;

-- ============================================
-- STEP 7: Create trigger for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_attendance_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attendance_sessions_updated_at
  BEFORE UPDATE ON public.attendance_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_sessions_updated_at();

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Teacher Attendance System Created';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ attendance_sessions table created';
  RAISE NOTICE '✅ attendance_records table created';
  RAISE NOTICE '✅ RLS policies configured';
  RAISE NOTICE '✅ Helper functions created';
  RAISE NOTICE '============================================';
END $$;
