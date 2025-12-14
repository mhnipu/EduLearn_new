-- ============================================
-- ROLE-BASED PERMISSION SYSTEM
-- ============================================
-- This migration adds support for assigning permissions to roles,
-- so when a role is assigned to a user, they automatically inherit
-- the role's permissions.

-- ============================================
-- STEP 1: Create role_module_permissions table
-- ============================================

CREATE TABLE IF NOT EXISTS public.role_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL, -- Can be app_role or custom role name
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  can_create BOOLEAN DEFAULT false,
  can_read BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_assign BOOLEAN DEFAULT false,
  can_approve BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, module_id)
);

-- Enable RLS
ALTER TABLE public.role_module_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Create RLS policies for role_module_permissions
-- ============================================

-- Super admins can manage all role permissions
CREATE POLICY "Super admins can manage role permissions"
ON public.role_module_permissions FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Admins can view role permissions
CREATE POLICY "Admins can view role permissions"
ON public.role_module_permissions FOR SELECT
USING (is_admin_or_higher(auth.uid()));

-- ============================================
-- STEP 3: Update has_module_permission to check role permissions
-- ============================================

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
    is_super_admin(_user_id) OR
    -- Check user-specific module permission (direct assignment)
    EXISTS (
      SELECT 1
      FROM public.user_module_permissions ump
      JOIN public.modules m ON m.id = ump.module_id
      WHERE ump.user_id = _user_id
        AND m.name = _module_name
        AND (
          (_permission = 'create' AND ump.can_create = true) OR
          (_permission = 'read' AND ump.can_read = true) OR
          (_permission = 'update' AND ump.can_update = true) OR
          (_permission = 'delete' AND ump.can_delete = true) OR
          (_permission = 'assign' AND (ump.can_update = true OR ump.can_create = true)) OR
          (_permission = 'approve' AND (ump.can_update = true OR ump.can_delete = true))
        )
    ) OR
    -- Check role-based permissions (inherited from roles)
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
          (_permission = 'assign' AND rmp.can_assign = true) OR
          (_permission = 'approve' AND rmp.can_approve = true)
        )
    ) OR
    -- Check custom role permissions
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
          (_permission = 'assign' AND rmp.can_assign = true) OR
          (_permission = 'approve' AND rmp.can_approve = true)
        )
    )
$$;

-- ============================================
-- STEP 4: Create function to sync role permissions to user
-- ============================================

CREATE OR REPLACE FUNCTION public.sync_role_permissions_to_user(
  _user_id uuid,
  _role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _module_record RECORD;
BEGIN
  -- For each module permission in the role, grant to user
  FOR _module_record IN
    SELECT module_id, can_create, can_read, can_update, can_delete
    FROM role_module_permissions
    WHERE role = _role
  LOOP
    -- Insert or update user permission (role permissions take precedence if user already has some)
    INSERT INTO user_module_permissions (user_id, module_id, can_create, can_read, can_update, can_delete)
    VALUES (_user_id, _module_record.module_id, _module_record.can_create, _module_record.can_read, 
            _module_record.can_update, _module_record.can_delete)
    ON CONFLICT (user_id, module_id) 
    DO UPDATE SET
      can_create = COALESCE(user_module_permissions.can_create, _module_record.can_create),
      can_read = COALESCE(user_module_permissions.can_read, _module_record.can_read),
      can_update = COALESCE(user_module_permissions.can_update, _module_record.can_update),
      can_delete = COALESCE(user_module_permissions.can_delete, _module_record.can_delete);
  END LOOP;
END;
$$;

-- ============================================
-- STEP 5: Create trigger to auto-sync permissions when role is assigned
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_role_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a role is assigned, sync its permissions to the user
  IF TG_OP = 'INSERT' THEN
    PERFORM sync_role_permissions_to_user(NEW.user_id, NEW.role::text);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_role_assigned_sync_permissions ON public.user_roles;
CREATE TRIGGER on_role_assigned_sync_permissions
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_role_assignment();

-- ============================================
-- STEP 6: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_role_module_permissions_role ON role_module_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_module_permissions_module ON role_module_permissions(module_id);

-- ============================================
-- STEP 7: Add update trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_role_module_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER role_module_permissions_updated_at
  BEFORE UPDATE ON role_module_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_role_module_permissions_updated_at();

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Role-based permission system created';
  RAISE NOTICE '✅ role_module_permissions table created';
  RAISE NOTICE '✅ has_module_permission() updated to check role permissions';
  RAISE NOTICE '✅ Auto-sync trigger created for role assignments';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Super Admins can now assign permissions to roles.';
  RAISE NOTICE '⚠️  When a role is assigned to a user, they automatically inherit the role''s permissions.';
END $$;
