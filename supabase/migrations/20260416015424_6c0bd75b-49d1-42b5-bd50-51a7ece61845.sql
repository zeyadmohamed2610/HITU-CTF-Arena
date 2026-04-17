-- Add invite_code and leader_id to teams
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS leader_id uuid;

-- Generate invite codes for existing teams that don't have one
UPDATE public.teams SET invite_code = upper(substr(md5(random()::text), 1, 8)) WHERE invite_code IS NULL;

-- Make invite_code NOT NULL after backfill
ALTER TABLE public.teams ALTER COLUMN invite_code SET NOT NULL;
ALTER TABLE public.teams ALTER COLUMN invite_code SET DEFAULT upper(substr(md5(random()::text), 1, 8));