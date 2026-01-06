import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, FileSpreadsheet, Database, Users, Target, 
  CheckCircle2, AlertCircle, Loader2, RefreshCw, Brain 
} from "lucide-react";

interface ColumnMapping {
  [key: string]: string;
}

interface ImportStats {
  total: number;
  new: number;
  updated: number;
  skipped: number;
  errors: number;
}

const AVAILABLE_FILES = [
  { name: "Planilha Persona", path: "/uploads/PLANILHA_persona.xlsx", type: "persona" },
  { name: "Análise ICP", path: "/uploads/ANALISEESTRATEGICA-ICP_COMPLETA.xlsx", type: "icp" },
  { name: "Vendas Competência 2023-2025", path: "/uploads/VENDAS_COMPETENCIA_2023_2024_2025.xlsx", type: "vendas" },
  { name: "Executado 2023-2025", path: "/uploads/EXECUTADO_2023_2024_2025.xlsx", type: "executado" },
];

// Standard field mappings for each type
const PERSONA_FIELDS = {
  prontuario: "Prontuário",
  name: "Paciente",
  cpf: "CPF do Paciente",
  email: "E-mail",
  phone: "Telefone",
  total_value: "Soma de Valor",
  marital_status: "Qual o seu estado civil?",
  main_objective: "Qual seu objetivo principal ao realizar sua cirurgia/procedimento?",
  why_not_done_yet: "Porque não realizou a cirurgia ainda",
  profession: "Profissão",
  children: "Você tem filhos? Se sim, quantos?",
  city: "Cidade que está morando?",
  state: "Estado?",
  country: "Qual país você está morando?",
  gender: "Gênero",
  instagram: "Instagram",
  birth_date: "Data de Nascimento",
  age: "Idade",
  nationality: "Nacionalidade",
  cep: "CEP",
  address: "Endereço Completo",
  neighborhood: "Bairro",
  origin: "Onde nos conheceu (Origem)",
  referral_name: "Nome da pessoa que indicou",
  influencer: "Qual influencer",
  height: "Altura (cm)",
  weight: "Peso (kg)",
};

const TRANSACTION_FIELDS = {
  date: ["Data", "Data de Venda", "Data Pagamento", "Data Competência"],
  prontuario: ["Prontuário", "Prontuario", "Cod Paciente"],
  patient_name: ["Paciente", "Nome do Paciente", "Cliente"],
  cpf: ["CPF", "CPF do Paciente", "CPF Cliente"],
  email: ["E-mail", "Email", "E-mail do Paciente"],
  phone: ["Telefone", "Telefone/WhatsApp", "Celular"],
  department: ["Departamento", "Grupo de Procedimentos", "Categoria"],
  procedure: ["Procedimento", "Procedimentos", "Nome Procedimento"],
  seller: ["Vendedor", "Responsável", "Consultor"],
  amount: ["Valor", "Valor Vendido", "Valor Total", "Valor Pago"],
  origin: ["Origem", "Como nos conheceu", "Canal"],
  referral_name: ["Indicação", "Indicado por", "Nome Indicação"],
  status: ["Situação", "Status", "Status Pagamento"],
};

export default function ComprehensiveDataImport() {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [fileType, setFileType] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [progress, setProgress] = useState(0);
  const [customFile, setCustomFile] = useState<File | null>(null);

  // Load file from path
  const loadFile = async (filePath: string) => {
    setLoading(true);
    try {
      const response = await fetch(filePath);
      const arrayBuffer = await response.arrayBuffer();
      const wb = XLSX.read(arrayBuffer);
      
      setWorkbook(wb);
      setSheets(wb.SheetNames);
      
      if (wb.SheetNames.length > 0) {
        setSelectedSheet(wb.SheetNames[0]);
        loadSheet(wb, wb.SheetNames[0]);
      }
    } catch (err) {
      console.error("Error loading file:", err);
      toast({ title: "Erro ao carregar arquivo", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Load custom uploaded file
  const handleCustomFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setCustomFile(file);
    setLoading(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer);
      
      setWorkbook(wb);
      setSheets(wb.SheetNames);
      
      if (wb.SheetNames.length > 0) {
        setSelectedSheet(wb.SheetNames[0]);
        loadSheet(wb, wb.SheetNames[0]);
      }
    } catch (err) {
      console.error("Error reading file:", err);
      toast({ title: "Erro ao ler arquivo", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Load sheet data
  const loadSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    const worksheet = wb.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });
    
    if (jsonData.length > 0) {
      const cols = Object.keys(jsonData[0]);
      setColumns(cols);
      setRawData(jsonData);
      autoMapColumns(cols);
    }
  };

  // Auto-map columns based on common names
  const autoMapColumns = (cols: string[]) => {
    const mapping: ColumnMapping = {};
    const lowerCols = cols.map(c => c.toLowerCase().trim());
    
    // Try to auto-map based on file type
    const fieldsToMap = fileType === 'persona' ? PERSONA_FIELDS : TRANSACTION_FIELDS;
    
    Object.entries(fieldsToMap).forEach(([field, possibleNames]) => {
      const names = Array.isArray(possibleNames) ? possibleNames : [possibleNames];
      for (const name of names) {
        const idx = lowerCols.findIndex(c => 
          c.includes(name.toLowerCase()) || name.toLowerCase().includes(c)
        );
        if (idx >= 0 && !mapping[field]) {
          mapping[field] = cols[idx];
          break;
        }
      }
    });
    
    setColumnMapping(mapping);
  };

  // Handle file selection
  useEffect(() => {
    if (selectedFile) {
      const file = AVAILABLE_FILES.find(f => f.path === selectedFile);
      if (file) {
        setFileType(file.type);
        loadFile(selectedFile);
      }
    }
  }, [selectedFile]);

  // Handle sheet change
  useEffect(() => {
    if (workbook && selectedSheet) {
      loadSheet(workbook, selectedSheet);
    }
  }, [selectedSheet, workbook]);

  // Parse value helpers
  const parseAmount = (value: any): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const str = String(value).replace(/[R$\s.]/g, '').replace(',', '.');
    return parseFloat(str) || 0;
  };

  const parseDate = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === 'number') {
      const date = XLSX.SSF.parse_date_code(value);
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
    if (typeof value === 'string') {
      const parts = value.split(/[-\/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) return value.split('T')[0];
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return null;
  };

  const normalizeCpf = (cpf: any): string => {
    if (!cpf) return '';
    return String(cpf).replace(/\D/g, '').padStart(11, '0');
  };

  const parseChildren = (value: string): { has: boolean; count: number } => {
    if (!value) return { has: false, count: 0 };
    const lower = value.toLowerCase();
    if (lower.includes('não') || lower === 'no' || lower === '0') return { has: false, count: 0 };
    const match = value.match(/(\d+)/);
    return { has: true, count: match ? parseInt(match[1]) : 1 };
  };

  // Import persona data
  const importPersonaData = async () => {
    const stats: ImportStats = { total: 0, new: 0, updated: 0, skipped: 0, errors: 0 };
    
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      stats.total++;
      setProgress(Math.round((i / rawData.length) * 100));
      
      try {
        const prontuario = columnMapping.prontuario ? String(row[columnMapping.prontuario] || '').trim() : null;
        const cpf = normalizeCpf(row[columnMapping.cpf]);
        const name = columnMapping.name ? String(row[columnMapping.name] || '').trim() : '';
        
        if (!name && !prontuario && !cpf) {
          stats.skipped++;
          continue;
        }

        const childrenData = parseChildren(row[columnMapping.children] || '');
        
        const patientData = {
          prontuario: prontuario || null,
          cpf: cpf || null,
          name: name,
          email: columnMapping.email ? String(row[columnMapping.email] || '').trim() : null,
          phone: columnMapping.phone ? String(row[columnMapping.phone] || '').trim() : null,
          birth_date: parseDate(row[columnMapping.birth_date]),
          age: row[columnMapping.age] ? parseInt(row[columnMapping.age]) : null,
          gender: columnMapping.gender ? String(row[columnMapping.gender] || '').trim() : null,
          nationality: columnMapping.nationality ? String(row[columnMapping.nationality] || '').trim() : null,
          marital_status: columnMapping.marital_status ? String(row[columnMapping.marital_status] || '').trim() : null,
          profession: columnMapping.profession ? String(row[columnMapping.profession] || '').trim() : null,
          has_children: childrenData.has,
          children_count: childrenData.count,
          country: columnMapping.country ? String(row[columnMapping.country] || '').trim() : null,
          state: columnMapping.state ? String(row[columnMapping.state] || '').trim() : null,
          city: columnMapping.city ? String(row[columnMapping.city] || '').trim() : null,
          neighborhood: columnMapping.neighborhood ? String(row[columnMapping.neighborhood] || '').trim() : null,
          address: columnMapping.address ? String(row[columnMapping.address] || '').trim() : null,
          cep: columnMapping.cep ? String(row[columnMapping.cep] || '').trim() : null,
          height_cm: row[columnMapping.height] ? parseFloat(row[columnMapping.height]) : null,
          weight_kg: row[columnMapping.weight] ? parseFloat(row[columnMapping.weight]) : null,
          origin: columnMapping.origin ? String(row[columnMapping.origin] || '').trim() : null,
          referral_name: columnMapping.referral_name ? String(row[columnMapping.referral_name] || '').trim() : null,
          influencer_name: columnMapping.influencer ? String(row[columnMapping.influencer] || '').trim() : null,
          instagram_handle: columnMapping.instagram ? String(row[columnMapping.instagram] || '').trim() : null,
          main_objective: columnMapping.main_objective ? String(row[columnMapping.main_objective] || '').trim() : null,
          why_not_done_yet: columnMapping.why_not_done_yet ? String(row[columnMapping.why_not_done_yet] || '').trim() : null,
          total_value_sold: parseAmount(row[columnMapping.total_value]),
          data_source: 'persona_spreadsheet',
          created_by: user?.id,
        };

        // Check for existing by prontuario or CPF
        let existingId: string | null = null;
        
        if (prontuario) {
          const { data: existing } = await supabase
            .from('patient_data')
            .select('id')
            .eq('prontuario', prontuario)
            .maybeSingle();
          if (existing) existingId = existing.id;
        }
        
        if (!existingId && cpf) {
          const { data: existing } = await supabase
            .from('patient_data')
            .select('id')
            .eq('cpf', cpf)
            .maybeSingle();
          if (existing) existingId = existing.id;
        }

        if (existingId) {
          // Update existing
          const { error } = await supabase
            .from('patient_data')
            .update(patientData)
            .eq('id', existingId);
          
          if (error) throw error;
          stats.updated++;
        } else {
          // Insert new
          const { error } = await supabase
            .from('patient_data')
            .insert(patientData);
          
          if (error) throw error;
          stats.new++;
        }
      } catch (err) {
        console.error("Error importing row:", err);
        stats.errors++;
      }
    }
    
    return stats;
  };

  // Import transaction data (vendas or executado)
  const importTransactionData = async () => {
    const stats: ImportStats = { total: 0, new: 0, updated: 0, skipped: 0, errors: 0 };
    const tableName = fileType === 'vendas' ? 'revenue_records' : 'executed_records';
    
    // Get user/team mappings
    const [{ data: mappings }, { data: profiles }, { data: teams }] = await Promise.all([
      supabase.from('feegow_user_mapping').select('feegow_name, user_id'),
      supabase.from('profiles').select('user_id, full_name, team_id').not('team_id', 'is', null),
      supabase.from('teams').select('id, name'),
    ]);

    const mappingByName = new Map<string, string>();
    mappings?.forEach(m => mappingByName.set(m.feegow_name.toLowerCase().trim(), m.user_id));

    const profileByName = new Map<string, { user_id: string; team_id: string }>();
    profiles?.forEach(p => {
      const firstName = p.full_name.split(' ')[0].toLowerCase().trim();
      profileByName.set(firstName, { user_id: p.user_id, team_id: p.team_id });
      profileByName.set(p.full_name.toLowerCase().trim(), { user_id: p.user_id, team_id: p.team_id });
    });

    const BATCH_SIZE = 50;
    const recordsToInsert: any[] = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      stats.total++;
      setProgress(Math.round((i / rawData.length) * 100));

      try {
        const sellerName = columnMapping.seller ? String(row[columnMapping.seller] || '').trim() : '';
        const date = parseDate(row[columnMapping.date]);
        const amount = parseAmount(row[columnMapping.amount]);

        if (!date || !sellerName) {
          stats.skipped++;
          continue;
        }

        // Find user
        let matchedUserId = mappingByName.get(sellerName.toLowerCase());
        let matchedTeamId: string | null = null;

        if (!matchedUserId) {
          const firstName = sellerName.split(' ')[0].toLowerCase().trim();
          const profile = profileByName.get(sellerName.toLowerCase()) || profileByName.get(firstName);
          if (profile) {
            matchedUserId = profile.user_id;
            matchedTeamId = profile.team_id;
          }
        }

        if (!matchedUserId) {
          stats.skipped++;
          continue;
        }

        if (!matchedTeamId) {
          const profile = profiles?.find(p => p.user_id === matchedUserId);
          matchedTeamId = profile?.team_id || null;
        }

        if (!matchedTeamId) {
          stats.skipped++;
          continue;
        }

        const record = {
          date,
          amount,
          department: columnMapping.department ? String(row[columnMapping.department] || '').trim() : null,
          procedure_name: columnMapping.procedure ? String(row[columnMapping.procedure] || '').trim() : null,
          patient_prontuario: columnMapping.prontuario ? String(row[columnMapping.prontuario] || '').trim() : null,
          patient_cpf: normalizeCpf(row[columnMapping.cpf]) || null,
          patient_name: columnMapping.patient_name ? String(row[columnMapping.patient_name] || '').trim() : null,
          patient_email: columnMapping.email ? String(row[columnMapping.email] || '').trim() : null,
          patient_phone: columnMapping.phone ? String(row[columnMapping.phone] || '').trim() : null,
          origin: columnMapping.origin ? String(row[columnMapping.origin] || '').trim() : null,
          referral_name: columnMapping.referral_name ? String(row[columnMapping.referral_name] || '').trim() : null,
          user_id: matchedUserId,
          team_id: matchedTeamId,
          attributed_to_user_id: matchedUserId,
          counts_for_individual: true,
          registered_by_admin: false,
        };

        recordsToInsert.push(record);
        stats.new++;
      } catch (err) {
        console.error("Error processing row:", err);
        stats.errors++;
      }
    }

    // Batch insert
    for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
      const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from(tableName).insert(batch);
      if (error) {
        console.error("Batch insert error:", error);
        stats.errors += batch.length;
        stats.new -= batch.length;
      }
    }

    return stats;
  };

  // Main import function
  const handleImport = async () => {
    if (!rawData.length) {
      toast({ title: "Nenhum dado para importar", variant: "destructive" });
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      let stats: ImportStats;

      if (fileType === 'persona') {
        stats = await importPersonaData();
      } else if (fileType === 'vendas' || fileType === 'executado') {
        stats = await importTransactionData();
      } else {
        toast({ title: "Tipo de arquivo não suportado", variant: "destructive" });
        return;
      }

      setImportStats(stats);
      toast({
        title: "Importação concluída!",
        description: `${stats.new} novos, ${stats.updated} atualizados, ${stats.skipped} ignorados, ${stats.errors} erros`,
      });
    } catch (err) {
      console.error("Import error:", err);
      toast({ title: "Erro na importação", variant: "destructive" });
    } finally {
      setImporting(false);
      setProgress(100);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Database className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Importação Completa de Dados</h2>
          <p className="text-sm text-muted-foreground">
            Importe todas as colunas das planilhas com deduplicação por CPF/Prontuário
          </p>
        </div>
      </div>

      <Tabs defaultValue="predefined" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="predefined">Arquivos Salvos</TabsTrigger>
          <TabsTrigger value="upload">Upload Novo</TabsTrigger>
        </TabsList>

        <TabsContent value="predefined" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Selecionar Arquivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedFile} onValueChange={setSelectedFile}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um arquivo..." />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_FILES.map((file) => (
                    <SelectItem key={file.path} value={file.path}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{file.type}</Badge>
                        {file.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {sheets.length > 1 && (
                <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a aba..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sheets.map((sheet) => (
                      <SelectItem key={sheet} value={sheet}>{sheet}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload de Arquivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Dados</Label>
                <Select value={fileType} onValueChange={setFileType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de dados..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="persona">Dados de Persona/Pacientes</SelectItem>
                    <SelectItem value="vendas">Vendas (Competência)</SelectItem>
                    <SelectItem value="executado">Executado</SelectItem>
                    <SelectItem value="icp">Análise ICP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Arquivo Excel</Label>
                <Input type="file" accept=".xlsx,.xls" onChange={handleCustomFile} />
              </div>

              {sheets.length > 1 && (
                <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a aba..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sheets.map((sheet) => (
                      <SelectItem key={sheet} value={sheet}>{sheet}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {loading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Column Mapping */}
      {columns.length > 0 && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Mapeamento de Colunas ({columns.length} colunas detectadas)
            </CardTitle>
            <CardDescription>
              Verifique e ajuste o mapeamento automático das colunas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(fileType === 'persona' ? PERSONA_FIELDS : TRANSACTION_FIELDS).map(([field, label]) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {Array.isArray(label) ? label[0] : label}
                    </Label>
                    <Select
                      value={columnMapping[field] || ""}
                      onValueChange={(val) => setColumnMapping(prev => ({ ...prev, [field]: val }))}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Não mapeado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Não mapeado</SelectItem>
                        {columns.map((col) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Data Preview */}
      {rawData.length > 0 && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Preview ({rawData.length} registros)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    {columns.slice(0, 8).map((col, idx) => (
                      <TableHead key={idx} className="whitespace-nowrap text-xs">{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawData.slice(0, 20).map((row, rowIdx) => (
                    <TableRow key={rowIdx}>
                      <TableCell className="font-medium">{rowIdx + 1}</TableCell>
                      {columns.slice(0, 8).map((col, colIdx) => (
                        <TableCell key={colIdx} className="text-xs max-w-[150px] truncate">
                          {String(row[col] || '').substring(0, 30)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Import Progress */}
      {importing && (
        <Card>
          <CardContent className="py-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Importando dados...</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Stats */}
      {importStats && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="py-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-semibold">Importação Concluída</span>
              </div>
              <Badge variant="outline">{importStats.total} total</Badge>
              <Badge className="bg-green-500">{importStats.new} novos</Badge>
              <Badge className="bg-blue-500">{importStats.updated} atualizados</Badge>
              <Badge variant="secondary">{importStats.skipped} ignorados</Badge>
              {importStats.errors > 0 && (
                <Badge variant="destructive">{importStats.errors} erros</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {rawData.length > 0 && !loading && (
        <div className="flex gap-4">
          <Button
            onClick={handleImport}
            disabled={importing || !fileType}
            className="gap-2"
          >
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Database className="w-4 h-4" />
            )}
            Importar {rawData.length} Registros
          </Button>
          
          <Button
            variant="outline"
            onClick={() => autoMapColumns(columns)}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Remapear Colunas
          </Button>
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Deduplicação Inteligente</p>
              <p className="text-muted-foreground">
                O sistema usa CPF e Prontuário para identificar pacientes duplicados.
                Registros existentes são atualizados, novos são criados automaticamente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
