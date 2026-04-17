
-- Trigger function: before deleting a challenge, remove solves and recalculate points
CREATE OR REPLACE FUNCTION public.handle_challenge_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected_user RECORD;
BEGIN
  -- Find affected users before deleting solves
  FOR affected_user IN
    SELECT DISTINCT user_id FROM public.solves WHERE challenge_id = OLD.id
  LOOP
    -- Delete solves for this challenge
    DELETE FROM public.solves WHERE challenge_id = OLD.id AND user_id = affected_user.user_id;
    
    -- Recalculate user's total points
    UPDATE public.profiles
    SET total_points = (
      SELECT COALESCE(SUM(points_awarded), 0) FROM public.solves WHERE user_id = affected_user.user_id
    )
    WHERE user_id = affected_user.user_id;
  END LOOP;

  -- Delete remaining solves (in case any were missed)
  DELETE FROM public.solves WHERE challenge_id = OLD.id;
  
  -- Also delete submissions for this challenge
  DELETE FROM public.submissions WHERE challenge_id = OLD.id;
  
  -- Delete hints and hint_unlocks
  DELETE FROM public.hint_unlocks WHERE hint_id IN (SELECT id FROM public.hints WHERE challenge_id = OLD.id);
  DELETE FROM public.hints WHERE challenge_id = OLD.id;
  
  -- Delete attachments
  DELETE FROM public.challenge_attachments WHERE challenge_id = OLD.id;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_handle_challenge_delete
  BEFORE DELETE ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_challenge_delete();
