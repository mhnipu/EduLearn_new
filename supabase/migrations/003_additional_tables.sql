-- Create helper functions for role hierarchy
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_higher(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'admin')
  )
$$;

-- Create student_guardians table
CREATE TABLE public.student_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, guardian_id)
);

ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;

-- RLS policies for student_guardians
CREATE POLICY "Super admins and admins can manage guardian relationships"
ON public.student_guardians
FOR ALL
USING (is_admin_or_higher(auth.uid()))
WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Guardians can view their assigned students"
ON public.student_guardians
FOR SELECT
USING (auth.uid() = guardian_id);

CREATE POLICY "Students can view their guardians"
ON public.student_guardians
FOR SELECT
USING (auth.uid() = student_id);

-- Update user_roles policies
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Admins can insert non-admin roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update non-admin roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin') AND role NOT IN ('super_admin', 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin') AND role NOT IN ('super_admin', 'admin'));

CREATE POLICY "Admins can delete non-admin roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin') AND role NOT IN ('super_admin', 'admin'));

-- Update profiles policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);