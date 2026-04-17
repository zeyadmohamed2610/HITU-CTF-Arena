import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Bell } from 'lucide-react';

export function AnnouncementBanner() {
  const { data: announcements } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);
      return data;
    },
  });

  const latest = announcements?.[0];
  if (!latest) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-warning/10 text-warning text-sm max-w-md truncate">
      <Bell className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{latest.message}</span>
    </div>
  );
}
