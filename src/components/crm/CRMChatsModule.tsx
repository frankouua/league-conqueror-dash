import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from '@/components/ui/resizable';
import { 
  MessageSquare, 
  Search, 
  Send, 
  Phone, 
  User, 
  MoreVertical,
  Inbox,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWhatsAppChats } from '@/hooks/useWhatsAppChats';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { useMyWhatsAppInstances } from '@/hooks/useMyWhatsAppInstances';
import { useWhatsAppSendMessage } from '@/hooks/useWhatsAppSendMessage';
import { useMarkChatAsRead } from '@/hooks/useMarkChatAsRead';
import { InstanceSelector } from '@/components/crm/chats/InstanceSelector';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return '';
  try {
    return format(new Date(timestamp), 'HH:mm', { locale: ptBR });
  } catch {
    return '';
  }
}

export function CRMChatsModule() {
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  
  // Load user's authorized instances
  const { 
    instances, 
    loading: instancesLoading, 
    hasAccess, 
    getRole,
    canManageChats 
  } = useMyWhatsAppInstances();
  
  // Load chats for selected instance only
  const { chats, loading: chatsLoading } = useWhatsAppChats(selectedInstanceId);
  const { messages, loading: messagesLoading } = useWhatsAppMessages(selectedConversation);
  
  // WhatsApp message sending with instance validation
  const { sendMessage, canSendMessage, sending } = useWhatsAppSendMessage();
  
  // Mark chat as read hook
  const { markAsRead } = useMarkChatAsRead();

  // Get selected chat info
  const selectedChat = chats.find((c) => c.id === selectedConversation);
  const currentRole = selectedInstanceId ? getRole(selectedInstanceId) : null;
  const currentInstance = instances.find(i => i.instance_id === selectedInstanceId);

  // Check if user can send messages in the current context
  const canSend = selectedInstanceId && selectedConversation && canSendMessage(selectedInstanceId);
  const isInputDisabled = !selectedConversation || !canSend || sending;

  // Handle instance selection with security check
  const handleSelectInstance = (instanceId: string) => {
    if (!hasAccess(instanceId)) {
      console.error('[WhatsApp Security] Blocked unauthorized instance access');
      return;
    }
    setSelectedInstanceId(instanceId);
    setSelectedConversation(null);
    setMessageInput('');
  };

  // Handle conversation selection with mark as read
  const handleSelectConversation = useCallback(async (chatId: string) => {
    if (!selectedInstanceId) return;
    
    // Update UI immediately
    setSelectedConversation(chatId);
    
    // Mark chat as read in the background
    await markAsRead({
      instanceId: selectedInstanceId,
      chatId
    });
  }, [selectedInstanceId, markAsRead]);

  // Handle message sending with full validation
  const handleSendMessage = useCallback(async () => {
    if (!selectedInstanceId || !selectedConversation || !selectedChat || !messageInput.trim()) {
      return;
    }

    const result = await sendMessage({
      instanceId: selectedInstanceId,
      chatId: selectedConversation,
      remoteJid: selectedChat.remote_jid,
      message: messageInput.trim()
    });

    if (result.success) {
      setMessageInput('');
    }
  }, [selectedInstanceId, selectedConversation, selectedChat, messageInput, sendMessage]);

  // Handle enter key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isInputDisabled) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage, isInputDisabled]);

  // Filter chats by search query
  const filteredChats = chats.filter((chat) => {
    const name = chat.contact_name?.toLowerCase() || '';
    const number = chat.contact_number?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return name.includes(query) || number.includes(query);
  });

  // Show instance selector when no instance is selected
  const showInstanceSelector = !selectedInstanceId || instances.length > 1;

  return (
    <div className="h-[calc(100vh-220px)] min-h-[500px]">
      <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border bg-card">
        {/* Left Column - Conversations List */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <div className="flex flex-col h-full">
            {/* Instance Selector & Search Header */}
            <div className="p-3 border-b space-y-3">
              {/* Instance Selector */}
              <InstanceSelector
                instances={instances}
                selectedInstanceId={selectedInstanceId}
                onSelectInstance={handleSelectInstance}
                loading={instancesLoading}
              />
              
              {/* Current role indicator */}
              {currentRole && (
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Conversas
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {chats.length}
                  </Badge>
                </div>
              )}
              
              {selectedInstanceId && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar conversas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              )}
            </div>

            {/* Conversations List */}
            <ScrollArea className="flex-1">
              {!selectedInstanceId ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <ShieldAlert className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h4 className="font-medium text-sm text-foreground mb-1">
                    Selecione uma instância
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Escolha uma instância WhatsApp para ver as conversas
                  </p>
                </div>
              ) : chatsLoading ? (
                <div className="p-3 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Inbox className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h4 className="font-medium text-sm text-foreground mb-1">
                    Nenhuma conversa
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    As conversas aparecerão aqui quando conectadas
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredChats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => handleSelectConversation(chat.id)}
                      className={cn(
                        "w-full p-3 text-left hover:bg-muted/50 transition-colors",
                        selectedConversation === chat.id && "bg-muted"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-medium text-sm truncate">
                              {chat.contact_name || chat.contact_number || 'Sem nome'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(chat.last_message_timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {chat.contact_number || chat.remote_jid}
                          </p>
                        </div>
                        {(chat.unread_count ?? 0) > 0 && (
                          <Badge className="h-5 min-w-5 flex items-center justify-center">
                            {chat.unread_count}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Center Column - Messages Area */}
        <ResizablePanel defaultSize={50} minSize={35}>
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="p-3 border-b flex items-center justify-between">
              {selectedConversation ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">
                        {selectedChat?.contact_name || selectedChat?.contact_number || 'Conversa'}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {selectedChat?.contact_number || selectedChat?.remote_jid}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm">Selecione uma conversa</span>
                </div>
              )}
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              {!selectedConversation ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                    <MessageSquare className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h4 className="font-medium text-foreground mb-2">
                    Bem-vindo ao Chats
                  </h4>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Selecione uma conversa à esquerda para ver as mensagens
                  </p>
                </div>
              ) : messagesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                      <Skeleton className="h-12 w-48 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center">
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    Nenhuma mensagem nesta conversa
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.from_me ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg px-3 py-2",
                          msg.from_me
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {!msg.from_me && msg.sender_name && (
                          <p className="text-xs font-medium mb-1 opacity-70">
                            {msg.sender_name}
                          </p>
                        )}
                        <p className="text-sm break-words">
                          {msg.content || '[Mídia]'}
                        </p>
                        <p
                          className={cn(
                            "text-xs mt-1",
                            msg.from_me ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}
                        >
                          {formatTimestamp(msg.message_timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-3 border-t">
              <div className="flex items-center gap-2">
                <Input
                  placeholder={
                    !selectedInstanceId 
                      ? "Selecione uma instância..." 
                      : !selectedConversation 
                        ? "Selecione uma conversa..." 
                        : !canSend
                          ? "Sem permissão para enviar..."
                          : "Digite uma mensagem..."
                  }
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="flex-1"
                  disabled={isInputDisabled}
                />
                <Button 
                  size="icon" 
                  disabled={isInputDisabled || !messageInput.trim()}
                  onClick={handleSendMessage}
                  className="shrink-0"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {selectedInstanceId && currentRole === 'viewer' && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Você tem permissão apenas para visualizar
                </p>
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Column - Details Panel */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <div className="flex flex-col h-full">
            {/* Panel Header */}
            <div className="p-3 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Detalhes
              </h3>
            </div>

            {/* Panel Content */}
            <ScrollArea className="flex-1 p-4">
              {!selectedConversation ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-sm text-muted-foreground">
                    Selecione uma conversa para ver os detalhes
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Contact Info */}
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <User className="w-8 h-8 text-primary" />
                    </div>
                    <h4 className="font-medium">
                      {selectedChat?.contact_name || 'Sem nome'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedChat?.contact_number || selectedChat?.remote_jid}
                    </p>
                  </div>

                  {/* Instance Info */}
                  {currentInstance && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Instância
                      </h5>
                      <Card className="bg-muted/50">
                        <CardContent className="p-3">
                          <p className="text-sm font-medium">{currentInstance.instance_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            Seu papel: {currentRole}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Ações Rápidas
                    </h5>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" className="h-8 text-xs" disabled>
                        Ver Lead
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-xs" 
                        disabled={!canManageChats(selectedInstanceId || '')}
                      >
                        Nova Tarefa
                      </Button>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Tags
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">Lead</Badge>
                      <Badge variant="secondary" className="text-xs">Novo</Badge>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Notas
                    </h5>
                    <Card className="bg-muted/50">
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground italic">
                          Nenhuma nota adicionada
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
