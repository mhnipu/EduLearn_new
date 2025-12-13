# 🔧 Fix: Legacy API Keys are Disabled

## ❌ Error Message
```
Error: Legacy API keys are disabled
```

## 🔍 Problem
You're using the **old JWT-based anon key** format:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Supabase has **disabled legacy keys** and now requires the **new publishable key** format:
```
sb_publishable_...
```

---

## ✅ Solution: Get New Publishable Key

### Step 1: Open Supabase Dashboard

Go to your project's API settings:
```
https://supabase.com/dashboard/project/pcpiigyuafdzgokiosve/settings/api
```

**Note:** Your current project ID is `pcpiigyuafdzgokiosve`

### Step 2: Find Publishable Key

In the API settings page, look for:

1. **Publishable Key** (NEW - Use This!)
   - Format: `sb_publishable_...`
   - This is the new key format

2. **Legacy anon key** (OLD - Don't Use!)
   - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - This is disabled

### Step 3: Copy the Publishable Key

Copy the **Publishable Key** (starts with `sb_publishable_`)

---

## 🔧 Update .env File

### Current .env (WRONG):
```bash
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Updated .env (CORRECT):
```bash
VITE_SUPABASE_PROJECT_ID="pcpiigyuafdzgokiosve"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_YOUR_NEW_KEY_HERE"
VITE_SUPABASE_URL="https://pcpiigyuafdzgokiosve.supabase.co"
```

**Replace `YOUR_NEW_KEY_HERE` with the publishable key you copied!**

---

## 📝 Quick Fix Steps

1. **Open Dashboard:**
   ```
   https://supabase.com/dashboard/project/pcpiigyuafdzgokiosve/settings/api
   ```

2. **Copy Publishable Key** (starts with `sb_publishable_`)

3. **Update .env file:**
   ```powershell
   notepad "e:\Work\Personal Projects\EduLearn\EduLearn_new\.env"
   ```
   
   Replace the old key with the new publishable key.

4. **Restart dev server:**
   ```powershell
   # Stop server (Ctrl+C)
   npm run dev
   ```

5. **Test:**
   - Hard refresh browser (Ctrl+Shift+R)
   - Try signup/login
   - Error should be gone! ✅

---

## 🔍 Verify Correct Key Format

### ✅ CORRECT (New Format):
```
sb_publishable_abc123xyz...
```

### ❌ WRONG (Old Format - Disabled):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🆘 If You Don't See Publishable Key

If your Supabase project doesn't show a publishable key:

1. **Check Project Settings:**
   - Go to: Project Settings → API
   - Look for "Publishable Keys" section

2. **Enable Publishable Keys:**
   - Some projects may need to enable this feature
   - Check Supabase documentation for your project type

3. **Alternative:**
   - Contact Supabase support
   - Or create a new project that supports publishable keys

---

## ✅ After Fix

You should see:
- ✅ No "Legacy API keys" error
- ✅ Authentication works
- ✅ Users can signup/login
- ✅ Data saves to Supabase

---

## 📋 Quick Reference

- **Dashboard**: https://supabase.com/dashboard/project/pcpiigyuafdzgokiosve/settings/api
- **Project ID**: `pcpiigyuafdzgokiosve`
- **Project URL**: `https://pcpiigyuafdzgokiosve.supabase.co`
- **Key Format**: `sb_publishable_...` (NOT `eyJhbGc...`)

---

**Fix this now and restart your dev server!** 🚀
