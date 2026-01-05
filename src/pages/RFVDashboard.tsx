import { useState, useEffect } from "react";
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
  MessageSquare, Mail, Sparkles, CheckCircle2, Database, Save, History
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import RFVActionHistory from "@/components/rfv/RFVActionHistory";
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
  id?: string;
  name: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  cpf?: string;
  prontuario?: string;
  firstPurchaseDate?: string;
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
  whatsapp: string;
  email: string;
  cpf: string;
  prontuario: string;
  purchaseDate: string;
  amount: string;
  // Campos adicionais opcionais
  firstPurchaseDate: string;
  totalPurchases: string;
  totalValue: string;
  averageTicket: string;
  daysSinceLastPurchase: string;
  recencyScore: string;
  frequencyScore: string;
  valueScore: string;
  segment: string;
}

const RFVDashboard = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [customers, setCustomers] = useState<RFVCustomer[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    clientName: '',
    phone: '',
    whatsapp: '',
    email: '',
    cpf: '',
    prontuario: '',
    purchaseDate: '',
    amount: '',
    firstPurchaseDate: '',
    totalPurchases: '',
    totalValue: '',
    averageTicket: '',
    daysSinceLastPurchase: '',
    recencyScore: '',
    frequencyScore: '',
    valueScore: '',
    segment: '',
  });
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<RFVSegment | 'all'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<RFVCustomer | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [aiStrategy, setAiStrategy] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [uploadLogs, setUploadLogs] = useState<any[]>([]);
  const [dataReferenceDate, setDataReferenceDate] = useState<string>('');
  const { profile } = useAuth();

  // Load existing RFV data and upload logs on mount
  useEffect(() => {
    loadExistingData();
    loadUploadLogs();
  }, []);

  const loadUploadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('rfv_upload_logs')
        .select('*')
        .order('uploaded_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setUploadLogs(data || []);
    } catch (error) {
      console.error('Error loading upload logs:', error);
    }
  };

  const loadExistingData = async () => {
    setIsLoadingData(true);
    try {
      // First, get the count of all records
      const { count } = await supabase
        .from('rfv_customers')
        .select('*', { count: 'exact', head: true });
      
      // Fetch all records with pagination if needed (Supabase default limit is 1000)
      let allData: any[] = [];
      const pageSize = 1000;
      let offset = 0;
      
      while (true) {
        const { data, error } = await supabase
          .from('rfv_customers')
          .select('*')
          .order('total_value', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (error) throw error;
        
        if (!data || data.length === 0) break;
        
        allData = [...allData, ...data];
        
        if (data.length < pageSize) break;
        offset += pageSize;
      }

      if (allData.length > 0) {
        const loadedCustomers: RFVCustomer[] = allData.map(row => ({
          id: row.id,
          name: row.name,
          phone: row.phone || undefined,
          whatsapp: row.whatsapp || undefined,
          email: row.email || undefined,
          cpf: row.cpf || undefined,
          prontuario: row.prontuario || undefined,
          firstPurchaseDate: row.first_purchase_date,
          lastPurchaseDate: row.last_purchase_date,
          totalPurchases: row.total_purchases,
          totalValue: Number(row.total_value),
          averageTicket: Number(row.average_ticket),
          recencyScore: row.recency_score,
          frequencyScore: row.frequency_score,
          valueScore: row.value_score,
          segment: row.segment as RFVSegment,
          daysSinceLastPurchase: row.days_since_last_purchase,
        }));

        // Recalculate days since last purchase
        const now = new Date();
        loadedCustomers.forEach(c => {
          c.daysSinceLastPurchase = Math.floor(
            (now.getTime() - new Date(c.lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24)
          );
        });

        setCustomers(loadedCustomers);
        toast({
          title: "Dados carregados",
          description: `${loadedCustomers.length} clientes encontrados no banco`,
        });
      }
    } catch (error) {
      console.error('Error loading RFV data:', error);
    }
    setIsLoadingData(false);
  };

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
      
      // First, get all data as array of arrays to find the header row
      const allRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
      
      console.log('Total rows found:', allRows.length);
      console.log('First 5 rows:', allRows.slice(0, 5));
      
      // Find the first row that looks like a header (has text content)
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(allRows.length, 15); i++) {
        const row = allRows[i];
        if (row && row.length > 0) {
          // Count non-empty text cells in this row
          const textCells = row.filter((cell: any) => {
            if (cell === null || cell === undefined || cell === '') return false;
            if (typeof cell === 'string' && cell.trim().length > 0) return true;
            return false;
          });
          
          // Check if this row contains text that looks like column names
          const hasTextHeaders = row.some((cell: any) => {
            if (typeof cell !== 'string') return false;
            const lower = cell.toLowerCase().trim();
            return lower.includes('nome') || lower.includes('cliente') || lower.includes('paciente') ||
                   lower.includes('data') || lower.includes('valor') || lower.includes('email') ||
                   lower.includes('telefone') || lower.includes('phone') || lower.includes('total') ||
                   lower.includes('compra') || lower.includes('faturamento') || lower.includes('procedimento');
          });
          
          if (hasTextHeaders && textCells.length >= 2) {
            headerRowIndex = i;
            console.log('Header row found at index:', headerRowIndex, 'Row content:', row);
            break;
          }
        }
      }
      
      // Parse again with the correct header row
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { 
        range: headerRowIndex,
        defval: ''
      });

      console.log('Parsed data rows:', jsonData.length);
      
      if (jsonData.length === 0) {
        toast({
          title: "Planilha vazia",
          description: "A planilha não contém dados.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Get ALL columns from the first row - don't filter anything yet
      const allColumns = Object.keys(jsonData[0]);
      console.log('All columns found:', allColumns);
      
      // Filter out only truly invalid columns (empty names or just underscores)
      const validColumns = allColumns.filter(col => {
        // Keep columns that have actual meaningful names
        const trimmed = col.trim();
        if (!trimmed) return false;
        // Filter out __EMPTY_X pattern from xlsx
        if (/^__EMPTY(_\d+)?$/.test(trimmed)) return false;
        // Filter out columns that are just numbers (likely row indices)
        if (/^\d+$/.test(trimmed)) return false;
        return true;
      });
      
      console.log('Valid columns after filtering:', validColumns);
      
      setAvailableColumns(validColumns);
      setRawData(jsonData);

      // Auto-detect columns
      const autoMapping: ColumnMapping = {
        clientName: '',
        phone: '',
        whatsapp: '',
        email: '',
        cpf: '',
        prontuario: '',
        purchaseDate: '',
        amount: '',
        firstPurchaseDate: '',
        totalPurchases: '',
        totalValue: '',
        averageTicket: '',
        daysSinceLastPurchase: '',
        recencyScore: '',
        frequencyScore: '',
        valueScore: '',
        segment: '',
      };

      for (const col of validColumns) {
        const colLower = col.toLowerCase();
        if (!autoMapping.clientName && (colLower.includes('cliente') || colLower.includes('paciente') || colLower.includes('nome'))) {
          autoMapping.clientName = col;
        } else if (!autoMapping.whatsapp && (colLower.includes('whatsapp') || colLower.includes('whats') || colLower.includes('zap'))) {
          autoMapping.whatsapp = col;
        } else if (!autoMapping.phone && (colLower.includes('telefone') || colLower.includes('phone') || colLower.includes('celular'))) {
          autoMapping.phone = col;
        } else if (!autoMapping.email && (colLower.includes('email') || colLower.includes('e-mail'))) {
          autoMapping.email = col;
        } else if (!autoMapping.cpf && colLower.includes('cpf')) {
          autoMapping.cpf = col;
        } else if (!autoMapping.prontuario && (colLower.includes('prontuario') || colLower.includes('prontuário') || colLower.includes('registro') || colLower.includes('código'))) {
          autoMapping.prontuario = col;
        } else if (!autoMapping.purchaseDate && (colLower.includes('data_limite') || colLower.includes('última') || colLower.includes('ultima') || colLower === 'data')) {
          autoMapping.purchaseDate = col;
        } else if (!autoMapping.firstPurchaseDate && (colLower.includes('primeira') || colLower.includes('first'))) {
          autoMapping.firstPurchaseDate = col;
        } else if (!autoMapping.totalPurchases && (colLower.includes('qtd') || colLower.includes('quantidade') || colLower.includes('compras') || colLower.includes('frequencia') || colLower.includes('frequência'))) {
          autoMapping.totalPurchases = col;
        } else if (!autoMapping.totalValue && (colLower.includes('total') || colLower.includes('ltv') || colLower.includes('faturamento'))) {
          autoMapping.totalValue = col;
        } else if (!autoMapping.averageTicket && (colLower.includes('ticket') || colLower.includes('médio') || colLower.includes('medio'))) {
          autoMapping.averageTicket = col;
        } else if (!autoMapping.amount && (colLower.includes('valor') || colLower.includes('value') || colLower.includes('score_valor'))) {
          autoMapping.amount = col;
        } else if (!autoMapping.daysSinceLastPurchase && (colLower.includes('dias') || colLower.includes('days'))) {
          autoMapping.daysSinceLastPurchase = col;
        } else if (!autoMapping.recencyScore && colLower.includes('recencia') || colLower.includes('recência') || colLower === 'r') {
          autoMapping.recencyScore = col;
        } else if (!autoMapping.frequencyScore && (colLower.includes('frequencia') || colLower.includes('frequência') || colLower === 'f')) {
          autoMapping.frequencyScore = col;
        } else if (!autoMapping.valueScore && (colLower.includes('score_valor') || colLower === 'v')) {
          autoMapping.valueScore = col;
        } else if (!autoMapping.segment && (colLower.includes('segmento') || colLower.includes('segment') || colLower.includes('rfv'))) {
          autoMapping.segment = col;
        }
      }
      
      console.log('Auto-detected mapping:', autoMapping);

      setColumnMapping(autoMapping);
      setShowColumnMapping(true);
      
      toast({
        title: "Arquivo carregado",
        description: `${jsonData.length} linhas e ${validColumns.length} colunas encontradas. Configure o mapeamento.`,
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
    if (!columnMapping.clientName || (!columnMapping.purchaseDate && !columnMapping.daysSinceLastPurchase) || (!columnMapping.amount && !columnMapping.totalValue)) {
      toast({
        title: "Mapeamento incompleto",
        description: "Configure pelo menos Nome, Data (ou Dias Sem Compra) e Valor Total.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Track stats for debugging
      let totalRows = 0;
      let skippedNoName = 0;
      let skippedNoDate = 0;
      let skippedNoAmount = 0;
      let processedRows = 0;

      // Check if we have pre-calculated data from spreadsheet
      const hasPreCalculatedData = columnMapping.recencyScore || columnMapping.frequencyScore || columnMapping.valueScore;
      
      // Process each row as a unique customer (for pre-calculated data)
      // or group by customer name (for raw transaction data)
      const customerTransactions: Record<string, { 
        dates: Date[]; 
        amounts: number[]; 
        phone?: string; 
        whatsapp?: string; 
        email?: string;
        cpf?: string;
        prontuario?: string;
        firstPurchaseDate?: string;
        totalPurchases?: number;
        totalValue?: number;
        averageTicket?: number;
        daysSinceLastPurchase?: number;
        recencyScore?: number;
        frequencyScore?: number;
        valueScore?: number;
        segment?: string;
      }> = {};

      for (const row of rawData) {
        totalRows++;
        const clientName = String(row[columnMapping.clientName] || '').trim();
        if (!clientName) {
          skippedNoName++;
          continue;
        }

        // Parse date
        let parsedDate: Date | null = null;
        const dateValue = row[columnMapping.purchaseDate];

        if (dateValue) {
          if (typeof dateValue === 'number') {
            try {
              const excelDate = XLSX.SSF.parse_date_code(dateValue);
              if (excelDate && excelDate.y > 1900) {
                parsedDate = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
              }
            } catch (e) {
              // Invalid date number
            }
          } else if (typeof dateValue === 'string') {
            const dateStr = dateValue.trim();
            const parts = dateStr.split(/[-\/\.]/);
            if (parts.length === 3) {
              if (parts[0].length === 4) {
                parsedDate = new Date(parts.join('-'));
              } else if (parts[2].length === 4) {
                parsedDate = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
              } else if (parts[2].length === 2) {
                const year = parseInt(parts[2]) > 50 ? `19${parts[2]}` : `20${parts[2]}`;
                parsedDate = new Date(`${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
              }
            }
          } else if (dateValue instanceof Date) {
            parsedDate = dateValue;
          }
        }

        if (!parsedDate || isNaN(parsedDate.getTime())) {
          parsedDate = new Date('2020-01-01');
          skippedNoDate++;
        }

        // Parse amount
        let amount = 0;
        const amountRaw = row[columnMapping.amount] || row[columnMapping.totalValue];
        if (typeof amountRaw === 'number') {
          amount = amountRaw;
        } else if (typeof amountRaw === 'string') {
          let cleaned = amountRaw.replace(/[R$\s]/g, '');
          if (cleaned.includes(',') && cleaned.includes('.')) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
          } else if (cleaned.includes(',') && !cleaned.includes('.')) {
            const parts = cleaned.split(',');
            if (parts.length === 2 && parts[1].length <= 2) {
              cleaned = cleaned.replace(',', '.');
            } else {
              cleaned = cleaned.replace(/,/g, '');
            }
          }
          amount = parseFloat(cleaned) || 0;
        }

        if (amount < 0) amount = 0;
        if (amount === 0) skippedNoAmount++;

        processedRows++;
        const key = clientName.toLowerCase();
        
        if (!customerTransactions[key]) {
          customerTransactions[key] = { dates: [], amounts: [] };
        }
        
        customerTransactions[key].dates.push(parsedDate);
        customerTransactions[key].amounts.push(amount);
        
        // Contact info
        if (columnMapping.phone && row[columnMapping.phone]) {
          customerTransactions[key].phone = String(row[columnMapping.phone]);
        }
        if (columnMapping.whatsapp && row[columnMapping.whatsapp]) {
          customerTransactions[key].whatsapp = String(row[columnMapping.whatsapp]);
        }
        if (columnMapping.email && row[columnMapping.email]) {
          customerTransactions[key].email = String(row[columnMapping.email]);
        }
        if (columnMapping.cpf && row[columnMapping.cpf]) {
          customerTransactions[key].cpf = String(row[columnMapping.cpf]);
        }
        if (columnMapping.prontuario && row[columnMapping.prontuario]) {
          customerTransactions[key].prontuario = String(row[columnMapping.prontuario]);
        }

        // Pre-calculated values from spreadsheet
        if (columnMapping.firstPurchaseDate && row[columnMapping.firstPurchaseDate]) {
          customerTransactions[key].firstPurchaseDate = String(row[columnMapping.firstPurchaseDate]);
        }
        if (columnMapping.totalPurchases && row[columnMapping.totalPurchases]) {
          customerTransactions[key].totalPurchases = Number(row[columnMapping.totalPurchases]) || 0;
        }
        if (columnMapping.totalValue && row[columnMapping.totalValue]) {
          const tv = row[columnMapping.totalValue];
          if (typeof tv === 'number') {
            customerTransactions[key].totalValue = tv;
          } else if (typeof tv === 'string') {
            let cleaned = tv.replace(/[R$\s]/g, '');
            if (cleaned.includes(',')) cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            customerTransactions[key].totalValue = parseFloat(cleaned) || 0;
          }
        }
        if (columnMapping.averageTicket && row[columnMapping.averageTicket]) {
          const at = row[columnMapping.averageTicket];
          if (typeof at === 'number') {
            customerTransactions[key].averageTicket = at;
          } else if (typeof at === 'string') {
            let cleaned = at.replace(/[R$\s]/g, '');
            if (cleaned.includes(',')) cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            customerTransactions[key].averageTicket = parseFloat(cleaned) || 0;
          }
        }
        if (columnMapping.daysSinceLastPurchase && row[columnMapping.daysSinceLastPurchase]) {
          customerTransactions[key].daysSinceLastPurchase = Number(row[columnMapping.daysSinceLastPurchase]) || 0;
        }
        if (columnMapping.recencyScore && row[columnMapping.recencyScore]) {
          customerTransactions[key].recencyScore = Number(row[columnMapping.recencyScore]) || 0;
        }
        if (columnMapping.frequencyScore && row[columnMapping.frequencyScore]) {
          customerTransactions[key].frequencyScore = Number(row[columnMapping.frequencyScore]) || 0;
        }
        if (columnMapping.valueScore && row[columnMapping.valueScore]) {
          customerTransactions[key].valueScore = Number(row[columnMapping.valueScore]) || 0;
        }
        if (columnMapping.segment && row[columnMapping.segment]) {
          customerTransactions[key].segment = String(row[columnMapping.segment]);
        }
      }

      console.log('Processing stats:', {
        totalRows,
        skippedNoName,
        skippedNoDate,
        skippedNoAmount,
        processedRows,
        uniqueCustomers: Object.keys(customerTransactions).length
      });

      const now = new Date();
      const allCustomerData = Object.entries(customerTransactions).map(([name, data]) => {
        const sortedDates = data.dates.sort((a, b) => b.getTime() - a.getTime());
        const lastPurchaseDate = sortedDates[0];
        
        // Use pre-calculated values if available, otherwise calculate
        const daysSinceLastPurchase = data.daysSinceLastPurchase ?? Math.floor((now.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalPurchases = data.totalPurchases ?? data.dates.length;
        const totalValue = data.totalValue ?? data.amounts.reduce((sum, a) => sum + a, 0);
        const averageTicket = data.averageTicket ?? (totalValue / Math.max(totalPurchases, 1));

        // Use whatsapp if available, otherwise use phone
        const whatsappNumber = data.whatsapp || data.phone;

        return {
          name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          phone: data.phone,
          whatsapp: whatsappNumber,
          email: data.email,
          cpf: data.cpf,
          prontuario: data.prontuario,
          daysSinceLastPurchase,
          totalPurchases,
          totalValue,
          averageTicket,
          lastPurchaseDate: lastPurchaseDate.toISOString().split('T')[0],
          firstPurchaseDate: data.firstPurchaseDate,
          // Pre-calculated scores (if available)
          preRecencyScore: data.recencyScore,
          preFrequencyScore: data.frequencyScore,
          preValueScore: data.valueScore,
          preSegment: data.segment,
        };
      });

      // Calculate quintiles for RFV scoring (only if not pre-calculated)
      const recencyValues = allCustomerData.map(c => c.daysSinceLastPurchase).sort((a, b) => a - b);
      const frequencyValues = allCustomerData.map(c => c.totalPurchases).sort((a, b) => a - b);
      const valueValues = allCustomerData.map(c => c.totalValue).sort((a, b) => a - b);

      const getQuintile = (value: number, sortedValues: number[], inverse = false): number => {
        const index = sortedValues.findIndex(v => v >= value);
        const percentile = index === -1 ? 1 : (index / sortedValues.length);
        const score = Math.ceil((inverse ? (1 - percentile) : percentile) * 5);
        return Math.max(1, Math.min(5, score || 1));
      };

      // Map segment names from spreadsheet to our segment keys
      const mapSegmentName = (segmentName?: string): RFVSegment | null => {
        if (!segmentName) return null;
        const lower = segmentName.toLowerCase();
        if (lower.includes('campe') || lower.includes('champion')) return 'champions';
        if (lower.includes('fiel') || lower.includes('loyal')) return 'loyal';
        if (lower.includes('potencial') || lower.includes('potential')) return 'potential';
        if (lower.includes('risco') || lower.includes('risk')) return 'at_risk';
        if (lower.includes('hibern') || lower.includes('dormindo')) return 'hibernating';
        if (lower.includes('perdido') || lower.includes('lost')) return 'lost';
        return null;
      };

      const rfvCustomers: RFVCustomer[] = allCustomerData.map(customer => {
        // Use pre-calculated scores if available and valid (1-5)
        const recencyScore = (customer.preRecencyScore && customer.preRecencyScore >= 1 && customer.preRecencyScore <= 5) 
          ? customer.preRecencyScore 
          : getQuintile(customer.daysSinceLastPurchase, recencyValues, true);
        const frequencyScore = (customer.preFrequencyScore && customer.preFrequencyScore >= 1 && customer.preFrequencyScore <= 5)
          ? customer.preFrequencyScore
          : getQuintile(customer.totalPurchases, frequencyValues);
        const valueScore = (customer.preValueScore && customer.preValueScore >= 1 && customer.preValueScore <= 5)
          ? customer.preValueScore
          : getQuintile(customer.totalValue, valueValues);
        
        // Use pre-calculated segment if available, otherwise calculate
        const mappedSegment = mapSegmentName(customer.preSegment);
        const segment = mappedSegment ?? calculateRFVSegment(recencyScore, frequencyScore, valueScore);

        return {
          name: customer.name,
          phone: customer.phone,
          whatsapp: customer.whatsapp,
          email: customer.email,
          cpf: customer.cpf,
          prontuario: customer.prontuario,
          firstPurchaseDate: customer.firstPurchaseDate,
          lastPurchaseDate: customer.lastPurchaseDate,
          daysSinceLastPurchase: customer.daysSinceLastPurchase,
          totalPurchases: customer.totalPurchases,
          totalValue: customer.totalValue,
          averageTicket: customer.averageTicket,
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
      setHasUnsavedChanges(true);

      const segmentCounts = rfvCustomers.reduce((acc, c) => {
        acc[c.segment] = (acc[c.segment] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Show detailed stats in toast
      const statsMessage = skippedNoName > 0 
        ? `${totalRows} linhas lidas, ${skippedNoName} sem nome. ${rfvCustomers.length} clientes únicos classificados.`
        : `${totalRows} linhas → ${rfvCustomers.length} clientes únicos classificados.`;

      toast({
        title: "Análise RFV concluída",
        description: statsMessage,
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

  const saveToDatabase = async () => {
    if (customers.length === 0) return;

    setIsSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Process in batches of 100 for better performance
      const BATCH_SIZE = 100;
      const batches = [];
      
      for (let i = 0; i < customers.length; i += BATCH_SIZE) {
        batches.push(customers.slice(i, i + BATCH_SIZE));
      }

      console.log(`Saving ${customers.length} customers in ${batches.length} batches...`);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        const batchData = batch.map(customer => ({
          name: customer.name.toLowerCase().trim(),
          phone: customer.phone || null,
          whatsapp: customer.whatsapp || customer.phone || null,
          email: customer.email || null,
          cpf: customer.cpf || null,
          prontuario: customer.prontuario || null,
          first_purchase_date: customer.firstPurchaseDate || customer.lastPurchaseDate,
          last_purchase_date: customer.lastPurchaseDate,
          total_purchases: customer.totalPurchases,
          total_value: customer.totalValue,
          average_ticket: customer.averageTicket,
          recency_score: customer.recencyScore,
          frequency_score: customer.frequencyScore,
          value_score: customer.valueScore,
          segment: customer.segment,
          days_since_last_purchase: customer.daysSinceLastPurchase,
          created_by: user?.id,
        }));

        const { data, error } = await supabase
          .from('rfv_customers')
          .upsert(batchData, { 
            onConflict: 'name',
            ignoreDuplicates: false 
          })
          .select('id');

        if (error) {
          console.error(`Batch ${batchIndex + 1} error:`, error);
          errorCount += batch.length;
        } else {
          successCount += data?.length || batch.length;
          console.log(`Batch ${batchIndex + 1}/${batches.length}: ${data?.length || batch.length} saved`);
        }
      }

      console.log(`Save complete: ${successCount} success, ${errorCount} errors`);
      setHasUnsavedChanges(false);
      
      // Save upload log
      const segmentBreakdown: Record<string, number> = {};
      customers.forEach(c => {
        segmentBreakdown[c.segment] = (segmentBreakdown[c.segment] || 0) + 1;
      });

      const { error: logError } = await supabase.from('rfv_upload_logs').insert({
        uploaded_by: user?.id,
        uploaded_by_name: profile?.full_name || 'Usuário',
        file_name: file?.name || 'Upload direto',
        total_customers: customers.length,
        data_reference_date: dataReferenceDate || null,
        segment_breakdown: segmentBreakdown,
      });

      if (logError) {
        console.error('Error saving upload log:', logError);
      }

      await loadUploadLogs();
      
      toast({
        title: "Dados salvos com sucesso!",
        description: `${successCount} clientes salvos${errorCount > 0 ? `, ${errorCount} erros` : ''}`,
      });

      // Reload data to get IDs
      await loadExistingData();
    } catch (error) {
      console.error('Error saving to database:', error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar os dados.",
        variant: "destructive",
      });
    }

    setIsSaving(false);
  };

  // Generate AI Strategy for selected customer
  const generateAIStrategy = async () => {
    if (!selectedCustomer) return;
    
    setIsLoadingAI(true);
    setAiStrategy(null);

    try {
      const { data, error } = await supabase.functions.invoke('rfv-ai-strategy', {
        body: {
          customer: {
            name: selectedCustomer.name,
            segment: selectedCustomer.segment,
            segmentName: RFV_SEGMENTS[selectedCustomer.segment].name,
            totalPurchases: selectedCustomer.totalPurchases,
            totalValue: selectedCustomer.totalValue,
            averageTicket: selectedCustomer.averageTicket,
            daysSinceLastPurchase: selectedCustomer.daysSinceLastPurchase,
            recencyScore: selectedCustomer.recencyScore,
            frequencyScore: selectedCustomer.frequencyScore,
            valueScore: selectedCustomer.valueScore,
          }
        }
      });

      if (error) throw error;
      
      setAiStrategy(data.strategy);
      toast({
        title: "Estratégia gerada!",
        description: "A IA analisou o cliente e criou uma estratégia personalizada.",
      });
    } catch (error) {
      console.error('Error generating AI strategy:', error);
      toast({
        title: "Erro ao gerar estratégia",
        description: "Não foi possível gerar a estratégia com IA.",
        variant: "destructive",
      });
    }

    setIsLoadingAI(false);
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

  // Advanced filters state
  const [filterMinValue, setFilterMinValue] = useState<string>('');
  const [filterMaxValue, setFilterMaxValue] = useState<string>('');
  const [filterMinDays, setFilterMinDays] = useState<string>('');
  const [filterMaxDays, setFilterMaxDays] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [searchName, setSearchName] = useState<string>('');

  // Table pagination
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(100);

  const filteredCustomers = customers.filter(c => {
    // Segment filter
    if (selectedSegment !== 'all' && c.segment !== selectedSegment) return false;
    
    // Name search
    if (searchName && !c.name.toLowerCase().includes(searchName.toLowerCase())) return false;
    
    // Value range filter
    if (filterMinValue && c.totalValue < parseFloat(filterMinValue)) return false;
    if (filterMaxValue && c.totalValue > parseFloat(filterMaxValue)) return false;
    
    // Days since purchase filter
    if (filterMinDays && c.daysSinceLastPurchase < parseInt(filterMinDays)) return false;
    if (filterMaxDays && c.daysSinceLastPurchase > parseInt(filterMaxDays)) return false;
    
    // Date range filter (last purchase date)
    if (filterDateFrom && c.lastPurchaseDate < filterDateFrom) return false;
    if (filterDateTo && c.lastPurchaseDate > filterDateTo) return false;
    
    return true;
  });

  // Reset pagination when filters change
  useEffect(() => {
    setTablePage(1);
  }, [
    selectedSegment,
    searchName,
    filterMinValue,
    filterMaxValue,
    filterMinDays,
    filterMaxDays,
    filterDateFrom,
    filterDateTo,
    customers.length,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / tablePageSize));
  const safePage = Math.min(tablePage, totalPages);
  const pagedCustomers = filteredCustomers.slice(
    (safePage - 1) * tablePageSize,
    safePage * tablePageSize
  );

  const clearFilters = () => {
    setFilterMinValue('');
    setFilterMaxValue('');
    setFilterMinDays('');
    setFilterMaxDays('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchName('');
    setSelectedSegment('all');
  };

  const hasActiveFilters = filterMinValue || filterMaxValue || filterMinDays || filterMaxDays || 
    filterDateFrom || filterDateTo || searchName || selectedSegment !== 'all';

  const exportToExcel = () => {
    if (filteredCustomers.length === 0) {
      toast({
        title: "Nenhum cliente para exportar",
        description: "Não há clientes correspondentes aos filtros atuais.",
        variant: "destructive",
      });
      return;
    }

    const exportData = filteredCustomers.map(customer => ({
      "Nome": customer.name,
      "Email": customer.email || "",
      "Telefone": customer.phone || "",
      "Total de Compras": customer.totalPurchases,
      "Valor Total (R$)": customer.totalValue.toFixed(2),
      "Ticket Médio (R$)": customer.averageTicket.toFixed(2),
      "Primeira Compra": customer.firstPurchaseDate || "",
      "Última Compra": customer.lastPurchaseDate,
      "Dias Sem Compra": customer.daysSinceLastPurchase,
      "Score Recência (R)": customer.recencyScore,
      "Score Frequência (F)": customer.frequencyScore,
      "Score Valor (V)": customer.valueScore,
      "Score Total": customer.recencyScore + customer.frequencyScore + customer.valueScore,
      "Segmento": RFV_SEGMENTS[customer.segment].name,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes RFV");

    // Auto-size columns
    const colWidths = [
      { wch: 30 }, // Nome
      { wch: 25 }, // Email
      { wch: 15 }, // Telefone
      { wch: 16 }, // Total de Compras
      { wch: 16 }, // Valor Total
      { wch: 16 }, // Ticket Médio
      { wch: 14 }, // Primeira Compra
      { wch: 14 }, // Última Compra
      { wch: 16 }, // Dias Sem Compra
      { wch: 18 }, // Score Recência
      { wch: 20 }, // Score Frequência
      { wch: 16 }, // Score Valor
      { wch: 12 }, // Score Total
      { wch: 15 }, // Segmento
    ];
    worksheet["!cols"] = colWidths;

    const fileName = `clientes_rfv_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    toast({
      title: "Exportação concluída",
      description: `${filteredCustomers.length} clientes exportados para ${fileName}`,
    });
  };

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

  // Generate personalized WhatsApp message based on segment
  const getWhatsAppMessage = (customer: RFVCustomer): string => {
    const firstName = customer.name.split(' ')[0];
    const messages: Record<RFVSegment, string> = {
      champions: `Olá ${firstName}! 👑 Tudo bem? Aqui é da Unique. Você é uma cliente especial para nós! Temos novidades exclusivas e gostaríamos de te contar. Podemos conversar?`,
      loyal: `Oi ${firstName}! 💙 Tudo bem? Passando para saber como você está. Temos algumas novidades que combinam com seu perfil. Posso te contar mais?`,
      potential: `Olá ${firstName}! ✨ Tudo bem com você? Esperamos que esteja gostando dos nossos serviços. Gostaríamos de saber sua opinião e mostrar o que temos de novo!`,
      at_risk: `Oi ${firstName}! 💛 Sentimos sua falta por aqui! Como você está? Estamos com condições especiais e gostaríamos muito de te receber novamente. Posso te apresentar?`,
      hibernating: `Olá ${firstName}! Há quanto tempo! Como você está? Temos muitas novidades na Unique e gostaríamos de te mostrar. Você está disponível para uma conversa?`,
      lost: `Oi ${firstName}! Tudo bem? Estamos com saudade de você! Preparamos algo especial para nossos clientes. Posso te contar mais?`,
    };
    return encodeURIComponent(messages[customer.segment]);
  };

  const getWhatsAppNumber = (customer: RFVCustomer): string => {
    const number = customer.whatsapp || customer.phone || '';
    // Remove all non-numeric characters
    const cleaned = number.replace(/\D/g, '');
    // Add Brazil country code if not present
    if (cleaned.length === 10 || cleaned.length === 11) {
      return `55${cleaned}`;
    }
    return cleaned;
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
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Mapeamento de Colunas</h3>
                    <Badge variant="outline" className="text-xs">
                      {availableColumns.length} colunas encontradas
                    </Badge>
                  </div>
                  {/* Campos obrigatórios */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Campos Obrigatórios</h4>
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
                        <Label>Última Compra (Data) *</Label>
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
                        <Label>Valor Total / LTV *</Label>
                        <select
                          className="w-full p-2 border rounded-md bg-background"
                          value={columnMapping.totalValue}
                          onChange={(e) => setColumnMapping({ ...columnMapping, totalValue: e.target.value })}
                        >
                          <option value="">Selecione...</option>
                          {availableColumns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Dados de Contato */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Dados de Contato</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <Label>WhatsApp</Label>
                        <select
                          className="w-full p-2 border rounded-md bg-background"
                          value={columnMapping.whatsapp}
                          onChange={(e) => setColumnMapping({ ...columnMapping, whatsapp: e.target.value })}
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
                  </div>

                  {/* Dados de Histórico */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Histórico de Compras</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Primeira Compra</Label>
                        <select
                          className="w-full p-2 border rounded-md bg-background"
                          value={columnMapping.firstPurchaseDate}
                          onChange={(e) => setColumnMapping({ ...columnMapping, firstPurchaseDate: e.target.value })}
                        >
                          <option value="">Selecione...</option>
                          {availableColumns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Qtd. Compras</Label>
                        <select
                          className="w-full p-2 border rounded-md bg-background"
                          value={columnMapping.totalPurchases}
                          onChange={(e) => setColumnMapping({ ...columnMapping, totalPurchases: e.target.value })}
                        >
                          <option value="">Selecione...</option>
                          {availableColumns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Ticket Médio</Label>
                        <select
                          className="w-full p-2 border rounded-md bg-background"
                          value={columnMapping.averageTicket}
                          onChange={(e) => setColumnMapping({ ...columnMapping, averageTicket: e.target.value })}
                        >
                          <option value="">Selecione...</option>
                          {availableColumns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Dias Sem Compra</Label>
                        <select
                          className="w-full p-2 border rounded-md bg-background"
                          value={columnMapping.daysSinceLastPurchase}
                          onChange={(e) => setColumnMapping({ ...columnMapping, daysSinceLastPurchase: e.target.value })}
                        >
                          <option value="">Selecione...</option>
                          {availableColumns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Scores RFV */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Scores RFV (se já calculados)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Score Recência (R)</Label>
                        <select
                          className="w-full p-2 border rounded-md bg-background"
                          value={columnMapping.recencyScore}
                          onChange={(e) => setColumnMapping({ ...columnMapping, recencyScore: e.target.value })}
                        >
                          <option value="">Selecione...</option>
                          {availableColumns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Score Frequência (F)</Label>
                        <select
                          className="w-full p-2 border rounded-md bg-background"
                          value={columnMapping.frequencyScore}
                          onChange={(e) => setColumnMapping({ ...columnMapping, frequencyScore: e.target.value })}
                        >
                          <option value="">Selecione...</option>
                          {availableColumns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Score Valor (V)</Label>
                        <select
                          className="w-full p-2 border rounded-md bg-background"
                          value={columnMapping.valueScore}
                          onChange={(e) => setColumnMapping({ ...columnMapping, valueScore: e.target.value })}
                        >
                          <option value="">Selecione...</option>
                          {availableColumns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Segmento RFV</Label>
                        <select
                          className="w-full p-2 border rounded-md bg-background"
                          value={columnMapping.segment}
                          onChange={(e) => setColumnMapping({ ...columnMapping, segment: e.target.value })}
                        >
                          <option value="">Selecione...</option>
                          {availableColumns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
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

        {/* Save Button and Stats */}
        {hasUnsavedChanges && customers.length > 0 && (
          <Alert className="mb-6 border-primary bg-primary/10">
            <Save className="h-4 w-4" />
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <span className="flex-1">Você tem {customers.length} clientes processados. Salve para persistir os dados.</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="dataRef" className="text-xs whitespace-nowrap">Data Ref.:</Label>
                  <Input
                    id="dataRef"
                    type="date"
                    value={dataReferenceDate}
                    onChange={(e) => setDataReferenceDate(e.target.value)}
                    className="w-36 h-8"
                    placeholder="Data dos dados"
                  />
                </div>
                <Button onClick={saveToDatabase} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
                  Salvar no Banco
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Upload History */}
        {uploadLogs.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-5 w-5" />
                Histórico de Uploads da Matriz RFV
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data Upload</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Arquivo</TableHead>
                      <TableHead className="text-center">Clientes</TableHead>
                      <TableHead>Data Ref. Dados</TableHead>
                      <TableHead>Segmentos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(log.uploaded_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>{log.uploaded_by_name}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={log.file_name}>
                          {log.file_name || '-'}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {log.total_customers?.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {log.data_reference_date 
                            ? new Date(log.data_reference_date).toLocaleDateString('pt-BR')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {log.segment_breakdown && (
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(log.segment_breakdown).map(([seg, count]) => (
                                <Badge key={seg} variant="outline" className="text-xs">
                                  {RFV_SEGMENTS[seg as RFVSegment]?.name || seg}: {String(count)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoadingData && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Carregando dados existentes...</span>
          </div>
        )}

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

            {/* Advanced Filters */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Filtros Avançados
                  </span>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Limpar Filtros
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Name Search */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Buscar por Nome</Label>
                    <Input
                      placeholder="Digite o nome..."
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  {/* Value Range */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Valor Total (R$)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        placeholder="Mín"
                        value={filterMinValue}
                        onChange={(e) => setFilterMinValue(e.target.value)}
                        className="w-1/2"
                      />
                      <Input
                        type="number"
                        placeholder="Máx"
                        value={filterMaxValue}
                        onChange={(e) => setFilterMaxValue(e.target.value)}
                        className="w-1/2"
                      />
                    </div>
                  </div>

                  {/* Days Since Purchase */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Dias sem Compra</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        placeholder="Mín"
                        value={filterMinDays}
                        onChange={(e) => setFilterMinDays(e.target.value)}
                        className="w-1/2"
                      />
                      <Input
                        type="number"
                        placeholder="Máx"
                        value={filterMaxDays}
                        onChange={(e) => setFilterMaxDays(e.target.value)}
                        className="w-1/2"
                      />
                    </div>
                  </div>

                  {/* Date Range */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Última Compra (Data)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="w-1/2"
                      />
                      <Input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        className="w-1/2"
                      />
                    </div>
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">{filteredCustomers.length} de {customers.length} clientes</Badge>
                    <span>correspondentes aos filtros</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Detail and Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Customer List */}
              <Card className="lg:col-span-2">
              <CardHeader>
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <span>
                      {selectedSegment === 'all' ? 'Todos os Clientes' : RFV_SEGMENTS[selectedSegment].name}
                    </span>

                    <div className="flex flex-col items-start sm:items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={exportToExcel}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Exportar Excel
                        </Button>
                        <Badge variant="outline">{filteredCustomers.length} clientes</Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          className="h-8 px-2 border rounded-md bg-background text-sm"
                          value={tablePageSize}
                          onChange={(e) => setTablePageSize(parseInt(e.target.value, 10))}
                          aria-label="Itens por página"
                        >
                          <option value={50}>50/pág</option>
                          <option value={100}>100/pág</option>
                          <option value={250}>250/pág</option>
                          <option value={500}>500/pág</option>
                        </select>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                          disabled={safePage <= 1}
                        >
                          Anterior
                        </Button>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          Página {safePage} de {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                          disabled={safePage >= totalPages}
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[500px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Contato</TableHead>
                          <TableHead>Prontuário</TableHead>
                          <TableHead>Segmento</TableHead>
                          <TableHead className="text-center">RFV</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Última Compra</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedCustomers.map((customer, index) => {
                          const segment = RFV_SEGMENTS[customer.segment];
                          const Icon = segment.icon;
                          const contactPhone = customer.whatsapp || customer.phone;
                          return (
                            <TableRow 
                              key={index} 
                              className={`cursor-pointer ${selectedCustomer?.name === customer.name ? 'bg-muted' : ''}`}
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setAiStrategy(null);
                              }}
                            >
                              <TableCell>
                                <div>
                                  <p className="font-medium">{customer.name}</p>
                                  {customer.cpf && (
                                    <p className="text-xs text-muted-foreground">CPF: {customer.cpf}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  {contactPhone ? (
                                    <a 
                                      href={`https://wa.me/55${contactPhone.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs text-green-600 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Phone className="h-3 w-3" />
                                      {contactPhone}
                                    </a>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Sem telefone</span>
                                  )}
                                  {customer.email && (
                                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">{customer.email}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {customer.prontuario ? (
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {customer.prontuario}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge className={`${segment.color} text-white`}>
                                  <Icon className="h-3 w-3 mr-1" />
                                  {segment.name}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Badge variant={customer.recencyScore >= 4 ? "default" : "outline"} className="text-xs px-1">
                                    {customer.recencyScore}
                                  </Badge>
                                  <Badge variant={customer.frequencyScore >= 4 ? "default" : "outline"} className="text-xs px-1">
                                    {customer.frequencyScore}
                                  </Badge>
                                  <Badge variant={customer.valueScore >= 4 ? "default" : "outline"} className="text-xs px-1">
                                    {customer.valueScore}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(customer.totalValue)}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p>{new Date(customer.lastPurchaseDate).toLocaleDateString('pt-BR')}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {customer.daysSinceLastPurchase}d atrás
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
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-5 w-5" />
                    Ações Recomendadas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedCustomer ? (
                    <>
                      {/* Customer Summary */}
                      <div className={`p-4 rounded-lg ${RFV_SEGMENTS[selectedCustomer.segment].bgLight}`}>
                        <div className="flex items-center gap-2 mb-3">
                          {(() => {
                            const Icon = RFV_SEGMENTS[selectedCustomer.segment].icon;
                            return <Icon className={`h-5 w-5 ${RFV_SEGMENTS[selectedCustomer.segment].textColor}`} />;
                          })()}
                          <span className="font-semibold">{selectedCustomer.name}</span>
                        </div>
                        
                        {/* Contact Info */}
                        <div className="space-y-2 mb-3 pb-3 border-b border-border/50">
                          {(selectedCustomer.whatsapp || selectedCustomer.phone) && (
                            <a 
                              href={`https://wa.me/55${(selectedCustomer.whatsapp || selectedCustomer.phone)?.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-green-600 hover:underline"
                            >
                              <Phone className="h-4 w-4" />
                              {selectedCustomer.whatsapp || selectedCustomer.phone}
                            </a>
                          )}
                          {selectedCustomer.email && (
                            <a 
                              href={`mailto:${selectedCustomer.email}`}
                              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                            >
                              <Mail className="h-4 w-4" />
                              {selectedCustomer.email}
                            </a>
                          )}
                          {selectedCustomer.prontuario && (
                            <div className="flex items-center gap-2 text-sm">
                              <Database className="h-4 w-4 text-muted-foreground" />
                              <span>Prontuário: <strong>{selectedCustomer.prontuario}</strong></span>
                            </div>
                          )}
                          {selectedCustomer.cpf && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>CPF: {selectedCustomer.cpf}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Compras</p>
                            <p className="font-bold">{selectedCustomer.totalPurchases}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Total</p>
                            <p className="font-bold">{formatCurrency(selectedCustomer.totalValue)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Ticket</p>
                            <p className="font-bold">{formatCurrency(selectedCustomer.averageTicket)}</p>
                          </div>
                        </div>
                        
                        {/* Days and Dates */}
                        <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Última Compra</p>
                            <p className="font-medium">{new Date(selectedCustomer.lastPurchaseDate).toLocaleDateString('pt-BR')}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Dias sem Compra</p>
                            <p className="font-medium">{selectedCustomer.daysSinceLastPurchase}d</p>
                          </div>
                        </div>
                      </div>

                      {/* Radar Chart */}
                      <div className="h-[180px]">
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

                      {/* AI Strategy Button */}
                      <div className="pt-2">
                        <Button 
                          onClick={generateAIStrategy} 
                          disabled={isLoadingAI}
                          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                        >
                          {isLoadingAI ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Gerando estratégia...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Gerar Estratégia com IA
                            </>
                          )}
                        </Button>
                      </div>

                      {/* AI Generated Strategy */}
                      {aiStrategy && (
                        <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="h-4 w-4 text-purple-500" />
                            <h4 className="font-semibold text-sm text-purple-700 dark:text-purple-300">
                              Estratégia Personalizada (IA)
                            </h4>
                          </div>
                          <div className="prose prose-sm dark:prose-invert max-w-none text-sm whitespace-pre-wrap">
                            {aiStrategy}
                          </div>
                        </div>
                      )}

                      {/* Action Cards */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Próximas Ações Sugeridas:</h4>
                        {RFV_SEGMENTS[selectedCustomer.segment].actions.slice(0, 3).map((action, index) => (
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
                      <div className="flex flex-col gap-2 pt-2">
                        {/* WhatsApp Button - Main CTA */}
                        {(selectedCustomer.whatsapp || selectedCustomer.phone) && (
                          <Button 
                            size="sm" 
                            className="w-full bg-green-600 hover:bg-green-700 text-white" 
                            asChild
                          >
                            <a 
                              href={`https://wa.me/${getWhatsAppNumber(selectedCustomer)}?text=${getWhatsAppMessage(selectedCustomer)}`} 
                              target="_blank"
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Enviar WhatsApp com Mensagem
                            </a>
                          </Button>
                        )}
                        
                        <div className="flex gap-2">
                          {selectedCustomer.phone && (
                            <Button size="sm" variant="outline" className="flex-1" asChild>
                              <a href={`tel:${selectedCustomer.phone}`}>
                                <Phone className="h-4 w-4 mr-1" />
                                Ligar
                              </a>
                            </Button>
                          )}
                          {selectedCustomer.email && (
                            <Button size="sm" variant="outline" className="flex-1" asChild>
                              <a href={`mailto:${selectedCustomer.email}`}>
                                <Mail className="h-4 w-4 mr-1" />
                                Email
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Action History Component */}
                      <div className="pt-4 border-t">
                        <RFVActionHistory 
                          customerId={selectedCustomer.id}
                          customerName={selectedCustomer.name}
                        />
                      </div>
                    </>
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
