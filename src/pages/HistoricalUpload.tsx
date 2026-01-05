import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileSpreadsheet, History, TrendingUp, Calendar, AlertCircle, Upload, Check, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import HistoricalComparison from "@/components/HistoricalComparison";

interface ParsedHistoricalData {
  date: string;
  month: number;
  year: number;
  sellerName: string;
  department: string;
  amountSold: number;
  amountPaid: number;
  quantity: number;
  clientName: string;
  clientCpf: string;
  clientEmail: string;
  clientProntuario: string;
  procedure: string;
}

const YEARS = [2020, 2021, 2022, 2023, 2024, 2025];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const HistoricalUpload = () => {
  const { user, profile, role, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'vendas' | 'executado'>('vendas');
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedHistoricalData[]>([]);
  const [importSuccess, setImportSuccess] = useState(false);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    date: '',
    sellerName: '',
    department: '',
    amountSold: '',
    amountPaid: '',
    clientName: '',
    clientCpf: '',
    clientEmail: '',
    clientProntuario: '',
    procedure: '',
  });
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParsedData([]);
      setImportSuccess(false);
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
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });

      if (jsonData.length === 0) {
        toast({
          title: "Planilha vazia",
          description: "A planilha não contém dados.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      const columns = Array.from(new Set(jsonData.flatMap((row) => Object.keys(row))));
      setAvailableColumns(columns);
      setRawData(jsonData);

      // Auto-detect columns
      const autoMapping = { ...columnMapping };
      for (const col of columns) {
        const colLower = col.toLowerCase().trim();
        if (colLower.includes('data') || colLower.includes('date')) {
          if (!autoMapping.date) autoMapping.date = col;
        }
        if (colLower.includes('vendedor') || colLower.includes('seller') || colLower.includes('usuario')) {
          if (!autoMapping.sellerName) autoMapping.sellerName = col;
        }
        if (colLower.includes('depart') || colLower.includes('grupo') || colLower.includes('setor')) {
          if (!autoMapping.department) autoMapping.department = col;
        }
        if (colLower.includes('cliente') || colLower.includes('paciente') || colLower.includes('nome conta')) {
          if (!autoMapping.clientName) autoMapping.clientName = col;
        }
        if (colLower === 'procedimento' || colLower.includes('servico') || colLower.includes('serviço')) {
          if (!autoMapping.procedure) autoMapping.procedure = col;
        }
        if (colLower.includes('valor vendido') || colLower === 'vendido') {
          autoMapping.amountSold = col;
        } else if (!autoMapping.amountSold && colLower.includes('valor') && !colLower.includes('pago') && !colLower.includes('recebido')) {
          autoMapping.amountSold = col;
        }
        if (colLower.includes('valor pago') || colLower === 'pago' || colLower.includes('valor recebido') || colLower === 'recebido') {
          autoMapping.amountPaid = col;
        }
        
        // CPF detection
        if (colLower === 'cpf' || colLower.includes('cpf') || colLower.includes('documento')) {
          if (!autoMapping.clientCpf) autoMapping.clientCpf = col;
        }
        
        // Email detection
        if (colLower === 'email' || colLower.includes('e-mail') || colLower.includes('email')) {
          if (!autoMapping.clientEmail) autoMapping.clientEmail = col;
        }
        
        // Prontuário detection
        if (colLower === 'prontuário' || colLower === 'prontuario' || 
            colLower.includes('prontuário') || colLower.includes('prontuario') ||
            colLower === 'id paciente' || colLower.includes('id conta')) {
          if (!autoMapping.clientProntuario) autoMapping.clientProntuario = col;
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
        description: "Não foi possível ler o arquivo Excel.",
        variant: "destructive",
      });
    }
    setIsProcessing(false);
  };

  const parseAmount = (value: any): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const str = String(value).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  const parseDate = (value: any): { date: string; month: number; year: number } | null => {
    if (!value) return null;
    
    // Handle Excel date number
    if (typeof value === 'number') {
      const excelDate = new Date((value - 25569) * 86400 * 1000);
      return {
        date: excelDate.toISOString().split('T')[0],
        month: excelDate.getMonth() + 1,
        year: excelDate.getFullYear(),
      };
    }
    
    // Handle string date
    const str = String(value);
    const parts = str.split(/[\/\-]/);
    if (parts.length === 3) {
      let day, month, year;
      if (parts[2].length === 4) {
        // DD/MM/YYYY
        day = parseInt(parts[0]);
        month = parseInt(parts[1]);
        year = parseInt(parts[2]);
      } else if (parts[0].length === 4) {
        // YYYY-MM-DD
        year = parseInt(parts[0]);
        month = parseInt(parts[1]);
        day = parseInt(parts[2]);
      } else {
        return null;
      }
      
      if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
      
      return {
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        month,
        year,
      };
    }
    
    return null;
  };

  const processData = async () => {
    if (!columnMapping.date || !columnMapping.amountSold) {
      toast({
        title: "Mapeamento incompleto",
        description: "Selecione pelo menos as colunas de Data e Valor Vendido.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    const processed: ParsedHistoricalData[] = [];
    
    for (const row of rawData) {
      const dateInfo = parseDate(row[columnMapping.date]);
      if (!dateInfo) continue;
      
      // Filter by selected year if specified
      if (selectedYear && dateInfo.year !== selectedYear) continue;
      
      processed.push({
        date: dateInfo.date,
        month: dateInfo.month,
        year: dateInfo.year,
        sellerName: columnMapping.sellerName ? String(row[columnMapping.sellerName] || '').trim() : '',
        department: columnMapping.department ? String(row[columnMapping.department] || '').trim() : '',
        amountSold: parseAmount(row[columnMapping.amountSold]),
        amountPaid: columnMapping.amountPaid ? parseAmount(row[columnMapping.amountPaid]) : 0,
        quantity: 1, // Each row is one transaction
        clientName: columnMapping.clientName ? String(row[columnMapping.clientName] || '').trim() : '',
        clientCpf: columnMapping.clientCpf ? String(row[columnMapping.clientCpf] || '').trim() : '',
        clientEmail: columnMapping.clientEmail ? String(row[columnMapping.clientEmail] || '').trim() : '',
        clientProntuario: columnMapping.clientProntuario ? String(row[columnMapping.clientProntuario] || '').trim() : '',
        procedure: columnMapping.procedure ? String(row[columnMapping.procedure] || '').trim() : '',
      });
    }
    
    setParsedData(processed);
    setIsProcessing(false);
    
    toast({
      title: "Dados processados",
      description: `${processed.length} registros de ${selectedYear} prontos para importar.`,
    });
  };

  const importData = async () => {
    if (parsedData.length === 0) {
      toast({
        title: "Sem dados",
        description: "Processe os dados antes de importar.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    
    try {
      // Get user mappings and team info
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, team_id');
      const { data: feegowMappings } = await supabase.from('feegow_user_mapping').select('user_id, feegow_name');
      
      const userMap = new Map<string, { userId: string; teamId: string | null }>();
      
      // Build mapping from feegow names
      feegowMappings?.forEach(m => {
        const profile = profiles?.find(p => p.user_id === m.user_id);
        if (profile) {
          userMap.set(m.feegow_name.toLowerCase().trim(), { userId: m.user_id, teamId: profile.team_id });
        }
      });
      
      // Also map by profile name
      profiles?.forEach(p => {
        const firstName = p.full_name.split(' ')[0].toLowerCase().trim();
        if (!userMap.has(firstName)) {
          userMap.set(firstName, { userId: p.user_id, teamId: p.team_id });
        }
      });
      
      const tableName = uploadType === 'vendas' ? 'revenue_records' : 'executed_records';
      let successCount = 0;
      let errorCount = 0;
      
      // Get default team
      const { data: defaultTeam } = await supabase.from('teams').select('id').limit(1).single();
      const defaultTeamId = defaultTeam?.id;
      
      // Insert in batches
      const batchSize = 100;
      for (let i = 0; i < parsedData.length; i += batchSize) {
        const batch = parsedData.slice(i, i + batchSize);
        
        const records = batch.map(item => {
          const sellerKey = item.sellerName.toLowerCase().trim();
          const sellerFirstName = sellerKey.split(' ')[0];
          const userInfo = userMap.get(sellerKey) || userMap.get(sellerFirstName);
          
          return {
            date: item.date,
            amount: item.amountSold,
            department: item.department || null,
            notes: `Histórico ${item.year} - ${item.procedure || 'N/A'}`,
            user_id: user?.id,
            team_id: userInfo?.teamId || defaultTeamId,
            attributed_to_user_id: userInfo?.userId || null,
            registered_by_admin: true,
            counts_for_individual: true,
          };
        });
        
        const { error } = await supabase.from(tableName).insert(records);
        
        if (error) {
          console.error('Error inserting batch:', error);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
        }
      }
      
      // Log the upload
      await supabase.from('sales_upload_logs').insert({
        uploaded_by: user?.id,
        uploaded_by_name: profile?.full_name || 'Admin',
        file_name: file?.name || 'historical-upload.xlsx',
        upload_type: `historico_${uploadType}`,
        total_rows: parsedData.length,
        imported_rows: successCount,
        error_rows: errorCount,
        skipped_rows: 0,
        total_revenue_sold: parsedData.reduce((sum, r) => sum + r.amountSold, 0),
        total_revenue_paid: parsedData.reduce((sum, r) => sum + r.amountPaid, 0),
        notes: `Upload histórico ${selectedYear}`,
      });
      
      setImportSuccess(true);
      toast({
        title: "✅ Importação Concluída!",
        description: `${successCount} registros importados com sucesso.`,
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro ao importar os dados.",
        variant: "destructive",
      });
    }
    
    setIsImporting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || role !== 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Acesso restrito a administradores.
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <History className="w-4 h-4" />
            <span className="text-sm font-medium">Dados Históricos</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gradient-gold mb-2">
            Upload Histórico
          </h1>
          <p className="text-muted-foreground">
            Importe dados de anos anteriores para análise comparativa
          </p>
        </div>

        <Tabs defaultValue="upload" className="max-w-6xl mx-auto">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="w-4 h-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="comparativo" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Análise Comparativa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            {/* Upload Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  Configuração do Upload
                </CardTitle>
                <CardDescription>
                  Selecione o tipo de dados e o ano para importar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Dados</Label>
                    <Select value={uploadType} onValueChange={(v) => setUploadType(v as 'vendas' | 'executado')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vendas">💰 Vendas (Receita)</SelectItem>
                        <SelectItem value="executado">✅ Executado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Ano dos Dados</Label>
                    <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map(year => (
                          <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Arquivo Excel</Label>
                    <Input 
                      type="file" 
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      disabled={isProcessing}
                    />
                  </div>
                </div>

                {/* Column Mapping */}
                {showColumnMapping && (
                  <div className="space-y-4 p-4 rounded-lg bg-muted/50 border">
                    <h4 className="font-medium">Mapeamento de Colunas</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Data *</Label>
                        <Select value={columnMapping.date} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, date: v }))}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableColumns.map(col => (
                              <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Valor Vendido *</Label>
                        <Select value={columnMapping.amountSold} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, amountSold: v }))}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableColumns.map(col => (
                              <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Valor Pago</Label>
                        <Select value={columnMapping.amountPaid} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, amountPaid: v }))}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Nenhum</SelectItem>
                            {availableColumns.map(col => (
                              <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Vendedor</Label>
                        <Select value={columnMapping.sellerName} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, sellerName: v }))}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Nenhum</SelectItem>
                            {availableColumns.map(col => (
                              <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Departamento</Label>
                        <Select value={columnMapping.department} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, department: v }))}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Nenhum</SelectItem>
                            {availableColumns.map(col => (
                              <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Procedimento</Label>
                        <Select value={columnMapping.procedure} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, procedure: v }))}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Nenhum</SelectItem>
                            {availableColumns.map(col => (
                              <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Cliente</Label>
                        <Select value={columnMapping.clientName} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, clientName: v }))}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Nenhum</SelectItem>
                            {availableColumns.map(col => (
                              <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">CPF do Cliente</Label>
                        <Select value={columnMapping.clientCpf} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, clientCpf: v }))}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Nenhum</SelectItem>
                            {availableColumns.map(col => (
                              <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">E-mail do Cliente</Label>
                        <Select value={columnMapping.clientEmail} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, clientEmail: v }))}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Nenhum</SelectItem>
                            {availableColumns.map(col => (
                              <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs">Prontuário (Feegow)</Label>
                        <Select value={columnMapping.clientProntuario} onValueChange={(v) => setColumnMapping(prev => ({ ...prev, clientProntuario: v }))}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Nenhum</SelectItem>
                            {availableColumns.map(col => (
                              <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      <Button onClick={processData} disabled={isProcessing}>
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>Processar Dados</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Preview */}
                {parsedData.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Preview ({parsedData.length} registros)</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          Total Vendido: R$ {parsedData.reduce((s, r) => s + r.amountSold, 0).toLocaleString('pt-BR')}
                        </Badge>
                        <Badge variant="outline">
                          Total Pago: R$ {parsedData.reduce((s, r) => s + r.amountPaid, 0).toLocaleString('pt-BR')}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Monthly Summary */}
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                      {MONTHS.map((month, idx) => {
                        const monthData = parsedData.filter(r => r.month === idx + 1);
                        const total = monthData.reduce((s, r) => s + r.amountSold, 0);
                        return (
                          <div key={month} className="p-2 rounded-lg bg-muted/50 text-center">
                            <p className="text-xs text-muted-foreground">{month.slice(0, 3)}</p>
                            <p className="font-medium text-sm">
                              {total > 0 ? `R$ ${(total / 1000).toFixed(0)}k` : '-'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{monthData.length} vendas</p>
                          </div>
                        );
                      })}
                    </div>
                    
                    <Button 
                      onClick={importData} 
                      disabled={isImporting || importSuccess}
                      className="w-full"
                      size="lg"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importando...
                        </>
                      ) : importSuccess ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Importação Concluída
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Importar {parsedData.length} Registros de {selectedYear}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">📋 Instruções</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>1. Exporte sua planilha do Feegow ou sistema de vendas com os dados históricos</p>
                <p>2. Selecione o tipo (Vendas ou Executado) e o ano dos dados</p>
                <p>3. Faça upload do arquivo e mapeie as colunas correspondentes</p>
                <p>4. Revise o preview e clique em Importar</p>
                <p className="text-primary font-medium">💡 Os dados serão associados automaticamente às vendedoras pelo nome</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparativo">
            <HistoricalComparison />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <footer className="mt-16 pb-8 text-center">
          <p className="text-muted-foreground text-sm">
            © 2026 Unique CPI • Copa Unique League
          </p>
        </footer>
      </main>
    </div>
  );
};

export default HistoricalUpload;