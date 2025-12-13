-- Migration 021: Bootstrap super admin role for default account
-- Purpose: Allow the fixed email super@gmail.com to self-assign super_admin role (one-time),
--          without exposing service_role keys to the frontend.
-- Notes: This is intended for development/initial setup. Review before production.

CREATE OR REPLACE FUNCTION public.bootstrap_super_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT u.email INTO v_email
  FROM auth.users u
  WHERE u.id = v_uid;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  IF lower(v_email) <> 'super@gmail.com' THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  -- Ensure super_admin role exists for this user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Optional: remove default student role for this account
  DELETE FROM public.user_roles
  WHERE user_id = v_uid AND role = 'student';
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_super_admin() TO authenticated;

