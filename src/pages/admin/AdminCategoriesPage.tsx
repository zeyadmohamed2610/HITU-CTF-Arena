import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminLog } from '@/lib/adminLog';

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').order('name');
      return data ?? [];
    },
  });

  const addCategory = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('categories').insert({ name: newName.trim() });
      if (error) throw error;
      await adminLog('create_category', { name: newName.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setNewName('');
      toast.success('Category added');
    },
    onError: () => toast.error('Failed to add category'),
  });

  const deleteCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      await adminLog('delete_category', { category_id: id, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-sans font-bold">Categories</h1>
      </div>

      <div className="flex gap-2 max-w-md">
        <Input
          placeholder="New category name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="bg-muted border-border"
          onKeyDown={(e) => e.key === 'Enter' && newName.trim() && addCategory.mutate()}
        />
        <Button onClick={() => addCategory.mutate()} disabled={!newName.trim()} className="gradient-primary text-primary-foreground">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Card className="gradient-card border-border">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {categories?.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-4">
                <span className="font-medium">{cat.name}</span>
                <Button size="sm" variant="ghost" onClick={() => deleteCategory.mutate({ id: cat.id, name: cat.name })} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {categories?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No categories yet</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
