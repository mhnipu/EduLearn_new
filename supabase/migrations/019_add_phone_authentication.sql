-- Migration: Add phone authentication support
-- Date: 2024-12-12
-- Description: Add phone field to profiles and update trigger

-- Step 1: Add phone column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Step 2: Create index on phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- Step 3: Update handle_new_user function to include phone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile with phone support
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', '')
  );
  
  RETURN NEW;
END;
$$;

-- Step 4: Add comment
COMMENT ON COLUMN public.profiles.phone IS 'User phone number for authentication and contact';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Phone authentication migration completed';
  RAISE NOTICE '📱 Phone column added to profiles table';
  RAISE NOTICE '🔧 handle_new_user trigger updated';
END $$;
