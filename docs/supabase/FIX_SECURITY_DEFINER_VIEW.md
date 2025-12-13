# 🔒 Security Definer View Fix

## Problem

Supabase Linter warning:
```
security_definer_view: View `public.student_overview` is defined with the SECURITY DEFINER property
```

## What is SECURITY DEFINER?

`SECURITY DEFINER` views enforce permissions of the **view creator** rather than the **querying user**. This can:
- ❌ Bypass Row Level Security (RLS)
- ❌ Create security vulnerabilities
- ❌ Allow unauthorized data access

## Solution

### Check if View Exists

Run this in Supabase SQL Editor:

```sql
-- Check if view exists
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE viewname = 'student_overview'
  AND schemaname = 'public';
```

### Fix: Remove SECURITY DEFINER

```sql
-- Drop existing view
DROP VIEW IF EXISTS public.student_overview CASCADE;

-- If you need to recreate it, do it WITHOUT SECURITY DEFINER
-- Example:
CREATE VIEW public.student_overview AS
SELECT 
  s.id as student_id,
  p.full_name,
  p.avatar_url
FROM students s
JOIN profiles p ON p.id = s.user_id;

-- Grant permissions
GRANT SELECT ON public.student_overview TO authenticated;
```

### Or Use SECURITY INVOKER (PostgreSQL 15+)

```sql
DROP VIEW IF EXISTS public.student_overview CASCADE;

CREATE VIEW public.student_overview
WITH (security_invoker = true) AS
SELECT 
  s.id as student_id,
  p.full_name,
  p.avatar_url
FROM students s
JOIN profiles p ON p.id = s.user_id;
```

## Quick Fix Steps

1. **Go to Supabase Dashboard** → SQL Editor

2. **Check if view exists**:
   ```sql
   SELECT viewname, definition 
   FROM pg_views 
   WHERE viewname = 'student_overview';
   ```

3. **If it exists, drop it**:
   ```sql
   DROP VIEW IF EXISTS public.student_overview CASCADE;
   ```

4. **If you need the view, recreate WITHOUT SECURITY DEFINER**

## Prevention

### ✅ Good Practice:
```sql
-- Use regular views
CREATE VIEW my_view AS
SELECT * FROM my_table;

-- Or explicitly use SECURITY INVOKER
CREATE VIEW my_view 
WITH (security_invoker = true) AS
SELECT * FROM my_table;
```

### ❌ Avoid:
```sql
-- Don't use SECURITY DEFINER for views
CREATE VIEW my_view 
WITH (security_definer = true) AS
SELECT * FROM my_table;
```

## Why This Matters

1. **Security**: Views should respect RLS policies
2. **Permissions**: Users should only see data they're allowed to
3. **Compliance**: Proper access control is required

## Additional Resources

- [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view)
- [PostgreSQL Views](https://www.postgresql.org/docs/current/sql-createview.html)

---

**Priority**: ⚠️ High - Fix Immediately
