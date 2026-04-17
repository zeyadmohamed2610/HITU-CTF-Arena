import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export type AppRole = 'player' | 'ctf_author' | 'admin';

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  total_points: number;
  is_banned: boolean;
}

interface CtfParticipant {
  id: string;
  user_id: string;
  team_id: string | null;
  registered_at: string;
}

interface CtfSettings {
  id: string;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
}

interface TeamInfo {
  id: string;
  name: string;
  leader_id: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  ctfParticipant: CtfParticipant | null;
  ctfSettings: CtfSettings | null;
  userTeam: TeamInfo | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setRoles: (roles: AppRole[]) => void;
  setCtfParticipant: (participant: CtfParticipant | null) => void;
  setCtfSettings: (settings: CtfSettings | null) => void;
  setUserTeam: (team: TeamInfo | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  isAdmin: () => boolean;
  isAuthor: () => boolean;
  isPlayer: () => boolean;
  isCtfParticipant: () => boolean;
  isCtfLive: () => boolean;
  canAccessChallenges: () => boolean;
  isTeamLeader: () => boolean;
  hasRole: (role: AppRole) => boolean;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

async function fetchUserData(userId: string) {
  const [profileRes, rolesRes, participantRes, settingsRes, teamRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).single(),
    supabase.from('user_roles').select('role').eq('user_id', userId),
    supabase.from('ctf_participants').select('*').eq('user_id', userId).single(),
    supabase.from('ctf_settings').select('*').single(),
    supabase
      .from('team_members')
      .select('team_id, teams(id, name, leader_id)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    profile: profileRes.data as Profile | null,
    roles: (rolesRes.data?.map((r) => r.role) as AppRole[]) ?? [],
    ctfParticipant: participantRes.data as CtfParticipant | null,
    ctfSettings: settingsRes.data as CtfSettings | null,
    userTeam: teamRes.data?.teams as TeamInfo | null,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  roles: [],
  ctfParticipant: null,
  ctfSettings: null,
  userTeam: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setRoles: (roles) => set({ roles }),
  setCtfParticipant: (participant) => set({ ctfParticipant: participant }),
  setCtfSettings: (settings) => set({ ctfSettings: settings }),
  setUserTeam: (userTeam) => set({ userTeam }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),

  isAdmin: () => get().roles.includes('admin'),
  isAuthor: () => get().roles.includes('ctf_author'),
  isPlayer: () => get().roles.includes('player'),
  isCtfParticipant: () => get().ctfParticipant !== null,
  isCtfLive: () => {
    const settings = get().ctfSettings;
    if (!settings?.is_active) return false;
    const now = new Date();
    const startTime = settings.start_time ? new Date(settings.start_time) : null;
    const endTime = settings.end_time ? new Date(settings.end_time) : null;

    if (startTime && now < startTime) return false;
    if (endTime && now > endTime) return false;
    return true;
  },
  canAccessChallenges: () => get().isCtfParticipant() && get().isCtfLive(),
  isTeamLeader: () => {
    const user = get().user;
    const userTeam = get().userTeam;
    if (!user || !userTeam) return false;
    return userTeam.leader_id === user.id;
  },
  hasRole: (role) => get().roles.includes(role),

   initialize: async () => {
     // Prevent double init
     if (get().initialized) return;

     // Get initial session first
     const { data: { session } } = await supabase.auth.getSession();

     if (session?.user) {
       const { profile, roles, ctfParticipant, ctfSettings, userTeam } = await fetchUserData(session.user.id);
       set({
         user: session.user,
         profile,
         roles,
         ctfParticipant,
         ctfSettings,
         userTeam,
         loading: false,
         initialized: true
       });
     } else {
       set({
         user: null,
         profile: null,
         roles: [],
         ctfParticipant: null,
         ctfSettings: null,
         userTeam: null,
         loading: false,
         initialized: true
       });
     }

     // Listen for future changes
     supabase.auth.onAuthStateChange(async (event, session) => {
       const user = session?.user ?? null;

       if (user) {
         // Use setTimeout to avoid Supabase deadlock with getSession
         setTimeout(async () => {
           const { profile, roles, ctfParticipant, ctfSettings, userTeam } = await fetchUserData(user.id);
           set({ user, profile, roles, ctfParticipant, ctfSettings, userTeam, loading: false });
         }, 0);
       } else {
         set({
           user: null,
           profile: null,
           roles: [],
           ctfParticipant: null,
           ctfSettings: null,
           userTeam: null,
           loading: false
         });
       }
     });
   },

   signOut: async () => {
     await supabase.auth.signOut();
     set({
       user: null,
       profile: null,
       roles: [],
       ctfParticipant: null,
       ctfSettings: null,
       userTeam: null
     });
   },
}));
