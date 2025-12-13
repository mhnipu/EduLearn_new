# ⚡ Quick Setup Guide - Supabase Database

## 🎯 Get Started in 3 Steps

### Step 1: Get Your Supabase Credentials

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in and select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (the publishable key)

### Step 2: Create `.env` File

In the `EduLearn_new` directory, create a `.env` file:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

**Copy from `.env.example`** and fill in your actual values!

### Step 3: Apply Database Migrations

**Option A: Using Supabase Dashboard (Easiest)**
1. Go to [Supabase Dashboard](https://app.supabase.com) → Your Project
2. Click **SQL Editor** in left sidebar
3. Click **New Query**
4. Open each file from `supabase/migrations/` folder
5. Copy the SQL content, paste into SQL Editor, and click **Run**

**Option B: Using Supabase CLI**
```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Link to your project
cd EduLearn_new
supabase link --project-ref ntukhzoocfcrhgusrjdv

# Push all migrations
supabase db push
```

## ✅ Verify Setup

1. **Check Environment Variables**:
   ```bash
   # Make sure .env file exists and has correct values
   cat .env
   ```

2. **Start Development Server**:
   ```bash
   npm install
   npm run dev
   ```

3. **Verify Database Connection**:
   - Open your app in browser
   - Try logging in or accessing any page that uses the database
   - Check browser console for any Supabase connection errors

4. **Check Tables in Supabase Dashboard**:
   - Go to **Table Editor** in Supabase Dashboard
   - You should see tables like `profiles`, `courses`, `books`, etc.

## 🗄️ Managing Your Database

### View/Edit Data
- **Supabase Dashboard** → **Table Editor** → Select any table

### Run SQL Queries
- **Supabase Dashboard** → **SQL Editor** → Write and run queries

### Manage Users & Profiles
- **Supabase Dashboard** → **Authentication** → **Users** (create/edit users)
- **Supabase Dashboard** → **Table Editor** → **`profiles`** (manage profiles)
- **Supabase Dashboard** → **Table Editor** → **`user_roles`** (assign roles)
- **Full Guide**: See [`SUPABASE_USER_MANAGEMENT.md`](./SUPABASE_USER_MANAGEMENT.md)

### Manage Storage (Files)
- **Supabase Dashboard** → **Storage** → Create buckets and upload files

### View Logs
- **Supabase Dashboard** → **Logs** → Check API and Database logs

## 📚 Need More Help?

- **Full Guide**: See [`SUPABASE_DATABASE_MANAGEMENT.md`](./SUPABASE_DATABASE_MANAGEMENT.md)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)

---

**Your database is now managed directly through Supabase!** 🎉
