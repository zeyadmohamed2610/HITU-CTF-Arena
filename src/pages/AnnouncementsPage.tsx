import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Bell } from 'lucide-react';

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  // Mark this user's last-seen announcement timestamp so the sidebar dot disappears
  useEffect(() => {
    if (announcements && announcements.length > 0) {
      localStorage.setItem('announcements_last_seen', announcements[0].created_at);
    }
  }, [announcements]);

  // Realtime updates so new announcements appear instantly
  useEffect(() => {
    const channel = supabase
      .channel('announcements-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        queryClient.invalidateQueries({ queryKey: ['announcements-all'] });
        queryClient.invalidateQueries({ queryKey: ['announcements'] });
        queryClient.invalidateQueries({ queryKey: ['announcements-unread'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-8 w-8 text-warning" />
        <h1 className="text-3xl font-sans font-bold">Announcements</h1>
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-muted-foreground text-sm">Loading...</p>}
        {!isLoading && announcements?.length === 0 && (
          <Card className="gradient-card border-border">
            <CardContent className="py-12 text-center text-muted-foreground">
              No announcements yet.
            </CardContent>
          </Card>
        )}
        {announcements?.map((a) => (
          <Card key={a.id} className="gradient-card border-border border-l-4 border-l-warning">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm whitespace-pre-wrap break-words">{a.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(a.created_at).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
