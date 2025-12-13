# 🔧 Troubleshoot: Email Invalid Error

## Current Issue
"Email address 'nipu@gmail.com' is invalid" error persisting even after fixes.

---

## ✅ Complete Fix Checklist

### Step 1: Force Clean Build

```powershell
# Stop dev server (Ctrl+C in terminal)

# Clean cache
Remove-Item -Recurse -Force "e:\Work\Personal Projects\EduLearn\EduLearn_new\node_modules\.vite"

# Clean dist if it exists
Remove-Item -Recurse -Force "e:\Work\Personal Projects\EduLearn\EduLearn_new\dist" -ErrorAction SilentlyContinue

# Restart server
cd "e:\Work\Personal Projects\EduLearn\EduLearn_new"
npm run dev
```

### Step 2: Clear Browser Cache Completely

**Option A: Hard Refresh**
```
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

**Option B: Clear All Cache**
1. Press `F12` (open DevTools)
2. Right-click on refresh button (while DevTools open)
3. Select "Empty Cache and Hard Reload"

**Option C: Incognito/Private Mode**
```
Ctrl + Shift + N (Chrome/Edge)
Ctrl + Shift + P (Firefox)
```
Test in incognito mode to verify cache isn't the issue.

### Step 3: Verify .env File

```powershell
# View .env content
Get-Content "e:\Work\Personal Projects\EduLearn\EduLearn_new\.env"
```

**Should show:**
```bash
VITE_SUPABASE_PROJECT_ID="alazrdburoobipmofypc"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGc..."
VITE_SUPABASE_URL="https://alazrdburoobipmofypc.supabase.co"
```

**NOT:**
```bash
VITE_SUPABASE_URL="https://ntukhzoocfcrhgusrjdv.supabase.co"  ❌
```

If URL is still wrong, fix it:
```powershell
notepad "e:\Work\Personal Projects\EduLearn\EduLearn_new\.env"
```

### Step 4: Check Browser Console

1. Open browser (F12)
2. Go to Console tab
3. Clear console
4. Try signup
5. Look for errors

**Expected logs:**
```
🌐 Auth Page Loaded
📡 Connected to Supabase: https://alazrdburoobipmofypc.supabase.co
📧 Signup Email: nipu@gmail.com
🔍 Validating signup data...
✅ Validation passed
```

**If you see:**
```
📡 Connected to Supabase: https://ntukhzoocfcrhgusrjdv.supabase.co  ❌
```
Then .env is not loaded correctly - restart dev server!

### Step 5: Test with Different Email

Try these emails to isolate the issue:
- `test@test.com`
- `admin@example.com`
- `user123@gmail.com`

If all fail with "invalid email" → validation issue
If all work → browser/cache issue with specific email

---

## 🔍 Advanced Debugging

### Check If Old Auth Context Is Loaded

In browser console (F12), type:
```javascript
console.log(import.meta.env.VITE_SUPABASE_URL)
```

Should show: `https://alazrdburoobipmofypc.supabase.co`

If it shows `ntukhzoocfcrhgusrjdv` → old .env cached!

**Fix:**
```powershell
# Stop server
# Delete .env
Remove-Item "e:\Work\Personal Projects\EduLearn\EduLearn_new\.env"

# Recreate .env with correct values
@"
VITE_SUPABASE_PROJECT_ID=alazrdburoobipmofypc
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsYXpyZGJ1cm9vYmlwbW9meXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MjY4MjMsImV4cCI6MjA4MDEwMjgyM30.x-JPH71Tr59UrE2bitT9wxonbAdNnls7eQr310GQWys
VITE_SUPABASE_URL=https://alazrdburoobipmofypc.supabase.co
"@ | Out-File -FilePath "e:\Work\Personal Projects\EduLearn\EduLearn_new\.env" -Encoding UTF8

# Restart
npm run dev
```

---

## 🎯 If Still Not Working

### Check TypeScript Errors

In VS Code, check for red squiggly lines in:
- `src/lib/auth.tsx`
- `src/pages/Auth.tsx`

### Check Terminal for Errors

Look for errors like:
- `Module not found`
- `Type error`
- `Export 'signInWithPhone' not found`

### Last Resort: Reset Everything

```powershell
cd "e:\Work\Personal Projects\EduLearn\EduLearn_new"

# Stop server
# Remove node_modules
Remove-Item -Recurse -Force .\node_modules

# Remove package-lock
Remove-Item package-lock.json

# Reinstall
npm install

# Clear cache
Remove-Item -Recurse -Force .\.vite -ErrorAction SilentlyContinue

# Restart
npm run dev
```

---

## ✅ Success Indicators

### In Browser Console (F12):
```
✅ 📡 Connected to Supabase: https://alazrdburoobipmofypc.supabase.co
✅ 📧 Signup Email: nipu@gmail.com
✅ ✅ Validation passed
✅ 📝 Creating new account in external Supabase...
✅ ✅ User created successfully
```

### In UI:
```
✅ Green toast: "Account Created in External Supabase!"
✅ No red error toast
✅ Form clears after successful signup
```

### In Supabase Dashboard:
```
✅ User appears in: https://supabase.com/dashboard/project/alazrdburoobipmofypc/auth/users
✅ Profile created in: profiles table
```

---

## 📋 Quick Command Summary

```powershell
# Complete reset and restart
cd "e:\Work\Personal Projects\EduLearn\EduLearn_new"
Remove-Item -Recurse -Force .\node_modules\.vite
npm run dev

# Test in incognito mode
# Open: http://localhost:8080
# Try signup with: test@example.com
```

---

**Still having issues? Share:**
1. Browser console screenshot (F12)
2. Terminal output
3. .env file content (hide the key)
