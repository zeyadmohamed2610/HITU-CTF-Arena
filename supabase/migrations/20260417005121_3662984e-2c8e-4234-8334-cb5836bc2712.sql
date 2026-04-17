
-- Function that recalculates a single team's total points
CREATE OR REPLACE FUNCTION public.recalc_team_points(_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.teams
  SET total_points = COALESCE((
    SELECT SUM(p.total_points)
    FROM public.team_members tm
    JOIN public.profiles p ON p.user_id = tm.user_id
    WHERE tm.team_id = _team_id
  ), 0)
  WHERE id = _team_id;
END;
$$;

-- Trigger function: when a profile's total_points changes, recalc that user's team
CREATE OR REPLACE FUNCTION public.on_profile_points_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _team_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.total_points IS NOT DISTINCT FROM OLD.total_points THEN
    RETURN NEW;
  END IF;
  SELECT team_id INTO _team_id FROM public.team_members WHERE user_id = NEW.user_id LIMIT 1;
  IF _team_id IS NOT NULL THEN
    PERFORM public.recalc_team_points(_team_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_points_sync ON public.profiles;
CREATE TRIGGER trg_profile_points_sync
AFTER UPDATE OF total_points ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.on_profile_points_change();

-- Trigger function: when team membership changes, recalc both old and new teams
CREATE OR REPLACE FUNCTION public.on_team_member_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recalc_team_points(NEW.team_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_team_points(OLD.team_id);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.recalc_team_points(OLD.team_id);
    IF NEW.team_id <> OLD.team_id THEN
      PERFORM public.recalc_team_points(NEW.team_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_team_member_sync ON public.team_members;
CREATE TRIGGER trg_team_member_sync
AFTER INSERT OR UPDATE OR DELETE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.on_team_member_change();

-- Backfill all team scores now
DO $$
DECLARE _t record;
BEGIN
  FOR _t IN SELECT id FROM public.teams LOOP
    PERFORM public.recalc_team_points(_t.id);
  END LOOP;
END $$;
