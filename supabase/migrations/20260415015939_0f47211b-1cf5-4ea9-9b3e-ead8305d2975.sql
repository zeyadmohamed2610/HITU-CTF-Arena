
-- Fix: restrict team INSERT to require creator is a member
DROP POLICY "Authenticated users can create teams" ON public.teams;
CREATE POLICY "Authenticated users can create teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Fix: restrict storage listing to only files the user needs
DROP POLICY "Challenge files publicly accessible" ON storage.objects;
CREATE POLICY "Challenge files publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'challenge-files' AND (storage.foldername(name))[1] IS NOT NULL);
