
-- Add full_name to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;

-- Create ctf_settings table
CREATE TABLE public.ctf_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ctf_name text NOT NULL DEFAULT 'CTF Platform',
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  timezone text NOT NULL DEFAULT 'Africa/Cairo',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ctf_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CTF settings viewable by everyone"
ON public.ctf_settings FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can manage CTF settings"
ON public.ctf_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Insert default row
INSERT INTO public.ctf_settings (ctf_name) VALUES ('CTF Platform');

-- Update handle_new_user to include full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'full_name');
  
  IF NEW.email = 'andrewmamdouh122@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'player');
  END IF;
  
  RETURN NEW;
END;
$$;
