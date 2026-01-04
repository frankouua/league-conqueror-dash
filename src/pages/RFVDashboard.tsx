import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, FileSpreadsheet, AlertCircle, Loader2, Users, TrendingUp, 
  Target, Phone, Gift, Heart, RefreshCw, Crown, Zap, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Clock, DollarSign, Calendar, Star,
  MessageSquare, Mail, Sparkles, CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import * as XLSX from "xlsx";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

const CHART_COLORS = [
  'hsl(142, 76%, 36%)', // Champions - verde
  'hsl(221, 83%, 53%)', // Loyal - azul
  'hsl(45, 93%, 47%)',  // Potential - amarelo
  'hsl(25, 95%, 53%)',  // At Risk - laranja
  'hsl(280, 60%, 55%)', // Hibernating - roxo
  'hsl(0, 84%, 60%)',   // Lost - vermelho
];

// RFV Segment definitions
const RFV_SEGMENTS = {
  champions: {
    name: 'Campeões',
    icon: Crown,
    color: 'bg-emerald-500',
    textColor: 'text-emerald-600',
    bgLight: 'bg-emerald-50',
    description: 'Compraram recentemente, frequência alta, alto valor',
    criteria: 'R: 4-5 | F: 4-5 | V: 4-5',
    priority: 1,
    actions: [
      { title: 'Programa VIP Exclusivo', description: 'Oferecer benefícios exclusivos e acesso antecipado', type: 'retention' },
      { title: 'Solicitar Indicações', description: 'Pedir indicações de amigos e familiares', type: 'referral' },
      { title: 'Depoimento Premium', description: 'Solicitar vídeo-depoimento para redes sociais', type: 'testimonial' },
      { title: 'Embaixador da Marca', description: 'Convidar para programa de embaixadores', type: 'ambassador' },
    ]
  },
  loyal: {
    name: 'Fiéis',
    icon: Heart,
    color: 'bg-blue-500',
    textColor: 'text-blue-600',
    bgLight: 'bg-blue-50',
    description: 'Compram com frequência, bom valor',
    criteria: 'R: 3-4 | F: 3-5 | V: 3-5',
    priority: 2,
    actions: [
      { title: 'Upsell de Procedimentos', description: 'Apresentar procedimentos complementares', type: 'upsell' },
      { title: 'Programa UniLovers', description: 'Engajar com missões e recompensas', type: 'loyalty' },
      { title: 'Cross-sell Personalizado', description: 'Oferecer tratamentos relacionados', type: 'crosssell' },
      { title: 'Avaliação de Satisfação', description: 'Coletar NPS e feedback detalhado', type: 'nps' },
    ]
  },
  potential: {
    name: 'Potenciais',
    icon: Zap,
    color: 'bg-amber-500',
    textColor: 'text-amber-600',
    bgLight: 'bg-amber-50',
    description: 'Compraram recentemente com bom potencial',
    criteria: 'R: 4-5 | F: 1-3 | V: 1-3',
    priority: 3,
    actions: [
      { title: 'Nutrição de Relacionamento', description: 'Sequência de conteúdo educativo', type: 'nurture' },
      { title: 'Segunda Compra Incentivada', description: 'Oferta especial para retorno', type: 'incentive' },
      { title: 'Agendamento Proativo', description: 'Ligar para agendar retorno', type: 'schedule' },
      { title: 'Convite UniLovers', description: 'Apresentar programa de fidelidade', type: 'loyalty' },
    ]
  },
  at_risk: {
    name: 'Em Risco',
    icon: AlertTriangle,
    color: 'bg-orange-500',
    textColor: 'text-orange-600',
    bgLight: 'bg-orange-50',
    description: 'Eram bons clientes mas não compram há tempo',
    criteria: 'R: 1-2 | F: 3-5 | V: 3-5',
    priority: 4,
    actions: [
      { title: 'Ligação de Reativação', description: 'Contato pessoal para entender ausência', type: 'call' },
      { title: 'Oferta de Retorno', description: 'Condição especial para voltar', type: 'winback' },
      { title: 'Pesquisa de Satisfação', description: 'Entender motivo do afastamento', type: 'survey' },
      { title: 'Mensagem Personalizada', description: 'WhatsApp com saudade e novidades', type: 'message' },
    ]
  },
  hibernating: {
    name: 'Hibernando',
    icon: Clock,
    color: 'bg-purple-500',
    textColor: 'text-purple-600',
    bgLight: 'bg-purple-50',
    description: 'Não compram há muito tempo, valor baixo-médio',
    criteria: 'R: 1-2 | F: 1-2 | V: 2-4',
    priority: 5,
    actions: [
      { title: 'Campanha de Reengajamento', description: 'Série de e-mails com novidades', type: 'campaign' },
      { title: 'Promoção Exclusiva', description: 'Desconto especial para retorno', type: 'promo' },
      { title: 'Convite para Evento', description: 'Convidar para live ou evento presencial', type: 'event' },
      { title: 'Atualização de Contato', description: 'Verificar se dados estão corretos', type: 'update' },
    ]
  },
  lost: {
    name: 'Perdidos',
    icon: RefreshCw,
    color: 'bg-red-500',
    textColor: 'text-red-600',
    bgLight: 'bg-red-50',
    description: 'Sem compras há muito tempo, baixo valor',
    criteria: 'R: 1-2 | F: 1-2 | V: 1-2',
    priority: 6,
    actions: [
      { title: 'Última Tentativa', description: 'Campanha final de reconquista', type: 'lastchance' },
      { title: 'Pesquisa de Churn', description: 'Entender por que saíram', type: 'churnsuvey' },
      { title: 'Oferta Irrecusável', description: 'Condição muito especial para retorno', type: 'offer' },
      { title: 'Arquivar ou Reativar', description: 'Decisão sobre manter na base', type: 'archive' },
    ]
  }
};

type RFVSegment = keyof typeof RFV_SEGMENTS;

interface RFVCustomer {
  name: string;
  phone?: string;
  email?: string;
  lastPurchaseDate: string;
  totalPurchases: number;
  totalValue: number;
  averageTicket: number;
  recencyScore: number;
  frequencyScore: number;
  valueScore: number;
  segment: RFVSegment;
  daysSinceLastPurchase: number;
}

interface ColumnMapping {
  clientName: string;
  phone: string;
  email: string;
  purchaseDate: string;
  amount: string;
}

const RFVDashboard = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customers, setCustomers] = useState<RFVCustomer[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    clientName: '',
    phone: '',
    email: '',
    purchaseDate: '',
    amount: '',
  });
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<RFVSegment | 'all'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<RFVCustomer | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setCustomers([]);
      parseExcelFile(selectedFile);
    }
  };

  const parseExcelFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

      if (jsonData.length === 0) {
        toast({
          title: "Planilha vazia",
          description: "A planilha não contém dados.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      const columns = Object.keys(jsonData[0]);
      setAvailableColumns(columns);
      setRawData(jsonData);

      // Auto-detect columns
      const autoMapping: ColumnMapping = {
        clientName: '',
        phone: '',
        email: '',
        purchaseDate: '',
        amount: '',
      };

      for (const col of columns) {
        const colLower = col.toLowerCase();
        if (colLower.includes('cliente') || colLower.includes('paciente') || colLower.includes('nome')) {
          autoMapping.clientName = col;
        } else if (colLower.includes('telefone') || colLower.includes('phone') || colLower.includes('celular')) {
          autoMapping.phone = col;
        } else if (colLower.includes('email') || colLower.includes('e-mail')) {
          autoMapping.email = col;
        } else if (colLower.includes('data') || colLower.includes('date')) {
          autoMapping.purchaseDate = col;
        } else if (colLower.includes('valor') || colLower.includes('value') || colLower.includes('amount') || colLower.includes('total')) {
          autoMapping.amount = col;
        }
      }

      setColumnMapping(autoMapping);
      setShowColumnMapping(true);
      
      toast({
        title: "Arquivo carregado",
        description: `${jsonData.length} linhas encontradas. Configure o mapeamento.`,
      });
    } catch (error) {
      console.error('Error parsing Excel:', error);
      toast({
        title: "Erro ao processar arquivo",
        description: "Não foi possível ler o arquivo.",
        variant: "destructive",
      });
    }
    setIsProcessing(false);
  };

  const calculateRFVSegment = (recency: number, frequency: number, value: number): RFVSegment => {
    // Champions: R: 4-5, F: 4-5, V: 4-5
    if (recency >= 4 && frequency >= 4 && value >= 4) return 'champions';
    
    // Loyal: R: 3-4, F: 3-5, V: 3-5
    if (recency >= 3 && frequency >= 3 && value >= 3) return 'loyal';
    
    // Potential: R: 4-5, F: 1-3, V: 1-3
    if (recency >= 4 && frequency <= 3 && value <= 3) return 'potential';
    
    // At Risk: R: 1-2, F: 3-5, V: 3-5
    if (recency <= 2 && frequency >= 3 && value >= 3) return 'at_risk';
    
    // Hibernating: R: 1-2, F: 1-2, V: 2-4
    if (recency <= 2 && frequency <= 2 && value >= 2 && value <= 4) return 'hibernating';
    
    // Lost: R: 1-2, F: 1-2, V: 1-2
    return 'lost';
  };

  const processWithMapping = async () => {
    if (!columnMapping.clientName || !columnMapping.purchaseDate || !columnMapping.amount) {
      toast({
        title: "Mapeamento incompleto",
        description: "Configure pelo menos Nome, Data e Valor.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Group transactions by customer
      const customerTransactions: Record<string, { dates: Date[]; amounts: number[]; phone?: string; email?: string }> = {};

      for (const row of rawData) {
        const clientName = String(row[columnMapping.clientName] || '').trim();
        if (!clientName) continue;

        const dateValue = row[columnMapping.purchaseDate];
        let parsedDate: Date | null = null;

        if (dateValue) {
          if (typeof dateValue === 'number') {
            const excelDate = XLSX.SSF.parse_date_code(dateValue);
            parsedDate = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
          } else if (typeof dateValue === 'string') {
            const parts = dateValue.split(/[-\/]/);
            if (parts.length === 3) {
              if (parts[0].length === 4) {
                parsedDate = new Date(parts.join('-'));
              } else {
                parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
              }
            }
          }
        }

        if (!parsedDate || isNaN(parsedDate.getTime())) continue;

        let amount = 0;
        const amountRaw = row[columnMapping.amount];
        if (typeof amountRaw === 'number') {
          amount = amountRaw;
        } else if (typeof amountRaw === 'string') {
          const cleaned = amountRaw.replace(/[R$\s.]/g, '').replace(',', '.');
          amount = parseFloat(cleaned) || 0;
        }

        if (amount <= 0) continue;

        const key = clientName.toLowerCase();
        if (!customerTransactions[key]) {
          customerTransactions[key] = { dates: [], amounts: [], phone: undefined, email: undefined };
        }
        
        customerTransactions[key].dates.push(parsedDate);
        customerTransactions[key].amounts.push(amount);
        
        if (columnMapping.phone && row[columnMapping.phone]) {
          customerTransactions[key].phone = String(row[columnMapping.phone]);
        }
        if (columnMapping.email && row[columnMapping.email]) {
          customerTransactions[key].email = String(row[columnMapping.email]);
        }
      }

      const now = new Date();
      const allCustomerData = Object.entries(customerTransactions).map(([name, data]) => {
        const sortedDates = data.dates.sort((a, b) => b.getTime() - a.getTime());
        const lastPurchaseDate = sortedDates[0];
        const daysSinceLastPurchase = Math.floor((now.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalPurchases = data.dates.length;
        const totalValue = data.amounts.reduce((sum, a) => sum + a, 0);
        const averageTicket = totalValue / totalPurchases;

        return {
          name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          phone: data.phone,
          email: data.email,
          daysSinceLastPurchase,
          totalPurchases,
          totalValue,
          averageTicket,
          lastPurchaseDate: lastPurchaseDate.toISOString().split('T')[0],
        };
      });

      // Calculate quintiles for RFV scoring
      const recencyValues = allCustomerData.map(c => c.daysSinceLastPurchase).sort((a, b) => a - b);
      const frequencyValues = allCustomerData.map(c => c.totalPurchases).sort((a, b) => a - b);
      const valueValues = allCustomerData.map(c => c.totalValue).sort((a, b) => a - b);

      const getQuintile = (value: number, sortedValues: number[], inverse = false): number => {
        const index = sortedValues.findIndex(v => v >= value);
        const percentile = index === -1 ? 1 : (index / sortedValues.length);
        const score = Math.ceil((inverse ? (1 - percentile) : percentile) * 5);
        return Math.max(1, Math.min(5, score || 1));
      };

      const rfvCustomers: RFVCustomer[] = allCustomerData.map(customer => {
        const recencyScore = getQuintile(customer.daysSinceLastPurchase, recencyValues, true); // inverse - less days = higher score
        const frequencyScore = getQuintile(customer.totalPurchases, frequencyValues);
        const valueScore = getQuintile(customer.totalValue, valueValues);
        const segment = calculateRFVSegment(recencyScore, frequencyScore, valueScore);

        return {
          ...customer,
          recencyScore,
          frequencyScore,
          valueScore,
          segment,
        };
      });

      // Sort by segment priority and value
      rfvCustomers.sort((a, b) => {
        const priorityDiff = RFV_SEGMENTS[a.segment].priority - RFV_SEGMENTS[b.segment].priority;
        if (priorityDiff !== 0) return priorityDiff;
        return b.totalValue - a.totalValue;
      });

      setCustomers(rfvCustomers);
      setShowColumnMapping(false);

      const segmentCounts = rfvCustomers.reduce((acc, c) => {
        acc[c.segment] = (acc[c.segment] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      toast({
        title: "Análise RFV concluída",
        description: `${rfvCustomers.length} clientes classificados em ${Object.keys(segmentCounts).length} segmentos`,
      });
    } catch (error) {
      console.error('Error processing data:', error);
      toast({
        title: "Erro no processamento",
        description: "Ocorreu um erro ao processar os dados.",
        variant: "destructive",
      });
    }

    setIsProcessing(false);
  };

  const getSegmentStats = () => {
    const stats: Record<RFVSegment, { count: number; revenue: number; avgTicket: number }> = {
      champions: { count: 0, revenue: 0, avgTicket: 0 },
      loyal: { count: 0, revenue: 0, avgTicket: 0 },
      potential: { count: 0, revenue: 0, avgTicket: 0 },
      at_risk: { count: 0, revenue: 0, avgTicket: 0 },
      hibernating: { count: 0, revenue: 0, avgTicket: 0 },
      lost: { count: 0, revenue: 0, avgTicket: 0 },
    };

    for (const customer of customers) {
      stats[customer.segment].count++;
      stats[customer.segment].revenue += customer.totalValue;
    }

    for (const segment of Object.keys(stats) as RFVSegment[]) {
      if (stats[segment].count > 0) {
        stats[segment].avgTicket = stats[segment].revenue / stats[segment].count;
      }
    }

    return stats;
  };

  const filteredCustomers = selectedSegment === 'all' 
    ? customers 
    : customers.filter(c => c.segment === selectedSegment);

  const segmentStats = getSegmentStats();

  const pieChartData = Object.entries(segmentStats)
    .filter(([, data]) => data.count > 0)
    .map(([segment, data], index) => ({
      name: RFV_SEGMENTS[segment as RFVSegment].name,
      value: data.count,
      revenue: data.revenue,
      fill: CHART_COLORS[index],
    }));

  const radarData = selectedCustomer ? [
    { subject: 'Recência', value: selectedCustomer.recencyScore, fullMark: 5 },
    { subject: 'Frequência', value: selectedCustomer.frequencyScore, fullMark: 5 },
    { subject: 'Valor', value: selectedCustomer.valueScore, fullMark: 5 },
  ] : [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            Matriz RFV - Segmentação de Clientes
          </h1>
          <p className="text-muted-foreground mt-2">
            Recência, Frequência e Valor para ações estratégicas de CS e Farmer
          </p>
        </div>

        {/* Upload Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload de Dados
            </CardTitle>
            <CardDescription>
              Faça upload da planilha com histórico de compras para gerar a análise RFV
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                      <FileSpreadsheet className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {file ? file.name : 'Clique para selecionar ou arraste a planilha'}
                      </p>
                    </div>
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              {isProcessing && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Processando arquivo...</span>
                </div>
              )}

              {showColumnMapping && (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold">Mapeamento de Colunas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Nome do Cliente *</Label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        value={columnMapping.clientName}
                        onChange={(e) => setColumnMapping({ ...columnMapping, clientName: e.target.value })}
                      >
                        <option value="">Selecione...</option>
                        {availableColumns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Data da Compra *</Label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        value={columnMapping.purchaseDate}
                        onChange={(e) => setColumnMapping({ ...columnMapping, purchaseDate: e.target.value })}
                      >
                        <option value="">Selecione...</option>
                        {availableColumns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Valor *</Label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        value={columnMapping.amount}
                        onChange={(e) => setColumnMapping({ ...columnMapping, amount: e.target.value })}
                      >
                        <option value="">Selecione...</option>
                        {availableColumns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        value={columnMapping.phone}
                        onChange={(e) => setColumnMapping({ ...columnMapping, phone: e.target.value })}
                      >
                        <option value="">Selecione...</option>
                        {availableColumns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        value={columnMapping.email}
                        onChange={(e) => setColumnMapping({ ...columnMapping, email: e.target.value })}
                      >
                        <option value="">Selecione...</option>
                        {availableColumns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Button onClick={processWithMapping} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Processar e Gerar Análise RFV
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {customers.length > 0 && (
          <>
            {/* Segment Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              {(Object.entries(RFV_SEGMENTS) as [RFVSegment, typeof RFV_SEGMENTS.champions][]).map(([key, segment]) => {
                const stats = segmentStats[key];
                const Icon = segment.icon;
                return (
                  <Card 
                    key={key} 
                    className={`cursor-pointer transition-all ${selectedSegment === key ? 'ring-2 ring-primary' : 'hover:shadow-lg'}`}
                    onClick={() => setSelectedSegment(selectedSegment === key ? 'all' : key)}
                  >
                    <CardContent className="p-4">
                      <div className={`${segment.bgLight} p-2 rounded-lg w-fit mb-2`}>
                        <Icon className={`h-5 w-5 ${segment.textColor}`} />
                      </div>
                      <p className="text-sm text-muted-foreground">{segment.name}</p>
                      <p className="text-2xl font-bold">{stats.count}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(stats.revenue)}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Segmento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number, name: string, props: any) => [
                            `${value} clientes | ${formatCurrency(props.payload.revenue)}`,
                            name
                          ]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Faturamento por Segmento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={pieChartData}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))">
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Customer Detail and Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Customer List */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      {selectedSegment === 'all' ? 'Todos os Clientes' : RFV_SEGMENTS[selectedSegment].name}
                    </span>
                    <Badge variant="outline">{filteredCustomers.length} clientes</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[500px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Segmento</TableHead>
                          <TableHead className="text-center">R</TableHead>
                          <TableHead className="text-center">F</TableHead>
                          <TableHead className="text-center">V</TableHead>
                          <TableHead className="text-right">Total Gasto</TableHead>
                          <TableHead>Última Compra</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCustomers.slice(0, 100).map((customer, index) => {
                          const segment = RFV_SEGMENTS[customer.segment];
                          const Icon = segment.icon;
                          return (
                            <TableRow 
                              key={index} 
                              className={`cursor-pointer ${selectedCustomer?.name === customer.name ? 'bg-muted' : ''}`}
                              onClick={() => setSelectedCustomer(customer)}
                            >
                              <TableCell>
                                <div>
                                  <p className="font-medium">{customer.name}</p>
                                  {customer.phone && (
                                    <p className="text-xs text-muted-foreground">{customer.phone}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={`${segment.color} text-white`}>
                                  <Icon className="h-3 w-3 mr-1" />
                                  {segment.name}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={customer.recencyScore >= 4 ? "default" : customer.recencyScore >= 3 ? "secondary" : "outline"}>
                                  {customer.recencyScore}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={customer.frequencyScore >= 4 ? "default" : customer.frequencyScore >= 3 ? "secondary" : "outline"}>
                                  {customer.frequencyScore}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={customer.valueScore >= 4 ? "default" : customer.valueScore >= 3 ? "secondary" : "outline"}>
                                  {customer.valueScore}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(customer.totalValue)}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p>{new Date(customer.lastPurchaseDate).toLocaleDateString('pt-BR')}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {customer.daysSinceLastPurchase} dias atrás
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Actions Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Ações Recomendadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedCustomer ? (
                    <div className="space-y-4">
                      {/* Customer Summary */}
                      <div className={`p-4 rounded-lg ${RFV_SEGMENTS[selectedCustomer.segment].bgLight}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {(() => {
                            const Icon = RFV_SEGMENTS[selectedCustomer.segment].icon;
                            return <Icon className={`h-5 w-5 ${RFV_SEGMENTS[selectedCustomer.segment].textColor}`} />;
                          })()}
                          <span className="font-semibold">{selectedCustomer.name}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Compras</p>
                            <p className="font-bold">{selectedCustomer.totalPurchases}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Total</p>
                            <p className="font-bold">{formatCurrency(selectedCustomer.totalValue)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Ticket</p>
                            <p className="font-bold">{formatCurrency(selectedCustomer.averageTicket)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Radar Chart */}
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" />
                            <PolarRadiusAxis domain={[0, 5]} />
                            <Radar
                              name="RFV"
                              dataKey="value"
                              stroke="hsl(var(--primary))"
                              fill="hsl(var(--primary))"
                              fillOpacity={0.5}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Action Cards */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Próximas Ações:</h4>
                        {RFV_SEGMENTS[selectedCustomer.segment].actions.map((action, index) => (
                          <div 
                            key={index}
                            className="p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-sm">{action.title}</p>
                                <p className="text-xs text-muted-foreground">{action.description}</p>
                              </div>
                              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Quick Actions */}
                      <div className="flex gap-2 pt-2">
                        {selectedCustomer.phone && (
                          <Button size="sm" variant="outline" className="flex-1">
                            <Phone className="h-4 w-4 mr-1" />
                            Ligar
                          </Button>
                        )}
                        {selectedCustomer.email && (
                          <Button size="sm" variant="outline" className="flex-1">
                            <Mail className="h-4 w-4 mr-1" />
                            Email
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="flex-1">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          WhatsApp
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Selecione um cliente na lista para ver as ações recomendadas</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Segment Strategy Cards */}
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-4">Estratégias por Segmento</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(Object.entries(RFV_SEGMENTS) as [RFVSegment, typeof RFV_SEGMENTS.champions][]).map(([key, segment]) => {
                  const stats = segmentStats[key];
                  if (stats.count === 0) return null;
                  const Icon = segment.icon;
                  return (
                    <Card key={key}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className={`${segment.color} p-2 rounded-lg`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{segment.name}</CardTitle>
                            <CardDescription>{segment.criteria}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">{segment.description}</p>
                        <div className="space-y-2">
                          {segment.actions.slice(0, 2).map((action, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                              <span>{action.title}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t flex justify-between text-sm">
                          <span className="text-muted-foreground">{stats.count} clientes</span>
                          <span className="font-semibold">{formatCurrency(stats.revenue)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default RFVDashboard;
