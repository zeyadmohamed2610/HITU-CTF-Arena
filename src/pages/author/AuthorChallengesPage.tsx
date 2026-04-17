import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const difficulties = ['easy', 'medium', 'hard', 'insane'];

interface ChallengeForm {
  title: string;
  description: string;
  flag: string;
  points: number;
  difficulty: string;
  category_id: string;
  is_dynamic: boolean;
  dynamic_decay_rate: number;
  is_active: boolean;
  first_blood_bonus: number;
}

const emptyForm: ChallengeForm = {
  title: '',
  description: '',
  flag: '',
  points: 100,
  difficulty: 'medium',
  category_id: '',
  is_dynamic: false,
  dynamic_decay_rate: 10,
  is_active: true,
  first_blood_bonus: 0,
};

export default function AuthorChallengesPage() {
  const { user, isAdmin } = useAuthStore();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ChallengeForm>(emptyForm);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').order('name');
      return data ?? [];
    },
  });

  const { data: challenges } = useQuery({
    queryKey: ['author-challenges', user?.id],
    queryFn: async () => {
      let q = supabase.from('challenges').select('*, categories(name)').order('created_at', { ascending: false });
      if (!isAdmin()) q = q.eq('created_by', user!.id);
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!user,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        category_id: form.category_id || null,
        created_by: user!.id,
      };
      if (editId) {
        const { created_by, ...update } = payload;
        const { error } = await supabase.from('challenges').update(update).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('challenges').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['author-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      setDialogOpen(false);
      setEditId(null);
      setForm(emptyForm);
      toast.success(editId ? 'Challenge updated' : 'Challenge created');
    },
    onError: () => toast.error('Failed to save challenge'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('challenges').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['author-challenges'] });
      toast.success('Challenge deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      title: c.title,
      description: c.description,
      flag: c.flag,
      points: c.points,
      difficulty: c.difficulty,
      category_id: c.category_id || '',
      is_dynamic: c.is_dynamic,
      dynamic_decay_rate: c.dynamic_decay_rate || 10,
      is_active: c.is_active,
      first_blood_bonus: c.first_blood_bonus || 0,
    });
    setDialogOpen(true);
  };

  const diffColors: Record<string, string> = {
    easy: 'bg-success/20 text-success',
    medium: 'bg-warning/20 text-warning',
    hard: 'bg-destructive/20 text-destructive',
    insane: 'bg-destructive/30 text-destructive',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-sans font-bold">{isAdmin() ? 'All Challenges' : 'My Challenges'}</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" /> New Challenge
            </Button>
          </DialogTrigger>
          <DialogContent className="gradient-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Challenge' : 'Create Challenge'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-muted border-border" />
              </div>
              <div className="space-y-2">
                <Label>Description (Markdown)</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-muted border-border min-h-[150px] font-mono text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Flag</Label>
                  <Input value={form.flag} onChange={(e) => setForm({ ...form, flag: e.target.value })} placeholder="CTF{...}" className="bg-muted border-border font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Points</Label>
                  <Input type="number" value={form.points} onChange={(e) => setForm({ ...form, points: parseInt(e.target.value) || 0 })} className="bg-muted border-border" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                    <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {difficulties.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                    <SelectTrigger className="bg-muted border-border"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Blood Bonus</Label>
                  <Input type="number" value={form.first_blood_bonus} onChange={(e) => setForm({ ...form, first_blood_bonus: parseInt(e.target.value) || 0 })} className="bg-muted border-border" />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={form.is_dynamic} onCheckedChange={(v) => setForm({ ...form, is_dynamic: v })} />
                  <Label>Dynamic Scoring</Label>
                </div>
              </div>
              {form.is_dynamic && (
                <div className="space-y-2">
                  <Label>Decay Rate</Label>
                  <Input type="number" value={form.dynamic_decay_rate} onChange={(e) => setForm({ ...form, dynamic_decay_rate: parseFloat(e.target.value) || 10 })} className="bg-muted border-border" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
              <Button
                onClick={() => save.mutate()}
                disabled={!form.title.trim() || !form.flag.trim()}
                className="w-full gradient-primary text-primary-foreground"
              >
                {editId ? 'Update Challenge' : 'Create Challenge'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {challenges?.map((c) => (
          <Card key={c.id} className="gradient-card border-border">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.title}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className={diffColors[c.difficulty] || ''}>{c.difficulty}</Badge>
                    <Badge variant="secondary" className="font-mono">{c.points}pts</Badge>
                    {c.categories && <Badge variant="outline">{(c.categories as any).name}</Badge>}
                    {!c.is_active && <Badge variant="destructive">Inactive</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(c.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {challenges?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No challenges yet. Create your first one!</div>
        )}
      </div>
    </div>
  );
}
