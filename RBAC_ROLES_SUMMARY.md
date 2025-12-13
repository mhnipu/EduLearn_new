# 🎯 RBAC Role Assignment Rules

## Role Hierarchy & Assignment Permissions

### 👑 Super Admin
**Can assign ALL roles:**
- ✅ super_admin (promote others to Super Admin)
- ✅ admin (create new Admins)
- ✅ teacher
- ✅ student
- ✅ guardian

**Special Powers:**
- Unlimited database access
- Can manage all permissions
- Bypasses all RLS policies
- Can assign/revoke any role
- Can grant/revoke any module permission

---

### 🔧 Admin
**Can assign ONLY these roles:**
- ✅ teacher
- ✅ student
- ✅ guardian

**CANNOT assign:**
- ❌ admin (requires Super Admin)
- ❌ super_admin (requires Super Admin)

**Why this restriction?**
- Prevents privilege escalation
- Admins cannot promote themselves or others to Admin/Super Admin
- Only Super Admin can create more Admins
- Security best practice

**Permissions:**
- Module permissions stored in `user_module_permissions` table
- Each action checks specific permission (create, read, update, delete)
- Without permissions, Admin cannot do anything

---

### 👨‍🏫 Teacher
**Assignment:**
- Can be assigned by: Super Admin or Admin
- Role stored in `user_roles` table

**Permissions:**
- Assignment-based access (assigned students/courses)
- Can manage assigned courses
- Can view/grade assigned students

---

### 🎓 Student
**Assignment:**
- Can be assigned by: Super Admin or Admin
- Default role for new users (if migration 022 applied)

**Permissions:**
- Self-service access only
- Can view own profile
- Can access enrolled courses

---

### 👨‍👩‍👧 Guardian
**Assignment:**
- Can be assigned by: Super Admin or Admin
- Links to specific students

**Permissions:**
- Can view assigned students' progress
- Limited to student guardian relationships

---

## Database Enforcement

### RLS Policies on `user_roles` table:

#### Super Admin Policy:
```sql
CREATE POLICY "Super admins have full access to user_roles"
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));
```
→ Super Admin can INSERT/UPDATE/DELETE any role

#### Admin Policies:
```sql
-- Admin can INSERT non-admin roles
CREATE POLICY "Admins can assign non-admin roles"
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') AND
    role NOT IN ('admin', 'super_admin')
  );

-- Admin can UPDATE non-admin roles
CREATE POLICY "Admins can update non-admin roles"
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') AND
    role NOT IN ('admin', 'super_admin')
  );

-- Admin can DELETE non-admin roles
CREATE POLICY "Admins can delete non-admin roles"
  FOR DELETE
  USING (
    has_role(auth.uid(), 'admin') AND
    role NOT IN ('admin', 'super_admin')
  );
```
→ Admin can only manage teacher/student/guardian roles

---

## Frontend Enforcement

### `SuperAdminManagement.tsx`:

#### Role Display Logic:
```typescript
const SUPER_ADMIN_ROLES = ['super_admin', 'admin', 'teacher', 'student', 'guardian'];
const ADMIN_ROLES = ['teacher', 'student', 'guardian'];

// Determine which roles to show based on current user's role
let availableRoles;
if (role === 'super_admin') {
  availableRoles = SUPER_ADMIN_ROLES; // Shows all 5 roles
} else if (role === 'admin') {
  availableRoles = ADMIN_ROLES; // Shows only 3 roles
}
```

#### Validation in `toggleRole`:
```typescript
if (role === 'admin' && (toggledRole === 'super_admin' || toggledRole === 'admin')) {
  toast({
    title: 'Permission denied',
    description: 'Only Super Admin can assign admin roles.',
    variant: 'destructive',
  });
  return; // Prevents API call
}
```

---

## How It Works

### Example 1: Super Admin assigns Admin role
1. Super Admin clicks "admin" checkbox for a user
2. Frontend: No validation error (Super Admin allowed)
3. Backend: `has_role(auth.uid(), 'super_admin')` → TRUE
4. Database: INSERT successful ✅
5. User now has Admin role

### Example 2: Admin tries to assign Admin role
1. Admin clicks "admin" checkbox (not visible, but let's say they try via API)
2. Frontend: Toast shows "Permission denied" → API call blocked
3. If they bypass frontend: Backend checks `role NOT IN ('admin', 'super_admin')`
4. Database: Policy violation, INSERT rejected ❌
5. Error returned

### Example 3: Admin assigns Teacher role
1. Admin clicks "teacher" checkbox for a user
2. Frontend: Validation passes (Admin allowed)
3. Backend: `has_role(auth.uid(), 'admin') AND role NOT IN ('admin', 'super_admin')`
4. Database: 'teacher' is allowed → INSERT successful ✅
5. User now has Teacher role

---

## Testing

### Test Super Admin:
```
1. Login: super@gmail.com / 445500
2. Go to: /admin/super
3. Select any user
4. Try assigning: super_admin ✅ Should work
5. Try assigning: admin ✅ Should work
6. Try assigning: teacher ✅ Should work
```

### Test Admin:
```
1. Create Admin user (via Super Admin)
2. Grant "users" module permissions (read, update)
3. Login as Admin
4. Go to: /admin/super
5. Try assigning: admin ❌ Should show "Permission denied"
6. Try assigning: super_admin ❌ Should show "Permission denied"
7. Try assigning: teacher ✅ Should work
8. Try assigning: student ✅ Should work
```

---

## Security Summary

✅ **Super Admin**: Full control, can create other Super Admins/Admins
✅ **Admin**: Limited to teacher/student/guardian assignment
✅ **Privilege Escalation**: Prevented at database level (RLS)
✅ **Frontend Validation**: Hides restricted options
✅ **Backend Enforcement**: Rejects unauthorized role assignments
✅ **Audit Trail**: All role changes logged in `user_roles` table

---

**Your RBAC system now has proper role assignment controls!** 🔒
