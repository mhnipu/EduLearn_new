# 🚀 Quick Migration Guide

## Run This First!

Before using the Student Enrollment System, you **MUST** apply the database migration.

---

## Option 1: Using Supabase CLI (Recommended)

```bash
# Navigate to project directory
cd "g:\testing project\versity project\EDulearn\smartlearn-mvp"

# Apply the migration
supabase db push
```

---

## Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **"New Query"**
4. Copy the entire contents of:
   ```
   supabase/migrations/20251211_enrollment_system.sql
   ```
5. Paste into the SQL Editor
6. Click **"Run"** or press `Ctrl+Enter`
7. Wait for "Success" message

---

## Option 3: Using psql Command Line

```bash
# If you have direct database access
psql "your-database-connection-string" -f supabase/migrations/20251211_enrollment_system.sql
```

---

## ✅ Verify Migration Success

After running the migration, verify it worked:

### Check Tables:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'teacher_student_assignments',
  'library_access_requests',
  'student_course_assignments'
);
```

**Expected Result:** Should return 3 rows

### Check Functions:
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'is_teacher_of_student',
  'get_library_access_status',
  'get_student_teachers',
  'get_teacher_students'
);
```

**Expected Result:** Should return 4 rows

### Check RLS Policies:
```sql
SELECT tablename, COUNT(*) as policy_count 
FROM pg_policies 
WHERE tablename IN (
  'teacher_student_assignments',
  'library_access_requests',
  'student_course_assignments'
)
GROUP BY tablename;
```

**Expected Result:** Each table should have 2-3 policies

---

## 🎯 After Migration

Once migration is successful:

1. ✅ Start your development server:
   ```bash
   npm run dev
   ```

2. ✅ Navigate to admin panel:
   ```
   http://localhost:5173/admin/student-enrollment
   ```

3. ✅ Start enrolling students!

---

## ❌ Common Issues

### Issue: "Migration already applied"
**Solution:** The migration has already been run. You're good to go!

### Issue: "Permission denied"
**Solution:** Make sure you're connected as a database admin user.

### Issue: "Function already exists"
**Solution:** Drop existing functions first:
```sql
DROP FUNCTION IF EXISTS get_student_teachers;
DROP FUNCTION IF EXISTS get_teacher_students;
-- etc.
```

### Issue: "Table already exists"
**Solution:** Either:
- Skip the table creation (comment out in migration)
- Or drop existing tables (⚠️ WARNING: This deletes data!)

---

## 🆘 Need Help?

1. Check **ENROLLMENT_SYSTEM_QUICKSTART.md** for detailed setup
2. Review **STUDENT_ENROLLMENT_SYSTEM.md** for comprehensive docs
3. Check migration file for SQL details

---

## ⚡ Quick Test

After migration, test with this SQL:

```sql
-- This should work without errors
SELECT * FROM teacher_student_assignments LIMIT 1;
SELECT * FROM library_access_requests LIMIT 1;
SELECT * FROM student_course_assignments LIMIT 1;
```

---

**Ready to go? Run the migration now!** 🚀

