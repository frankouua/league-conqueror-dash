import { useState } from 'react';
import { 
  Smartphone, QrCode, Check, X, RefreshCw, Settings, Shield,
  Trash2, Eye, EyeOff, AlertTriangle, Wifi, WifiOff, Plus,
  User, Clock, MessageSquare, Bot, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppConnection {
  id: string;
  name: string;
  phone: string;
  userId: string;
  userName: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'qr_pending';
  lastSeen: Date;
  messagesCount: number;
  apiType: 'official' | 'unofficial';
  permissions: {
    viewBy: 'self' | 'team' | 'all';
    canMonitor: boolean;
    aiEnabled: boolean;
  };
}

// Mock connections
const mockConnections: WhatsAppConnection[] = [
  {
    id: '1',
    name: 'WhatsApp Comercial - Ana',
    phone: '+55 11 99999-1111',
    userId: 'user-1',
    userName: 'Ana Silva',
    status: 'connected',
    lastSeen: new Date(),
    messagesCount: 1234,
    apiType: 'unofficial',
    permissions: {
      viewBy: 'self',
      canMonitor: true,
      aiEnabled: true
    }
  },
  {
    id: '2',
    name: 'WhatsApp - Bruno',
    phone: '+55 11 99999-2222',
    userId: 'user-2',
    userName: 'Bruno Santos',
    status: 'connected',
    lastSeen: new Date(Date.now() - 3600000),
    messagesCount: 876,
    apiType: 'unofficial',
    permissions: {
      viewBy: 'team',
      canMonitor: true,
      aiEnabled: true
    }
  },
  {
    id: '3',
    name: 'WhatsApp Oficial - Unique',
    phone: '+55 11 3333-4444',
    userId: 'company',
    userName: 'Unique Clinic',
    status: 'connected',
    lastSeen: new Date(),
    messagesCount: 5678,
    apiType: 'official',
    permissions: {
      viewBy: 'all',
      canMonitor: true,
      aiEnabled: true
    }
  },
  {
    id: '4',
    name: 'WhatsApp - Carla',
    phone: '+55 11 99999-3333',
    userId: 'user-3',
    userName: 'Carla Oliveira',
    status: 'disconnected',
    lastSeen: new Date(Date.now() - 86400000),
    messagesCount: 432,
    apiType: 'unofficial',
    permissions: {
      viewBy: 'self',
      canMonitor: false,
      aiEnabled: false
    }
  }
];

export function CRMWhatsAppConnections() {
  const { toast } = useToast();
  const [connections, setConnections] = useState<WhatsAppConnection[]>(mockConnections);
  const [showNewConnection, setShowNewConnection] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<WhatsAppConnection | null>(null);
  const [newConnectionType, setNewConnectionType] = useState<'official' | 'unofficial'>('unofficial');

  const handleConnect = (connection: WhatsAppConnection) => {
    // Simulate reconnection
    setConnections(prev => prev.map(c => 
      c.id === connection.id 
        ? { ...c, status: 'connecting' as const }
        : c
    ));

    setTimeout(() => {
      setConnections(prev => prev.map(c => 
        c.id === connection.id 
          ? { ...c, status: 'connected' as const, lastSeen: new Date() }
          : c
      ));
      toast({
        title: 'Conectado!',
        description: `${connection.name} reconectado com sucesso`,
      });
    }, 2000);
  };

  const handleDisconnect = (connection: WhatsAppConnection) => {
    setConnections(prev => prev.map(c => 
      c.id === connection.id 
        ? { ...c, status: 'disconnected' as const }
        : c
    ));
    toast({
      title: 'Desconectado',
      description: `${connection.name} foi desconectado`,
    });
  };

  const handleDelete = (connectionId: string) => {
    setConnections(prev => prev.filter(c => c.id !== connectionId));
    setShowDeleteDialog(null);
    toast({
      title: 'Conexão removida',
      description: 'A conexão do WhatsApp foi removida com sucesso',
    });
  };

  const handleUpdatePermissions = (connectionId: string, permissions: Partial<WhatsAppConnection['permissions']>) => {
    setConnections(prev => prev.map(c => 
      c.id === connectionId 
        ? { ...c, permissions: { ...c.permissions, ...permissions } }
        : c
    ));
  };

  const connectedCount = connections.filter(c => c.status === 'connected').length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conexões Ativas</p>
                <p className="text-2xl font-bold text-green-600">{connectedCount}</p>
              </div>
              <Wifi className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Conexões</p>
                <p className="text-2xl font-bold">{connections.length}</p>
              </div>
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mensagens Hoje</p>
                <p className="text-2xl font-bold">847</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">IA Ativa</p>
                <p className="text-2xl font-bold text-purple-600">
                  {connections.filter(c => c.permissions.aiEnabled).length}
                </p>
              </div>
              <Bot className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add New Connection */}
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Adicionar Nova Conexão
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Conecte um novo WhatsApp ao CRM para monitoramento e automação
              </p>
            </div>
            <Button onClick={() => setShowNewConnection(true)} className="gap-2">
              <Smartphone className="h-4 w-4" />
              Conectar WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connections List */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Conexões Configuradas</h3>
        
        <div className="grid gap-4">
          {connections.map((connection) => (
            <Card key={connection.id} className={cn(
              "transition-all",
              connection.status === 'disconnected' && "opacity-60"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Avatar & Status */}
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className={cn(
                        connection.apiType === 'official' ? 'bg-green-600' : 'bg-blue-600',
                        'text-white'
                      )}>
                        {connection.userName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background",
                      connection.status === 'connected' && "bg-green-500",
                      connection.status === 'connecting' && "bg-yellow-500 animate-pulse",
                      connection.status === 'disconnected' && "bg-red-500",
                      connection.status === 'qr_pending' && "bg-orange-500"
                    )} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{connection.name}</h4>
                      <Badge variant={connection.apiType === 'official' ? 'default' : 'secondary'}>
                        {connection.apiType === 'official' ? 'API Oficial' : 'Não Oficial'}
                      </Badge>
                      {connection.permissions.aiEnabled && (
                        <Badge variant="outline" className="border-purple-500 text-purple-500">
                          <Bot className="h-3 w-3 mr-1" />
                          IA
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{connection.phone}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {connection.userName}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {connection.messagesCount} mensagens
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Visto: {connection.lastSeen.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Permissions */}
                  <div className="hidden md:flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      {connection.permissions.viewBy === 'self' && <EyeOff className="h-4 w-4 text-muted-foreground" />}
                      {connection.permissions.viewBy === 'team' && <Eye className="h-4 w-4 text-blue-500" />}
                      {connection.permissions.viewBy === 'all' && <Eye className="h-4 w-4 text-green-500" />}
                      <span className="text-muted-foreground">
                        {connection.permissions.viewBy === 'self' && 'Privado'}
                        {connection.permissions.viewBy === 'team' && 'Equipe'}
                        {connection.permissions.viewBy === 'all' && 'Todos'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {connection.status === 'connected' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(connection)}
                        className="gap-1"
                      >
                        <WifiOff className="h-4 w-4" />
                        Desconectar
                      </Button>
                    ) : connection.status === 'connecting' ? (
                      <Button variant="outline" size="sm" disabled>
                        <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                        Conectando...
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnect(connection)}
                        className="gap-1"
                      >
                        <Wifi className="h-4 w-4" />
                        Reconectar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedConnection(connection)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowDeleteDialog(connection.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* New Connection Dialog */}
      <Dialog open={showNewConnection} onOpenChange={setShowNewConnection}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              Escolha o tipo de conexão e siga as instruções
            </DialogDescription>
          </DialogHeader>

          <Tabs value={newConnectionType} onValueChange={(v) => setNewConnectionType(v as typeof newConnectionType)}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="unofficial" className="gap-2">
                <Smartphone className="h-4 w-4" />
                QR Code
              </TabsTrigger>
              <TabsTrigger value="official" className="gap-2">
                <Shield className="h-4 w-4" />
                API Oficial
              </TabsTrigger>
            </TabsList>

            <TabsContent value="unofficial" className="space-y-4 mt-4">
              <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-700 dark:text-orange-400">Atenção</p>
                    <p className="text-orange-600 dark:text-orange-300">
                      A conexão via QR Code usa APIs não oficiais. Mantenha o celular conectado à internet.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="text-center space-y-4">
                <div className="w-48 h-48 mx-auto bg-muted rounded-lg flex items-center justify-center">
                  <QrCode className="h-32 w-32 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Abra o WhatsApp no seu celular, vá em <strong>Configurações → Aparelhos conectados → Conectar aparelho</strong> e escaneie o QR Code acima.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="official" className="space-y-4 mt-4">
              <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                <CardContent className="p-4 flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-green-700 dark:text-green-400">Recomendado</p>
                    <p className="text-green-600 dark:text-green-300">
                      A API oficial é mais estável e permite templates de mensagens aprovados.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Phone Number ID</Label>
                  <Input placeholder="Ex: 123456789" />
                </div>
                <div className="space-y-2">
                  <Label>Access Token</Label>
                  <Input type="password" placeholder="Token de acesso do Meta" />
                </div>
                <div className="space-y-2">
                  <Label>Business Account ID</Label>
                  <Input placeholder="ID da conta comercial" />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewConnection(false)}>
              Cancelar
            </Button>
            <Button className="gap-2">
              {newConnectionType === 'official' ? (
                <>
                  <Check className="h-4 w-4" />
                  Conectar
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4" />
                  Gerar QR Code
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={!!selectedConnection} onOpenChange={() => setSelectedConnection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações da Conexão</DialogTitle>
            <DialogDescription>
              {selectedConnection?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedConnection && (
            <div className="space-y-6">
              {/* Visibility */}
              <div className="space-y-2">
                <Label>Quem pode visualizar as conversas?</Label>
                <Select
                  value={selectedConnection.permissions.viewBy}
                  onValueChange={(v) => handleUpdatePermissions(selectedConnection.id, { viewBy: v as 'self' | 'team' | 'all' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">
                      <div className="flex items-center gap-2">
                        <EyeOff className="h-4 w-4" />
                        Apenas eu
                      </div>
                    </SelectItem>
                    <SelectItem value="team">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Minha equipe
                      </div>
                    </SelectItem>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Todos (gestores)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* AI Monitoring */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Monitoramento por IA</Label>
                  <p className="text-sm text-muted-foreground">
                    A IA analisa as conversas e sugere ações
                  </p>
                </div>
                <Switch
                  checked={selectedConnection.permissions.aiEnabled}
                  onCheckedChange={(v) => handleUpdatePermissions(selectedConnection.id, { aiEnabled: v })}
                />
              </div>

              {/* Can Monitor */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Permitir supervisão</Label>
                  <p className="text-sm text-muted-foreground">
                    Gestores podem ver as conversas em tempo real
                  </p>
                </div>
                <Switch
                  checked={selectedConnection.permissions.canMonitor}
                  onCheckedChange={(v) => handleUpdatePermissions(selectedConnection.id, { canMonitor: v })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setSelectedConnection(null)}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conexão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá desconectar o WhatsApp e remover todas as configurações. As conversas salvas serão mantidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
