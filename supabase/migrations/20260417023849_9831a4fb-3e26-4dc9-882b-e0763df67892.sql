-- Recreate the trigger on auth.users (it was missing)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill any existing auth users who don't have a profile yet
INSERT INTO public.profiles (user_id, username, full_name)
SELECT u.id, u.raw_user_meta_data->>'username', u.raw_user_meta_data->>'full_name'
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

-- Backfill missing roles
INSERT INTO public.user_roles (user_id, role)
SELECT u.id,
  CASE WHEN LOWER(u.email) = LOWER('andrewmamdouh122@gmail.com') THEN 'admin'::app_role
       ELSE 'player'::app_role END
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL
ON CONFLICT DO NOTHING;