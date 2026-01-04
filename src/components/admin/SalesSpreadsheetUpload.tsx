import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, Check, X, AlertCircle, Loader2, UserPlus, TrendingUp, Users, DollarSign, Award, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from "xlsx";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(210, 70%, 50%)',
  'hsl(150, 60%, 45%)',
  'hsl(280, 60%, 55%)',
  'hsl(30, 80%, 55%)',
  'hsl(350, 70%, 50%)',
  'hsl(180, 60%, 45%)',
  'hsl(60, 70%, 45%)',
];

interface ParsedSale {
  date: string;
  department: string;
  procedure: string;
  clientName: string;
  sellerName: string;
  amountSold: number;      // Valor Vendido
  amountPaid: number;      // Valor Pago/Recebido
  matchedUserId: string | null;
  matchedTeamId: string | null;
  matchedTeamName: string | null;
  status: 'matched' | 'unmatched' | 'error';
  errorMessage?: string;
}

interface ColumnMapping {
  date: string;
  department: string;
  procedure: string;
  clientName: string;
  sellerName: string;
  amountSold: string;      // Valor Vendido
  amountPaid: string;      // Valor Pago/Recebido
}

interface SalesMetrics {
  totalSales: number;
  totalRevenueSold: number;    // Total Valor Vendido
  totalRevenuePaid: number;    // Total Valor Recebido
  averageTicketSoldPerSale: number;   // Ticket Médio por Venda (Vendido)
  averageTicketPaidPerSale: number;   // Ticket Médio por Venda (Recebido)
  averageTicketSoldPerClient: number; // Ticket Médio por Cliente (Vendido)
  averageTicketPaidPerClient: number; // Ticket Médio por Cliente (Recebido)
  uniqueClients: number;
  uniqueSellers: number;
  salesByDepartment: Record<string, { count: number; revenueSold: number; revenuePaid: number }>;
  salesBySeller: Record<string, { count: number; revenueSold: number; revenuePaid: number; uniqueClients: number }>;
  salesByTeam: Record<string, { count: number; revenueSold: number; revenuePaid: number; teamName: string }>;
  salesByProcedure: Record<string, { count: number; revenueSold: number; revenuePaid: number }>;
  topClients: { name: string; revenueSold: number; revenuePaid: number; count: number }[];
  salesByDate: Record<string, { count: number; revenueSold: number; revenuePaid: number }>;
}

const SalesSpreadsheetUpload = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedSales, setParsedSales] = useState<ParsedSale[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    date: '',
    department: '',
    procedure: '',
    clientName: '',
    sellerName: '',
    amountSold: '',
    amountPaid: '',
  });
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    skipped: number;
  } | null>(null);
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [sellerSortBy, setSellerSortBy] = useState<'revenuePaid' | 'revenueSold' | 'count'>('revenuePaid');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParsedSales([]);
      setImportResults(null);
      setMetrics(null);
      setSheetNames([]);
      setSelectedSheet("");
      parseExcelFile(selectedFile);
    }
  };

  const parseExcelFile = async (file: File, sheetOverride?: string) => {
    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      setSheetNames(workbook.SheetNames);

      const sheetName = sheetOverride && workbook.SheetNames.includes(sheetOverride)
        ? sheetOverride
        : workbook.SheetNames[0];

      setSelectedSheet(sheetName);

      const worksheet = workbook.Sheets[sheetName];
      // Use defval to keep empty cells so columns don't disappear from the first row
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
        defval: "",
      });

      if (jsonData.length === 0) {
        toast({
          title: "Planilha vazia",
          description: "A planilha não contém dados.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Build columns from ALL rows (Feegow exports may have empty cells in the first data row)
      const columns = Array.from(
        new Set(jsonData.flatMap((row) => Object.keys(row)))
      );
      setAvailableColumns(columns);
      setRawData(jsonData);

      // Auto-detect columns
      const autoMapping: ColumnMapping = {
        date: '',
        department: '',
        procedure: '',
        clientName: '',
        sellerName: '',
        amountSold: '',
        amountPaid: '',
      };

      // Feegow-specific column detection
      for (const col of columns) {
        const colLower = col.toLowerCase().trim();
        
        // Date detection
        if (colLower.includes('data') || colLower.includes('date') || colLower === 'dt') {
          if (!autoMapping.date) autoMapping.date = col;
        }
        
        // Department detection - includes "Grupo" which is Feegow's department field
        if (colLower.includes('depart') || colLower.includes('setor') || 
            colLower.includes('grupo') || colLower === 'grupo procedimento' || 
            colLower.includes('segmento') || colLower.includes('grupo proc')) {
          if (!autoMapping.department) autoMapping.department = col;
        }
        
        // Client name detection - "Nome Conta" is Feegow's patient name
        if (colLower.includes('cliente') || colLower.includes('paciente') || 
            colLower.includes('patient') || colLower.includes('client') ||
            colLower.includes('nome conta') || colLower === 'conta' ||
            colLower === 'nome' || colLower.includes('nome do paciente')) {
          if (!autoMapping.clientName) autoMapping.clientName = col;
        }
        
        // Seller detection
        if (colLower.includes('vendedor') || colLower.includes('seller') || 
            colLower.includes('usuario') || colLower.includes('user') || 
            colLower.includes('responsavel') || colLower.includes('atendente') ||
            colLower.includes('consultor') || colLower.includes('profissional')) {
          if (!autoMapping.sellerName) autoMapping.sellerName = col;
        }
        
        // Procedure detection
        if (colLower === 'procedimento' || colLower.includes('procedure') ||
            colLower.includes('servico') || colLower.includes('serviço') ||
            (colLower.includes('nome') && colLower.includes('proc'))) {
          if (!autoMapping.procedure) autoMapping.procedure = col;
        }
        
        // Amount Sold detection (valor vendido)
        if (colLower.includes('valor vendido') || colLower === 'vendido') {
          autoMapping.amountSold = col;
        } else if (!autoMapping.amountSold && colLower.includes('valor') && !colLower.includes('pago') && !colLower.includes('recebido')) {
          autoMapping.amountSold = col;
        }
        
        // Amount Paid detection (valor pago/recebido)
        if (colLower.includes('valor pago') || colLower === 'pago' || 
            colLower.includes('valor recebido') || colLower === 'recebido') {
          autoMapping.amountPaid = col;
        }
      }

      setColumnMapping(autoMapping);
      setShowColumnMapping(true);
      
      toast({
        title: "Arquivo carregado",
        description: `${jsonData.length} linhas encontradas. Configure o mapeamento de colunas.`,
      });
    } catch (error) {
      console.error('Error parsing Excel:', error);
      toast({
        title: "Erro ao processar arquivo",
        description: "Não foi possível ler o arquivo Excel.",
        variant: "destructive",
      });
    }
    setIsProcessing(false);
  };

  // Normalize client name for unique identification
  const normalizeClientName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/\s+/g, ' '); // Normalize spaces
  };

  const calculateMetrics = (sales: ParsedSale[]): SalesMetrics => {
    const validSales = sales.filter(s => s.status !== 'error' && (s.amountSold > 0 || s.amountPaid > 0));
    
    const totalSales = validSales.length;
    const totalRevenueSold = validSales.reduce((sum, s) => sum + s.amountSold, 0);
    const totalRevenuePaid = validSales.reduce((sum, s) => sum + s.amountPaid, 0);
    
    // Calculate unique clients by normalized name
    const clientMap = new Map<string, { name: string; totalSold: number; totalPaid: number; purchases: number }>();
    for (const sale of validSales) {
      if (sale.clientName) {
        const normalizedName = normalizeClientName(sale.clientName);
        const existing = clientMap.get(normalizedName);
        if (existing) {
          existing.totalSold += sale.amountSold;
          existing.totalPaid += sale.amountPaid;
          existing.purchases++;
        } else {
          clientMap.set(normalizedName, {
            name: sale.clientName.trim(),
            totalSold: sale.amountSold,
            totalPaid: sale.amountPaid,
            purchases: 1,
          });
        }
      }
    }
    
    const uniqueClients = clientMap.size;
    const uniqueSellers = new Set(validSales.map(s => s.sellerName.toLowerCase().trim()).filter(Boolean)).size;
    
    // Average ticket per SALE (total revenue / number of sales)
    const averageTicketSoldPerSale = totalSales > 0 ? totalRevenueSold / totalSales : 0;
    const averageTicketPaidPerSale = totalSales > 0 ? totalRevenuePaid / totalSales : 0;
    
    // Average ticket per CLIENT (total revenue / unique clients)
    const averageTicketSoldPerClient = uniqueClients > 0 ? totalRevenueSold / uniqueClients : 0;
    const averageTicketPaidPerClient = uniqueClients > 0 ? totalRevenuePaid / uniqueClients : 0;
    
    // Sales by department
    const salesByDepartment: Record<string, { count: number; revenueSold: number; revenuePaid: number }> = {};
    for (const sale of validSales) {
      const dept = sale.department?.trim() || 'Não informado';
      if (!salesByDepartment[dept]) {
        salesByDepartment[dept] = { count: 0, revenueSold: 0, revenuePaid: 0 };
      }
      salesByDepartment[dept].count++;
      salesByDepartment[dept].revenueSold += sale.amountSold;
      salesByDepartment[dept].revenuePaid += sale.amountPaid;
    }
    
    // Sales by seller with unique clients count
    const salesBySeller: Record<string, { count: number; revenueSold: number; revenuePaid: number; uniqueClients: number; clientSet: Set<string> }> = {};
    for (const sale of validSales) {
      const seller = sale.sellerName?.trim() || 'Não informado';
      if (!salesBySeller[seller]) {
        salesBySeller[seller] = { count: 0, revenueSold: 0, revenuePaid: 0, uniqueClients: 0, clientSet: new Set() };
      }
      salesBySeller[seller].count++;
      salesBySeller[seller].revenueSold += sale.amountSold;
      salesBySeller[seller].revenuePaid += sale.amountPaid;
      if (sale.clientName) {
        salesBySeller[seller].clientSet.add(normalizeClientName(sale.clientName));
      }
    }
    
    // Convert clientSet to uniqueClients count and remove the Set from the final object
    const salesBySellerFinal: Record<string, { count: number; revenueSold: number; revenuePaid: number; uniqueClients: number }> = {};
    for (const [seller, data] of Object.entries(salesBySeller)) {
      salesBySellerFinal[seller] = {
        count: data.count,
        revenueSold: data.revenueSold,
        revenuePaid: data.revenuePaid,
        uniqueClients: data.clientSet.size,
      };
    }

    // Sales by team
    const salesByTeam: Record<string, { count: number; revenueSold: number; revenuePaid: number; teamName: string }> = {};
    for (const sale of validSales) {
      if (sale.matchedTeamId) {
        const teamKey = sale.matchedTeamId;
        const teamName = sale.matchedTeamName || 'Time Desconhecido';
        if (!salesByTeam[teamKey]) {
          salesByTeam[teamKey] = { count: 0, revenueSold: 0, revenuePaid: 0, teamName };
        }
        salesByTeam[teamKey].count++;
        salesByTeam[teamKey].revenueSold += sale.amountSold;
        salesByTeam[teamKey].revenuePaid += sale.amountPaid;
      }
    }

    // Sales by procedure
    const salesByProcedure: Record<string, { count: number; revenueSold: number; revenuePaid: number }> = {};
    for (const sale of validSales) {
      const proc = sale.procedure?.trim() || 'Não informado';
      if (!salesByProcedure[proc]) {
        salesByProcedure[proc] = { count: 0, revenueSold: 0, revenuePaid: 0 };
      }
      salesByProcedure[proc].count++;
      salesByProcedure[proc].revenueSold += sale.amountSold;
      salesByProcedure[proc].revenuePaid += sale.amountPaid;
    }
    
    // Top clients by revenue (using unique client data)
    const topClients = Array.from(clientMap.values())
      .map(client => ({
        name: client.name,
        revenueSold: client.totalSold,
        revenuePaid: client.totalPaid,
        count: client.purchases,
      }))
      .sort((a, b) => b.revenueSold - a.revenueSold)
      .slice(0, 10);
    
    // Sales by date
    const salesByDate: Record<string, { count: number; revenueSold: number; revenuePaid: number }> = {};
    for (const sale of validSales) {
      if (sale.date) {
        if (!salesByDate[sale.date]) {
          salesByDate[sale.date] = { count: 0, revenueSold: 0, revenuePaid: 0 };
        }
        salesByDate[sale.date].count++;
        salesByDate[sale.date].revenueSold += sale.amountSold;
        salesByDate[sale.date].revenuePaid += sale.amountPaid;
      }
    }
    
    return {
      totalSales,
      totalRevenueSold,
      totalRevenuePaid,
      averageTicketSoldPerSale,
      averageTicketPaidPerSale,
      averageTicketSoldPerClient,
      averageTicketPaidPerClient,
      uniqueClients,
      uniqueSellers,
      salesByDepartment,
      salesBySeller: salesBySellerFinal,
      salesByTeam,
      salesByProcedure,
      topClients,
      salesByDate,
    };
  };

  const processWithMapping = async () => {
    if (!columnMapping.date || !columnMapping.sellerName || (!columnMapping.amountSold && !columnMapping.amountPaid)) {
      toast({
        title: "Mapeamento incompleto",
        description: "Configure pelo menos Data, Vendedor e um campo de Valor (Vendido ou Pago).",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const [{ data: mappings }, { data: profiles }, { data: teams }] = await Promise.all([
        supabase.from('feegow_user_mapping').select('feegow_name, user_id'),
        supabase.from('profiles').select('user_id, full_name, team_id').not('team_id', 'is', null),
        supabase.from('teams').select('id, name'),
      ]);

      const mappingByName = new Map<string, string>();
      mappings?.forEach(m => {
        mappingByName.set(m.feegow_name.toLowerCase().trim(), m.user_id);
      });

      const teamNamesById = new Map<string, string>();
      teams?.forEach(t => {
        teamNamesById.set(t.id, t.name);
      });

      const profileByUserId = new Map<string, { full_name: string; team_id: string }>();
      const profileByName = new Map<string, { user_id: string; team_id: string }>();
      profiles?.forEach(p => {
        profileByUserId.set(p.user_id, { full_name: p.full_name, team_id: p.team_id });
        const firstName = p.full_name.split(' ')[0].toLowerCase().trim();
        profileByName.set(firstName, { user_id: p.user_id, team_id: p.team_id });
        profileByName.set(p.full_name.toLowerCase().trim(), { user_id: p.user_id, team_id: p.team_id });
      });

      // Filter out summary/total rows (usually at the end of Feegow exports)
      const filteredData = rawData.filter((row) => {
        const clientName = columnMapping.clientName ? String(row[columnMapping.clientName] || '') : '';
        const sellerName = String(row[columnMapping.sellerName] || '');
        const clientLower = clientName.toLowerCase().trim();
        const sellerLower = sellerName.toLowerCase().trim();
        
        // Skip rows that look like totals/summaries
        const isTotalRow = 
          clientLower.includes('total') || 
          clientLower.includes('soma') || 
          clientLower.includes('subtotal') ||
          sellerLower.includes('total') || 
          sellerLower.includes('soma') ||
          sellerLower === '' && clientLower === '';
        
        return !isTotalRow;
      });

      console.log(`Filtered ${rawData.length - filteredData.length} total/summary rows`);

      const sales: ParsedSale[] = filteredData.map((row) => {
        try {
          const dateValue = row[columnMapping.date];
          const sellerName = String(row[columnMapping.sellerName] || '').trim();
          const amountSoldRaw = columnMapping.amountSold ? row[columnMapping.amountSold] : 0;
          const amountPaidRaw = columnMapping.amountPaid ? row[columnMapping.amountPaid] : 0;
          const department = columnMapping.department ? String(row[columnMapping.department] || '').trim() : '';
          const procedure = columnMapping.procedure ? String(row[columnMapping.procedure] || '').trim() : '';
          const clientName = columnMapping.clientName ? String(row[columnMapping.clientName] || '').trim() : '';

          // Parse date
          let parsedDate = '';
          if (dateValue) {
            if (typeof dateValue === 'number') {
              const excelDate = XLSX.SSF.parse_date_code(dateValue);
              parsedDate = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
            } else if (typeof dateValue === 'string') {
              const parts = dateValue.split(/[-\/]/);
              if (parts.length === 3) {
                if (parts[0].length === 4) {
                  parsedDate = dateValue;
                } else {
                  parsedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
              }
            }
          }

          if (!parsedDate) {
            return {
              date: '',
              department,
              procedure,
              clientName,
              sellerName,
              amountSold: 0,
              amountPaid: 0,
              matchedUserId: null,
              matchedTeamId: null,
              matchedTeamName: null,
              status: 'error' as const,
              errorMessage: 'Data inválida',
            };
          }

          // Parse amounts - helper function for Brazilian format
          const parseAmount = (raw: any): number => {
            if (typeof raw === 'number') return raw;
            if (typeof raw === 'string') {
              let cleaned = raw.replace(/[R$\s]/g, '').trim();
              if (cleaned.includes(',') && cleaned.indexOf(',') > cleaned.lastIndexOf('.')) {
                cleaned = cleaned.replace(/\./g, '').replace(',', '.');
              } else if (cleaned.includes(',') && !cleaned.includes('.')) {
                cleaned = cleaned.replace(',', '.');
              }
              return parseFloat(cleaned) || 0;
            }
            return 0;
          };

          const amountSold = parseAmount(amountSoldRaw);
          const amountPaid = parseAmount(amountPaidRaw);

          // At least one amount should be valid
          if (amountSold <= 0 && amountPaid <= 0) {
            return {
              date: parsedDate,
              department,
              procedure,
              clientName,
              sellerName,
              amountSold: 0,
              amountPaid: 0,
              matchedUserId: null,
              matchedTeamId: null,
              matchedTeamName: null,
              status: 'error' as const,
              errorMessage: 'Valor inválido ou zero',
            };
          }

          // Match seller
          const sellerLower = sellerName.toLowerCase().trim();
          let matchedUserId: string | null = null;
          let matchedTeamId: string | null = null;
          let matchedTeamName: string | null = null;

          if (mappingByName.has(sellerLower)) {
            matchedUserId = mappingByName.get(sellerLower)!;
            const profileData = profileByUserId.get(matchedUserId);
            if (profileData) {
              matchedTeamId = profileData.team_id;
            }
          } else {
            const directMatch = profileByName.get(sellerLower);
            if (directMatch) {
              matchedUserId = directMatch.user_id;
              matchedTeamId = directMatch.team_id;
            } else {
              const firstName = sellerName.split(' ')[0].toLowerCase().trim();
              const firstNameMatch = profileByName.get(firstName);
              if (firstNameMatch) {
                matchedUserId = firstNameMatch.user_id;
                matchedTeamId = firstNameMatch.team_id;
              }
            }
          }

          // Get team name if matched
          if (matchedTeamId) {
            matchedTeamName = teamNamesById.get(matchedTeamId) || null;
          }

          return {
            date: parsedDate,
            department,
            procedure,
            clientName,
            sellerName,
            amountSold,
            amountPaid,
            matchedUserId,
            matchedTeamId,
            matchedTeamName,
            status: matchedUserId ? 'matched' as const : 'unmatched' as const,
          };
        } catch {
          return {
            date: '',
            department: '',
            procedure: '',
            clientName: '',
            sellerName: '',
            amountSold: 0,
            amountPaid: 0,
            matchedUserId: null,
            matchedTeamId: null,
            matchedTeamName: null,
            status: 'error' as const,
            errorMessage: 'Erro ao processar linha',
          };
        }
      });

      setParsedSales(sales);
      setShowColumnMapping(false);
      setMetrics(calculateMetrics(sales));

      const matched = sales.filter(s => s.status === 'matched').length;
      const unmatched = sales.filter(s => s.status === 'unmatched').length;
      const errors = sales.filter(s => s.status === 'error').length;

      toast({
        title: "Processamento concluído",
        description: `${matched} vendas mapeadas, ${unmatched} sem vendedor, ${errors} erros`,
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

  const importSales = async () => {
    const validSales = parsedSales.filter(s => s.status === 'matched' && s.matchedUserId && s.matchedTeamId);
    
    if (validSales.length === 0) {
      toast({
        title: "Nenhuma venda para importar",
        description: "Não há vendas válidas com vendedor mapeado.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    let success = 0;
    let failed = 0;
    let skipped = 0;

    try {
      for (const sale of validSales) {
        // Use amountPaid for the main revenue record (actual payment received)
        const primaryAmount = sale.amountPaid > 0 ? sale.amountPaid : sale.amountSold;
        
        const { data: existing } = await supabase
          .from('revenue_records')
          .select('id')
          .eq('date', sale.date)
          .eq('attributed_to_user_id', sale.matchedUserId)
          .eq('amount', primaryAmount)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        // Build notes with client, procedure and amounts info
        const noteParts: string[] = [];
        if (sale.clientName) noteParts.push(`Cliente: ${sale.clientName}`);
        if (sale.procedure) noteParts.push(`Procedimento: ${sale.procedure}`);
        if (sale.amountSold > 0 && sale.amountPaid > 0 && sale.amountSold !== sale.amountPaid) {
          noteParts.push(`Vendido: ${sale.amountSold.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
        }
        const notes = noteParts.length > 0 ? noteParts.join(' | ') : null;

        const { error } = await supabase.from('revenue_records').insert({
          date: sale.date,
          amount: primaryAmount,
          notes,
          department: sale.department || null,
          user_id: sale.matchedUserId!,
          team_id: sale.matchedTeamId!,
          attributed_to_user_id: sale.matchedUserId,
          counts_for_individual: true,
          registered_by_admin: false,
        });

        if (error) {
          console.error('Error inserting sale:', error);
          failed++;
        } else {
          success++;
        }
      }

      // Update RFV customer data
      await updateRFVCustomers(validSales);

      setImportResults({ success, failed, skipped });
      
      toast({
        title: "Importação concluída",
        description: `${success} vendas importadas, ${skipped} duplicadas ignoradas, ${failed} erros. Dados RFV atualizados.`,
      });
    } catch (error) {
      console.error('Error importing sales:', error);
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro durante a importação.",
        variant: "destructive",
      });
    }

    setIsImporting(false);
  };

  // Function to update RFV customers based on sales data
  const updateRFVCustomers = async (sales: ParsedSale[]) => {
    // Group sales by client name - use amountPaid for RFV (actual value received)
    const clientSales: Record<string, { dates: string[]; amounts: number[] }> = {};

    for (const sale of sales) {
      if (!sale.clientName) continue;
      const key = sale.clientName.toLowerCase().trim();
      if (!clientSales[key]) {
        clientSales[key] = { dates: [], amounts: [] };
      }
      clientSales[key].dates.push(sale.date);
      // Use amountPaid if available, otherwise amountSold
      const amount = sale.amountPaid > 0 ? sale.amountPaid : sale.amountSold;
      clientSales[key].amounts.push(amount);
    }

    const now = new Date();

    for (const [clientName, data] of Object.entries(clientSales)) {
      try {
        // Check if customer exists
        const { data: existing } = await supabase
          .from('rfv_customers')
          .select('*')
          .eq('name', clientName)
          .maybeSingle();

        const sortedDates = data.dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        const latestDate = sortedDates[0];
        const earliestDate = sortedDates[sortedDates.length - 1];
        const totalNewAmount = data.amounts.reduce((sum, a) => sum + a, 0);
        const newPurchaseCount = data.dates.length;

        if (existing) {
          // Update existing customer
          const newLastPurchase = new Date(latestDate) > new Date(existing.last_purchase_date) 
            ? latestDate 
            : existing.last_purchase_date;
          const newFirstPurchase = new Date(earliestDate) < new Date(existing.first_purchase_date)
            ? earliestDate
            : existing.first_purchase_date;
          const newTotalPurchases = existing.total_purchases + newPurchaseCount;
          const newTotalValue = Number(existing.total_value) + totalNewAmount;
          const newAvgTicket = newTotalValue / newTotalPurchases;
          const daysSince = Math.floor((now.getTime() - new Date(newLastPurchase).getTime()) / (1000 * 60 * 60 * 24));

          await supabase
            .from('rfv_customers')
            .update({
              last_purchase_date: newLastPurchase,
              first_purchase_date: newFirstPurchase,
              total_purchases: newTotalPurchases,
              total_value: newTotalValue,
              average_ticket: newAvgTicket,
              days_since_last_purchase: daysSince,
            })
            .eq('id', existing.id);
        } else {
          // Insert new customer
          const daysSince = Math.floor((now.getTime() - new Date(latestDate).getTime()) / (1000 * 60 * 60 * 24));
          const avgTicket = totalNewAmount / newPurchaseCount;

          await supabase
            .from('rfv_customers')
            .insert({
              name: clientName,
              first_purchase_date: earliestDate,
              last_purchase_date: latestDate,
              total_purchases: newPurchaseCount,
              total_value: totalNewAmount,
              average_ticket: avgTicket,
              recency_score: 3, // Will be recalculated
              frequency_score: 1,
              value_score: 1,
              segment: 'potential',
              days_since_last_purchase: daysSince,
              created_by: user?.id,
            });
        }
      } catch (error) {
        console.error('Error updating RFV for customer:', clientName, error);
      }
    }

    // Recalculate all RFV scores after updates
    await recalculateAllRFVScores();
  };

  // Function to recalculate RFV scores for all customers
  const recalculateAllRFVScores = async () => {
    try {
      const { data: allCustomers, error } = await supabase
        .from('rfv_customers')
        .select('*');

      if (error || !allCustomers || allCustomers.length === 0) return;

      const now = new Date();

      // Update days since last purchase for all
      const customersWithDays = allCustomers.map(c => ({
        ...c,
        days_since_last_purchase: Math.floor(
          (now.getTime() - new Date(c.last_purchase_date).getTime()) / (1000 * 60 * 60 * 24)
        ),
      }));

      // Calculate quintiles
      const recencyValues = customersWithDays.map(c => c.days_since_last_purchase).sort((a, b) => a - b);
      const frequencyValues = customersWithDays.map(c => c.total_purchases).sort((a, b) => a - b);
      const valueValues = customersWithDays.map(c => Number(c.total_value)).sort((a, b) => a - b);

      const getQuintile = (value: number, sortedValues: number[], inverse = false): number => {
        const index = sortedValues.findIndex(v => v >= value);
        const percentile = index === -1 ? 1 : (index / sortedValues.length);
        const score = Math.ceil((inverse ? (1 - percentile) : percentile) * 5);
        return Math.max(1, Math.min(5, score || 1));
      };

      const calculateSegment = (r: number, f: number, v: number): string => {
        if (r >= 4 && f >= 4 && v >= 4) return 'champions';
        if (r >= 3 && f >= 3 && v >= 3) return 'loyal';
        if (r >= 4 && f <= 3 && v <= 3) return 'potential';
        if (r <= 2 && f >= 3 && v >= 3) return 'at_risk';
        if (r <= 2 && f <= 2 && v >= 2 && v <= 4) return 'hibernating';
        return 'lost';
      };

      // Update each customer with new scores
      for (const customer of customersWithDays) {
        const recencyScore = getQuintile(customer.days_since_last_purchase, recencyValues, true);
        const frequencyScore = getQuintile(customer.total_purchases, frequencyValues);
        const valueScore = getQuintile(Number(customer.total_value), valueValues);
        const segment = calculateSegment(recencyScore, frequencyScore, valueScore);

        await supabase
          .from('rfv_customers')
          .update({
            days_since_last_purchase: customer.days_since_last_purchase,
            recency_score: recencyScore,
            frequency_score: frequencyScore,
            value_score: valueScore,
            segment: segment,
          })
          .eq('id', customer.id);
      }

      console.log(`RFV scores recalculated for ${allCustomers.length} customers`);
    } catch (error) {
      console.error('Error recalculating RFV scores:', error);
    }
  };

  const addSellerMapping = async (sellerName: string) => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .not('team_id', 'is', null);

    if (!profiles || profiles.length === 0) {
      toast({
        title: "Nenhum usuário disponível",
        description: "Não há usuários cadastrados para mapear.",
        variant: "destructive",
      });
      return;
    }

    const userOptions = profiles.map(p => `${p.full_name}`).join('\n');
    const selectedName = prompt(`Selecione o usuário para mapear "${sellerName}":\n\n${userOptions}\n\nDigite o nome exato:`);
    
    if (!selectedName) return;

    const selectedProfile = profiles.find(p => 
      p.full_name.toLowerCase() === selectedName.toLowerCase()
    );

    if (!selectedProfile) {
      toast({
        title: "Usuário não encontrado",
        description: "O nome digitado não corresponde a nenhum usuário.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from('feegow_user_mapping').insert({
      feegow_name: sellerName,
      user_id: selectedProfile.user_id,
    });

    if (error) {
      toast({
        title: "Erro ao criar mapeamento",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Mapeamento criado",
      description: `"${sellerName}" → "${selectedProfile.full_name}"`,
    });

    processWithMapping();
  };

  const matchedCount = parsedSales.filter(s => s.status === 'matched').length;
  const unmatchedCount = parsedSales.filter(s => s.status === 'unmatched').length;
  const errorCount = parsedSales.filter(s => s.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Upload de Planilha de Vendas
          </CardTitle>
          <CardDescription>
            Faça upload de uma planilha Excel exportada do Feegow com os dados de vendas.
            A planilha deve conter: Data, Departamento, Cliente, Vendedor e Valor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="spreadsheet">Arquivo Excel (.xlsx, .xls)</Label>
              <Input
                id="spreadsheet"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={isProcessing}
                className="mt-1"
              />
            </div>
            {file && (
              <Badge variant="outline" className="h-10 px-4">
                {file.name}
              </Badge>
            )}
          </div>

          {file && sheetNames.length > 1 && showColumnMapping && (
            <div>
              <Label>Aba da planilha</Label>
              <select
                value={selectedSheet}
                onChange={(e) => {
                  const newSheet = e.target.value;
                  setSelectedSheet(newSheet);
                  if (file) parseExcelFile(file, newSheet);
                }}
                className="w-full mt-1 p-2 border rounded-md bg-background"
              >
                {sheetNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Dica: se “Grupo Procedimento”/“Procedimento” não aparecem, normalmente estão em outra aba.
              </p>
            </div>
          )}

          {/* Sheet Preview - 5 rows */}
          {showColumnMapping && rawData.length > 0 && (
            <div className="space-y-2">
              <Label>Prévia da aba "{selectedSheet}" (5 primeiras linhas)</Label>
              <div className="border rounded-md overflow-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {availableColumns.slice(0, 8).map((col) => (
                        <TableHead key={col} className="whitespace-nowrap text-xs">
                          {col}
                        </TableHead>
                      ))}
                      {availableColumns.length > 8 && (
                        <TableHead className="text-xs text-muted-foreground">
                          +{availableColumns.length - 8} colunas
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawData.slice(0, 5).map((row, idx) => (
                      <TableRow key={idx}>
                        {availableColumns.slice(0, 8).map((col) => (
                          <TableCell key={col} className="whitespace-nowrap text-xs py-1.5">
                            {String(row[col] ?? '').slice(0, 30)}
                            {String(row[col] ?? '').length > 30 ? '...' : ''}
                          </TableCell>
                        ))}
                        {availableColumns.length > 8 && (
                          <TableCell className="text-xs text-muted-foreground">...</TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                Verifique se esta aba contém os dados de vendas antes de prosseguir.
              </p>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processando arquivo...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Column Mapping */}
      {showColumnMapping && availableColumns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mapeamento de Colunas</CardTitle>
            <CardDescription>
              Selecione qual coluna da planilha corresponde a cada campo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label>Data da Venda *</Label>
                <select
                  value={columnMapping.date}
                  onChange={(e) => setColumnMapping(m => ({ ...m, date: e.target.value }))}
                  className="w-full mt-1 p-2 border rounded-md bg-background"
                >
                  <option value="">Selecione...</option>
                  {availableColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Nome do Vendedor *</Label>
                <select
                  value={columnMapping.sellerName}
                  onChange={(e) => setColumnMapping(m => ({ ...m, sellerName: e.target.value }))}
                  className="w-full mt-1 p-2 border rounded-md bg-background"
                >
                  <option value="">Selecione...</option>
                  {availableColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Valor Vendido</Label>
                <select
                  value={columnMapping.amountSold}
                  onChange={(e) => setColumnMapping(m => ({ ...m, amountSold: e.target.value }))}
                  className="w-full mt-1 p-2 border rounded-md bg-background"
                >
                  <option value="">Não incluir</option>
                  {availableColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Valor Pago/Recebido *</Label>
                <select
                  value={columnMapping.amountPaid}
                  onChange={(e) => setColumnMapping(m => ({ ...m, amountPaid: e.target.value }))}
                  className="w-full mt-1 p-2 border rounded-md bg-background"
                >
                  <option value="">Selecione...</option>
                  {availableColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Departamento *</Label>
                <select
                  value={columnMapping.department}
                  onChange={(e) => setColumnMapping(m => ({ ...m, department: e.target.value }))}
                  className="w-full mt-1 p-2 border rounded-md bg-background"
                >
                  <option value="">Selecione...</option>
                  {availableColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Nome do Cliente</Label>
                <select
                  value={columnMapping.clientName}
                  onChange={(e) => setColumnMapping(m => ({ ...m, clientName: e.target.value }))}
                  className="w-full mt-1 p-2 border rounded-md bg-background"
                >
                  <option value="">Não incluir</option>
                  {availableColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Procedimento</Label>
                <select
                  value={columnMapping.procedure}
                  onChange={(e) => setColumnMapping(m => ({ ...m, procedure: e.target.value }))}
                  className="w-full mt-1 p-2 border rounded-md bg-background"
                >
                  <option value="">Não incluir</option>
                  {availableColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button onClick={processWithMapping} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Processar Dados
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Metrics Dashboard */}
      {metrics && (
        <div className="space-y-6">
          {/* KPIs - Valor Vendido vs Recebido */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-500/20">
                    <TrendingUp className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground font-medium">💰 Valor Vendido</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {metrics.totalRevenueSold.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Ticket/Venda: {metrics.averageTicketSoldPerSale.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      <span>Ticket/Cliente: {metrics.averageTicketSoldPerClient.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-green-500/20">
                    <DollarSign className="w-6 h-6 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground font-medium">✅ Valor Recebido</p>
                    <p className="text-3xl font-bold text-green-600">
                      {metrics.totalRevenuePaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Ticket/Venda: {metrics.averageTicketPaidPerSale.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      <span>Ticket/Cliente: {metrics.averageTicketPaidPerClient.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary KPIs */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/20">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nº de Vendas</p>
                    <p className="text-2xl font-bold text-foreground">{metrics.totalSales}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-purple-500/20">
                    <Users className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clientes Únicos</p>
                    <p className="text-2xl font-bold text-foreground">{metrics.uniqueClients}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-orange-500/20">
                    <Calendar className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vendedores</p>
                    <p className="text-2xl font-bold text-foreground">{metrics.uniqueSellers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-amber-500/20">
                    <Award className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Média Vendas/Cliente</p>
                    <p className="text-2xl font-bold text-foreground">
                      {metrics.uniqueClients > 0 ? (metrics.totalSales / metrics.uniqueClients).toFixed(1) : '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Pie Chart - Por Departamento */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Faturamento por Departamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(metrics.salesByDepartment).map(([name, data]) => ({
                          name,
                          value: data.revenuePaid,
                          count: data.count,
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(metrics.salesByDepartment).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        labelFormatter={(label) => `Departamento: ${label}`}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Bar Chart - Top Vendedores */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top 10 Vendedores (Faturamento)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries(metrics.salesBySeller)
                        .sort((a, b) => b[1].revenuePaid - a[1].revenuePaid)
                        .slice(0, 10)
                        .map(([name, data]) => ({
                          name: name.split(' ')[0], // First name only for chart
                          fullName: name,
                          revenue: data.revenuePaid,
                          count: data.count,
                        }))}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis 
                        type="number" 
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={80}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tables Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Por Departamento - Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vendas por Departamento</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Departamento</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Vendido</TableHead>
                      <TableHead className="text-right">Recebido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(metrics.salesByDepartment)
                      .sort((a, b) => b[1].revenuePaid - a[1].revenuePaid)
                      .map(([dept, data]) => (
                        <TableRow key={dept}>
                          <TableCell className="font-medium">{dept}</TableCell>
                          <TableCell className="text-right">{data.count}</TableCell>
                          <TableCell className="text-right text-blue-600">
                            {data.revenueSold.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                          <TableCell className="text-right text-green-600 font-medium">
                            {data.revenuePaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Por Vendedor - Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Ranking de Vendedores</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Ordenar por:</span>
                  <select
                    value={sellerSortBy}
                    onChange={(e) => setSellerSortBy(e.target.value as 'revenuePaid' | 'revenueSold' | 'count')}
                    className="text-sm p-1.5 border rounded-md bg-background"
                  >
                    <option value="revenuePaid">Valor Recebido</option>
                    <option value="revenueSold">Valor Vendido</option>
                    <option value="count">Nº de Vendas</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendedor</TableHead>
                        <TableHead className="text-right">Vendas</TableHead>
                        <TableHead className="text-right">Clientes</TableHead>
                        <TableHead className={`text-right ${sellerSortBy === 'revenueSold' ? 'font-bold' : ''}`}>Vendido</TableHead>
                        <TableHead className={`text-right ${sellerSortBy === 'revenuePaid' ? 'font-bold' : ''}`}>Recebido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(metrics.salesBySeller)
                        .sort((a, b) => b[1][sellerSortBy] - a[1][sellerSortBy])
                        .slice(0, 15)
                        .map(([seller, data], index) => (
                          <TableRow key={seller}>
                            <TableCell className="font-medium">
                              <span className="mr-2">
                                {index === 0 && '🥇'}
                                {index === 1 && '🥈'}
                                {index === 2 && '🥉'}
                              </span>
                              {seller}
                            </TableCell>
                            <TableCell className={`text-right ${sellerSortBy === 'count' ? 'font-bold' : ''}`}>{data.count}</TableCell>
                            <TableCell className="text-right">{data.uniqueClients}</TableCell>
                            <TableCell className={`text-right text-blue-600 ${sellerSortBy === 'revenueSold' ? 'font-bold' : ''}`}>
                              {data.revenueSold.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </TableCell>
                            <TableCell className={`text-right text-green-600 ${sellerSortBy === 'revenuePaid' ? 'font-bold' : ''}`}>
                              {data.revenuePaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Clientes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Top 10 Clientes (Maior Faturamento)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Compras</TableHead>
                    <TableHead className="text-right">Vendido</TableHead>
                    <TableHead className="text-right">Recebido</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.topClients.map((client, index) => (
                    <TableRow key={client.name}>
                      <TableCell>
                        <Badge variant={index < 3 ? "default" : "secondary"}>
                          {index + 1}º
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell className="text-right">{client.count}</TableCell>
                      <TableCell className="text-right text-blue-600">
                        {client.revenueSold.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-semibold">
                        {client.revenuePaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell className="text-right">
                        {(client.revenuePaid / client.count).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Summary */}
      {parsedSales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo do Processamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Badge variant="default" className="text-lg py-2 px-4">
                <Check className="w-4 h-4 mr-2" />
                {matchedCount} mapeadas
              </Badge>
              <Badge variant="secondary" className="text-lg py-2 px-4">
                <AlertCircle className="w-4 h-4 mr-2" />
                {unmatchedCount} sem vendedor
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive" className="text-lg py-2 px-4">
                  <X className="w-4 h-4 mr-2" />
                  {errorCount} erros
                </Badge>
              )}
            </div>

            {importResults && (
              <Alert>
                <AlertDescription>
                  Importação finalizada: {importResults.success} inseridas, {importResults.skipped} duplicadas ignoradas, {importResults.failed} falhas.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-4">
              <Button 
                onClick={importSales} 
                disabled={isImporting || matchedCount === 0}
                className="bg-gradient-gold"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Importar {matchedCount} Vendas
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Preview */}
      {parsedSales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Prévia dos Dados</CardTitle>
            <CardDescription>
              Primeiras 50 linhas. Vendas sem vendedor mapeado podem ser corrigidas clicando no botão de adicionar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedSales.slice(0, 50).map((sale, index) => (
                    <TableRow key={index} className={sale.status === 'error' ? 'bg-destructive/10' : ''}>
                      <TableCell>
                        {sale.status === 'matched' && (
                          <Badge variant="default" className="bg-green-600">
                            <Check className="w-3 h-3 mr-1" />
                            OK
                          </Badge>
                        )}
                        {sale.status === 'unmatched' && (
                          <Badge variant="secondary">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Sem vendedor
                          </Badge>
                        )}
                        {sale.status === 'error' && (
                          <Badge variant="destructive">
                            <X className="w-3 h-3 mr-1" />
                            {sale.errorMessage}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{sale.date}</TableCell>
                      <TableCell>{sale.department || '-'}</TableCell>
                      <TableCell>{sale.sellerName}</TableCell>
                      <TableCell>
                        {(sale.amountPaid > 0 ? sale.amountPaid : sale.amountSold).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{sale.clientName}</TableCell>
                      <TableCell>
                        {sale.status === 'unmatched' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addSellerMapping(sale.sellerName)}
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Mapear
                          </Button>
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
    </div>
  );
};

export default SalesSpreadsheetUpload;
