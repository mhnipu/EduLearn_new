# 🗄️ Supabase Database Management Guide

This guide explains how to manage your database directly through Supabase, without using Lovable cloud.

## 📋 Prerequisites

1. **Supabase Account**: Create one at [supabase.com](https://supabase.com)
2. **Supabase Project**: You should have a project with ID `ntukhzoocfcrhgusrjdv` (from `supabase/config.toml`)
3. **Supabase CLI** (Optional, for local development):
   ```bash
   npm install -g supabase
   # or
   brew install supabase/tap/supabase
   ```

## 🔑 Step 1: Get Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (this is your publishable key)

## 🔧 Step 2: Configure Environment Variables

Create a `.env` file in the root directory (`EduLearn_new/.env`):

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

**Important**: Replace the placeholder values with your actual Supabase credentials.

## 🚀 Step 3: Link Your Local Project to Supabase

If you want to use Supabase CLI for migrations:

```bash
# Navigate to project directory
cd EduLearn_new

# Link to your Supabase project
supabase link --project-ref ntukhzoocfcrhgusrjdv
```

You'll need your database password. Get it from:
- Supabase Dashboard → **Settings** → **Database** → **Connection string** → **URI**

## 📊 Step 4: Manage Database Through Supabase Dashboard

### Access Database Tables

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Table Editor** in the left sidebar
4. You can now:
   - View all tables
   - Add/edit/delete rows
   - Import data (CSV, JSON)
   - Export data

### Run SQL Queries

1. Go to **SQL Editor** in the left sidebar
2. Click **New Query**
3. Write your SQL and click **Run** (or press `Ctrl+Enter`)

### Apply Migrations

You have several migration files in `supabase/migrations/`. To apply them:

**Option 1: Using Supabase Dashboard (Recommended for beginners)**
1. Go to **SQL Editor**
2. Open each migration file from `supabase/migrations/`
3. Copy the SQL content
4. Paste into SQL Editor and run

**Option 2: Using Supabase CLI**
```bash
# Push all migrations to remote database
supabase db push

# Or push specific migration
supabase db push --file supabase/migrations/your-migration.sql
```

**Option 3: Using psql (if you have direct database access)**
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.ntukhzoocfcrhgusrjdv.supabase.co:5432/postgres" -f supabase/migrations/your-migration.sql
```

## 🔐 Step 5: Database Security (RLS Policies)

Your database uses Row Level Security (RLS) for data protection. To manage policies:

1. Go to **Authentication** → **Policies** in Supabase Dashboard
2. Or use **SQL Editor** to create/modify policies

Example:
```sql
-- View all RLS policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

## 📁 Step 6: Storage Management

To manage file storage (images, videos, documents):

1. Go to **Storage** in the left sidebar
2. Create buckets as needed:
   - `avatars` - for user profile pictures
   - `videos` - for course videos
   - `documents` - for PDFs and other files
3. Set bucket policies for access control

## 🔄 Step 7: Database Backups

Supabase automatically backs up your database, but you can also:

1. **Manual Backup**: 
   - Go to **Database** → **Backups**
   - Click **Download backup**

2. **Export Data**:
   - Use **Table Editor** → Select table → **Export** → Choose format (CSV, JSON)

## 🛠️ Common Database Operations

### View All Tables
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Check Table Structure
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'your_table_name'
ORDER BY ordinal_position;
```

### View RLS Policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

### Reset Database (⚠️ DANGEROUS - Use with caution)
```sql
-- This will delete all data!
TRUNCATE TABLE table_name CASCADE;
```

## 📝 Creating New Migrations

If you need to create a new migration:

**Using Supabase CLI:**
```bash
# Create a new migration file
supabase migration new your_migration_name

# This creates a file in supabase/migrations/
# Edit the file, then push:
supabase db push
```

**Manually:**
1. Create a new file in `supabase/migrations/`
2. Name it: `YYYYMMDDHHMMSS_description.sql`
3. Write your SQL
4. Apply using one of the methods above

## 🔍 Monitoring & Logs

1. **Database Logs**: 
   - Go to **Logs** → **Postgres Logs** in Supabase Dashboard

2. **API Logs**:
   - Go to **Logs** → **API Logs**

3. **Database Performance**:
   - Go to **Database** → **Reports** for query performance

## 🚨 Troubleshooting

### Issue: "Table doesn't exist"
**Solution**: Run the migration files in order from `supabase/migrations/`

### Issue: "Permission denied"
**Solution**: Check RLS policies. You may need to update policies for your user role.

### Issue: "Connection refused"
**Solution**: 
- Verify your `.env` file has correct credentials
- Check if your Supabase project is active
- Verify network connectivity

### Issue: "Migration failed"
**Solution**:
- Check SQL syntax in migration file
- Ensure previous migrations were applied
- Check for conflicting table/function names

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## ✅ Quick Checklist

- [ ] Created Supabase account and project
- [ ] Copied Project URL and anon key
- [ ] Created `.env` file with credentials
- [ ] Applied all migrations from `supabase/migrations/`
- [ ] Verified tables exist in Table Editor
- [ ] Tested database connection in your app
- [ ] Set up storage buckets (if needed)
- [ ] Reviewed RLS policies

---

## 👥 User Management

**Managing users and profiles directly through Supabase:**

- **Full Guide**: See [`SUPABASE_USER_MANAGEMENT.md`](./SUPABASE_USER_MANAGEMENT.md)
- **Quick Access**: 
  - **Authentication** → **Users** (for auth users)
  - **Table Editor** → **`profiles`** (for user profiles)
  - **Table Editor** → **`user_roles`** (for role assignments)

---

**Note**: Your database is now fully managed through Supabase. All database operations in your code use the Supabase client, which connects directly to your Supabase project.
