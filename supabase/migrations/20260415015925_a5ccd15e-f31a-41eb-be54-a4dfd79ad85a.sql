
-- Enums
CREATE TYPE public.app_role AS ENUM ('player', 'ctf_author', 'admin');
CREATE TYPE public.ticket_status AS ENUM ('open', 'closed');

-- User Roles (must be created before has_role function)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'player',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helper function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles (after has_role exists)
CREATE POLICY "Roles viewable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  website TEXT,
  total_points INTEGER NOT NULL DEFAULT 0,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'player');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Teams
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teams viewable by everyone" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update teams" ON public.teams FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete teams" ON public.teams FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Team Members
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members viewable by everyone" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Users can join teams" ON public.team_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave teams" ON public.team_members FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ctf_author'));

-- Challenges
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  flag TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 100,
  is_dynamic BOOLEAN NOT NULL DEFAULT false,
  dynamic_decay_rate NUMERIC DEFAULT 10,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'insane')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  solve_count INTEGER NOT NULL DEFAULT 0,
  first_blood_user_id UUID REFERENCES auth.users(id),
  first_blood_bonus INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active challenges viewable" ON public.challenges FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin') OR (public.has_role(auth.uid(), 'ctf_author') AND created_by = auth.uid()));
CREATE POLICY "Authors can create challenges" ON public.challenges FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ctf_author') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authors can update own challenges" ON public.challenges FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authors/admins can delete challenges" ON public.challenges FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR (public.has_role(auth.uid(), 'ctf_author') AND created_by = auth.uid()));

-- Submissions
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  flag_submitted TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own submissions" ON public.submissions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create submissions" ON public.submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Solves
CREATE TABLE public.solves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  points_awarded INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id)
);
ALTER TABLE public.solves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solves viewable by everyone" ON public.solves FOR SELECT USING (true);
CREATE POLICY "System can insert solves" ON public.solves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Hints
CREATE TABLE public.hints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  penalty_percentage INTEGER NOT NULL DEFAULT 10 CHECK (penalty_percentage >= 0 AND penalty_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.hints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hints viewable by everyone" ON public.hints FOR SELECT USING (true);
CREATE POLICY "Authors admins can manage hints" ON public.hints FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR (
    public.has_role(auth.uid(), 'ctf_author') AND challenge_id IN (SELECT id FROM public.challenges WHERE created_by = auth.uid())
  )
);

-- Hint Unlocks
CREATE TABLE public.hint_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hint_id UUID NOT NULL REFERENCES public.hints(id) ON DELETE CASCADE,
  points_deducted INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, hint_id)
);
ALTER TABLE public.hint_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own unlocks" ON public.hint_unlocks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can unlock hints" ON public.hint_unlocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active announcements viewable" ON public.announcements FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Tickets
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tickets" ON public.tickets FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users admins can update tickets" ON public.tickets FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Ticket Replies
CREATE TABLE public.ticket_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view replies on own tickets" ON public.ticket_replies FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR ticket_id IN (SELECT id FROM public.tickets WHERE user_id = auth.uid())
);
CREATE POLICY "Users admins can reply" ON public.ticket_replies FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR ticket_id IN (SELECT id FROM public.tickets WHERE user_id = auth.uid())
);

-- Challenge Attachments
CREATE TABLE public.challenge_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('file', 'link')),
  url_or_path TEXT NOT NULL,
  filename TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.challenge_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Attachments viewable by everyone" ON public.challenge_attachments FOR SELECT USING (true);
CREATE POLICY "Authors admins can manage attachments" ON public.challenge_attachments FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR (
    public.has_role(auth.uid(), 'ctf_author') AND challenge_id IN (SELECT id FROM public.challenges WHERE created_by = auth.uid())
  )
);

-- Badges
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges viewable by everyone" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Admins can manage badges" ON public.badges FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User Badges
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User badges viewable by everyone" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "Admins can manage user badges" ON public.user_badges FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin Logs
CREATE TABLE public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can view logs" ON public.admin_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can insert logs" ON public.admin_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Rules
CREATE TABLE public.rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rules viewable by everyone" ON public.rules FOR SELECT USING (true);
CREATE POLICY "Admins can manage rules" ON public.rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Scoreboard Freeze
CREATE TABLE public.scoreboard_freeze (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_frozen BOOLEAN NOT NULL DEFAULT false,
  frozen_at TIMESTAMP WITH TIME ZONE,
  unfrozen_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.scoreboard_freeze ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Freeze status viewable by everyone" ON public.scoreboard_freeze FOR SELECT USING (true);
CREATE POLICY "Admins can manage freeze" ON public.scoreboard_freeze FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rules_updated_at BEFORE UPDATE ON public.rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_submissions_user ON public.submissions(user_id);
CREATE INDEX idx_submissions_challenge ON public.submissions(challenge_id);
CREATE INDEX idx_solves_user ON public.solves(user_id);
CREATE INDEX idx_solves_challenge ON public.solves(challenge_id);
CREATE INDEX idx_challenges_category ON public.challenges(category_id);
CREATE INDEX idx_challenges_active ON public.challenges(is_active);
CREATE INDEX idx_team_members_team ON public.team_members(team_id);
CREATE INDEX idx_admin_logs_admin ON public.admin_logs(admin_id);
CREATE INDEX idx_tickets_user ON public.tickets(user_id);
CREATE INDEX idx_hint_unlocks_user ON public.hint_unlocks(user_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('challenge-files', 'challenge-files', true);
CREATE POLICY "Challenge files publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'challenge-files');
CREATE POLICY "Authors admins can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'challenge-files' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ctf_author')));
CREATE POLICY "Authors admins can delete files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'challenge-files' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'ctf_author')));

-- Insert defaults
INSERT INTO public.rules (content) VALUES ('# Competition Rules

1. Do not share flags with other teams
2. Do not attack the infrastructure
3. Have fun and learn!');

INSERT INTO public.scoreboard_freeze (is_frozen) VALUES (false);
