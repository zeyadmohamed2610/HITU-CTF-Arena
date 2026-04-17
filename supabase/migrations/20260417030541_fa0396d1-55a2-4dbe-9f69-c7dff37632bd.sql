CREATE TABLE IF NOT EXISTS public.info (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Info viewable by everyone" ON public.info FOR SELECT USING (true);
CREATE POLICY "Admins can manage info" ON public.info FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.info (content) VALUES ('# Information

Welcome to the CTF! Add useful information here.') ON CONFLICT DO NOTHING;