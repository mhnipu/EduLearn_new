# 🚀 Migration from Lovable to Supabase - Complete Guide

## 🎯 Overview

This guide helps you migrate your EDulearn platform from Lovable cloud storage to Supabase for both data and media files.

---

## ⚠️ Current Issue: `custom_roles` Table Missing

**Error:**
```json
{
  "code": "PGRST205",
  "message": "Could not find the table 'public.custom_roles' in the schema cache",
  "hint": "Perhaps you meant the table 'public.user_roles'"
}
```

**Reason:** The `custom_roles` table hasn't been created in your Supabase database yet.

---

## 🔧 Quick Fix: Create `custom_roles` Table

### Option 1: Using Supabase SQL Editor (Recommended)

**Step 1:** Open Supabase Dashboard
```
Go to: https://supabase.com/dashboard
→ Select your project
→ Click "SQL Editor" in left sidebar
```

**Step 2:** Copy and paste this SQL:

```sql
-- Create custom_roles table for SuperAdmin to create custom roles
CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_custom_roles_name ON custom_roles(role_name);
CREATE INDEX IF NOT EXISTS idx_custom_roles_created_by ON custom_roles(created_by);

-- Enable RLS
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super admins have full access to custom roles" ON custom_roles;
DROP POLICY IF EXISTS "Admins can read custom roles" ON custom_roles;

-- Policy: Super admins can do everything
CREATE POLICY "Super admins have full access to custom roles"
  ON custom_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

-- Policy: Admins can only read custom roles
CREATE POLICY "Admins can read custom roles"
  ON custom_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_custom_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS custom_roles_updated_at ON custom_roles;

CREATE TRIGGER custom_roles_updated_at
  BEFORE UPDATE ON custom_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_roles_updated_at();

-- Comment on table
COMMENT ON TABLE custom_roles IS 'Custom roles created by super admins that can be assigned by admins';
```

**Step 3:** Click "Run" button (or press Ctrl+Enter)

**Step 4:** Verify
```sql
SELECT * FROM custom_roles;
```
Should return empty result (no error).

**Step 5:** Hard refresh your browser
```
Ctrl + Shift + R
```

---

## 📦 Complete Lovable to Supabase Migration

### Part 1: Database Schema Migration

Since Lovable uses its own backend, you need to ensure all tables exist in Supabase.

#### 1.1 Check Existing Tables

**Run in Supabase SQL Editor:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected Tables:**
- `profiles`
- `user_roles`
- `modules`
- `user_module_permissions`
- `courses`
- `lessons`
- `videos`
- `books`
- `assignments`
- `course_enrollments`
- `certificates`
- `bookmarks`
- `ratings`
- `categories`
- `course_categories`
- `activity_feed`
- `student_guardians`
- `custom_roles` ← **NEW**

#### 1.2 Missing Tables?

If any tables are missing, check the migrations folder:
```
smartlearn-mvp/supabase/migrations/
```

Run all migration files in chronological order (oldest first).

---

### Part 2: Media File Migration

#### 2.1 Create Supabase Storage Buckets

**Go to Supabase Dashboard → Storage**

Create these buckets:
1. **`avatars`** - User profile pictures
2. **`course-thumbnails`** - Course images
3. **`videos`** - Video content
4. **`books`** - PDF/ebook files
5. **`certificates`** - Generated certificates
6. **`uploads`** - General uploads

**Bucket Settings:**
- Public: Yes (for avatars, thumbnails)
- File size limit: Adjust as needed
- Allowed MIME types: Configure based on content

#### 2.2 Set Storage Policies

**For Public Buckets (avatars, course-thumbnails):**
```sql
-- Allow public read
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Allow authenticated upload
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );
```

**For Private Buckets (videos, books):**
```sql
-- Only authenticated users can read
CREATE POLICY "Authenticated Read"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'videos' );

-- Admins and teachers can upload
CREATE POLICY "Admin Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin', 'teacher')
  )
);
```

#### 2.3 Update File URLs in Code

**Find all Lovable storage URLs:**
```typescript
// OLD (Lovable)
const imageUrl = 'https://lovable.app/storage/...'

// NEW (Supabase)
const imageUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
```

**Search in your codebase:**
```bash
# Find Lovable URLs
grep -r "lovable" src/
```

**Replace with Supabase:**
```typescript
// For public files
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl('path/to/file.jpg')

// For private files
const { data, error } = await supabase.storage
  .from('videos')
  .createSignedUrl('path/to/video.mp4', 3600) // 1 hour expiry
```

---

### Part 3: Data Migration

#### 3.1 Export Data from Lovable

If you have existing data in Lovable:

1. **Export as CSV/JSON**
   - Use Lovable's export feature
   - Download all tables

2. **Or use API** (if available)
   ```javascript
   // Example API call to export
   const response = await fetch('https://lovable-api/export', {
     headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
   })
   const data = await response.json()
   ```

#### 3.2 Import to Supabase

**Option 1: CSV Import**
```
Supabase Dashboard → Table Editor
→ Select table
→ Click "Insert" → "Import data" → Upload CSV
```

**Option 2: SQL Insert**
```sql
INSERT INTO profiles (id, full_name, created_at)
VALUES 
  ('uuid-1', 'John Doe', NOW()),
  ('uuid-2', 'Jane Smith', NOW());
```

**Option 3: Batch Insert Script**
```typescript
const { data, error } = await supabase
  .from('profiles')
  .insert([
    { full_name: 'John Doe' },
    { full_name: 'Jane Smith' }
  ])
```

---

### Part 4: Update Environment Variables

**In your `.env` file:**

```bash
# OLD (Lovable)
VITE_LOVABLE_URL=https://lovable.app/api
VITE_STORAGE_URL=https://lovable.app/storage

# NEW (Supabase)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Update in code:**
```typescript
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## 🔄 Migration Checklist

### Phase 1: Setup ✅
- [ ] Create Supabase project
- [ ] Note project URL and anon key
- [ ] Update `.env` file

### Phase 2: Schema ✅
- [ ] Run all migration files in SQL Editor
- [ ] Create `custom_roles` table (see above)
- [ ] Verify all tables exist
- [ ] Check RLS policies are active

### Phase 3: Storage 🗂️
- [ ] Create storage buckets
- [ ] Configure bucket policies
- [ ] Set file size limits

### Phase 4: Data 📊
- [ ] Export data from Lovable (if any)
- [ ] Import to Supabase tables
- [ ] Verify data integrity
- [ ] Update file URLs

### Phase 5: Code Updates 💻
- [ ] Update Supabase client config
- [ ] Replace Lovable storage URLs
- [ ] Test all file uploads
- [ ] Test all file downloads
- [ ] Test authentication

### Phase 6: Testing 🧪
- [ ] Test user login
- [ ] Test file upload/download
- [ ] Test role assignments
- [ ] Test permissions
- [ ] Test all dashboards

---

## 🛠️ Troubleshooting

### Issue 1: "Table not found"
**Solution:** Run the table creation SQL in SQL Editor

### Issue 2: "RLS policy violation"
**Solution:** Check if user has correct role in `user_roles` table

### Issue 3: "Storage policy violation"
**Solution:** Update storage policies to allow your use case

### Issue 4: "File upload fails"
**Solution:** 
1. Check bucket exists
2. Verify MIME type is allowed
3. Check file size limit

---

## 📝 Important Notes

### Authentication
- Lovable uses its own auth
- Supabase has built-in auth
- You may need to migrate users:
  ```sql
  -- Create auth user (run in Supabase dashboard)
  -- Then link to profile
  INSERT INTO profiles (id, full_name)
  VALUES (auth.uid(), 'User Name');
  ```

### Real-time Subscriptions
- Lovable: Managed automatically
- Supabase: Need to enable per table
  ```sql
  ALTER TABLE activity_feed REPLICA IDENTITY FULL;
  ```

### File Storage
- Lovable: Automatic CDN
- Supabase: Need to configure
  - Use CDN if needed
  - Set proper CORS policies

---

## 🚀 After Migration

### 1. Clean Up Old Code
```bash
# Remove Lovable references
grep -r "lovable" src/ | wc -l  # Should be 0
```

### 2. Update Documentation
- Update setup instructions
- Document new Supabase setup
- Update team wiki

### 3. Monitor
- Check Supabase dashboard for usage
- Monitor error logs
- Track storage usage

---

## 📧 Need Help?

### Supabase Support
- Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com

### Common Commands

**Check database connection:**
```typescript
const { data, error } = await supabase.from('profiles').select('count')
console.log('Connected:', !error)
```

**Check storage:**
```typescript
const { data: buckets } = await supabase.storage.listBuckets()
console.log('Buckets:', buckets)
```

---

## ✅ Success Criteria

Migration is complete when:
- ✅ All tables exist in Supabase
- ✅ All RLS policies active
- ✅ All storage buckets created
- ✅ All files migrated
- ✅ All URLs updated
- ✅ No Lovable references in code
- ✅ All features working
- ✅ Tests passing

---

**🎉 Happy Migrating! Your data will be safe and fast in Supabase! 🚀**

