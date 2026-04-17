import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, Plus, Send, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';

export default function TicketsPage() {
  const { user, isAdmin } = useAuthStore();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch tickets - for players only own, for admin all
  const { data: tickets } = useQuery({
    queryKey: ['tickets', user?.id, isAdmin()],
    queryFn: async () => {
      let query = supabase.from('tickets').select('*').order('created_at', { ascending: false });
      const { data: ticketData, error } = await query;
      if (error) { console.error('tickets error', error); return []; }
      if (!ticketData || ticketData.length === 0) return [];
      
      // Fetch usernames for ticket owners
      const userIds = [...new Set(ticketData.map(t => t.user_id))];
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds);
      const profileMap = new Map(profileData?.map(p => [p.user_id, p.username]) ?? []);
      
      return ticketData.map(t => ({
        ...t,
        owner_username: profileMap.get(t.user_id) || 'Unknown',
      }));
    },
    enabled: !!user,
  });

  // Fetch replies for selected ticket
  const { data: replies } = useQuery({
    queryKey: ['ticket-replies', selectedTicketId],
    queryFn: async () => {
      const { data: replyData, error } = await supabase
        .from('ticket_replies')
        .select('*')
        .eq('ticket_id', selectedTicketId!)
        .order('created_at', { ascending: true });
      if (error) { console.error('replies error', error); return []; }
      if (!replyData || replyData.length === 0) return [];
      
      const userIds = [...new Set(replyData.map(r => r.user_id))];
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds);
      const profileMap = new Map(profileData?.map(p => [p.user_id, p.username]) ?? []);
      
      return replyData.map(r => ({
        ...r,
        owner_username: profileMap.get(r.user_id) || 'Unknown',
      }));
    },
    enabled: !!selectedTicketId,
    refetchInterval: 5000,
  });

  const selectedTicket = tickets?.find((t) => t.id === selectedTicketId);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  const createTicket = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tickets').insert({
        user_id: user!.id,
        subject: newSubject,
        message: newMessage,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setNewSubject('');
      setNewMessage('');
      setCreateOpen(false);
      toast.success('Ticket created');
    },
    onError: () => toast.error('Failed to create ticket'),
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ticket_replies').insert({
        ticket_id: selectedTicketId!,
        user_id: user!.id,
        message: replyText,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-replies'] });
      setReplyText('');
    },
    onError: () => toast.error('Failed to send reply'),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'open' | 'closed' }) => {
      const { error } = await supabase
        .from('tickets')
        .update({ status, closed_at: status === 'closed' ? new Date().toISOString() : null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket updated');
    },
    onError: () => toast.error('Failed to update ticket'),
  });

  const isMyMessage = (msgUserId: string) => msgUserId === user?.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-sans font-bold">Support Tickets</h1>
          <p className="text-muted-foreground mt-1">Need help? Open a ticket</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gradient-primary text-primary-foreground">
          <Plus className="h-4 w-4 mr-2" /> New Ticket
        </Button>
      </div>

      <div className="space-y-3">
        {tickets?.map((ticket) => (
          <Card
            key={ticket.id}
            className="gradient-card border-border card-hover cursor-pointer"
            onClick={() => setSelectedTicketId(ticket.id)}
          >
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3 min-w-0">
                <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {ticket.subject}
                    {isAdmin() && ticket.owner_username && (
                      <span className="text-muted-foreground ml-2">— {ticket.owner_username}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(ticket.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>{ticket.status}</Badge>
            </CardContent>
          </Card>
        ))}
        {tickets?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">No tickets yet</div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="gradient-card border-border">
          <DialogHeader><DialogTitle>Create Ticket</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Subject" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className="bg-muted border-border" />
            <Textarea placeholder="Describe your issue..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="bg-muted border-border min-h-[120px]" />
            <Button onClick={() => createTicket.mutate()} disabled={!newSubject.trim() || !newMessage.trim()} className="w-full gradient-primary text-primary-foreground">Submit</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedTicketId} onOpenChange={() => setSelectedTicketId(null)}>
        <DialogContent className="gradient-card border-border max-w-2xl max-h-[80vh] flex flex-col p-0">
          {selectedTicket && (
            <>
              <div className="flex items-center justify-between p-4 border-b border-border gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {selectedTicket.status === 'closed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus.mutate({ id: selectedTicket.id, status: 'open' })}
                      className="text-primary border-primary/40 hover:bg-primary/10 shrink-0"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" /> Reopen
                    </Button>
                  )}
                  <h3 className="font-sans font-semibold truncate">{selectedTicket.subject}</h3>
                  <Badge variant={selectedTicket.status === 'open' ? 'default' : 'secondary'} className="shrink-0">
                    {selectedTicket.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {selectedTicket.status === 'open' && isAdmin() && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateStatus.mutate({ id: selectedTicket.id, status: 'closed' })}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4 mr-1" /> Close
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[50vh]">
                <div className={`flex ${isMyMessage(selectedTicket.user_id) ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] p-3 rounded-lg ${isMyMessage(selectedTicket.user_id) ? 'bg-primary/20 rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
                    <p className="text-xs text-muted-foreground mb-1">
                      {isMyMessage(selectedTicket.user_id) ? 'You' : selectedTicket.owner_username}
                    </p>
                    <p className="text-sm">{selectedTicket.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(selectedTicket.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {replies?.map((r) => (
                  <div key={r.id} className={`flex ${isMyMessage(r.user_id) ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] p-3 rounded-lg ${isMyMessage(r.user_id) ? 'bg-primary/20 rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
                      <p className="text-xs text-muted-foreground mb-1">
                        {isMyMessage(r.user_id) ? 'You' : r.owner_username}
                      </p>
                      <p className="text-sm">{r.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {selectedTicket.status === 'closed' ? (
                <div className="p-4 border-t border-border text-center text-sm text-muted-foreground bg-muted/30">
                  🔒 This ticket is closed. {isAdmin() ? 'Reopen it' : 'An admin must reopen it'} to send messages.
                </div>
              ) : (
                <div className="flex gap-2 p-4 border-t border-border">
                  <Input
                    placeholder="Type a message..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="bg-muted border-border"
                    onKeyDown={(e) => e.key === 'Enter' && replyText.trim() && sendReply.mutate()}
                  />
                  <Button
                    onClick={() => sendReply.mutate()}
                    disabled={!replyText.trim()}
                    className="gradient-primary text-primary-foreground shrink-0"
                  >
                    <Send className="h-4 w-4" />
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
