
-- Re-create the trigger for new user signups
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: create profile + admin role for any existing auth users missing profiles
INSERT INTO public.profiles (user_id, username, full_name)
SELECT id, raw_user_meta_data->>'username', raw_user_meta_data->>'full_name'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);

INSERT INTO public.user_roles (user_id, role)
SELECT u.id,
  CASE WHEN u.email = 'andrewmamdouh122@gmail.com' THEN 'admin'::app_role ELSE 'player'::app_role END
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id);
