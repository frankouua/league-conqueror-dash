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

interface ParsedSale {
  date: string;
  department: string;
  clientName: string;
  sellerName: string;
  amount: number;
  matchedUserId: string | null;
  matchedTeamId: string | null;
  status: 'matched' | 'unmatched' | 'error';
  errorMessage?: string;
}

interface ColumnMapping {
  date: string;
  department: string;
  clientName: string;
  sellerName: string;
  amount: string;
}

interface SalesMetrics {
  totalSales: number;
  totalRevenue: number;
  averageTicket: number;
  uniqueClients: number;
  uniqueSellers: number;
  salesByDepartment: Record<string, { count: number; revenue: number }>;
  salesBySeller: Record<string, { count: number; revenue: number }>;
  topClients: { name: string; revenue: number; count: number }[];
  salesByDate: Record<string, { count: number; revenue: number }>;
}

const SalesSpreadsheetUpload = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedSales, setParsedSales] = useState<ParsedSale[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    date: '',
    department: '',
    clientName: '',
    sellerName: '',
    amount: '',
  });
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    skipped: number;
  } | null>(null);
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParsedSales([]);
      setImportResults(null);
      setMetrics(null);
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
        date: '',
        department: '',
        clientName: '',
        sellerName: '',
        amount: '',
      };

      for (const col of columns) {
        const colLower = col.toLowerCase();
        if (colLower.includes('data') || colLower.includes('date')) {
          autoMapping.date = col;
        } else if (colLower.includes('depart') || colLower.includes('setor')) {
          autoMapping.department = col;
        } else if (colLower.includes('cliente') || colLower.includes('paciente') || colLower.includes('patient') || colLower.includes('client')) {
          autoMapping.clientName = col;
        } else if (colLower.includes('vendedor') || colLower.includes('seller') || colLower.includes('usuario') || colLower.includes('user') || colLower.includes('responsavel')) {
          autoMapping.sellerName = col;
        } else if (colLower.includes('valor') || colLower.includes('value') || colLower.includes('amount') || colLower.includes('total')) {
          autoMapping.amount = col;
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

  const calculateMetrics = (sales: ParsedSale[]): SalesMetrics => {
    const validSales = sales.filter(s => s.status !== 'error' && s.amount > 0);
    
    const totalSales = validSales.length;
    const totalRevenue = validSales.reduce((sum, s) => sum + s.amount, 0);
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    const uniqueClients = new Set(validSales.map(s => s.clientName.toLowerCase().trim()).filter(Boolean)).size;
    const uniqueSellers = new Set(validSales.map(s => s.sellerName.toLowerCase().trim()).filter(Boolean)).size;
    
    // Sales by department
    const salesByDepartment: Record<string, { count: number; revenue: number }> = {};
    for (const sale of validSales) {
      const dept = sale.department || 'Não informado';
      if (!salesByDepartment[dept]) {
        salesByDepartment[dept] = { count: 0, revenue: 0 };
      }
      salesByDepartment[dept].count++;
      salesByDepartment[dept].revenue += sale.amount;
    }
    
    // Sales by seller
    const salesBySeller: Record<string, { count: number; revenue: number }> = {};
    for (const sale of validSales) {
      const seller = sale.sellerName || 'Não informado';
      if (!salesBySeller[seller]) {
        salesBySeller[seller] = { count: 0, revenue: 0 };
      }
      salesBySeller[seller].count++;
      salesBySeller[seller].revenue += sale.amount;
    }
    
    // Top clients by revenue
    const clientRevenue: Record<string, { revenue: number; count: number }> = {};
    for (const sale of validSales) {
      if (sale.clientName) {
        const client = sale.clientName.trim();
        if (!clientRevenue[client]) {
          clientRevenue[client] = { revenue: 0, count: 0 };
        }
        clientRevenue[client].revenue += sale.amount;
        clientRevenue[client].count++;
      }
    }
    const topClients = Object.entries(clientRevenue)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    // Sales by date
    const salesByDate: Record<string, { count: number; revenue: number }> = {};
    for (const sale of validSales) {
      if (sale.date) {
        if (!salesByDate[sale.date]) {
          salesByDate[sale.date] = { count: 0, revenue: 0 };
        }
        salesByDate[sale.date].count++;
        salesByDate[sale.date].revenue += sale.amount;
      }
    }
    
    return {
      totalSales,
      totalRevenue,
      averageTicket,
      uniqueClients,
      uniqueSellers,
      salesByDepartment,
      salesBySeller,
      topClients,
      salesByDate,
    };
  };

  const processWithMapping = async () => {
    if (!columnMapping.date || !columnMapping.sellerName || !columnMapping.amount) {
      toast({
        title: "Mapeamento incompleto",
        description: "Configure pelo menos Data, Vendedor e Valor.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const [{ data: mappings }, { data: profiles }] = await Promise.all([
        supabase.from('feegow_user_mapping').select('feegow_name, user_id'),
        supabase.from('profiles').select('user_id, full_name, team_id').not('team_id', 'is', null),
      ]);

      const mappingByName = new Map<string, string>();
      mappings?.forEach(m => {
        mappingByName.set(m.feegow_name.toLowerCase().trim(), m.user_id);
      });

      const profileByUserId = new Map<string, { full_name: string; team_id: string }>();
      const profileByName = new Map<string, { user_id: string; team_id: string }>();
      profiles?.forEach(p => {
        profileByUserId.set(p.user_id, { full_name: p.full_name, team_id: p.team_id });
        const firstName = p.full_name.split(' ')[0].toLowerCase().trim();
        profileByName.set(firstName, { user_id: p.user_id, team_id: p.team_id });
        profileByName.set(p.full_name.toLowerCase().trim(), { user_id: p.user_id, team_id: p.team_id });
      });

      const sales: ParsedSale[] = rawData.map((row) => {
        try {
          const dateValue = row[columnMapping.date];
          const sellerName = String(row[columnMapping.sellerName] || '').trim();
          const amountRaw = row[columnMapping.amount];
          const department = columnMapping.department ? String(row[columnMapping.department] || '') : '';
          const clientName = columnMapping.clientName ? String(row[columnMapping.clientName] || '') : '';

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
              clientName,
              sellerName,
              amount: 0,
              matchedUserId: null,
              matchedTeamId: null,
              status: 'error' as const,
              errorMessage: 'Data inválida',
            };
          }

          // Parse amount
          let amount = 0;
          if (typeof amountRaw === 'number') {
            amount = amountRaw;
          } else if (typeof amountRaw === 'string') {
            const cleaned = amountRaw.replace(/[R$\s.]/g, '').replace(',', '.');
            amount = parseFloat(cleaned) || 0;
          }

          if (amount <= 0) {
            return {
              date: parsedDate,
              department,
              clientName,
              sellerName,
              amount: 0,
              matchedUserId: null,
              matchedTeamId: null,
              status: 'error' as const,
              errorMessage: 'Valor inválido ou zero',
            };
          }

          // Match seller
          const sellerLower = sellerName.toLowerCase().trim();
          let matchedUserId: string | null = null;
          let matchedTeamId: string | null = null;

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

          return {
            date: parsedDate,
            department,
            clientName,
            sellerName,
            amount,
            matchedUserId,
            matchedTeamId,
            status: matchedUserId ? 'matched' as const : 'unmatched' as const,
          };
        } catch {
          return {
            date: '',
            department: '',
            clientName: '',
            sellerName: '',
            amount: 0,
            matchedUserId: null,
            matchedTeamId: null,
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
        const { data: existing } = await supabase
          .from('revenue_records')
          .select('id')
          .eq('date', sale.date)
          .eq('attributed_to_user_id', sale.matchedUserId)
          .eq('amount', sale.amount)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        const { error } = await supabase.from('revenue_records').insert({
          date: sale.date,
          amount: sale.amount,
          notes: sale.clientName ? `Cliente: ${sale.clientName}` : null,
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

      setImportResults({ success, failed, skipped });
      
      toast({
        title: "Importação concluída",
        description: `${success} vendas importadas, ${skipped} duplicadas ignoradas, ${failed} erros`,
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
                <Label>Valor *</Label>
                <select
                  value={columnMapping.amount}
                  onChange={(e) => setColumnMapping(m => ({ ...m, amount: e.target.value }))}
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
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/20">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Faturamento Total</p>
                    <p className="text-2xl font-bold text-foreground">
                      {metrics.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-500/20">
                    <TrendingUp className="w-6 h-6 text-blue-500" />
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
                  <div className="p-3 rounded-xl bg-green-500/20">
                    <Award className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ticket Médio</p>
                    <p className="text-2xl font-bold text-foreground">
                      {metrics.averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
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
          </div>

          {/* Vendas por Departamento e Vendedor */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Por Departamento */}
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
                      <TableHead className="text-right">Faturamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(metrics.salesByDepartment)
                      .sort((a, b) => b[1].revenue - a[1].revenue)
                      .map(([dept, data]) => (
                        <TableRow key={dept}>
                          <TableCell className="font-medium">{dept}</TableCell>
                          <TableCell className="text-right">{data.count}</TableCell>
                          <TableCell className="text-right">
                            {data.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Por Vendedor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ranking de Vendedores</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendedor</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(metrics.salesBySeller)
                      .sort((a, b) => b[1].revenue - a[1].revenue)
                      .slice(0, 10)
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
                          <TableCell className="text-right">{data.count}</TableCell>
                          <TableCell className="text-right">
                            {data.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
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
                    <TableHead className="text-right">Faturamento Total</TableHead>
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
                      <TableCell className="text-right font-semibold">
                        {client.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell className="text-right">
                        {(client.revenue / client.count).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                        {sale.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
