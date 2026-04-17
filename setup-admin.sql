-- HITU CTF Arena - Admin Setup Script
-- Run this in Supabase SQL Editor after creating your first admin user

-- 1. Replace 'your-admin-user-id' with the actual UUID from auth.users
-- You can find this in Supabase Auth > Users

-- Create admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('your-admin-user-id', 'admin');

-- Optional: Create CTF Author role
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('author-user-id', 'ctf_author');

-- 2. Verify setup
SELECT
  p.username,
  ur.role,
  p.created_at
FROM public.profiles p
JOIN public.user_roles ur ON p.user_id = ur.user_id
WHERE ur.role IN ('admin', 'ctf_author');

-- 3. Optional: Pre-populate some categories
INSERT INTO public.categories (name) VALUES
  ('Web Exploitation'),
  ('Binary Exploitation'),
  ('Reverse Engineering'),
  ('Cryptography'),
  ('Forensics'),
  ('OSINT'),
  ('Miscellaneous')
ON CONFLICT (name) DO NOTHING;

-- 4. Optional: Set default CTF settings
INSERT INTO public.ctf_settings (is_active)
VALUES (false)
ON CONFLICT DO NOTHING;

-- 5. Optional: Set default rules
UPDATE public.rules SET content = '# HITU CTF Arena - Official Rules

## Competition Rules
1. **Fair Play**: Do not share flags, hints, or solutions with other teams
2. **No Attacks**: Do not attack the competition infrastructure or other teams
3. **Brute Force**: Do not attempt brute force attacks on submissions
4. **Eligibility**: Only registered participants may compete
5. **Team Size**: Teams may have up to 4 members

## Scoring
- Points are awarded based on challenge difficulty
- First blood bonuses for solving challenges first
- Dynamic scoring may be applied to some challenges

## Code of Conduct
- Respect all participants and organizers
- Report any issues through the ticketing system
- Have fun and learn!

## Disqualification
Teams may be disqualified for:
- Sharing flags with other teams
- Attacking infrastructure
- Using unauthorized tools or methods
- Harassment or unsportsmanlike conduct

*These rules are enforced to ensure a fair and educational competition for all participants.*'
WHERE id = (SELECT id FROM public.rules LIMIT 1);

-- 6. Optional: Create default badges
INSERT INTO public.badges (name, description, icon) VALUES
  ('First Blood', 'First to solve a challenge', '🏆'),
  ('Speed Runner', 'Solved challenge in under 5 minutes', '⚡'),
  ('Team Player', 'Contributed to team success', '🤝'),
  ('Perfectionist', 'Solved all challenges in a category', '💎')
ON CONFLICT (name) DO NOTHING;