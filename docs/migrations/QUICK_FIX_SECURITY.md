# ⚡ Quick Security Fix - 2 Minutes

## 🎯 Fastest Way (No Installation Needed!)

### Step 1: Open Supabase Dashboard
1. Go to: **https://app.supabase.com**
2. Login and select your project

### Step 2: Run SQL
1. Click **SQL Editor** in left sidebar
2. Click **New Query**
3. Copy and paste this:

```sql
DROP VIEW IF EXISTS public.student_overview CASCADE;
```

4. Click **Run** (or press `Ctrl+Enter`)

### Step 3: Verify
Run this to confirm:

```sql
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_views 
      WHERE viewname = 'student_overview' 
      AND schemaname = 'public'
    ) THEN '❌ View still exists'
    ELSE '✅ Fixed! View removed'
  END as status;
```

---

## ✅ Done!

Security issue fixed! The `SECURITY DEFINER` vulnerability has been removed.

---

## 📚 More Details

- **Full Guide**: See [`APPLY_SECURITY_FIX.md`](./APPLY_SECURITY_FIX.md)
- **What is SECURITY DEFINER**: See [`docs/supabase/FIX_SECURITY_DEFINER_VIEW.md`](./docs/supabase/FIX_SECURITY_DEFINER_VIEW.md)
- **CLI Installation** (optional): See [`INSTALL_SUPABASE_CLI.md`](./INSTALL_SUPABASE_CLI.md)

---

**Time taken**: ~2 minutes
**No installation required**: Uses Supabase Dashboard only
