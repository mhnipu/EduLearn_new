# 🔧 Apply All Migrations to Supabase

## Current Status
You have **20 migration files** that need to be applied to your external Supabase database.

---

## 🚀 Quick Apply Method (Dashboard)

### Step 1: Open Supabase SQL Editor
```
https://supabase.com/dashboard/project/alazrdburoobipmofypc/sql/new
```

### Step 2: Apply Critical Migrations First

#### Migration 1: Security Fix (CRITICAL!)
**File:** `20251212191752_fix_security_definer_view.sql`

```sql
-- Fix Security Definer View Issue
DROP VIEW IF EXISTS public.student_overview;

CREATE OR REPLACE VIEW public.student_overview 
WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  COUNT(DISTINCT e.course_id) as enrolled_courses,
  COUNT(DISTINCT a.id) as total_assignments,
  COUNT(DISTINCT CASE WHEN sub.status = 'completed' THEN sub.id END) as completed_assignments
FROM public.profiles p
LEFT JOIN public.enrollments e ON p.id = e.student_id
LEFT JOIN public.assignments a ON e.course_id = a.course_id
LEFT JOIN public.assignment_submissions sub ON a.id = sub.assignment_id AND p.id = sub.student_id
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.id AND ur.role = 'student'
)
GROUP BY p.id, p.full_name, p.avatar_url;

COMMENT ON VIEW public.student_overview IS 'Student overview with security invoker (uses querying user permissions)';
```

**Run this first!** ✅

---

#### Migration 2: Phone Authentication Support
**File:** `20251212194644_add_phone_authentication.sql`

```sql
-- Add phone column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- Update handle_new_user trigger to save phone number
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$;

-- Add helpful comment
COMMENT ON COLUMN public.profiles.phone IS 'User phone number for authentication and contact';
```

**Run this second!** ✅

---

### Step 3: Verify Success

After running each migration, check for success:

```sql
-- Check if view was created correctly
SELECT * FROM public.student_overview LIMIT 1;

-- Check if phone column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'phone';

-- Check if trigger is updated
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user';
```

---

## 📋 All Migration Files (In Order)

Here are all 20 migrations in chronological order:

1. ✅ `20251201043306_7f2762a4-83a5-430f-b11b-8fe38374aaf4.sql` - Initial schema
2. ✅ `20251201045320_82084b2b-9190-4851-be7e-3cd929608763.sql`
3. ✅ `20251201045345_88ff8d90-fd4d-4567-8df5-630dfda8a93b.sql`
4. ✅ `20251202051805_37b3ceea-505e-4093-800f-10d15614049e.sql`
5. ✅ `20251202151719_407949a7-ffd9-4cfc-ac7c-f1771959e142.sql`
6. ✅ `20251202153512_cd8f7d59-5b7e-4492-99e2-88e6302860fa.sql`
7. ✅ `20251202165719_f463c1f5-c769-442f-82f5-894da9415d0d.sql`
8. ✅ `20251202171614_3d5abe74-7784-4306-9043-6e72ba420a8f.sql`
9. ✅ `20251202173109_97e5c8b4-07ca-4053-91cb-1e092ef79c55.sql`
10. ✅ `20251202174404_7ad4d883-e31f-4bf0-86b2-3fa78634d07c.sql`
11. ✅ `20251202191706_34eb9875-76d5-4730-8273-2a66bcc4510b.sql`
12. ✅ `20251203040604_7b09963f-50e8-4072-a256-07411efec7b8.sql`
13. ✅ `20251203044913_40bddb5e-cbd3-49fe-a8d1-fbee1660ffb3.sql`
14. ✅ `20251203084231_create_custom_roles_table.sql`
15. ✅ `20251212_admin_enroll_function.sql`
16. ✅ `20251212_fix_enrollment_rls.sql`
17. ✅ `20251212_teacher_course_assignments.sql`
18. 🔴 `20251212191752_fix_security_definer_view.sql` **← APPLY THIS!**
19. 🔴 `20251212194644_add_phone_authentication.sql` **← APPLY THIS!**
20. ✅ `FINAL_FIX_ENROLLMENT.sql`

---

## 🎯 Priority Migrations (Must Apply Now)

### For Security Fix:
```
supabase/migrations/20251212191752_fix_security_definer_view.sql
```

### For Phone Authentication:
```
supabase/migrations/20251212194644_add_phone_authentication.sql
```

---

## 📊 Check Applied Migrations

To see which migrations are already applied in your database:

```sql
-- Check migration history (if using Supabase CLI)
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
```

---

## ⚠️ Important Notes

1. **Order Matters**: Apply migrations in chronological order (sorted by filename)
2. **Idempotent**: Most migrations use `IF NOT EXISTS` / `IF EXISTS` so safe to rerun
3. **Backup**: Supabase automatically backs up, but you can create manual backup:
   - Go to: Database → Backups → Create backup

---

## 🚀 Quick Apply Commands

If you want to use CLI (after `supabase login` and `supabase link`):

```powershell
cd "e:\Work\Personal Projects\EduLearn\EduLearn_new"

# Apply all migrations
supabase db push

# Or apply specific migration
supabase db push --file supabase/migrations/20251212194644_add_phone_authentication.sql
```

**But Dashboard method is recommended!** ✅

---

## ✅ After Applying

1. Check for errors in SQL Editor
2. Verify tables/functions created:
   ```sql
   -- List all tables
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' ORDER BY table_name;
   
   -- List all functions
   SELECT proname FROM pg_proc 
   WHERE pronamespace = 'public'::regnamespace 
   ORDER BY proname;
   ```

3. Test signup in your app:
   - Should save phone number ✅
   - Should use security invoker view ✅

---

## 🆘 If Errors Occur

**Error: "already exists"**
- ✅ Safe to ignore - means already applied

**Error: "does not exist"**
- ❌ Apply earlier migrations first

**Error: "permission denied"**
- Check you're using service_role key in dashboard

---

**Ready to apply?** Open SQL Editor and paste the two critical migrations! 🚀
