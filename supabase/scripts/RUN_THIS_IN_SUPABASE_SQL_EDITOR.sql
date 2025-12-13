-- =====================================================
-- QUICK FIX: Create custom_roles table
-- =====================================================
-- Copy this entire file and paste in Supabase SQL Editor
-- Then click "RUN" or press Ctrl+Enter
-- =====================================================

-- Create custom_roles table for SuperAdmin to create custom roles
CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_custom_roles_name ON custom_roles(role_name);
CREATE INDEX IF NOT EXISTS idx_custom_roles_created_by ON custom_roles(created_by);

-- Enable RLS
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Super admins have full access to custom roles" ON custom_roles;
DROP POLICY IF EXISTS "Admins can read custom roles" ON custom_roles;

-- Policy: Super admins can do everything
CREATE POLICY "Super admins have full access to custom roles"
  ON custom_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

-- Policy: Admins can only read custom roles
CREATE POLICY "Admins can read custom roles"
  ON custom_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_custom_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS custom_roles_updated_at ON custom_roles;

-- Create trigger
CREATE TRIGGER custom_roles_updated_at
  BEFORE UPDATE ON custom_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_roles_updated_at();

-- Comment on table
COMMENT ON TABLE custom_roles IS 'Custom roles created by super admins that can be assigned by admins';

-- Verify table was created successfully
SELECT 
  'custom_roles table created successfully!' as message,
  COUNT(*) as row_count 
FROM custom_roles;

-- =====================================================
-- DONE! Table created successfully.
-- Now refresh your browser (Ctrl + Shift + R)
-- =====================================================

