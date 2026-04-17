import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Award, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminBadgesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { data: badges } = useQuery({
    queryKey: ['badges'],
    queryFn: async () => {
      const { data } = await supabase.from('badges').select('*').order('name');
      return data ?? [];
    },
  });

  const addBadge = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('badges').insert({ name: name.trim(), description: description.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      setName(''); setDescription('');
      toast.success('Badge created');
    },
    onError: () => toast.error('Failed to create badge'),
  });

  const deleteBadge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('badges').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      toast.success('Badge deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Award className="h-8 w-8 text-warning" />
        <h1 className="text-3xl font-sans font-bold">Badges</h1>
      </div>

      <div className="flex gap-2 max-w-lg">
        <Input placeholder="Badge name" value={name} onChange={(e) => setName(e.target.value)} className="bg-muted border-border" />
        <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-muted border-border" />
        <Button onClick={() => addBadge.mutate()} disabled={!name.trim()} className="gradient-primary text-primary-foreground shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Card className="gradient-card border-border">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {badges?.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-4">
                <div>
                  <span className="font-medium">{b.name}</span>
                  {b.description && <p className="text-sm text-muted-foreground">{b.description}</p>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteBadge.mutate(b.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {badges?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No badges yet</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
