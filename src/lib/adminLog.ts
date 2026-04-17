import { supabase } from '@/integrations/supabase/client';

export async function adminLog(action: string, details?: Record<string, any>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  await supabase.from('admin_logs').insert({
    admin_id: user.id,
    action,
    details: details ?? null,
  });
}
