import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollText, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

export default function RulesPage() {
  const { isAdmin } = useAuthStore();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState('');

  const { data: rules } = useQuery({
    queryKey: ['rules'],
    queryFn: async () => {
      const { data } = await supabase.from('rules').select('*').limit(1).single();
      return data;
    },
  });

  const saveRules = useMutation({
    mutationFn: async () => {
      if (rules?.id) {
        const { error } = await supabase.from('rules').update({ content }).eq('id', rules.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('rules').insert({ content });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      setEditing(false);
      toast.success('Rules saved');
    },
    onError: () => toast.error('Failed to save rules'),
  });

  const startEdit = () => {
    setContent(rules?.content || '');
    setEditing(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ScrollText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-sans font-bold">Competition Rules</h1>
        </div>
        {isAdmin() && !editing && (
          <Button onClick={startEdit} variant="outline">Edit Rules</Button>
        )}
        {isAdmin() && editing && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={() => saveRules.mutate()} className="gradient-primary text-primary-foreground">
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
              placeholder="Write rules in Markdown..."
            />
          ) : (
            <div className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-a:text-primary prose-li:text-foreground/90 prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-blockquote:border-primary prose-blockquote:text-muted-foreground prose-table:text-foreground/90 prose-th:text-foreground prose-td:border-border prose-th:border-border">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {rules?.content || '*No rules have been set yet.*'}
              </ReactMarkdown>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
