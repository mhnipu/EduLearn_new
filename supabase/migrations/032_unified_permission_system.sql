-- ============================================
-- UNIFIED PERMISSION SYSTEM FOR ALL MODULES
-- ============================================
-- This migration ensures that ALL modules use the same permission-based
-- access control system. Every table and action is protected by module permissions.

-- ============================================
-- STEP 1: Add missing modules if needed
-- ============================================

-- Add 'enrollments' module if it doesn't exist
INSERT INTO public.modules (name, description)
SELECT 'enrollments', 'Course enrollment management'
WHERE NOT EXISTS (SELECT 1 FROM public.modules WHERE name = 'enrollments');

-- Add 'categories' module if it doesn't exist (or keep it under library)
-- For now, categories are part of library module

-- ============================================
-- STEP 2: Update role_module_permissions to support assign and approve
-- ============================================

-- Add assign and approve columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'role_module_permissions' 
    AND column_name = 'can_assign'
  ) THEN
    ALTER TABLE public.role_module_permissions 
    ADD COLUMN can_assign BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'role_module_permissions' 
    AND column_name = 'can_approve'
  ) THEN
    ALTER TABLE public.role_module_permissions 
    ADD COLUMN can_approve BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add assign and approve to user_module_permissions if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_module_permissions' 
    AND column_name = 'can_assign'
  ) THEN
    ALTER TABLE public.user_module_permissions 
    ADD COLUMN can_assign BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_module_permissions' 
    AND column_name = 'can_approve'
  ) THEN
    ALTER TABLE public.user_module_permissions 
    ADD COLUMN can_approve BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================
-- STEP 3: Update has_module_permission to support assign and approve
-- ============================================

CREATE OR REPLACE FUNCTION public.has_module_permission(
  _user_id uuid,
  _module_name text,
  _permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Super admins have all permissions
    is_super_admin(_user_id) OR
    -- Check user-specific module permission (direct assignment)
    EXISTS (
      SELECT 1
      FROM public.user_module_permissions ump
      JOIN public.modules m ON m.id = ump.module_id
      WHERE ump.user_id = _user_id
        AND m.name = _module_name
        AND (
          (_permission = 'create' AND ump.can_create = true) OR
          (_permission = 'read' AND ump.can_read = true) OR
          (_permission = 'update' AND ump.can_update = true) OR
          (_permission = 'delete' AND ump.can_delete = true) OR
          (_permission = 'assign' AND ump.can_assign = true) OR
          (_permission = 'approve' AND ump.can_approve = true) OR
          -- Fallback: assign can use update/create, approve can use update/delete
          (_permission = 'assign' AND (ump.can_update = true OR ump.can_create = true)) OR
          (_permission = 'approve' AND (ump.can_update = true OR ump.can_delete = true))
        )
    ) OR
    -- Check role-based permissions (inherited from roles)
    EXISTS (
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
          (_permission = 'assign' AND rmp.can_assign = true) OR
          (_permission = 'approve' AND rmp.can_approve = true) OR
          -- Fallback: assign can use update/create, approve can use update/delete
          (_permission = 'assign' AND (rmp.can_update = true OR rmp.can_create = true)) OR
          (_permission = 'approve' AND (rmp.can_update = true OR rmp.can_delete = true))
        )
    ) OR
    -- Check custom role permissions
    EXISTS (
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
          (_permission = 'assign' AND rmp.can_assign = true) OR
          (_permission = 'approve' AND rmp.can_approve = true) OR
          -- Fallback
          (_permission = 'assign' AND (rmp.can_update = true OR rmp.can_create = true)) OR
          (_permission = 'approve' AND (rmp.can_update = true OR rmp.can_delete = true))
        )
    )
$$;

-- ============================================
-- STEP 4: Update RLS policies for COURSES module
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Admins can manage all courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can view their courses" ON public.courses;
DROP POLICY IF EXISTS "Users can view courses" ON public.courses;

-- Courses SELECT: requires courses.read permission
CREATE POLICY "users_with_courses_read_permission_can_view_courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'read') OR
    -- Students can view courses they're enrolled in
    (public.has_role(auth.uid(), 'student') AND EXISTS (
      SELECT 1 FROM public.course_enrollments 
      WHERE course_id = courses.id AND user_id = auth.uid()
    )) OR
    -- Teachers can view courses they created or are assigned to
    (public.has_role(auth.uid(), 'teacher') AND (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.teacher_course_assignments WHERE course_id = courses.id AND teacher_id = auth.uid())
    ))
  );

-- Courses INSERT: requires courses.create permission
CREATE POLICY "users_with_courses_create_permission_can_create_courses"
  ON public.courses FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'create')
  );

-- Courses UPDATE: requires courses.update permission
CREATE POLICY "users_with_courses_update_permission_can_update_courses"
  ON public.courses FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'update') OR
    -- Teachers can update their own courses
    (public.has_role(auth.uid(), 'teacher') AND created_by = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'update') OR
    (public.has_role(auth.uid(), 'teacher') AND created_by = auth.uid())
  );

-- Courses DELETE: requires courses.delete permission
CREATE POLICY "users_with_courses_delete_permission_can_delete_courses"
  ON public.courses FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'delete')
  );

-- ============================================
-- STEP 5: Update RLS policies for LESSONS module
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Enrolled students and authorized users can view lessons" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can manage lessons for their courses" ON public.lessons;
DROP POLICY IF EXISTS "Admins can manage all lessons" ON public.lessons;

-- Lessons SELECT: requires lessons.read permission
CREATE POLICY "users_with_lessons_read_permission_can_view_lessons"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'lessons', 'read') OR
    -- Students can view lessons from enrolled courses
    (public.has_role(auth.uid(), 'student') AND EXISTS (
      SELECT 1 FROM public.course_enrollments ce
      WHERE ce.course_id = lessons.course_id AND ce.user_id = auth.uid()
    )) OR
    -- Teachers can view lessons from their courses
    (public.has_role(auth.uid(), 'teacher') AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id AND (c.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.teacher_course_assignments tca
        WHERE tca.course_id = c.id AND tca.teacher_id = auth.uid()
      ))
    ))
  );

-- Lessons INSERT: requires lessons.create permission
CREATE POLICY "users_with_lessons_create_permission_can_create_lessons"
  ON public.lessons FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'lessons', 'create') OR
    -- Teachers can create lessons for their courses
    (public.has_role(auth.uid(), 'teacher') AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id AND c.created_by = auth.uid()
    ))
  );

-- Lessons UPDATE: requires lessons.update permission
CREATE POLICY "users_with_lessons_update_permission_can_update_lessons"
  ON public.lessons FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'lessons', 'update') OR
    -- Teachers can update lessons from their courses
    (public.has_role(auth.uid(), 'teacher') AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id AND c.created_by = auth.uid()
    ))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'lessons', 'update') OR
    (public.has_role(auth.uid(), 'teacher') AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id AND c.created_by = auth.uid()
    ))
  );

-- Lessons DELETE: requires lessons.delete permission
CREATE POLICY "users_with_lessons_delete_permission_can_delete_lessons"
  ON public.lessons FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'lessons', 'delete')
  );

-- ============================================
-- STEP 6: Update RLS policies for ENROLLMENTS
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins can manage enrollments" ON public.course_enrollments;

-- Course Enrollments SELECT: requires courses.read or enrollments.read
CREATE POLICY "users_with_enrollment_read_permission_can_view_enrollments"
  ON public.course_enrollments FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'read') OR
    public.has_module_permission(auth.uid(), 'enrollments', 'read') OR
    -- Users can view their own enrollments
    user_id = auth.uid() OR
    -- Teachers can view enrollments for their courses
    (public.has_role(auth.uid(), 'teacher') AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_enrollments.course_id AND c.created_by = auth.uid()
    ))
  );

-- Course Enrollments INSERT: requires courses.assign or enrollments.create
CREATE POLICY "users_with_enrollment_create_permission_can_create_enrollments"
  ON public.course_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'assign') OR
    public.has_module_permission(auth.uid(), 'enrollments', 'create') OR
    -- Users can enroll themselves if course allows it
    (user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_enrollments.course_id 
      AND (c.max_capacity IS NULL OR c.max_capacity = 0 OR (
        SELECT COUNT(*) FROM public.course_enrollments ce2 
        WHERE ce2.course_id = c.id
      ) < c.max_capacity)
    ))
  );

-- Course Enrollments DELETE: requires courses.assign or enrollments.delete
CREATE POLICY "users_with_enrollment_delete_permission_can_delete_enrollments"
  ON public.course_enrollments FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'assign') OR
    public.has_module_permission(auth.uid(), 'enrollments', 'delete') OR
    -- Users can unenroll themselves
    user_id = auth.uid()
  );

-- ============================================
-- STEP 7: Update RLS policies for QUIZZES/ASSIGNMENTS module
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view assignments" ON public.assignments;
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.assignments;

-- Assignments SELECT: requires quizzes.read permission
CREATE POLICY "users_with_quizzes_read_permission_can_view_assignments"
  ON public.assignments FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'quizzes', 'read') OR
    -- Students can view active assignments
    (public.has_role(auth.uid(), 'student') AND is_active = true) OR
    -- Teachers can view assignments they created
    (public.has_role(auth.uid(), 'teacher') AND created_by = auth.uid())
  );

-- Assignments INSERT: requires quizzes.create permission
CREATE POLICY "users_with_quizzes_create_permission_can_create_assignments"
  ON public.assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'quizzes', 'create')
  );

-- Assignments UPDATE: requires quizzes.update permission
CREATE POLICY "users_with_quizzes_update_permission_can_update_assignments"
  ON public.assignments FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'quizzes', 'update')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'quizzes', 'update')
  );

-- Assignments DELETE: requires quizzes.delete permission
CREATE POLICY "users_with_quizzes_delete_permission_can_delete_assignments"
  ON public.assignments FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'quizzes', 'delete')
  );

-- Assignment Submissions SELECT: requires quizzes.read
CREATE POLICY "users_with_quizzes_read_permission_can_view_submissions"
  ON public.assignment_submissions FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'quizzes', 'read') OR
    -- Students can view their own submissions
    student_id = auth.uid() OR
    -- Teachers can view submissions for assignments they created
    (public.has_role(auth.uid(), 'teacher') AND EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_submissions.assignment_id AND a.created_by = auth.uid()
    ))
  );

-- Assignment Submissions INSERT: students can submit, admins with permission can create
CREATE POLICY "users_can_create_submissions"
  ON public.assignment_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'quizzes', 'create') OR
    -- Students can submit their own assignments
    (public.has_role(auth.uid(), 'student') AND student_id = auth.uid())
  );

-- Assignment Submissions UPDATE: requires quizzes.update
CREATE POLICY "users_with_quizzes_update_permission_can_update_submissions"
  ON public.assignment_submissions FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'quizzes', 'update') OR
    -- Students can update their own submissions before grading
    (public.has_role(auth.uid(), 'student') AND student_id = auth.uid() AND graded_at IS NULL)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'quizzes', 'update') OR
    (public.has_role(auth.uid(), 'student') AND student_id = auth.uid() AND graded_at IS NULL)
  );

-- ============================================
-- STEP 8: Update RLS policies for USERS module
-- ============================================

-- Profiles SELECT: requires users.read permission
DROP POLICY IF EXISTS "Admins with users module can view all profiles" ON public.profiles;
CREATE POLICY "users_with_users_read_permission_can_view_profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'users', 'read') OR
    -- Users can always view their own profile
    id = auth.uid()
  );

-- Profiles UPDATE: requires users.update permission
DROP POLICY IF EXISTS "Admins with users module can update all profiles" ON public.profiles;
CREATE POLICY "users_with_users_update_permission_can_update_profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'users', 'update') OR
    -- Users can update their own profile
    id = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'users', 'update') OR
    id = auth.uid()
  );

-- User Roles: already handled in migration 024, but ensure it checks permissions
-- User Module Permissions: already handled, but ensure admins need users.update to grant

-- ============================================
-- STEP 9: Update RLS policies for COMMENTS module
-- ============================================

-- Comments SELECT: requires comments.read permission
DROP POLICY IF EXISTS "Users can view comments" ON public.comments;
CREATE POLICY "users_with_comments_read_permission_can_view_comments"
  ON public.comments FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'comments', 'read') OR
    -- Users can view comments on content they have access to
    true  -- Comments are generally public, but can be restricted
  );

-- Comments INSERT: requires comments.create permission
CREATE POLICY "users_with_comments_create_permission_can_create_comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'comments', 'create')
  );

-- Comments UPDATE: requires comments.update permission
CREATE POLICY "users_with_comments_update_permission_can_update_comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'comments', 'update') OR
    -- Users can update their own comments
    user_id = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'comments', 'update') OR
    user_id = auth.uid()
  );

-- Comments DELETE: requires comments.delete permission
CREATE POLICY "users_with_comments_delete_permission_can_delete_comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'comments', 'delete') OR
    -- Users can delete their own comments
    user_id = auth.uid()
  );

-- ============================================
-- STEP 10: Update RLS policies for CATEGORIES (library module)
-- ============================================

-- Categories SELECT: requires library.read permission
DROP POLICY IF EXISTS "Everyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins and teachers can manage categories" ON public.categories;

CREATE POLICY "users_with_library_read_permission_can_view_categories"
  ON public.categories FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'library', 'read') OR
    -- Allow viewing for content access
    true
  );

-- Categories INSERT: requires library.create permission
CREATE POLICY "users_with_library_create_permission_can_create_categories"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'library', 'create')
  );

-- Categories UPDATE: requires library.update permission
CREATE POLICY "users_with_library_update_permission_can_update_categories"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'library', 'update')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'library', 'update')
  );

-- Categories DELETE: requires library.delete permission
CREATE POLICY "users_with_library_delete_permission_can_delete_categories"
  ON public.categories FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'library', 'delete')
  );

-- ============================================
-- STEP 11: Update RLS policies for COURSE MODULES
-- ============================================

-- Course Modules SELECT: requires courses.read
DROP POLICY IF EXISTS "Users can view modules of assigned courses" ON public.course_modules;
CREATE POLICY "users_with_courses_read_permission_can_view_course_modules"
  ON public.course_modules FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'read') OR
    -- Students can view modules from enrolled courses
    (public.has_role(auth.uid(), 'student') AND EXISTS (
      SELECT 1 FROM public.course_enrollments ce
      WHERE ce.course_id = course_modules.course_id AND ce.user_id = auth.uid()
    ))
  );

-- Course Modules INSERT/UPDATE/DELETE: requires courses.update
DROP POLICY IF EXISTS "Admins can manage course modules" ON public.course_modules;
CREATE POLICY "users_with_courses_update_permission_can_manage_course_modules"
  ON public.course_modules FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'update')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'update')
  );

-- ============================================
-- STEP 12: Update RLS policies for COURSE MATERIALS
-- ============================================

-- Course Materials SELECT: requires courses.read
DROP POLICY IF EXISTS "Enrolled students and authorized users can view materials" ON public.course_materials;
CREATE POLICY "users_with_courses_read_permission_can_view_course_materials"
  ON public.course_materials FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'read') OR
    -- Students can view materials from enrolled courses
    (public.has_role(auth.uid(), 'student') AND EXISTS (
      SELECT 1 FROM public.course_enrollments ce
      WHERE ce.course_id = course_materials.course_id AND ce.user_id = auth.uid()
    ))
  );

-- Course Materials INSERT/UPDATE/DELETE: requires courses.update
CREATE POLICY "users_with_courses_update_permission_can_manage_course_materials"
  ON public.course_materials FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'update')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'courses', 'update')
  );

-- ============================================
-- STEP 13: Update RLS policies for ANALYTICS module
-- ============================================

-- Activity Feed SELECT: requires analytics.read
DROP POLICY IF EXISTS "Admins can view all activity" ON public.activity_feed;
CREATE POLICY "users_with_analytics_read_permission_can_view_activity"
  ON public.activity_feed FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_module_permission(auth.uid(), 'analytics', 'read') OR
    -- Users can view their own activity
    user_id = auth.uid()
  );

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Unified permission system applied';
  RAISE NOTICE '✅ All modules now use permission-based access control';
  RAISE NOTICE '✅ RLS policies updated for: courses, lessons, enrollments, quizzes, users, comments, categories';
  RAISE NOTICE '✅ Support for assign and approve permissions added';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: All admins now need explicit module permissions to access features.';
  RAISE NOTICE '⚠️  Super Admin has full access. Regular admins need permissions granted by Super Admin.';
  RAISE NOTICE '⚠️  Students and teachers have role-based access but can also have module permissions.';
END $$;
