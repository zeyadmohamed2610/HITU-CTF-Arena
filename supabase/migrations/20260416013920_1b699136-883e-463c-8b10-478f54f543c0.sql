DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

DO $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE lower(email) = lower('andrewmamdouh122@gmail.com')
  LIMIT 1;

  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id)
    VALUES (target_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    DELETE FROM public.user_roles
    WHERE user_id = target_user_id
      AND role = 'player';

    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;