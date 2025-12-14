-- ============================================
-- LOGIN HISTORY AND SESSION PERSISTENCE
-- ============================================
-- This migration creates a login history table to track user login events
-- and ensures proper session persistence configuration.

-- ============================================
-- STEP 1: Create login_history table
-- ============================================

CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_method TEXT NOT NULL CHECK (login_method IN ('email', 'phone')),
  login_identifier TEXT NOT NULL, -- email or phone number
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  browser TEXT,
  os TEXT,
  login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  session_duration INTERVAL,
  is_active BOOLEAN DEFAULT true, -- true if session is still active
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_login_at ON public.login_history(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_active ON public.login_history(user_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Create RLS policies for login_history
-- ============================================

-- Users can view their own login history
CREATE POLICY "Users can view own login history"
  ON public.login_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- System can insert login history (via trigger or function)
CREATE POLICY "System can insert login history"
  ON public.login_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own login history (for logout tracking)
CREATE POLICY "Users can update own login history"
  ON public.login_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all login history
CREATE POLICY "Admins can view all login history"
  ON public.login_history FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR
    (public.has_role(auth.uid(), 'admin') AND public.has_module_permission(auth.uid(), 'users', 'read'))
  );

-- ============================================
-- STEP 3: Create function to record login
-- ============================================

CREATE OR REPLACE FUNCTION public.record_login(
  _user_id UUID,
  _login_method TEXT,
  _login_identifier TEXT,
  _ip_address TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _login_id UUID;
  _device_type TEXT;
  _browser TEXT;
  _os TEXT;
BEGIN
  -- Parse user agent to extract device info (basic parsing)
  IF _user_agent IS NOT NULL THEN
    -- Detect device type
    IF _user_agent ILIKE '%mobile%' OR _user_agent ILIKE '%android%' OR _user_agent ILIKE '%iphone%' THEN
      _device_type := 'mobile';
    ELSIF _user_agent ILIKE '%tablet%' OR _user_agent ILIKE '%ipad%' THEN
      _device_type := 'tablet';
    ELSE
      _device_type := 'desktop';
    END IF;

    -- Detect browser (basic)
    IF _user_agent ILIKE '%chrome%' AND _user_agent NOT ILIKE '%edg%' THEN
      _browser := 'Chrome';
    ELSIF _user_agent ILIKE '%firefox%' THEN
      _browser := 'Firefox';
    ELSIF _user_agent ILIKE '%safari%' AND _user_agent NOT ILIKE '%chrome%' THEN
      _browser := 'Safari';
    ELSIF _user_agent ILIKE '%edg%' THEN
      _browser := 'Edge';
    ELSE
      _browser := 'Other';
    END IF;

    -- Detect OS (basic)
    IF _user_agent ILIKE '%windows%' THEN
      _os := 'Windows';
    ELSIF _user_agent ILIKE '%mac%' OR _user_agent ILIKE '%darwin%' THEN
      _os := 'macOS';
    ELSIF _user_agent ILIKE '%linux%' THEN
      _os := 'Linux';
    ELSIF _user_agent ILIKE '%android%' THEN
      _os := 'Android';
    ELSIF _user_agent ILIKE '%iphone%' OR _user_agent ILIKE '%ipad%' THEN
      _os := 'iOS';
    ELSE
      _os := 'Other';
    END IF;
  END IF;

  -- Mark previous active sessions as inactive
  UPDATE public.login_history
  SET is_active = false,
      logout_at = NOW(),
      session_duration = NOW() - login_at
  WHERE user_id = _user_id AND is_active = true;

  -- Insert new login record
  INSERT INTO public.login_history (
    user_id,
    login_method,
    login_identifier,
    ip_address,
    user_agent,
    device_type,
    browser,
    os,
    is_active
  )
  VALUES (
    _user_id,
    _login_method,
    _login_identifier,
    _ip_address,
    _user_agent,
    _device_type,
    _browser,
    _os,
    true
  )
  RETURNING id INTO _login_id;

  RETURN _login_id;
END;
$$;

-- ============================================
-- STEP 4: Create function to record logout
-- ============================================

CREATE OR REPLACE FUNCTION public.record_logout(
  _user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark all active sessions as inactive
  UPDATE public.login_history
  SET is_active = false,
      logout_at = NOW(),
      session_duration = NOW() - login_at
  WHERE user_id = _user_id AND is_active = true;
END;
$$;

-- ============================================
-- STEP 5: Create function to get user login history
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_login_history(
  _user_id UUID,
  _limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  login_method TEXT,
  login_identifier TEXT,
  ip_address TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  login_at TIMESTAMPTZ,
  logout_at TIMESTAMPTZ,
  session_duration INTERVAL,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lh.id,
    lh.login_method,
    lh.login_identifier,
    lh.ip_address,
    lh.device_type,
    lh.browser,
    lh.os,
    lh.login_at,
    lh.logout_at,
    lh.session_duration,
    lh.is_active
  FROM public.login_history lh
  WHERE lh.user_id = _user_id
  ORDER BY lh.login_at DESC
  LIMIT _limit;
END;
$$;

-- ============================================
-- STEP 6: Create function to get active sessions
-- ============================================

CREATE OR REPLACE FUNCTION public.get_active_sessions(
  _user_id UUID
)
RETURNS TABLE (
  id UUID,
  login_method TEXT,
  login_identifier TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  login_at TIMESTAMPTZ,
  ip_address TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lh.id,
    lh.login_method,
    lh.login_identifier,
    lh.device_type,
    lh.browser,
    lh.os,
    lh.login_at,
    lh.ip_address
  FROM public.login_history lh
  WHERE lh.user_id = _user_id AND lh.is_active = true
  ORDER BY lh.login_at DESC;
END;
$$;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Login history table created';
  RAISE NOTICE '✅ RLS policies configured';
  RAISE NOTICE '✅ Login/logout tracking functions created';
  RAISE NOTICE '✅ Session persistence is handled by Supabase client (already configured)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '   1. Update auth.tsx to call record_login() on successful login';
  RAISE NOTICE '   2. Update signOut() to call record_logout()';
  RAISE NOTICE '   3. Session persistence is already enabled in supabase client';
END $$;
