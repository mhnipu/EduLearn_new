# 🔧 Install Supabase CLI - Windows

## Quick Install (Recommended)

### Method 1: Using Scoop (Easiest) ✅

```powershell
# Install Scoop (if not installed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Method 2: Download Binary Directly

1. Go to: https://github.com/supabase/cli/releases/latest
2. Download `supabase_windows_amd64.zip`
3. Extract the zip file
4. Create folder: `C:\Program Files\Supabase\`
5. Move `supabase.exe` to `C:\Program Files\Supabase\`
6. Add to PATH:
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Go to **Advanced** tab → **Environment Variables**
   - Under "System variables", find and select **Path**
   - Click **Edit** → **New**
   - Add: `C:\Program Files\Supabase\`
   - Click **OK** on all dialogs
7. **Restart PowerShell** (important!)

---

## Verify Installation

```powershell
supabase --version
```

Should show: `supabase version x.x.x`

---

## Alternative: Use Supabase Dashboard (No CLI Needed)

If you don't want to install CLI, you can apply the migration directly in Supabase Dashboard:

### Step 1: Go to Supabase Dashboard
1. Open: https://app.supabase.com
2. Select your project
3. Click **SQL Editor**

### Step 2: Run Migration
1. Click **New Query**
2. Open: `supabase/migrations/20251212191752_fix_security_definer_view.sql`
3. Copy all content
4. Paste in SQL Editor
5. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify
You should see messages like:
- `NOTICE: View student_overview exists - will be dropped`
- `NOTICE: View student_overview dropped successfully`
- `NOTICE: No views with SECURITY DEFINER found`

✅ Done!

---

## Quick Fix (Dashboard Method)

**Just run this SQL in Supabase Dashboard → SQL Editor:**

```sql
-- Quick fix for SECURITY DEFINER view warning
DROP VIEW IF EXISTS public.student_overview CASCADE;

-- Verify
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_views 
      WHERE viewname = 'student_overview' 
      AND schemaname = 'public'
    ) THEN 'View still exists - check if it has SECURITY DEFINER'
    ELSE 'View removed successfully ✅'
  END as status;
```

---

## Recommended Approach

**For this fix, use Supabase Dashboard method** - it's faster and doesn't require CLI installation.

CLI is useful for:
- Future migrations
- Local development
- CI/CD pipelines

But for a one-time security fix, Dashboard is easier!

---

## After Installing CLI

Once CLI is installed, you can:

### 1. Link to your project
```powershell
supabase link --project-ref your-project-ref
```

### 2. Push migrations
```powershell
supabase db push
```

### 3. Pull remote changes
```powershell
supabase db pull
```

---

## Need Help?

**For this security fix:**
→ Use Dashboard method: See [`APPLY_SECURITY_FIX.md`](./APPLY_SECURITY_FIX.md)

**For CLI installation issues:**
→ See: https://supabase.com/docs/guides/cli/getting-started
