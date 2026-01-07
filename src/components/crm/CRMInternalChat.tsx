import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Send, MessageSquare, User, Loader2, FileText, StickyNote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  lead_id: string;
  sender_id: string;
  sender_name: string | null;
  content: string;
  message_type: 'text' | 'note' | 'system' | 'file';
  is_internal: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

interface CRMInternalChatProps {
  leadId: string;
  leadName?: string;
}

export function CRMInternalChat({ leadId, leadName }: CRMInternalChatProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'note'>('text');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['crm-chat-messages', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_chat_messages')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!leadId,
    refetchInterval: 5000, // Poll every 5 seconds as backup
  });

  // Real-time subscription
  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel(`crm-chat-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'crm_chat_messages',
          filter: `lead_id=eq.${leadId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['crm-chat-messages', leadId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!message.trim() || !user) return;

      const { error } = await supabase.from('crm_chat_messages').insert({
        lead_id: leadId,
        sender_id: user.id,
        sender_name: profile?.full_name || user.email,
        content: message.trim(),
        message_type: messageType,
        is_internal: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['crm-chat-messages', leadId] });
    },
  });

  const handleSend = () => {
    if (message.trim()) {
      sendMessage.mutate();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'note':
        return <StickyNote className="h-3 w-3" />;
      case 'file':
        return <FileText className="h-3 w-3" />;
      case 'system':
        return null;
      default:
        return <MessageSquare className="h-3 w-3" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Chat Interno</span>
          {leadName && (
            <Badge variant="outline" className="text-xs">
              {leadName}
            </Badge>
          )}
        </div>
        <Badge variant="secondary" className="text-xs">
          {messages.length} mensagens
        </Badge>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Nenhuma mensagem ainda</p>
            <p className="text-xs">Comece a conversar sobre este lead</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isOwn = msg.sender_id === user?.id;
              const isSystem = msg.message_type === 'system';

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      {msg.content}
                    </Badge>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={cn('flex gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-xs bg-primary/10">
                      {getInitials(msg.sender_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      'max-w-[70%] rounded-lg px-3 py-2',
                      isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted',
                      msg.message_type === 'note' && 'border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('text-xs font-medium', isOwn ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                        {isOwn ? 'Você' : msg.sender_name || 'Usuário'}
                      </span>
                      {msg.message_type !== 'text' && (
                        <Badge variant="outline" className="h-4 px-1 text-[10px]">
                          {getMessageTypeIcon(msg.message_type)}
                          <span className="ml-1">
                            {msg.message_type === 'note' ? 'Nota' : msg.message_type}
                          </span>
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    <span className={cn('text-[10px] mt-1 block', isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t space-y-2">
        <Tabs value={messageType} onValueChange={(v) => setMessageType(v as 'text' | 'note')}>
          <TabsList className="h-8">
            <TabsTrigger value="text" className="text-xs gap-1 h-6">
              <MessageSquare className="h-3 w-3" />
              Mensagem
            </TabsTrigger>
            <TabsTrigger value="note" className="text-xs gap-1 h-6">
              <StickyNote className="h-3 w-3" />
              Nota
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <Textarea
            placeholder={messageType === 'note' ? 'Adicionar nota interna...' : 'Digite sua mensagem...'}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[60px] resize-none"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!message.trim() || sendMessage.isPending}
            className="h-auto"
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
