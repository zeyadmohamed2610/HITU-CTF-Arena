import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Flag, CheckCircle, Clock, Search } from 'lucide-react';
import { toast } from 'sonner';
import { logActivity } from '@/lib/activityLog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const difficultyColors: Record<string, string> = {
  easy: 'bg-success/20 text-success',
  medium: 'bg-warning/20 text-warning',
  hard: 'bg-destructive/20 text-destructive',
  insane: 'bg-destructive/30 text-destructive',
};

const DIFFICULTIES = ['easy', 'medium', 'hard', 'insane'];

export default function ChallengesPage() {
  const { user } = useAuthStore();
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [flagInput, setFlagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: ctfSettings } = useQuery({
    queryKey: ['ctf-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('ctf_settings').select('*').limit(1).maybeSingle();
      return data;
    },
  });

  const ctfEnded = !!ctfSettings?.end_time && new Date(ctfSettings.end_time).getTime() <= Date.now();
  const allowPostCtf = Boolean((ctfSettings as any)?.allow_post_ctf_submissions);
  const submissionsBlocked = ctfEnded && !allowPostCtf;
  const noPointsMode = ctfEnded && allowPostCtf;

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').order('name');
      return data ?? [];
    },
  });

  const { data: challenges } = useQuery({
    queryKey: ['challenges'],
    queryFn: async () => {
      const { data } = await supabase
        .from('challenges')
        .select('*, categories(name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const { data: userSolves, refetch: refetchSolves } = useQuery({
    queryKey: ['user-solves', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('solves').select('challenge_id').eq('user_id', user!.id);
      return new Set(data?.map((s) => s.challenge_id) ?? []);
    },
    enabled: !!user,
  });

  const toggleFilter = (set: Set<string>, value: string): Set<string> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const filtered = challenges?.filter((c) => {
    if (selectedCategories.size > 0 && !selectedCategories.has(c.category_id ?? '')) return false;
    if (selectedDifficulties.size > 0 && !selectedDifficulties.has(c.difficulty)) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by category
  const grouped = new Map<string, { name: string; challenges: typeof filtered }>();
  filtered?.forEach((c) => {
    const catId = c.category_id ?? 'uncategorized';
    const catName = (c.categories as any)?.name ?? 'Uncategorized';
    if (!grouped.has(catId)) {
      grouped.set(catId, { name: catName, challenges: [] });
    }
    grouped.get(catId)!.challenges!.push(c);
  });

  const handleSubmitFlag = async () => {
    if (!selectedChallenge || !user || !flagInput.trim()) return;
    if (submissionsBlocked) {
      toast.error('CTF has ended. Submissions are closed.');
      return;
    }
    setSubmitting(true);

    try {
      await supabase.from('submissions').insert({
        user_id: user.id,
        challenge_id: selectedChallenge.id,
        flag_submitted: flagInput,
        is_correct: false,
      });

      const { data: challenge } = await supabase
        .from('challenges')
        .select('flag, points')
        .eq('id', selectedChallenge.id)
        .single();

      if (challenge && flagInput.trim() === challenge.flag) {
        if (noPointsMode) {
          toast.success('✅ Correct flag! (No points — CTF has ended)');
          logActivity('flag_submit_correct_post_ctf', { challenge: selectedChallenge.title });
          setSelectedChallenge(null);
          setFlagInput('');
        } else {
          const { error } = await supabase.from('solves').insert({
            user_id: user.id,
            challenge_id: selectedChallenge.id,
            points_awarded: challenge.points,
          });

          if (!error) {
            toast.success('🎉 Correct flag! Points awarded!');
            logActivity('flag_submit_correct', { challenge: selectedChallenge.title, points: challenge.points });
            refetchSolves();
            setSelectedChallenge(null);
            setFlagInput('');
          } else if (error.code === '23505') {
            toast.info('You already solved this challenge!');
          }
        }
      } else {
        toast.error('Incorrect flag. Try again!');
        logActivity('flag_submit_wrong', { challenge: selectedChallenge.title });
      }
    } catch {
      toast.error('Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-sans font-bold">Challenges</h1>
        <p className="text-muted-foreground mt-1">Capture the flag to earn points</p>
      </div>

      {submissionsBlocked && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="font-sans font-semibold text-destructive">🏁 CTF has ended</p>
          <p className="text-sm text-muted-foreground mt-1">Submissions are closed. The scoreboard is now final.</p>
        </div>
      )}
      {noPointsMode && (
        <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
          <p className="font-sans font-semibold text-warning">⏰ CTF has ended — practice mode</p>
          <p className="text-sm text-muted-foreground mt-1">You can still submit flags to verify them, but no points will be awarded.</p>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search challenges..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-muted border-border"
        />
      </div>

      {/* Multi-select Filters */}
      <div className="flex flex-wrap gap-6">
        {/* Category filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Categories</Label>
          <div className="flex flex-wrap gap-2">
            {categories?.map((c) => (
              <label
                key={c.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border cursor-pointer transition-colors text-sm ${
                  selectedCategories.has(c.id)
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Checkbox
                  checked={selectedCategories.has(c.id)}
                  onCheckedChange={() => setSelectedCategories(toggleFilter(selectedCategories, c.id))}
                  className="h-3.5 w-3.5"
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>

        {/* Difficulty filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Difficulty</Label>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((d) => (
              <label
                key={d}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border cursor-pointer transition-colors text-sm capitalize ${
                  selectedDifficulties.has(d)
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Checkbox
                  checked={selectedDifficulties.has(d)}
                  onCheckedChange={() => setSelectedDifficulties(toggleFilter(selectedDifficulties, d))}
                  className="h-3.5 w-3.5"
                />
                {d}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Challenges grouped by category */}
      {Array.from(grouped.entries()).map(([catId, { name, challenges: catChallenges }]) => (
        <div key={catId} className="space-y-3">
          <h2 className="text-xl font-sans font-semibold flex items-center gap-2 border-b border-border pb-2">
            <Flag className="h-5 w-5 text-primary" />
            {name}
            <Badge variant="secondary" className="ml-2 text-xs">{catChallenges?.length}</Badge>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {catChallenges?.map((challenge) => {
              const solved = userSolves?.has(challenge.id);
              return (
                <Card
                  key={challenge.id}
                  className={`gradient-card border-border card-hover cursor-pointer ${solved ? 'border-primary/50' : ''}`}
                  onClick={() => { setSelectedChallenge(challenge); setFlagInput(''); }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base font-sans">{challenge.title}</CardTitle>
                      {solved && <CheckCircle className="h-5 w-5 text-primary shrink-0" />}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className={difficultyColors[challenge.difficulty]}>
                        {challenge.difficulty}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-mono font-bold text-primary">{challenge.points}pts</span>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Flag className="h-3.5 w-3.5" />
                        {challenge.solve_count} solves
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {filtered?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No challenges found matching your filters.
        </div>
      )}

      {/* Challenge Detail Dialog */}
      <Dialog open={!!selectedChallenge} onOpenChange={() => setSelectedChallenge(null)}>
        <DialogContent className="max-w-2xl gradient-card border-border">
          {selectedChallenge && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-sans flex items-center gap-2">
                  {selectedChallenge.title}
                  {userSolves?.has(selectedChallenge.id) && (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                </DialogTitle>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className={difficultyColors[selectedChallenge.difficulty]}>
                    {selectedChallenge.difficulty}
                  </Badge>
                  <Badge variant="secondary">{selectedChallenge.points}pts</Badge>
                </div>
              </DialogHeader>
              <div className="markdown-content prose prose-invert max-w-none text-sm mt-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedChallenge.description}
                </ReactMarkdown>
              </div>
              {submissionsBlocked && !userSolves?.has(selectedChallenge.id) && (
                <p className="mt-4 text-sm text-destructive">🏁 CTF has ended. Submissions are closed.</p>
              )}
              {!userSolves?.has(selectedChallenge.id) && !submissionsBlocked && (
                <div className="flex gap-2 mt-4">
                  <Input
                    placeholder="CTF{your_flag_here}"
                    value={flagInput}
                    onChange={(e) => setFlagInput(e.target.value)}
                    className="bg-muted border-border font-mono"
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitFlag()}
                  />
                  <Button
                    onClick={handleSubmitFlag}
                    disabled={submitting || !flagInput.trim()}
                    className="gradient-primary text-primary-foreground"
                  >
                    {submitting ? <Clock className="h-4 w-4 animate-spin" /> : 'Submit'}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
