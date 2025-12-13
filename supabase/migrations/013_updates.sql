-- Allow admins to view all user roles (needed for teacher selector)
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (is_admin_or_higher(auth.uid()));