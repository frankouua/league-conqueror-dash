import { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageSquare, 
  Search, 
  Send, 
  Phone, 
  User, 
  MoreVertical,
  Inbox,
  ShieldAlert,
  Loader2,
  Smartphone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWhatsAppChats } from '@/hooks/useWhatsAppChats';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { useMyWhatsAppInstances } from '@/hooks/useMyWhatsAppInstances';
import { useWhatsAppSendMessage } from '@/hooks/useWhatsAppSendMessage';
import { useWhatsAppSendMedia } from '@/hooks/useWhatsAppSendMedia';
import { useMarkChatAsRead } from '@/hooks/useMarkChatAsRead';
import { ChannelsSidebar } from '@/components/crm/chats/ChannelsSidebar';
import { InstancesList } from '@/components/crm/chats/InstancesList';
import { WhatsAppMediaRenderer } from '@/components/crm/chats/WhatsAppMediaRenderer';
import { MediaUploadButton, type MediaFile } from '@/components/crm/chats/MediaUploadButton';
import { MediaLibraryDialog } from '@/components/crm/chats/MediaLibraryDialog';
import { MediaViewer, MediaViewerItem } from '@/components/crm/chats/MediaViewer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChatMediaPreview } from '@/components/crm/chats/ChatMediaPreview';

type Channel = 'whatsapp' | 'instagram' | 'facebook';

function isWhatsAppVisualMediaMessage(messageType: string | null, mediaUrl: string | null, mediaPreview?: string | null) {
  const type = (messageType?.toLowerCase() || '').replace('message', '').trim();
  const hasMedia = Boolean(mediaUrl || mediaPreview);

  // Tipos que devem parecer “WhatsApp”: imagem/sticker/vídeo/áudio/documento
  if (['image', 'sticker', 'video', 'audio', 'ptt', 'document', 'documentwithcaption'].includes(type)) return true;

  // Heurística: às vezes vem como Conversation/Text mas com mídia presente
  if (hasMedia && (type === 'text' || type === 'conversation' || type === 'extendedtext' || type === '')) return true;

  return false;
}

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return '';
  try {
    return format(new Date(timestamp), 'HH:mm', { locale: ptBR });
  } catch {
    return '';
  }
}

export function CRMChatsModule() {
  // Channel & Instance State
  const [activeChannel, setActiveChannel] = useState<Channel>('whatsapp');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  
  // Media viewer state for navigation between chat media
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  
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
  
  // WhatsApp media sending
  const { sendMedia, sending: sendingMedia } = useWhatsAppSendMedia();
  
  // Mark chat as read hook
  const { markAsRead } = useMarkChatAsRead();

  // Auto-select first instance when instances load and none is selected
  useEffect(() => {
    if (!instancesLoading && instances.length > 0 && !selectedInstanceId) {
      const firstInstance = instances[0];
      if (firstInstance && hasAccess(firstInstance.instance_id)) {
        setSelectedInstanceId(firstInstance.instance_id);
      }
    }
  }, [instancesLoading, instances, selectedInstanceId, hasAccess]);

  // Get selected chat info
  const selectedChat = chats.find((c) => c.id === selectedConversation);
  const currentRole = selectedInstanceId ? getRole(selectedInstanceId) : null;
  const currentInstance = instances.find(i => i.instance_id === selectedInstanceId);

  // Check if user can send messages in the current context
  const canSend = selectedInstanceId && selectedConversation && canSendMessage(selectedInstanceId);
  const isInputDisabled = !selectedConversation || !canSend || sending;

  // Handle channel selection
  const handleSelectChannel = (channel: Channel) => {
    setActiveChannel(channel);
    // Reset state when changing channels
    if (channel !== 'whatsapp') {
      setSelectedInstanceId(null);
      setSelectedConversation(null);
    }
  };

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

  // Handle media selection
  const handleMediaSelect = useCallback(async (media: MediaFile) => {
    if (!selectedInstanceId || !selectedConversation || !selectedChat) return;

    await sendMedia({
      instanceId: selectedInstanceId,
      chatId: selectedConversation,
      remoteJid: selectedChat.remote_jid,
      mediaType: media.type,
      file: media.file,
      caption: media.caption,
      latitude: media.latitude,
      longitude: media.longitude,
      locationName: media.locationName,
      locationAddress: media.locationAddress,
      contactName: media.contactName,
      contactPhone: media.contactPhone,
    });
  }, [selectedInstanceId, selectedConversation, selectedChat, sendMedia]);

  // Filter chats by search query
  const filteredChats = chats.filter((chat) => {
    const name = chat.contact_name?.toLowerCase() || '';
    const number = chat.contact_number?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return name.includes(query) || number.includes(query);
  });

  // Compute all media items from messages for navigation
  const allChatMedia = useMemo<MediaViewerItem[]>(() => {
    return messages
      .filter(msg => {
        const type = (msg.message_type?.toLowerCase() || '').replace('message', '');
        const hasMedia = msg.media_url || msg.media_preview;
        // Captura imagens de várias formas que podem vir do WhatsApp
        const isImage = type.includes('image') || 
                       type === 'image' || 
                       type === 'sticker' ||
                       (hasMedia && (type === 'text' || type === 'conversation' || type === 'extendedtext' || type === ''));
        return hasMedia && isImage;
      })
      .map(msg => ({
        id: msg.id,
        type: 'image' as const,
        src: msg.media_url || msg.media_preview || '',
        preview: msg.media_preview,
        caption: msg.content && msg.content !== '[Imagem]' && !msg.content.toLowerCase().includes('imagem') 
          ? msg.content 
          : undefined,
        timestamp: msg.message_timestamp,
        fromMe: msg.from_me,
        contactName: selectedChat?.contact_name,
      }));
  }, [messages, selectedChat?.contact_name]);

  // Get current media for viewer
  const selectedMedia = useMemo(() => {
    return allChatMedia.find(m => m.id === selectedMediaId) || null;
  }, [allChatMedia, selectedMediaId]);

  // Handle opening media viewer
  const handleOpenMediaViewer = useCallback((mediaId: string) => {
    setSelectedMediaId(mediaId);
    setMediaViewerOpen(true);
  }, []);

  // Handle navigation between media
  const handleMediaNavigate = useCallback((direction: 'prev' | 'next') => {
    if (!selectedMediaId || allChatMedia.length === 0) return;
    
    const currentIndex = allChatMedia.findIndex(m => m.id === selectedMediaId);
    if (currentIndex === -1) return;
    
    let newIndex: number;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
    } else {
      newIndex = currentIndex < allChatMedia.length - 1 ? currentIndex + 1 : currentIndex;
    }
    
    if (allChatMedia[newIndex]) {
      setSelectedMediaId(allChatMedia[newIndex].id);
    }
  }, [selectedMediaId, allChatMedia]);

  return (
    <div className="h-[calc(100vh-220px)] min-h-[500px]">
      <div className="h-full rounded-lg border bg-card flex overflow-hidden">
        {/* Column 1 - Channels Sidebar */}
        <ChannelsSidebar
          activeChannel={activeChannel}
          onSelectChannel={handleSelectChannel}
          onOpenMediaLibrary={() => setMediaLibraryOpen(true)}
        />

        {/* Column 2 - Instances List (WhatsApp only) */}
        {activeChannel === 'whatsapp' && (
          <InstancesList
            instances={instances}
            selectedInstanceId={selectedInstanceId}
            onSelectInstance={handleSelectInstance}
            loading={instancesLoading}
          />
        )}

        {/* Column 3 - Conversations List */}
        <div className="w-72 border-r bg-card flex flex-col shrink-0">
          {/* Instance Header - Fixed when instance is selected */}
          {selectedInstanceId && currentInstance && (
            <div className="p-3 border-b bg-gradient-to-r from-green-500/10 to-transparent shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">
                    {currentInstance.instance_name}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {currentInstance.phone_number || 'Número não configurado'}
                  </p>
                </div>
                <Badge 
                  variant={currentInstance.status === 'connected' ? 'default' : 'secondary'}
                  className={cn(
                    "text-[10px] h-5 shrink-0",
                    currentInstance.status === 'connected' 
                      ? "bg-green-500/20 text-green-700 hover:bg-green-500/30" 
                      : ""
                  )}
                >
                  {currentInstance.status === 'connected' ? 'Online' : 'Pendente'}
                </Badge>
              </div>
            </div>
          )}

          {/* Search Header */}
          <div className="p-3 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Conversas
              </h3>
              {selectedInstanceId && (
                <Badge variant="secondary" className="text-xs">
                  {chats.length}
                </Badge>
              )}
            </div>
            
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
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <ShieldAlert className="w-7 h-7 text-muted-foreground" />
                </div>
                <h4 className="font-medium text-sm text-foreground mb-1">
                  Selecione uma instância
                </h4>
                <p className="text-xs text-muted-foreground">
                  Escolha uma instância à esquerda
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
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Inbox className="w-7 h-7 text-muted-foreground" />
                </div>
                <h4 className="font-medium text-sm text-foreground mb-1">
                  Nenhuma conversa
                </h4>
                <p className="text-xs text-muted-foreground">
                  As conversas aparecerão aqui
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => handleSelectConversation(chat.id)}
                    className={cn(
                      "w-full px-2 py-2 text-left transition-all relative",
                      selectedConversation === chat.id 
                        ? "bg-primary/10 border-l-3 border-l-primary" 
                        : "hover:bg-muted/50 border-l-3 border-l-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                        selectedConversation === chat.id 
                          ? "bg-primary/20" 
                          : "bg-primary/10"
                      )}>
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center justify-between gap-1">
                          <span className={cn(
                            "text-[13px] leading-tight font-medium block overflow-hidden text-ellipsis whitespace-nowrap",
                            selectedConversation === chat.id && "text-primary"
                          )}>
                            {chat.contact_name || chat.contact_number || 'Sem nome'}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatTimestamp(chat.last_message_timestamp)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
                          {chat.contact_number || chat.remote_jid?.replace('@s.whatsapp.net', '')}
                        </p>
                      </div>
                      {(chat.unread_count ?? 0) > 0 && (
                        <Badge className="h-4 min-w-4 text-[10px] px-1 shrink-0">
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

        {/* Column 4 - Messages + Details */}
        <div className="flex-1 flex min-w-0">
          {/* Messages Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat Header */}
            <div className="p-3 border-b flex items-center justify-between shrink-0">
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
                    Bem-vindo ao Hub de Chats
                  </h4>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Selecione um canal, instância e conversa para começar
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
                <div className="space-y-2">
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
                          "max-w-[75%] rounded-lg overflow-hidden",
                          // Mídia visual: padding menor para a miniatura ocupar mais espaço, mas mantém o balão
                          isWhatsAppVisualMediaMessage(msg.message_type, msg.media_url, msg.media_preview)
                            ? "p-1"
                            : "px-2.5 py-1.5",
                          // Cor do balão para todas as mensagens (texto e mídia)
                          msg.from_me
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {!msg.from_me && msg.sender_name && (
                          <p className="text-[11px] font-medium mb-0.5 opacity-70">
                            {msg.sender_name}
                          </p>
                        )}
                        <WhatsAppMediaRenderer
                          messageType={msg.message_type}
                          content={msg.content}
                          mediaUrl={msg.media_url}
                          mediaPreview={msg.media_preview}
                          fromMe={msg.from_me}
                          messageId={msg.id}
                          timestamp={msg.message_timestamp}
                          contactName={selectedChat?.contact_name}
                          onOpenMediaViewer={handleOpenMediaViewer}
                        />
                        <p
                          className={cn(
                            "text-[10px] mt-0.5 text-right",
                            msg.from_me
                              ? "text-primary-foreground/60"
                              : "text-muted-foreground"
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
            <div className="p-3 border-t shrink-0">
              <div className="flex items-center gap-2">
                <MediaUploadButton
                  disabled={isInputDisabled || sendingMedia}
                  onMediaSelect={handleMediaSelect}
                />
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
                  disabled={isInputDisabled || !messageInput.trim() || sendingMedia}
                  onClick={handleSendMessage}
                  className="shrink-0"
                >
                  {sending || sendingMedia ? (
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

          {/* Details Panel */}
          <div className="w-64 border-l bg-card flex flex-col shrink-0">
            {/* Panel Header */}
            <div className="p-3 border-b shrink-0">
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
                    Selecione uma conversa
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Contact Info */}
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                      <User className="w-7 h-7 text-primary" />
                    </div>
                    <h4 className="font-medium text-sm">
                      {selectedChat?.contact_name || 'Sem nome'}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {selectedChat?.contact_number || selectedChat?.remote_jid}
                    </p>
                  </div>

                  {/* Instance Info */}
                  {currentInstance && (
                    <div className="space-y-1.5">
                      <h5 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        Instância
                      </h5>
                      <Card className="bg-muted/50">
                        <CardContent className="p-2.5">
                          <p className="text-xs font-medium">{currentInstance.instance_name}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">
                            Papel: {currentRole}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="space-y-1.5">
                    <h5 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Ações Rápidas
                    </h5>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button variant="outline" size="sm" className="h-7 text-[10px]" disabled>
                        Ver Lead
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-[10px]" 
                        disabled={!canManageChats(selectedInstanceId || '')}
                      >
                        Nova Tarefa
                      </Button>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-1.5">
                    <h5 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Tags
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-[10px]">Lead</Badge>
                      <Badge variant="secondary" className="text-[10px]">Novo</Badge>
                    </div>
                  </div>

                  {/* Chat Media Preview */}
                  <ChatMediaPreview messages={messages} />

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <h5 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Notas
                    </h5>
                    <Card className="bg-muted/50">
                      <CardContent className="p-2.5">
                        <p className="text-[10px] text-muted-foreground italic">
                          Nenhuma nota adicionada
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Media Library Dialog */}
      <MediaLibraryDialog
        open={mediaLibraryOpen}
        onOpenChange={setMediaLibraryOpen}
        defaultChannel={activeChannel}
      />

      {/* Media Viewer for chat images with navigation */}
      <MediaViewer
        open={mediaViewerOpen}
        onOpenChange={setMediaViewerOpen}
        media={selectedMedia}
        allMedia={allChatMedia}
        onNavigate={handleMediaNavigate}
      />
    </div>
  );
}
