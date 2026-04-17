import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bell, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { adminLog } from '@/lib/adminLog';

export default function AdminAnnouncementsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  const { data: announcements } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('announcements').insert({ message: message.trim(), created_by: user!.id });
      if (error) throw error;
      await adminLog('create_announcement', { message: message.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setMessage('');
      toast.success('Announcement created');
    },
    onError: () => toast.error('Failed'),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('announcements').update({ is_active: active }).eq('id', id);
      if (error) throw error;
      await adminLog(active ? 'show_announcement' : 'hide_announcement', { announcement_id: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      await adminLog('delete_announcement', { announcement_id: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      toast.success('Deleted');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-8 w-8 text-warning" />
        <h1 className="text-3xl font-sans font-bold">Announcements</h1>
      </div>

      <div className="flex gap-2 max-w-lg">
        <Input
          placeholder="New announcement..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="bg-muted border-border"
          onKeyDown={(e) => e.key === 'Enter' && message.trim() && create.mutate()}
        />
        <Button onClick={() => create.mutate()} disabled={!message.trim()} className="gradient-primary text-primary-foreground shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Card className="gradient-card border-border">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {announcements?.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-4 gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{a.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={a.is_active ? 'default' : 'secondary'}>{a.is_active ? 'Active' : 'Hidden'}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => toggle.mutate({ id: a.id, active: !a.is_active })}>
                    {a.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(a.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {announcements?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No announcements</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
