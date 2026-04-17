import { supabase } from '@/integrations/supabase/client';

export type ActivityAction =
  | 'login'
  | 'login_failed'
  | 'signup'
  | 'page_visit'
  | 'flag_submit_correct'
  | 'flag_submit_correct_post_ctf'
  | 'flag_submit_wrong'
  | 'team_create'
  | 'team_join'
  | 'team_leave'
  | 'profile_update'
  | 'ticket_create'
  | 'hint_unlock';

// Capture request fingerprint to help detect attacks (bots, scanners, scripted abuse)
function getRequestFingerprint() {
  if (typeof window === 'undefined') return {};
  const nav: any = navigator;
  return {
    user_agent: navigator.userAgent,
    language: navigator.language,
    platform: nav.platform || nav.userAgentData?.platform || 'unknown',
    referrer: document.referrer || 'direct',
    path: window.location.pathname + window.location.search,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    screen: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export async function logActivity(action: ActivityAction, details?: Record<string, any>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const fingerprint = getRequestFingerprint();
    await supabase.from('activity_logs').insert({
      user_id: user?.id ?? null,
      action,
      details: { ...fingerprint, ...(details ?? {}) },
    });
  } catch {
    // silently fail — logging should never break the app
  }
}
