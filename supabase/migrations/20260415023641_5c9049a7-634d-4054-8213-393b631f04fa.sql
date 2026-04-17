
-- Update profile total_points when a solve is inserted
CREATE OR REPLACE FUNCTION public.update_profile_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET total_points = (
    SELECT COALESCE(SUM(points_awarded), 0) FROM public.solves WHERE user_id = NEW.user_id
  )
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_solve_update_points
AFTER INSERT ON public.solves
FOR EACH ROW
EXECUTE FUNCTION public.update_profile_points();

-- Update challenge solve_count
CREATE OR REPLACE FUNCTION public.update_challenge_solve_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.challenges
  SET solve_count = (
    SELECT COUNT(*) FROM public.solves WHERE challenge_id = NEW.challenge_id
  )
  WHERE id = NEW.challenge_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_solve_update_challenge_count
AFTER INSERT ON public.solves
FOR EACH ROW
EXECUTE FUNCTION public.update_challenge_solve_count();

-- Unique constraint to prevent double solves
ALTER TABLE public.solves ADD CONSTRAINT solves_user_challenge_unique UNIQUE (user_id, challenge_id);
