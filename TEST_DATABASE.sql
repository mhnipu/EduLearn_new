-- ============================================
-- TEST: Check if functions exist
-- ============================================
-- Run this FIRST to verify your database state
-- ============================================

-- Check if admin_enroll_student function exists
SELECT 
  'admin_enroll_student function exists' as test_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ YES'
    ELSE '❌ NO - Need to create it'
  END as result
FROM pg_proc 
WHERE proname = 'admin_enroll_student';

-- Check if admin_assign_teacher function exists
SELECT 
  'admin_assign_teacher function exists' as test_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ YES'
    ELSE '❌ NO - Need to create it'
  END as result
FROM pg_proc 
WHERE proname = 'admin_assign_teacher';

-- Check if teacher_course_assignments table exists
SELECT 
  'teacher_course_assignments table exists' as test_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ YES'
    ELSE '❌ NO - Need to create it'
  END as result
FROM pg_tables 
WHERE tablename = 'teacher_course_assignments';

-- Check if is_admin_or_higher function exists (needed by our functions)
SELECT 
  'is_admin_or_higher function exists' as test_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ YES'
    ELSE '❌ NO - This is a problem!'
  END as result
FROM pg_proc 
WHERE proname = 'is_admin_or_higher';

-- Check your current database name
SELECT 
  'Current database' as test_name,
  current_database() as result;

