-- Create modules table for feature-level permissions
CREATE TABLE public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create user_module_permissions for granular CRUD access
CREATE TABLE public.user_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  can_create boolean DEFAULT false,
  can_read boolean DEFAULT false,
  can_update boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- Enable RLS
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

-- Seed default modules
INSERT INTO public.modules (name, description) VALUES
  ('courses', 'Course management'),
  ('lessons', 'Lesson content management'),
  ('users', 'User management'),
  ('analytics', 'Analytics and reporting'),
  ('library', 'E-Library content (books & videos)'),
  ('quizzes', 'Quiz and assignment management'),
  ('certificates', 'Certificate generation'),
  ('comments', 'Comments and ratings');

-- RLS policies for modules
CREATE POLICY "Everyone can view modules" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Super admins can manage modules" ON public.modules FOR ALL USING (is_super_admin(auth.uid()));

-- RLS policies for user_module_permissions
CREATE POLICY "Users can view own permissions" ON public.user_module_permissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins can manage all permissions" ON public.user_module_permissions FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "Admins can view all permissions" ON public.user_module_permissions FOR SELECT USING (is_admin_or_higher(auth.uid()));

-- Create function to check module permission
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
    -- Check specific module permission
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
          (_permission = 'delete' AND ump.can_delete = true)
        )
    )
$$;

-- Create function to get all user roles (for multi-role support)
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS SETOF app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

-- Update handle_new_user to NOT assign default role (users signup without role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile only, no default role
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  RETURN NEW;
END;
$$;