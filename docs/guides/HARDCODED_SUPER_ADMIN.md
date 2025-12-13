# 👑 Hardcoded Super Admin User

## 📋 Overview

A special **hardcoded super admin user** has been created that:
- ✅ **NOT saved in database** - exists only in code
- ✅ **Full permissions** - can manage everything
- ✅ **Can assign roles** - assign any role to any user
- ✅ **Can create users** - create new users in the system
- ✅ **Bypasses database** - doesn't require Supabase authentication

---

## 🔑 Login Credentials

```
Email: super@gmail.com
Password: 445500
```

---

## 🎯 Features

### Full Access
- ✅ Access all dashboards
- ✅ Manage all users
- ✅ Assign any role (super_admin, admin, teacher, student, guardian)
- ✅ Create new users
- ✅ Edit user permissions
- ✅ Manage courses, enrollments, assignments
- ✅ Access all modules and features

### Database Operations
- ✅ Can perform all database operations
- ✅ Can assign roles via `user_roles` table
- ✅ Can create users via Supabase Auth
- ✅ Can manage permissions via `user_module_permissions` table

---

## 🔧 How It Works

### Authentication Flow

1. **User enters credentials:**
   - Email: `super@gmail.com`
   - Password: `445500`

2. **System checks:**
   - If credentials match hardcoded admin → bypass Supabase
   - Create mock user object
   - Set role to `super_admin`
   - Grant all permissions

3. **Session Management:**
   - Session stored in localStorage
   - Persists across page refreshes
   - No database lookup required

### Permission System

```typescript
// Hardcoded admin always returns true for all permissions
hasPermission(moduleName, permission) → always true
hasRole('super_admin') → always true
```

---

## 📍 Location in Code

**File:** `src/lib/auth.tsx`

**Key Constants:**
```typescript
const HARDCODED_SUPER_ADMIN = {
  email: 'super@gmail.com',
  password: '445500',
  id: 'hardcoded-super-admin-id',
  role: 'super_admin',
};
```

---

## 🚀 Usage

### Login

1. Go to: `/auth`
2. Enter:
   - Email: `super@gmail.com`
   - Password: `445500`
3. Click **Sign In**
4. You'll be redirected to Super Admin Dashboard

### Access Features

After login, you can:
- **Assign Roles**: Go to User Management → Assign any role
- **Create Users**: Create new users in the system
- **Manage Permissions**: Edit user module permissions
- **Access All Dashboards**: Switch between admin/teacher/student views

---

## ⚠️ Important Notes

### Security
- ⚠️ **This is a hardcoded backdoor** - use only for development/testing
- ⚠️ **Change credentials** before production deployment
- ⚠️ **Consider removing** in production or securing it better

### Database
- ✅ **User is NOT in database** - won't appear in `auth.users` table
- ✅ **Can still manage database** - all operations work normally
- ✅ **Session persists** - stored in localStorage

### Limitations
- ❌ **Can't be edited** - credentials are hardcoded
- ❌ **No profile** - won't appear in `profiles` table
- ❌ **No user_roles entry** - role is set in code only

---

## 🔍 Verification

### Check if Hardcoded Admin is Active

In browser console (F12):
```javascript
// Check localStorage
localStorage.getItem('hardcoded_super_admin')
// Should return: "true"

// Check auth context
// Role should be: "super_admin"
// Permissions should be: [] (empty = all permissions)
```

### Console Logs

When logging in, you'll see:
```
🔐 Hardcoded Super Admin detected - bypassing database
✅ Hardcoded Super Admin logged in successfully
👑 Full permissions granted - can manage everything
📊 This user is NOT saved in database
```

---

## 🛠️ Customization

### Change Credentials

Edit `src/lib/auth.tsx`:
```typescript
const HARDCODED_SUPER_ADMIN = {
  email: 'your-email@gmail.com',  // Change this
  password: 'your-password',       // Change this
  id: 'hardcoded-super-admin-id',
  role: 'super_admin',
};
```

### Disable Hardcoded Admin

Comment out the check in `signIn` function:
```typescript
// if (email.toLowerCase().trim() === HARDCODED_SUPER_ADMIN.email && password === HARDCODED_SUPER_ADMIN.password) {
//   // ... hardcoded admin code
// }
```

---

## ✅ Testing

### Test Login
1. Go to `/auth`
2. Login with: `super@gmail.com` / `445500`
3. Should redirect to `/dashboard/admin`
4. Check console for success messages

### Test Permissions
1. Try accessing User Management
2. Try assigning roles
3. Try creating users
4. All should work! ✅

### Test Database Operations
1. Assign role to a user
2. Check `user_roles` table in Supabase
3. Role should be assigned successfully
4. Hardcoded admin can manage database even though not in it

---

## 📋 Quick Reference

- **Email**: `super@gmail.com`
- **Password**: `445500`
- **Role**: `super_admin`
- **Permissions**: All (full access)
- **Database**: NOT saved
- **Location**: `src/lib/auth.tsx`

---

**Use this account to set up your system and assign roles to other users!** 🚀
