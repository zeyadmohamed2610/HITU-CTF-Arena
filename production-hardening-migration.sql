-- HITU CTF Arena - Production Hardening Migration
-- Version 2.0 - Production Grade Security

-- =========================================
-- 1. TEAM INVITE SYSTEM HARDENING
-- =========================================

-- Create secure team join function
CREATE OR REPLACE FUNCTION public.join_team(invite_code TEXT, target_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- Use provided user_id or auth.uid()
  v_user_id := COALESCE(target_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate invite code and get team
  SELECT id INTO v_team_id
  FROM public.teams
  WHERE invite_code = invite_code
  AND NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = teams.id
    AND tm.user_id = v_user_id
  );

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code or already member';
  END IF;

  -- Check team size limit
  IF (SELECT COUNT(*) FROM public.team_members WHERE team_id = v_team_id) >= 4 THEN
    RAISE EXCEPTION 'Team is full (4 members maximum)';
  END IF;

  -- Check if user is already in another team
  IF EXISTS (SELECT 1 FROM public.team_members WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'User is already in a team';
  END IF;

  -- Check if user is player role
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'player') THEN
    RAISE EXCEPTION 'Only players can join teams';
  END IF;

  -- Atomic insert with conflict prevention
  INSERT INTO public.team_members (user_id, team_id)
  VALUES (v_user_id, v_team_id);

  -- Get team info for response
  SELECT jsonb_build_object(
    'team_id', t.id,
    'team_name', t.name,
    'invite_code', t.invite_code,
    'leader_id', t.leader_id,
    'member_count', (SELECT COUNT(*) FROM public.team_members WHERE team_id = t.id)
  ) INTO v_result
  FROM public.teams t
  WHERE t.id = v_team_id;

  -- Log the action
  INSERT INTO public.audit_logs (user_id, action, details)
  VALUES (v_user_id, 'team_join', jsonb_build_object('team_id', v_team_id, 'invite_code', invite_code));

  RETURN v_result;
END;
$$;

-- =========================================
-- 2. POINTS SYSTEM HARDENING (OPTION A: Use Views)
-- =========================================

-- Remove denormalized points columns
ALTER TABLE public.profiles DROP COLUMN IF EXISTS total_points;
ALTER TABLE public.teams DROP COLUMN IF EXISTS total_points;

-- Create secure views for points calculation
CREATE OR REPLACE VIEW public.user_scores AS
SELECT
  p.user_id,
  p.username,
  COALESCE(SUM(s.points_awarded), 0) as total_points,
  COUNT(DISTINCT s.challenge_id) as challenges_solved,
  COUNT(DISTINCT s.id) as total_solves
FROM public.profiles p
LEFT JOIN public.solves s ON p.user_id = s.user_id
GROUP BY p.user_id, p.username;

CREATE OR REPLACE VIEW public.team_scores AS
SELECT
  t.id as team_id,
  t.name,
  t.leader_id,
  COALESCE(SUM(s.points_awarded), 0) as total_points,
  COUNT(DISTINCT tm.user_id) as member_count,
  COUNT(DISTINCT s.challenge_id) as challenges_solved
FROM public.teams t
LEFT JOIN public.team_members tm ON t.id = tm.team_id
LEFT JOIN public.solves s ON tm.user_id = s.user_id
GROUP BY t.id, t.name, t.leader_id;

-- =========================================
-- 3. AUDIT LOGGING SYSTEM
-- =========================================

-- Enhanced audit logs table (already exists, enhance it)
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Function to create audit log
CREATE OR REPLACE FUNCTION public.create_audit_log(
  target_user_id UUID DEFAULT NULL,
  action_name TEXT,
  action_details JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, details, ip_address, user_agent)
  VALUES (
    COALESCE(target_user_id, auth.uid()),
    action_name,
    action_details,
    inet_client_addr(),
    current_setting('request.headers', true)::jsonb ->> 'user-agent'
  );
END;
$$;

-- =========================================
-- 4. SECURE SUBMISSION PROCESS
-- =========================================

-- Enhanced submission function with logging
CREATE OR REPLACE FUNCTION public.submit_flag(
  challenge_id UUID,
  flag_text TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_correct BOOLEAN;
  v_points INTEGER;
  v_challenge_exists BOOLEAN;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check CTF is live and user is participant
  IF NOT public.is_ctf_live() THEN
    PERFORM public.create_audit_log(v_user_id, 'ctf_not_live', jsonb_build_object('challenge_id', challenge_id));
    RAISE EXCEPTION 'CTF is not currently active';
  END IF;

  IF NOT public.is_ctf_participant(v_user_id) THEN
    PERFORM public.create_audit_log(v_user_id, 'not_participant', jsonb_build_object('challenge_id', challenge_id));
    RAISE EXCEPTION 'You must be registered as a CTF participant';
  END IF;

  -- Check user is player role
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'player') THEN
    PERFORM public.create_audit_log(v_user_id, 'invalid_role', jsonb_build_object('challenge_id', challenge_id));
    RAISE EXCEPTION 'Only players can submit flags';
  END IF;

  -- Verify challenge exists and is active
  SELECT EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = challenge_id AND c.is_active = true
  ) INTO v_challenge_exists;

  IF NOT v_challenge_exists THEN
    PERFORM public.create_audit_log(v_user_id, 'invalid_challenge', jsonb_build_object('challenge_id', challenge_id));
    RAISE EXCEPTION 'Challenge does not exist or is not active';
  END IF;

  -- Check if already solved (prevent duplicate solves)
  IF EXISTS (SELECT 1 FROM public.solves WHERE user_id = v_user_id AND challenge_id = challenge_id) THEN
    PERFORM public.create_audit_log(v_user_id, 'already_solved', jsonb_build_object('challenge_id', challenge_id));
    RAISE EXCEPTION 'Challenge already solved';
  END IF;

  -- Validate flag
  SELECT c.points INTO v_points
  FROM public.challenges c
  WHERE c.id = challenge_id AND c.flag = flag_text;

  v_is_correct := (v_points IS NOT NULL);

  -- Log the submission
  PERFORM public.create_audit_log(
    v_user_id,
    CASE WHEN v_is_correct THEN 'flag_correct' ELSE 'flag_incorrect' END,
    jsonb_build_object(
      'challenge_id', challenge_id,
      'ip_address', inet_client_addr(),
      'user_agent', current_setting('request.headers', true)::jsonb ->> 'user-agent'
    )
  );

  -- If correct, create solve record
  IF v_is_correct THEN
    -- Check if this is first blood
    DECLARE
      v_first_blood_bonus INTEGER := 0;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM public.solves WHERE challenge_id = challenge_id) THEN
        -- First blood! Award bonus points
        v_first_blood_bonus := GREATEST(v_points / 2, 50);

        -- Update challenge with first blood info
        UPDATE public.challenges
        SET first_blood_user_id = v_user_id,
            first_blood_bonus = v_first_blood_bonus
        WHERE id = challenge_id;
      END IF;

      -- Insert solve
      INSERT INTO public.solves (user_id, challenge_id, points_awarded)
      VALUES (v_user_id, challenge_id, v_points + v_first_blood_bonus);

      v_result := jsonb_build_object(
        'success', true,
        'points_awarded', v_points + v_first_blood_bonus,
        'first_blood_bonus', v_first_blood_bonus,
        'message', 'Flag correct! Challenge solved.'
      );
    END;
  ELSE
    v_result := jsonb_build_object(
      'success', false,
      'message', 'Incorrect flag. Try again.'
    );
  END IF;

  RETURN v_result;
END;
$$;

-- =========================================
-- 5. TEAM SYSTEM HARDENING
-- =========================================

-- Function to transfer team leadership
CREATE OR REPLACE FUNCTION public.transfer_team_leadership(team_uuid UUID, new_leader_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if current user is the team leader
  IF NOT EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = team_uuid AND leader_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are not the team leader';
  END IF;

  -- Check if new leader is a team member
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = team_uuid AND user_id = new_leader_id
  ) THEN
    RAISE EXCEPTION 'New leader must be a team member';
  END IF;

  -- Transfer leadership
  UPDATE public.teams
  SET leader_id = new_leader_id
  WHERE id = team_uuid;

  -- Log the action
  PERFORM public.create_audit_log(auth.uid(), 'transfer_leadership',
    jsonb_build_object('team_id', team_uuid, 'new_leader_id', new_leader_id));

  RETURN true;
END;
$$;

-- Function to leave team safely
CREATE OR REPLACE FUNCTION public.leave_team(team_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_count INTEGER;
  v_is_leader BOOLEAN;
BEGIN
  -- Check if user is in the team
  SELECT
    (SELECT COUNT(*) FROM public.team_members WHERE team_id = team_uuid),
    (leader_id = auth.uid())
  INTO v_member_count, v_is_leader
  FROM public.teams
  WHERE id = team_uuid;

  IF v_is_leader AND v_member_count > 1 THEN
    RAISE EXCEPTION 'Team leader cannot leave team with members. Transfer leadership first.';
  END IF;

  -- Remove from team
  DELETE FROM public.team_members
  WHERE team_id = team_uuid AND user_id = auth.uid();

  -- If last member, delete the team
  IF v_member_count <= 1 THEN
    DELETE FROM public.teams WHERE id = team_uuid;
  END IF;

  -- Log the action
  PERFORM public.create_audit_log(auth.uid(), 'leave_team',
    jsonb_build_object('team_id', team_uuid, 'was_last_member', v_member_count <= 1));

  RETURN true;
END;
$$;

-- =========================================
-- 6. RLS POLICIES - FINAL SECURE VERSION
-- =========================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Team members viewable by everyone" ON public.team_members;
DROP POLICY IF EXISTS "Users can join teams" ON public.team_members;
DROP POLICY IF EXISTS "Players can join teams" ON public.team_members;
DROP POLICY IF EXISTS "Users can leave teams" ON public.team_members;
DROP POLICY IF EXISTS "Teams viewable by everyone" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Admins can delete teams" ON public.teams;
DROP POLICY IF EXISTS "Team leaders can update teams" ON public.teams;
DROP POLICY IF EXISTS "Players can register for CTF" ON public.ctf_participants;
DROP POLICY IF EXISTS "Users can register for CTF" ON public.ctf_participants;
DROP POLICY IF EXISTS "Users can unregister from CTF" ON public.ctf_participants;
DROP POLICY IF EXISTS "Players can unregister from CTF" ON public.ctf_participants;
DROP POLICY IF EXISTS "Participants viewable by admins" ON public.ctf_participants;
DROP POLICY IF EXISTS "Users can view their own participation" ON public.ctf_participants;
DROP POLICY IF EXISTS "Users can submit during live CTF" ON public.submissions;
DROP POLICY IF EXISTS "Users can view own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Players can insert solves during live CTF" ON public.solves;
DROP POLICY IF EXISTS "Solves viewable by participants" ON public.solves;

-- Secure team policies
CREATE POLICY "Teams are public readable" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Players can create teams" ON public.teams FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'player'::app_role)
    AND leader_id = auth.uid()  -- Creator becomes leader
  );
CREATE POLICY "Team leaders and admins can update teams" ON public.teams FOR UPDATE
  TO authenticated
  USING (
    leader_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "Admins can delete teams" ON public.teams FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Secure team member policies
CREATE POLICY "Team members viewable by everyone" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Team joining only through secure function" ON public.team_members FOR INSERT
  TO authenticated
  WITH CHECK (false);  -- Force use of join_team() function
CREATE POLICY "Members and leaders can leave teams" ON public.team_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_id AND leader_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Secure CTF participation policies
CREATE POLICY "CTF participants viewable by admins" ON public.ctf_participants FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own CTF participation" ON public.ctf_participants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Players can register for CTF" ON public.ctf_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'player'::app_role)
    AND user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.ctf_participants WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Players can unregister from CTF" ON public.ctf_participants FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'player'::app_role)
    AND user_id = auth.uid()
  );

-- Secure submission policies
CREATE POLICY "Submissions viewable by owner or admin" ON public.submissions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "Submissions only through secure function" ON public.submissions FOR INSERT
  TO authenticated
  WITH CHECK (false);  -- Force use of submit_flag() function

-- Secure solve policies
CREATE POLICY "Solves viewable by participants and admins" ON public.solves FOR SELECT
  TO authenticated
  USING (
    is_ctf_participant(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "Solves only through secure function" ON public.solves FOR INSERT
  TO authenticated
  WITH CHECK (false);  -- Force use of submit_flag() function

-- =========================================
-- 7. PERFORMANCE OPTIMIZATION
-- =========================================

-- Add pagination support functions
CREATE OR REPLACE FUNCTION public.get_paginated_challenges(
  page_size INTEGER DEFAULT 20,
  page_offset INTEGER DEFAULT 0,
  include_inactive BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  points INTEGER,
  difficulty TEXT,
  category_name TEXT,
  solve_count BIGINT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.title,
    c.description,
    c.points,
    c.difficulty,
    cat.name as category_name,
    c.solve_count,
    c.created_at
  FROM public.challenges c
  LEFT JOIN public.categories cat ON c.category_id = cat.id
  WHERE (include_inactive OR c.is_active = true)
  AND (
    c.is_active = true
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'ctf_author'::app_role) AND c.created_by = auth.uid())
  )
  ORDER BY c.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
$$;

CREATE OR REPLACE FUNCTION public.get_paginated_scoreboard(
  page_size INTEGER DEFAULT 50,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  rank BIGINT,
  team_id UUID,
  team_name TEXT,
  total_points BIGINT,
  member_count BIGINT,
  challenges_solved BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY ts.total_points DESC, ts.team_id) as rank,
    ts.team_id,
    ts.name as team_name,
    ts.total_points,
    ts.member_count,
    ts.challenges_solved
  FROM public.team_scores ts
  WHERE ts.member_count > 0
  ORDER BY ts.total_points DESC, ts.team_id
  LIMIT page_size
  OFFSET page_offset;
$$;

-- Add more performance indexes
CREATE INDEX IF NOT EXISTS idx_solves_created_at ON public.solves(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_points ON public.challenges(points);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- =========================================
-- 8. SECURITY HARDENING
-- =========================================

-- Function to detect suspicious activity
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity()
RETURNS TABLE (
  user_id UUID,
  activity_type TEXT,
  count_last_hour BIGINT,
  risk_level TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Detect rapid team joins (possible abuse)
  SELECT
    al.user_id,
    'team_join_abuse'::TEXT as activity_type,
    COUNT(*) as count_last_hour,
    CASE
      WHEN COUNT(*) > 10 THEN 'HIGH'
      WHEN COUNT(*) > 5 THEN 'MEDIUM'
      ELSE 'LOW'
    END as risk_level
  FROM public.audit_logs al
  WHERE al.action = 'team_join'
  AND al.created_at > now() - interval '1 hour'
  GROUP BY al.user_id
  HAVING COUNT(*) > 3;
$$;

-- =========================================
-- 9. FINAL CLEANUP
-- =========================================

-- Ensure all triggers are in place
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_challenges_updated_at ON public.challenges;
DROP TRIGGER IF EXISTS update_ctf_settings_updated_at ON public.ctf_settings;
DROP TRIGGER IF EXISTS update_rules_updated_at ON public.rules;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ctf_settings_updated_at
  BEFORE UPDATE ON public.ctf_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rules_updated_at
  BEFORE UPDATE ON public.rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.join_team(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_flag(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_team(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_team_leadership(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_paginated_challenges(INTEGER, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_paginated_scoreboard(INTEGER, INTEGER) TO authenticated;