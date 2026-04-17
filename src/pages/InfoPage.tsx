import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Info, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

export default function InfoPage() {
  const { isAdmin } = useAuthStore();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState('');

  const { data: info } = useQuery({
    queryKey: ['info'],
    queryFn: async () => {
      const { data } = await supabase.from('info' as any).select('*').limit(1).maybeSingle();
      return data as any;
    },
  });

  const saveInfo = useMutation({
    mutationFn: async () => {
      if (info?.id) {
        const { error } = await supabase.from('info' as any).update({ content, updated_at: new Date().toISOString() }).eq('id', info.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('info' as any).insert({ content });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['info'] });
      setEditing(false);
      toast.success('Info saved');
    },
    onError: () => toast.error('Failed to save info'),
  });

  const startEdit = () => {
    setContent(info?.content || '');
    setEditing(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Info className="h-8 w-8 text-info" />
          <h1 className="text-3xl font-sans font-bold">Info</h1>
        </div>
        {isAdmin() && !editing && (
          <Button onClick={startEdit} variant="outline">Edit Info</Button>
        )}
        {isAdmin() && editing && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={() => saveInfo.mutate()} className="gradient-primary text-primary-foreground">
              <Save className="h-4 w-4 mr-2" /> Save
            </Button>
          </div>
        )}
      </div>

      <Card className="gradient-card border-border">
        <CardContent className="pt-6">
          {editing ? (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="bg-muted border-border min-h-[400px] font-mono text-sm"
              placeholder="Write info in Markdown..."
            />
          ) : (
            <div className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-a:text-primary prose-li:text-foreground/90 prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-blockquote:border-primary prose-blockquote:text-muted-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {info?.content || '*No info has been set yet.*'}
              </ReactMarkdown>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
