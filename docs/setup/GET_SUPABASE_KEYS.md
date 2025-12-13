# 🔑 Get Your Supabase Keys

## Step 1: Go to API Settings

Open this link in browser:
```
https://supabase.com/dashboard/project/alazrdburoobipmofypc/settings/api
```

## Step 2: Copy Your Keys

You'll see two important values:

### 1. Project URL
```
https://alazrdburoobipmofypc.supabase.co
```
**✅ This is CORRECT!**

### 2. Anon/Public Key (COPY THIS!)
Look for **"anon public"** key - it's a long string starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**COPY THIS KEY!**

## Step 3: Update .env File

Open: `e:\Work\Personal Projects\EduLearn\EduLearn_new\.env`

Replace `YOUR_ACTUAL_ANON_KEY_HERE` with the key you copied:

```bash
VITE_SUPABASE_URL=https://alazrdburoobipmofypc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # PASTE YOUR KEY HERE
VITE_SUPABASE_PROJECT_ID=alazrdburoobipmofypc
```

## Step 4: Restart Dev Server

```powershell
# Stop server (Ctrl+C)
npm run dev
```

## ✅ Verify It's Working

1. Open browser console (F12)
2. You should see:
   ```
   📡 Connected to Supabase: https://alazrdburoobipmofypc.supabase.co
   ```

3. Create a test user
4. Check in Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/alazrdburoobipmofypc/auth/users
   ```

✅ **User should appear in YOUR Supabase project, NOT Lovable cloud!**

---

## 🎯 Quick Links

- **API Settings**: https://supabase.com/dashboard/project/alazrdburoobipmofypc/settings/api
- **Users Table**: https://supabase.com/dashboard/project/alazrdburoobipmofypc/auth/users  
- **Profiles Table**: https://supabase.com/dashboard/project/alazrdburoobipmofypc/editor (select 'profiles' table)

---

**After getting the key, update .env and restart server!**
