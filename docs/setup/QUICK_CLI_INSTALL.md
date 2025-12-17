# 🚀 Quick CLI Installation & Migration

## Option 1: Automated Script (Recommended)

Run this PowerShell script to install Supabase CLI and apply migrations automatically:

```powershell
cd "e:\Work\Personal Projects\EduLearn\EduLearn_new"
.\scripts\INSTALL_AND_APPLY_CLI.ps1
```

This script will:
1. ✅ Download Supabase CLI
2. ✅ Extract to `%USERPROFILE%\.supabase`
3. ✅ Login to Supabase
4. ✅ Link to your project
5. ✅ Apply critical migrations

---

## Option 2: Manual Installation

### Step 1: Download CLI

Download from: https://github.com/supabase/cli/releases/latest

**For Windows:**
- Download: `supabase_windows_amd64.zip`
- Extract to: `C:\Users\YourName\.supabase\`
- Add to PATH: `C:\Users\YourName\.supabase`

### Step 2: Verify Installation

```powershell
# Close and reopen PowerShell
supabase --version
```

### Step 3: Login

```powershell
supabase login
```

This will open your browser. Authorize the CLI.

### Step 4: Link Project

```powershell
cd "e:\Work\Personal Projects\EduLearn\EduLearn_new"
supabase link --project-ref alazrdburoobipmofypc
```

### Step 5: Apply Migrations

```powershell
# Apply security fix
supabase db push --file "supabase\migrations\20251212191752_fix_security_definer_view.sql"

# Apply phone authentication
supabase db push --file "supabase\migrations\20251212194644_add_phone_authentication.sql"
```

---

## Option 3: Dashboard Method (Easiest)

If CLI installation fails, use the Dashboard:

1. Open: https://supabase.com/dashboard/project/alazrdburoobipmofypc/sql/new
2. Copy content from: `COPY_PASTE_TO_SUPABASE.sql`
3. Paste and click **RUN**

---

## Troubleshooting

### Error: "supabase is not recognized"

**Solution 1: Add to PATH manually**
```powershell
$env:Path = "C:\Users\YourName\.supabase;$env:Path"
```

**Solution 2: Use full path**
```powershell
& "C:\Users\YourName\.supabase\supabase.exe" --version
```

### Error: "Access token not provided"

**Solution:** Run `supabase login` first

### Error: "Failed to link project"

**Solution:** Make sure you're logged in and have access to the project

---

## Verification

After applying migrations:

```powershell
# Check connection
supabase status

# List migrations
supabase db list-migrations
```

Or verify in Dashboard:
- Tables: https://supabase.com/dashboard/project/alazrdburoobipmofypc/editor
- Users: https://supabase.com/dashboard/project/alazrdburoobipmofypc/auth/users

---

## Next Steps

1. ✅ Restart dev server: `npm run dev`
2. ✅ Test signup with phone number
3. ✅ Check browser console (F12) for logs
4. ✅ Verify user in Supabase Dashboard

---

**Need help?** Check `docs/migrations/APPLY_ALL_MIGRATIONS.md` for detailed guide.
