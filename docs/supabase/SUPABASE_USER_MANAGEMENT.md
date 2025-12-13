# 👥 Managing Users & Profiles via Supabase Dashboard

This guide shows you how to manage users and profiles directly through Supabase Dashboard instead of through the application interface.

## 📋 Table of Contents

1. [Viewing Users](#viewing-users)
2. [Creating Users](#creating-users)
3. [Managing Profiles](#managing-profiles)
4. [Assigning Roles](#assigning-roles)
5. [Updating User Information](#updating-user-information)
6. [Resetting Passwords](#resetting-passwords)
7. [Deleting Users](#deleting-users)
8. [Bulk Operations](#bulk-operations)

---

## 🔍 Viewing Users

### Option 1: View Auth Users (Authentication)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **Users** in the left sidebar
4. You'll see all registered users with:
   - Email address
   - User ID (UUID)
   - Created date
   - Last sign in
   - Email verification status

### Option 2: View Profiles (Table Editor)

1. Go to **Table Editor** in the left sidebar
2. Select the **`profiles`** table
3. You'll see:
   - User ID (links to `auth.users`)
   - Full name
   - Avatar URL
   - Created/Updated timestamps

### Option 3: View Users with Roles (SQL Query)

Run this query in **SQL Editor**:

```sql
SELECT 
  u.id,
  u.email,
  u.created_at as user_created_at,
  u.last_sign_in_at,
  u.email_confirmed_at,
  p.full_name,
  p.avatar_url,
  p.created_at as profile_created_at,
  array_agg(ur.role) as roles
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
GROUP BY u.id, u.email, u.created_at, u.last_sign_in_at, u.email_confirmed_at, 
         p.full_name, p.avatar_url, p.created_at
ORDER BY u.created_at DESC;
```

---

## ➕ Creating Users

### Method 1: Create User via Supabase Dashboard (Recommended)

1. Go to **Authentication** → **Users**
2. Click **"Add user"** or **"Invite user"** button
3. Fill in:
   - **Email**: User's email address
   - **Password**: Set a temporary password (user should change it)
   - **Auto Confirm User**: ✅ Check this to skip email verification
   - **User Metadata**: Add `full_name` in JSON format:
     ```json
     {
       "full_name": "John Doe"
     }
     ```
4. Click **"Create user"**

**What happens automatically:**
- A user is created in `auth.users`
- A trigger automatically creates a profile in `profiles` table
- The profile will have the `full_name` from metadata

### Method 2: Create User via SQL (Advanced)

Run this in **SQL Editor**:

```sql
-- First, create the auth user (requires service role key or admin access)
-- Note: This requires direct database access or using Supabase Admin API

-- After user is created, manually create profile if trigger didn't fire:
INSERT INTO public.profiles (id, full_name)
VALUES (
  'user-uuid-here',  -- Replace with actual user ID from auth.users
  'John Doe'
);
```

### Method 3: Import Users via CSV

1. Prepare a CSV file with columns:
   - `email`
   - `password` (or leave empty for users to set)
   - `full_name`
2. Go to **Authentication** → **Users**
3. Click **"Import users"** (if available)
4. Upload your CSV file

---

## 👤 Managing Profiles

### View Profile

1. Go to **Table Editor** → **`profiles`** table
2. Find the user by ID or search by name
3. Click on a row to view details

### Update Profile

**Option 1: Using Table Editor**
1. Go to **Table Editor** → **`profiles`**
2. Click on the row you want to edit
3. Modify:
   - `full_name`
   - `avatar_url`
4. Click **"Save"**

**Option 2: Using SQL Editor**
```sql
UPDATE public.profiles
SET 
  full_name = 'Updated Name',
  avatar_url = 'https://example.com/avatar.jpg',
  updated_at = NOW()
WHERE id = 'user-uuid-here';
```

### Create Profile for Existing User

If a user exists in `auth.users` but doesn't have a profile:

```sql
INSERT INTO public.profiles (id, full_name)
VALUES (
  'user-uuid-from-auth-users',
  'User Full Name'
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name;
```

---

## 🎭 Assigning Roles

### View Current Roles

**Option 1: Table Editor**
1. Go to **Table Editor** → **`user_roles`** table
2. Filter by `user_id` to see a user's roles

**Option 2: SQL Query**
```sql
SELECT 
  ur.user_id,
  u.email,
  p.full_name,
  ur.role,
  ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.user_id = 'user-uuid-here';
```

### Assign a Role

**Option 1: Using Table Editor**
1. Go to **Table Editor** → **`user_roles`**
2. Click **"Insert"** → **"Insert row"**
3. Fill in:
   - `user_id`: User's UUID (from `auth.users`)
   - `role`: One of: `admin`, `teacher`, `student`, `guardian`, `super_admin`
4. Click **"Save"**

**Option 2: Using SQL Editor**
```sql
-- Assign a single role
INSERT INTO public.user_roles (user_id, role)
VALUES ('user-uuid-here', 'teacher')
ON CONFLICT (user_id, role) DO NOTHING;

-- Assign multiple roles to a user
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('user-uuid-here', 'teacher'),
  ('user-uuid-here', 'student')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Remove a Role

**Using SQL Editor:**
```sql
DELETE FROM public.user_roles
WHERE user_id = 'user-uuid-here' 
  AND role = 'student';
```

### Change User's Primary Role

Users can have multiple roles. To change which role is primary, you can:
1. Remove old roles
2. Add new roles
3. The system will use the highest priority role (super_admin > admin > teacher > guardian > student)

---

## ✏️ Updating User Information

### Update Email Address

1. Go to **Authentication** → **Users**
2. Find the user
3. Click on the user
4. Click **"Edit"** or the edit icon
5. Update the email
6. Click **"Save"**

**Note**: User will need to verify the new email if email confirmation is enabled.

### Update Password

See [Resetting Passwords](#resetting-passwords) section below.

### Update Profile Information

See [Managing Profiles](#managing-profiles) section above.

---

## 🔑 Resetting Passwords

### Method 1: Send Password Reset Email

1. Go to **Authentication** → **Users**
2. Find the user
3. Click on the user
4. Click **"Send password reset email"** or similar option

### Method 2: Set Password Directly (Admin)

1. Go to **Authentication** → **Users**
2. Find the user
3. Click on the user
4. Click **"Reset password"** or **"Set password"**
5. Enter new password
6. Click **"Save"**

**Note**: User should be prompted to change password on next login.

### Method 3: Using SQL (Requires Admin Access)

```sql
-- This requires using Supabase Admin API or service role
-- Direct SQL password updates are not recommended for security
```

---

## 🗑️ Deleting Users

### Delete User (Cascades to Profile and Roles)

**Option 1: Using Authentication Dashboard**
1. Go to **Authentication** → **Users**
2. Find the user
3. Click on the user
4. Click **"Delete user"** or trash icon
5. Confirm deletion

**What gets deleted automatically (due to CASCADE):**
- User from `auth.users`
- Profile from `profiles`
- All roles from `user_roles`
- All related data (enrollments, progress, etc.)

**Option 2: Using SQL Editor**
```sql
-- Delete user (cascades to all related data)
DELETE FROM auth.users
WHERE id = 'user-uuid-here';
```

### Delete Profile Only (Keep Auth User)

```sql
DELETE FROM public.profiles
WHERE id = 'user-uuid-here';
```

**Note**: This is not recommended as it breaks the relationship. Better to delete the entire user.

---

## 📦 Bulk Operations

### Bulk Assign Roles

```sql
-- Assign 'student' role to multiple users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'student'
FROM auth.users
WHERE id IN (
  'user-uuid-1',
  'user-uuid-2',
  'user-uuid-3'
)
ON CONFLICT (user_id, role) DO NOTHING;
```

### Bulk Update Profiles

```sql
-- Update multiple profiles
UPDATE public.profiles
SET 
  full_name = CASE id
    WHEN 'user-uuid-1' THEN 'John Doe'
    WHEN 'user-uuid-2' THEN 'Jane Smith'
    WHEN 'user-uuid-3' THEN 'Bob Johnson'
  END,
  updated_at = NOW()
WHERE id IN ('user-uuid-1', 'user-uuid-2', 'user-uuid-3');
```

### Bulk Delete Users

```sql
-- Delete multiple users (use with extreme caution!)
DELETE FROM auth.users
WHERE id IN (
  'user-uuid-1',
  'user-uuid-2',
  'user-uuid-3'
);
```

---

## 🔍 Useful SQL Queries

### Find Users Without Profiles

```sql
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
```

### Find Users Without Roles

```sql
SELECT u.id, u.email, p.full_name
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL;
```

### Find All Admins

```sql
SELECT 
  u.id,
  u.email,
  p.full_name,
  ur.role,
  ur.created_at as role_assigned_at
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.role IN ('admin', 'super_admin')
ORDER BY ur.role, p.full_name;
```

### Count Users by Role

```sql
SELECT 
  role,
  COUNT(*) as user_count
FROM public.user_roles
GROUP BY role
ORDER BY user_count DESC;
```

### Find Recently Created Users

```sql
SELECT 
  u.id,
  u.email,
  p.full_name,
  u.created_at,
  u.last_sign_in_at,
  array_agg(ur.role) as roles
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.created_at > NOW() - INTERVAL '7 days'
GROUP BY u.id, u.email, p.full_name, u.created_at, u.last_sign_in_at
ORDER BY u.created_at DESC;
```

---

## ⚠️ Important Notes

### Security Considerations

1. **Service Role Key**: Never expose your service role key in client-side code
2. **RLS Policies**: Row Level Security policies protect your data. Be careful when modifying them
3. **Password Security**: Always use strong passwords when creating users manually
4. **Email Verification**: Consider requiring email verification for security

### Data Integrity

1. **Cascade Deletes**: Deleting a user from `auth.users` will cascade delete related data
2. **Foreign Keys**: The `profiles.id` must match `auth.users.id`
3. **Role Constraints**: Roles must be one of the enum values: `admin`, `teacher`, `student`, `guardian`, `super_admin`

### Best Practices

1. **Always create profiles**: Every user in `auth.users` should have a corresponding profile
2. **Assign roles explicitly**: Don't leave users without roles
3. **Use transactions**: For bulk operations, wrap in transactions
4. **Backup before bulk deletes**: Always backup before deleting multiple users
5. **Audit trail**: Consider logging user management actions

---

## 🆘 Troubleshooting

### Issue: User created but no profile

**Solution**: 
```sql
INSERT INTO public.profiles (id, full_name)
VALUES (
  'user-uuid-here',
  COALESCE(
    (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = 'user-uuid-here'),
    'Unknown User'
  )
);
```

### Issue: User can't login after role assignment

**Solution**: 
- Check if user has at least one role assigned
- Verify RLS policies allow the user to access required tables
- Check if user's email is confirmed

### Issue: Profile exists but user can't be found in auth.users

**Solution**: 
- This shouldn't happen due to foreign key constraints
- If it does, the profile is orphaned and should be deleted:
```sql
DELETE FROM public.profiles
WHERE id NOT IN (SELECT id FROM auth.users);
```

---

## 📚 Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Table Editor Guide](https://supabase.com/docs/guides/database/tables)
- [Supabase SQL Editor Guide](https://supabase.com/docs/guides/database/overview)

---

**Your users and profiles are now fully manageable through Supabase Dashboard!** 🎉
