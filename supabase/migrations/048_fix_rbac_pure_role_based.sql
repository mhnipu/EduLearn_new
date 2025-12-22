-- ============================================
-- FIX RBAC TO PURE ROLE-BASED SYSTEM
-- ============================================
-- This migration transforms the hybrid (user+role) permission system
-- into a pure role-based system where:
-- 1. Permissions are assigned ONLY to roles (role_module_permissions)
-- 2. Users inherit permissions from their roles automatically
-- 3. No user-level permission assignments (except potential future overrides)
-- 4. Frontend queries role permissions via user's roles
-- 5. Admin UI manages role permissions, not user permissions
--
-- PROBLEM FIXED:
-- Previously, has_module_permission() checked user_module_permissions FIRST,
-- then fell back to role permissions. Frontend only queried user_module_permissions.
-- This caused users with the same role to have different permissions.
--
-- SOLUTION:
-- - has_module_permission() now checks role_module_permissions ONLY
-- - New function get_user_effective_permissions() aggregates permissions from roles
-- - Remove trigger that synced role permissions to user_module_permissions
-- - user_module_permissions table kept but deprecated (not used in normal flow)
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Create get_user_effective_permissions() function
-- ============================================
-- This function aggregates all permissions from a user's roles.
-- If a user has multiple roles, permissions are unioned (OR logic).
-- Used by frontend to get user's effective permissions.

CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(_user_id uuid)
RETURNS TABLE (
  module_name text,
  can_create boolean,
  can_read boolean,
  can_update boolean,
  can_delete boolean,
  can_assign boolean,
  can_approve boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.name as module_name,
    -- Union permissions: if ANY role has permission, user has it
    BOOL_OR(rmp.can_create) as can_create,
    BOOL_OR(rmp.can_read) as can_read,
    BOOL_OR(rmp.can_update) as can_update,
    BOOL_OR(rmp.can_delete) as can_delete,
    BOOL_OR(COALESCE(rmp.can_assign, false)) as can_assign,
    BOOL_OR(COALESCE(rmp.can_approve, false)) as can_approve
  FROM public.user_roles ur
  JOIN public.role_module_permissions rmp ON rmp.role = ur.role::text
  JOIN public.modules m ON m.id = rmp.module_id
  WHERE ur.user_id = _user_id
  GROUP BY m.name
  ORDER BY m.name
$$;

COMMENT ON FUNCTION public.get_user_effective_permissions IS 
'Returns effective permissions for a user, aggregated from all their roles. 
If user has multiple roles, permissions are unioned (if ANY role has permission, user has it).
Used by frontend to display user permissions derived from roles.';

-- ============================================
-- STEP 2: Fix has_module_permission() function
-- ============================================
-- PRIORITY CHANGE: Check role_module_permissions FIRST (role-based)
-- Remove user_module_permissions check (or make it override-only for future)
-- This ensures all users with the same role have identical permissions.

CREATE OR REPLACE FUNCTION public.has_module_permission(
  _user_id uuid,
  _module_name text,
  _permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Super admins have all permissions
    public.is_super_admin(_user_id) OR
    -- Check role-based permissions (PRIMARY - users inherit from roles)
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_module_permissions rmp ON rmp.role = ur.role::text
      JOIN public.modules m ON m.id = rmp.module_id
      WHERE ur.user_id = _user_id
        AND m.name = _module_name
        AND (
          (_permission = 'create' AND rmp.can_create = true) OR
          (_permission = 'read' AND rmp.can_read = true) OR
          (_permission = 'update' AND rmp.can_update = true) OR
          (_permission = 'delete' AND rmp.can_delete = true) OR
          (_permission = 'assign' AND COALESCE(rmp.can_assign, false) = true) OR
          (_permission = 'approve' AND COALESCE(rmp.can_approve, false) = true) OR
          -- Fallback: assign can use update/create, approve can use update/delete
          (_permission = 'assign' AND (rmp.can_update = true OR rmp.can_create = true)) OR
          (_permission = 'approve' AND (rmp.can_update = true OR rmp.can_delete = true))
        )
    ) OR
    -- Check custom role permissions (if user has custom role)
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.custom_roles cr ON cr.role_name = ur.role::text
      JOIN public.role_module_permissions rmp ON rmp.role = cr.role_name
      JOIN public.modules m ON m.id = rmp.module_id
      WHERE ur.user_id = _user_id
        AND m.name = _module_name
        AND (
          (_permission = 'create' AND rmp.can_create = true) OR
          (_permission = 'read' AND rmp.can_read = true) OR
          (_permission = 'update' AND rmp.can_update = true) OR
          (_permission = 'delete' AND rmp.can_delete = true) OR
          (_permission = 'assign' AND COALESCE(rmp.can_assign, false) = true) OR
          (_permission = 'approve' AND COALESCE(rmp.can_approve, false) = true) OR
          -- Fallback
          (_permission = 'assign' AND (rmp.can_update = true OR rmp.can_create = true)) OR
          (_permission = 'approve' AND (rmp.can_update = true OR rmp.can_delete = true))
        )
    )
    -- NOTE: user_module_permissions check REMOVED
    -- This was causing users with same role to have different permissions
    -- If needed in future for overrides, can be added back as override-only
$$;

COMMENT ON FUNCTION public.has_module_permission IS 
'Check if user has specific module permission. 
NOW PURELY ROLE-BASED: Checks role_module_permissions via user roles.
Super Admin always returns true. 
All users with the same role will have identical permissions.';

-- ============================================
-- STEP 3: Fix check_module_permission() function (if it exists)
-- ============================================
-- Some older RLS policies may use check_module_permission() instead of has_module_permission()
-- Update it to also use role-based permissions for consistency

CREATE OR REPLACE FUNCTION public.check_module_permission(
  _user_id uuid,
  _module_name text,
  _permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Use the same logic as has_module_permission (role-based only)
  SELECT public.has_module_permission(_user_id, _module_name, _permission)
$$;

COMMENT ON FUNCTION public.check_module_permission IS 
'DEPRECATED: This function is a wrapper around has_module_permission() for backward compatibility.
Consider using has_module_permission() directly. Now uses pure role-based permissions.';

-- ============================================
-- STEP 4: Remove auto-sync trigger
-- ============================================
-- Remove the trigger that synced role permissions to user_module_permissions.
-- This trigger was a workaround and contradicts pure RBAC.
-- With pure RBAC, permissions are read directly from role_module_permissions.

DROP TRIGGER IF EXISTS on_role_assigned_sync_permissions ON public.user_roles;

-- Also drop the functions if they exist (optional, but cleaner)
-- Note: These functions may not exist if they were never created or already removed
-- We use a DO block to safely drop functions regardless of their exact signatures
DO $$
DECLARE
  func_record record;
BEGIN
  -- Drop sync_role_permissions_to_user with any signature
  FOR func_record IN 
    SELECT oid::regprocedure as func_sig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = 'sync_role_permissions_to_user'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_sig || ' CASCADE';
  END LOOP;

  -- Drop handle_role_assignment with any signature
  FOR func_record IN 
    SELECT oid::regprocedure as func_sig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = 'handle_role_assignment'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_sig || ' CASCADE';
  END LOOP;
END $$;

-- ============================================
-- STEP 5: Deprecate user_module_permissions table
-- ============================================
-- Keep the table structure but document that it's deprecated.
-- Existing data is kept but not used in permission checks.
-- Could be used in future for permission overrides if needed.

COMMENT ON TABLE public.user_module_permissions IS 
'DEPRECATED: This table is no longer used in the permission system.
Permissions are now assigned to roles (role_module_permissions) and users inherit from their roles.
This table is kept for potential future override scenarios but is NOT queried in normal permission checks.
To manage permissions, use role_module_permissions table and assign roles to users.';

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ RBAC system fixed to pure role-based';
  RAISE NOTICE '✅ get_user_effective_permissions() function created';
  RAISE NOTICE '✅ has_module_permission() now checks role permissions only';
  RAISE NOTICE '✅ check_module_permission() updated to use role-based permissions';
  RAISE NOTICE '✅ Auto-sync trigger removed';
  RAISE NOTICE '✅ user_module_permissions table deprecated (not used)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 IMPORTANT CHANGES:';
  RAISE NOTICE '   1. Permissions are now assigned to ROLES, not users';
  RAISE NOTICE '   2. Users inherit permissions from their assigned roles';
  RAISE NOTICE '   3. All users with the same role have identical permissions';
  RAISE NOTICE '   4. To change permissions, update role_module_permissions table';
  RAISE NOTICE '   5. Frontend should use get_user_effective_permissions() function';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 NEXT STEPS:';
  RAISE NOTICE '   1. Update frontend fetchUserPermissions() to use get_user_effective_permissions()';
  RAISE NOTICE '   2. Update admin UI to manage role permissions instead of user permissions';
  RAISE NOTICE '   3. Test that users with same role have same permissions';
END $$;

COMMIT;
