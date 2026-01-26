import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Clock,
  CheckCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Placeholder conversation type
interface PlaceholderConversation {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar?: string;
}

// Placeholder data - empty for now
const placeholderConversations: PlaceholderConversation[] = [];

export function CRMChatsModule() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="h-[calc(100vh-220px)] min-h-[500px]">
      <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border bg-card">
        {/* Left Column - Conversations List */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <div className="flex flex-col h-full">
            {/* Search Header */}
            <div className="p-3 border-b space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Conversas
                </h3>
                <Badge variant="secondary" className="text-xs">
                  0
                </Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>

            {/* Conversations List */}
            <ScrollArea className="flex-1">
              {placeholderConversations.length === 0 ? (
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
                  {placeholderConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv.id)}
                      className={cn(
                        "w-full p-3 text-left hover:bg-muted/50 transition-colors",
                        selectedConversation === conv.id && "bg-muted"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-medium text-sm truncate">
                              {conv.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {conv.time}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.lastMessage}
                          </p>
                        </div>
                        {conv.unread > 0 && (
                          <Badge className="h-5 min-w-5 flex items-center justify-center">
                            {conv.unread}
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
                      <h4 className="font-medium text-sm">Nome do Contato</h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Online
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
                    Selecione uma conversa à esquerda para começar a enviar mensagens
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Placeholder messages */}
                  <div className="flex justify-center">
                    <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      Mensagens aparecerão aqui
                    </span>
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-3 border-t">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Digite uma mensagem..."
                  className="flex-1"
                  disabled={!selectedConversation}
                />
                <Button 
                  size="icon" 
                  disabled={!selectedConversation}
                  className="shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
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
                  {/* Contact Info Placeholder */}
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <User className="w-8 h-8 text-primary" />
                    </div>
                    <h4 className="font-medium">Nome do Contato</h4>
                    <p className="text-sm text-muted-foreground">+55 11 99999-9999</p>
                  </div>

                  {/* Quick Actions Placeholder */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Ações Rápidas
                    </h5>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" className="h-8 text-xs" disabled>
                        Ver Lead
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs" disabled>
                        Nova Tarefa
                      </Button>
                    </div>
                  </div>

                  {/* Tags Placeholder */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Tags
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">Lead</Badge>
                      <Badge variant="secondary" className="text-xs">Novo</Badge>
                    </div>
                  </div>

                  {/* Notes Placeholder */}
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
