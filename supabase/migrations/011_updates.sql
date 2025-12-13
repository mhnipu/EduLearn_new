-- Create course_waitlist table for enrollment waitlist functionality
CREATE TABLE public.course_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'enrolled', 'expired', 'cancelled')),
  UNIQUE (course_id, user_id)
);

-- Add capacity column to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT NULL;

-- Enable RLS
ALTER TABLE public.course_waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own waitlist entries"
ON public.course_waitlist
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all waitlist entries"
ON public.course_waitlist
FOR SELECT
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Users can join waitlist"
ON public.course_waitlist
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel their waitlist entry"
ON public.course_waitlist
FOR UPDATE
USING (auth.uid() = user_id AND status = 'waiting');

CREATE POLICY "Admins can manage all waitlist entries"
ON public.course_waitlist
FOR ALL
USING (is_admin_or_higher(auth.uid()));

-- Create function to get next waitlist position
CREATE OR REPLACE FUNCTION get_next_waitlist_position(p_course_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_pos INTEGER;
BEGIN
  SELECT COALESCE(MAX(position), 0) + 1 INTO next_pos
  FROM course_waitlist
  WHERE course_id = p_course_id AND status = 'waiting';
  RETURN next_pos;
END;
$$;

-- Create function to process waitlist when spot opens
CREATE OR REPLACE FUNCTION process_waitlist_on_unenroll()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_user RECORD;
  course_capacity INTEGER;
  current_enrolled INTEGER;
BEGIN
  -- Get course capacity
  SELECT max_capacity INTO course_capacity FROM courses WHERE id = OLD.course_id;
  
  -- If no capacity limit, skip
  IF course_capacity IS NULL THEN
    RETURN OLD;
  END IF;
  
  -- Get current enrollment count
  SELECT COUNT(*) INTO current_enrolled FROM course_enrollments WHERE course_id = OLD.course_id;
  
  -- If still at or over capacity, skip
  IF current_enrolled >= course_capacity THEN
    RETURN OLD;
  END IF;
  
  -- Get next person on waitlist
  SELECT * INTO next_user 
  FROM course_waitlist 
  WHERE course_id = OLD.course_id AND status = 'waiting'
  ORDER BY position ASC
  LIMIT 1;
  
  -- If someone is waiting, notify them
  IF next_user.id IS NOT NULL THEN
    UPDATE course_waitlist 
    SET status = 'notified', 
        notified_at = now(),
        expires_at = now() + INTERVAL '48 hours'
    WHERE id = next_user.id;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create trigger for when someone unenrolls
DROP TRIGGER IF EXISTS on_enrollment_deleted ON public.course_enrollments;
CREATE TRIGGER on_enrollment_deleted
AFTER DELETE ON public.course_enrollments
FOR EACH ROW
EXECUTE FUNCTION process_waitlist_on_unenroll();