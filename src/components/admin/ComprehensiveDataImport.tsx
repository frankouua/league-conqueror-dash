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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, FileSpreadsheet, Database, Users, Target, 
  CheckCircle2, AlertCircle, Loader2, RefreshCw, Brain, Zap 
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

interface ImportSummary {
  totalValue: number;
  uniquePatients: number;
  recordsByYear: Record<string, number>;
  valueByYear: Record<string, number>;
  recordsByDepartment: Record<string, { count: number; value: number; inactiveCount?: number; inactiveValue?: number }>;
  inactiveSellerCount?: number;
  inactiveSellerValue?: number;
  skippedReasons?: Record<string, { count: number; value: number }>; // Track skip reasons
}

// Pre-import diagnostics data
interface PreImportDiagnostics {
  totalRows: number;
  bruteTotal: number; // Raw sum from spreadsheet
  parsedTotal: number; // After parseAmount
  zeroValueRows: number; // Rows where brute value exists but parsed to 0
  problemRows: Array<{
    row: number;
    bruteValue: string;
    parsedValue: number;
    date: string;
    patient: string;
    procedure: string;
  }>;
}

interface ImportError {
  row: number;
  reason: string;
  data?: string;
}

const AVAILABLE_FILES = [
  { name: "Planilha Persona", path: "/uploads/PLANILHA_persona.xlsx", type: "persona" },
  { name: "Análise ICP", path: "/uploads/ANALISEESTRATEGICA-ICP_COMPLETA.xlsx", type: "icp" },
  { name: "Vendas Competência 2023-2025", path: "/uploads/VENDAS_COMPETENCIA_2023_2024_2025.xlsx", type: "vendas" },
  { name: "Executado 2023-2025", path: "/uploads/EXECUTADO_2023_2024_2025.xlsx", type: "executado" },
];

const FILE_TYPES = [
  { value: "persona", label: "Dados de Persona/Pacientes" },
  { value: "cadastros", label: "Cadastros de Pacientes (Feegow)" },
  { value: "vendas", label: "Vendas por Competência" },
  { value: "executado", label: "Valores Executados" },
  { value: "formulario", label: "Respostas de Formulário (Sonhos/Desejos/Medos)" },
];

// Standard field mappings for each type
const PERSONA_FIELDS = {
  prontuario: "Prontuário",
  name: "Paciente",
  cpf: "CPF do Paciente",
  email: "E-mail",
  phone: "Telefone",
  cellphone: "Celular",
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
  rg: "RG",
  dreams: "Sonhos",
  desires: "Desejos",
  fears: "Medos",
  expectations: "Expectativas",
};

// IMPORTANT: "Valor" (contracted value) is the priority, not "Valor Pago" (paid value)
const TRANSACTION_FIELDS = {
  date: ["Data", "Data de Venda", "Data Pagamento", "Data Competência", "Data Execução"],
  prontuario: ["Prontuário", "Prontuario", "Cod Paciente"],
  patient_name: ["Paciente", "Nome do Paciente", "Cliente", "Conta"],
  cpf: ["CPF", "CPF do Paciente", "CPF Cliente"],
  email: ["E-mail", "Email", "E-mail do Paciente"],
  phone: ["Telefone", "Telefone Fixo", "Fone"],
  cellphone: ["Celular", "Telefone/WhatsApp", "WhatsApp", "Celular/WhatsApp"],
  department: ["Departamento", "Grupo de Procedimentos", "Categoria", "Grupo de procedimento"],
  procedure: ["Procedimento", "Procedimentos", "Nome Procedimento"],
  seller: ["Vendedor", "Responsável", "Consultor", "Usuário"],
  executor: ["Executante", "Executor", "Profissional", "Médico", "Cirurgião"],
  // Priority: "Valor" first (contracted/total value), NOT "Valor Pago"
  amount: ["Valor", "Valor Total", "Valor Vendido", "Valor Contrato"],
  amount_paid: ["Valor Pago", "Valor Recebido", "Total Pago", "Pago"],
  origin: ["Origem", "Como nos conheceu", "Canal"],
  referral_name: ["Indicação", "Indicado por", "Nome Indicação"],
  status: ["Situação", "Status", "Status Pagamento"],
};

export default function ComprehensiveDataImport() {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [fileType, setFileType] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(""); // Filtro de ano
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]); // Dados filtrados por ano
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [progress, setProgress] = useState(0);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [clearBeforeImport, setClearBeforeImport] = useState(false);
  const [existingFingerprints, setExistingFingerprints] = useState<Set<string>>(new Set());
  const [diagnostics, setDiagnostics] = useState<PreImportDiagnostics | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  // Anos disponíveis para filtro
  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear - 2, currentYear - 1, currentYear].map(String);

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
    
    // CRITICAL: For 'amount' field, we need special handling to prioritize "Valor" over "Valor Pago"
    // First pass: exact or near-exact matches only
    Object.entries(fieldsToMap).forEach(([field, possibleNames]) => {
      const names = Array.isArray(possibleNames) ? possibleNames : [possibleNames];
      
      // For 'amount' field, prioritize columns that are exactly "Valor" (not "Valor Pago")
      if (field === 'amount') {
        // First try exact match for "Valor"
        const exactIdx = lowerCols.findIndex(c => c === 'valor');
        if (exactIdx >= 0) {
          mapping[field] = cols[exactIdx];
          return; // Found exact match, skip further processing
        }
        
        // Then try other matches but EXCLUDE "valor pago" variants
        for (const name of names) {
          const idx = lowerCols.findIndex(c => {
            const isMatch = c.includes(name.toLowerCase()) || name.toLowerCase().includes(c);
            // Exclude "valor pago" variants for the 'amount' field
            const isValorPago = c.includes('pago') || c.includes('recebido');
            return isMatch && !isValorPago;
          });
          if (idx >= 0 && !mapping[field]) {
            mapping[field] = cols[idx];
            break;
          }
        }
        return;
      }
      
      // For 'amount_paid' field, look specifically for "Valor Pago"
      if (field === 'amount_paid') {
        const valorPagoIdx = lowerCols.findIndex(c => 
          c.includes('pago') || c.includes('recebido')
        );
        if (valorPagoIdx >= 0) {
          mapping[field] = cols[valorPagoIdx];
        }
        return;
      }
      
      // Standard matching for other fields
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
    
    console.log('[AUTO-MAP] Column mapping result:', mapping);
    console.log('[AUTO-MAP] Amount column:', mapping.amount);
    console.log('[AUTO-MAP] Amount Paid column:', mapping.amount_paid);
    
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

  // ENHANCED: Robust parseAmount for Brazilian/US formats
  const parseAmount = (value: any): number => {
    // Already a number
    if (typeof value === 'number') return value;
    if (value === null || value === undefined || value === '') return 0;
    
    let str = String(value).trim();
    
    // Remove currency symbols, spaces, NBSP
    str = str.replace(/[R$€\$\s\u00A0]/g, '');
    
    // Empty after cleanup
    if (!str) return 0;
    
    // Detect format by analyzing separators
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    
    let normalized: string;
    
    if (lastComma > lastDot) {
      // Brazilian format: 1.234.567,89 or 1234567,89
      // Comma is decimal separator
      normalized = str.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
      // US format: 1,234,567.89 or 1234567.89
      // Dot is decimal separator
      normalized = str.replace(/,/g, '');
    } else if (lastComma !== -1 && lastDot === -1) {
      // Only comma: could be "1234,89" (Brazilian decimal)
      // Check if comma has 2-3 digits after (likely decimal)
      const afterComma = str.split(',')[1];
      if (afterComma && afterComma.length <= 3) {
        normalized = str.replace(',', '.');
      } else {
        // Thousand separator only
        normalized = str.replace(/,/g, '');
      }
    } else if (lastDot !== -1 && lastComma === -1) {
      // Only dot: could be "1234.89" (US decimal) or "1.234.567" (Brazilian thousands)
      const parts = str.split('.');
      if (parts.length === 2 && parts[1].length <= 3) {
        // Likely decimal
        normalized = str;
      } else if (parts.length > 2) {
        // Multiple dots = thousand separators (Brazilian)
        normalized = str.replace(/\./g, '');
      } else {
        normalized = str;
      }
    } else {
      // No separators
      normalized = str;
    }
    
    // Remove any remaining non-numeric chars except dot and minus
    normalized = normalized.replace(/[^\d.\-]/g, '');
    
    const result = parseFloat(normalized);
    return isNaN(result) ? 0 : result;
  };
  
  // Check if raw value looks like it should have a value (for validation)
  const hasRawValue = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'number' && value !== 0) return true;
    const str = String(value).trim();
    // Check if it has digits
    return /\d/.test(str);
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
  
  // Filtrar dados por ano quando necessário
  useEffect(() => {
    if (!rawData.length) {
      setFilteredData([]);
      return;
    }
    
    // Só aplica filtro de ano para vendas/executado
    if ((fileType === 'vendas' || fileType === 'executado') && selectedYear && selectedYear !== 'todos' && columnMapping.date) {
      const dateColumn = columnMapping.date;
      const filtered = rawData.filter(row => {
        const date = parseDate(row[dateColumn]);
        if (!date) return false;
        return date.startsWith(selectedYear);
      });
      setFilteredData(filtered);
    } else {
      setFilteredData(rawData);
    }
  }, [rawData, selectedYear, fileType, columnMapping.date]);

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

  // Import persona data - OPTIMIZED with batch processing
  const importPersonaData = async () => {
    const stats: ImportStats = { total: 0, new: 0, updated: 0, skipped: 0, errors: 0 };
    
    // Step 1: Pre-fetch all existing records for fast lookup (10% progress)
    setProgress(5);
    toast({ title: "Carregando dados existentes...", description: "Preparando para importação rápida" });
    
    const existingByProntuario = new Map<string, string>();
    const existingByCpf = new Map<string, string>();
    
    // Fetch existing records in batches
    const PAGE_SIZE = 1000;
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data: existing } = await supabase
        .from('patient_data')
        .select('id, prontuario, cpf')
        .range(from, from + PAGE_SIZE - 1);
      
      if (!existing || existing.length === 0) break;
      
      existing.forEach(record => {
        if (record.prontuario) existingByProntuario.set(record.prontuario, record.id);
        if (record.cpf) existingByCpf.set(record.cpf.replace(/\D/g, ''), record.id);
      });
      
      if (existing.length < PAGE_SIZE) break;
    }
    
    setProgress(15);
    console.log(`Loaded ${existingByProntuario.size} existing prontuarios, ${existingByCpf.size} CPFs`);
    
    // Step 2: Process all rows and separate into inserts vs updates
    const toInsert: any[] = [];
    const toUpdate: { id: string; data: any }[] = [];
    
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      stats.total++;
      
      // Update progress every 500 rows
      if (i % 500 === 0) {
        setProgress(15 + Math.round((i / rawData.length) * 35)); // 15-50%
      }
      
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
          email: columnMapping.email ? String(row[columnMapping.email] || '').trim() || null : null,
          phone: columnMapping.phone ? String(row[columnMapping.phone] || '').trim() || null : null,
          whatsapp: columnMapping.cellphone ? String(row[columnMapping.cellphone] || '').trim() || null : null,
          birth_date: parseDate(row[columnMapping.birth_date]),
          age: row[columnMapping.age] ? parseInt(row[columnMapping.age]) : null,
          gender: columnMapping.gender ? String(row[columnMapping.gender] || '').trim() || null : null,
          nationality: columnMapping.nationality ? String(row[columnMapping.nationality] || '').trim() || null : null,
          marital_status: columnMapping.marital_status ? String(row[columnMapping.marital_status] || '').trim() || null : null,
          profession: columnMapping.profession ? String(row[columnMapping.profession] || '').trim() || null : null,
          has_children: childrenData.has,
          children_count: childrenData.count,
          country: columnMapping.country ? String(row[columnMapping.country] || '').trim() || null : null,
          state: columnMapping.state ? String(row[columnMapping.state] || '').trim() || null : null,
          city: columnMapping.city ? String(row[columnMapping.city] || '').trim() || null : null,
          neighborhood: columnMapping.neighborhood ? String(row[columnMapping.neighborhood] || '').trim() || null : null,
          address: columnMapping.address ? String(row[columnMapping.address] || '').trim() || null : null,
          cep: columnMapping.cep ? String(row[columnMapping.cep] || '').trim() || null : null,
          height_cm: row[columnMapping.height] ? parseFloat(row[columnMapping.height]) : null,
          weight_kg: row[columnMapping.weight] ? parseFloat(row[columnMapping.weight]) : null,
          origin: columnMapping.origin ? String(row[columnMapping.origin] || '').trim() || null : null,
          referral_name: columnMapping.referral_name ? String(row[columnMapping.referral_name] || '').trim() || null : null,
          influencer_name: columnMapping.influencer ? String(row[columnMapping.influencer] || '').trim() || null : null,
          instagram_handle: columnMapping.instagram ? String(row[columnMapping.instagram] || '').trim() || null : null,
          main_objective: columnMapping.main_objective ? String(row[columnMapping.main_objective] || '').trim() || null : null,
          why_not_done_yet: columnMapping.why_not_done_yet ? String(row[columnMapping.why_not_done_yet] || '').trim() || null : null,
          dreams: columnMapping.dreams ? String(row[columnMapping.dreams] || '').trim() || null : null,
          desires: columnMapping.desires ? String(row[columnMapping.desires] || '').trim() || null : null,
          fears: columnMapping.fears ? String(row[columnMapping.fears] || '').trim() || null : null,
          expectations: columnMapping.expectations ? String(row[columnMapping.expectations] || '').trim() || null : null,
          total_value_sold: parseAmount(row[columnMapping.total_value]),
          data_source: 'persona_spreadsheet',
          created_by: user?.id,
        };

        // Check for existing record using in-memory maps (instant lookup)
        let existingId: string | null = null;
        if (prontuario) existingId = existingByProntuario.get(prontuario) || null;
        if (!existingId && cpf) existingId = existingByCpf.get(cpf) || null;

        if (existingId) {
          toUpdate.push({ id: existingId, data: patientData });
          stats.updated++;
        } else {
          toInsert.push(patientData);
          stats.new++;
        }
      } catch (err) {
        console.error("Error processing row:", err);
        stats.errors++;
      }
    }
    
    setProgress(50);
    console.log(`Prepared ${toInsert.length} inserts, ${toUpdate.length} updates`);
    
    // Step 3: Batch insert new records
    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(toInsert.length / BATCH_SIZE);
    
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      setProgress(50 + Math.round((batchNum / totalBatches) * 30)); // 50-80%
      
      const { error } = await supabase.from('patient_data').insert(batch);
      if (error) {
        console.error("Batch insert error:", error);
        stats.errors += batch.length;
        stats.new -= batch.length;
      }
    }
    
    // Step 4: Batch update existing records (in parallel batches)
    setProgress(80);
    const UPDATE_BATCH = 50; // Smaller batches for updates
    const updateBatches = Math.ceil(toUpdate.length / UPDATE_BATCH);
    
    for (let i = 0; i < toUpdate.length; i += UPDATE_BATCH) {
      const batch = toUpdate.slice(i, i + UPDATE_BATCH);
      const batchNum = Math.floor(i / UPDATE_BATCH) + 1;
      setProgress(80 + Math.round((batchNum / updateBatches) * 20)); // 80-100%
      
      // Execute updates in parallel within each batch
      await Promise.all(
        batch.map(async ({ id, data }) => {
          const { error } = await supabase.from('patient_data').update(data).eq('id', id);
          if (error) {
            console.error("Update error:", error);
            stats.errors++;
            stats.updated--;
          }
        })
      );
    }
    
    return stats;
  };

  // ENHANCED: Generate fingerprint for deduplication with better normalization
  const generateFingerprint = (date: string, patientName: string, amount: number, procedure: string, department: string): string => {
    // Normalize strings: trim, lowercase, collapse multiple spaces, remove accents
    const normalize = (s: string) => (s || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove accents
    
    // Quantize amount to 2 decimal places
    const normalizedAmount = Math.round(amount * 100) / 100;
    
    return `${date}|${normalize(patientName)}|${normalizedAmount.toFixed(2)}|${normalize(procedure)}|${normalize(department)}`;
  };
  
  // Calculate pre-import diagnostics
  const calculateDiagnostics = () => {
    if (!rawData.length || !columnMapping.amount) {
      setDiagnostics(null);
      return;
    }
    
    const dataToAnalyze = filteredData.length > 0 ? filteredData : rawData;
    const amountCol = columnMapping.amount;
    const amountPaidCol = columnMapping.amount_paid;
    const dateCol = columnMapping.date;
    const patientCol = columnMapping.patient_name;
    const procedureCol = columnMapping.procedure;
    
    let bruteTotal = 0;
    let parsedTotal = 0;
    let zeroValueRows = 0;
    const problemRows: PreImportDiagnostics['problemRows'] = [];
    
    for (let i = 0; i < dataToAnalyze.length; i++) {
      const row = dataToAnalyze[i];
      const bruteValue = row[amountCol];
      let parsed = parseAmount(bruteValue);
      
      // Fallback to amount_paid if main amount is 0 but amount_paid exists
      if (parsed === 0 && amountPaidCol && row[amountPaidCol]) {
        parsed = parseAmount(row[amountPaidCol]);
      }
      
      // Try to calculate brute total (best effort)
      if (typeof bruteValue === 'number') {
        bruteTotal += bruteValue;
      } else if (bruteValue) {
        const bruteParsed = parseAmount(bruteValue);
        bruteTotal += bruteParsed > 0 ? bruteParsed : 0;
      }
      
      parsedTotal += parsed;
      
      // Check for problematic rows: has raw value but parsed to 0
      if (hasRawValue(bruteValue) && parsed === 0) {
        zeroValueRows++;
        if (problemRows.length < 20) {
          problemRows.push({
            row: i + 2, // Excel row number
            bruteValue: String(bruteValue || '').substring(0, 50),
            parsedValue: parsed,
            date: String(row[dateCol] || '').substring(0, 20),
            patient: String(row[patientCol] || '').substring(0, 30),
            procedure: String(row[procedureCol] || '').substring(0, 30),
          });
        }
      }
    }
    
    setDiagnostics({
      totalRows: dataToAnalyze.length,
      bruteTotal,
      parsedTotal,
      zeroValueRows,
      problemRows,
    });
  };
  
  // Recalculate diagnostics when data or mapping changes
  useEffect(() => {
    if ((fileType === 'vendas' || fileType === 'executado') && rawData.length > 0) {
      calculateDiagnostics();
    } else {
      setDiagnostics(null);
    }
  }, [rawData, filteredData, columnMapping.amount, columnMapping.amount_paid, fileType]);

  // Load existing fingerprints for deduplication
  const loadExistingFingerprints = async (tableName: 'revenue_records' | 'executed_records', yearFilter?: string): Promise<Set<string>> => {
    const fingerprints = new Set<string>();
    const PAGE_SIZE = 1000;
    
    for (let from = 0; ; from += PAGE_SIZE) {
      let query = supabase
        .from(tableName)
        .select('date, patient_name, amount, procedure_name, department')
        .range(from, from + PAGE_SIZE - 1);
      
      if (yearFilter && yearFilter !== 'todos') {
        query = query.gte('date', `${yearFilter}-01-01`).lte('date', `${yearFilter}-12-31`);
      }
      
      const { data } = await query;
      if (!data || data.length === 0) break;
      
      data.forEach(record => {
        const fp = generateFingerprint(
          record.date, 
          record.patient_name || '', 
          record.amount, 
          record.procedure_name || '', 
          record.department || ''
        );
        fingerprints.add(fp);
      });
      
      if (data.length < PAGE_SIZE) break;
    }
    
    return fingerprints;
  };

  // Clear records for a specific year
  const clearYearRecords = async (tableName: 'revenue_records' | 'executed_records', year: string) => {
    const { error, count } = await supabase
      .from(tableName)
      .delete({ count: 'exact' })
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`);
    
    if (error) {
      console.error('Error clearing records:', error);
      throw error;
    }
    
    return count || 0;
  };

  // Import transaction data (vendas or executado) - OPTIMIZED VERSION WITH DEDUPLICATION
  const importTransactionData = async (): Promise<{ stats: ImportStats; errors: ImportError[]; summary: ImportSummary }> => {
    const stats: ImportStats = { total: 0, new: 0, updated: 0, skipped: 0, errors: 0 };
    const errors: ImportError[] = [];
    const summary: ImportSummary = {
      totalValue: 0,
      uniquePatients: 0,
      recordsByYear: {},
      valueByYear: {},
      recordsByDepartment: {},
      skippedReasons: {}, // Track why records are being skipped
    };
    const uniquePatientSet = new Set<string>();
    const tableName: 'revenue_records' | 'executed_records' = fileType === 'vendas' ? 'revenue_records' : 'executed_records';
    
    // Step 1: Clear existing records if requested
    if (clearBeforeImport && selectedYear && selectedYear !== 'todos') {
      setProgress(5);
      toast({ title: "Limpando registros existentes...", description: `Removendo dados de ${selectedYear}` });
      const deletedCount = await clearYearRecords(tableName, selectedYear);
      console.log(`Deleted ${deletedCount} existing records for ${selectedYear}`);
    }
    
    // Step 2: Load existing fingerprints for deduplication
    setProgress(10);
    toast({ title: "Verificando duplicatas...", description: "Carregando registros existentes" });
    const existingFps = clearBeforeImport ? new Set<string>() : await loadExistingFingerprints(tableName, selectedYear);
    console.log(`Loaded ${existingFps.size} existing fingerprints`);
    
    // Step 3: Get user/team mappings + default team in SINGLE parallel call
    setProgress(15);
    const [{ data: mappings }, { data: profiles }, { data: teams }, { data: firstTeam }] = await Promise.all([
      supabase.from('feegow_user_mapping').select('feegow_name, user_id'),
      supabase.from('profiles').select('user_id, full_name, team_id').not('team_id', 'is', null),
      supabase.from('teams').select('id, name'),
      supabase.from('teams').select('id').limit(1).single(), // Pre-fetch default team
    ]);

    const defaultTeamId = firstTeam?.id || null;

    const mappingByName = new Map<string, string>();
    mappings?.forEach(m => mappingByName.set(m.feegow_name.toLowerCase().trim(), m.user_id));

    const profileByName = new Map<string, { user_id: string; team_id: string }>();
    profiles?.forEach(p => {
      const firstName = p.full_name.split(' ')[0].toLowerCase().trim();
      profileByName.set(firstName, { user_id: p.user_id, team_id: p.team_id });
      profileByName.set(p.full_name.toLowerCase().trim(), { user_id: p.user_id, team_id: p.team_id });
    });

    const BATCH_SIZE = 500;
    const recordsToInsert: any[] = [];
    const recordRowMap: number[] = [];
    
    const dataToProcess = filteredData.length > 0 ? filteredData : rawData;
    const progressInterval = Math.max(1, Math.floor(dataToProcess.length / 20));

    for (let i = 0; i < dataToProcess.length; i++) {
      const row = dataToProcess[i];
      stats.total++;
      
      if (i % progressInterval === 0) {
        setProgress(Math.round((i / dataToProcess.length) * 50));
      }

      try {
        const sellerName = columnMapping.seller
          ? String(row[columnMapping.seller] || "").trim()
          : "";
        const date = parseDate(row[columnMapping.date]);
        const patientName = columnMapping.patient_name ? String(row[columnMapping.patient_name] || '').trim() : '';
        const department = columnMapping.department ? String(row[columnMapping.department] || '').trim() : 'Sem Departamento';
        const procedure = columnMapping.procedure ? String(row[columnMapping.procedure] || '').trim() : '';
        
        // ENHANCED: Parse amount with fallback to amount_paid
        const rawAmount = row[columnMapping.amount];
        let amount = parseAmount(rawAmount);
        let usedFallback = false;
        
        // If main amount is 0 but we have amount_paid column, try that as fallback
        if (amount === 0 && columnMapping.amount_paid && row[columnMapping.amount_paid]) {
          const fallbackAmount = parseAmount(row[columnMapping.amount_paid]);
          if (fallbackAmount > 0) {
            amount = fallbackAmount;
            usedFallback = true;
          }
        }
        
        // Helper para rastrear motivos de skip com valores
        const trackSkip = (reason: string, skipValue: number = 0) => {
          if (!summary.skippedReasons) summary.skippedReasons = {};
          if (!summary.skippedReasons[reason]) {
            summary.skippedReasons[reason] = { count: 0, value: 0 };
          }
          summary.skippedReasons[reason].count++;
          summary.skippedReasons[reason].value += skipValue;
        };

        if (!date) {
          stats.skipped++;
          trackSkip('Data inválida', amount);
          if (errors.length < 100) {
            errors.push({ 
              row: i + 2,
              reason: 'Data inválida ou não encontrada',
              data: `Data: "${row[columnMapping.date] || 'vazio'}", Paciente: "${patientName}", Valor: R$ ${amount.toLocaleString('pt-BR')}`
            });
          }
          continue;
        }
        
        // VALIDATION: Block rows with raw value but parsed to 0 (parsing error)
        if (hasRawValue(rawAmount) && amount === 0) {
          stats.skipped++;
          trackSkip('Valor não reconhecido (parsing)', 0);
          if (errors.length < 100) {
            errors.push({ 
              row: i + 2,
              reason: `Valor não reconhecido: "${String(rawAmount).substring(0, 30)}"`,
              data: `Data: ${date}, Paciente: "${patientName}", Procedimento: "${procedure}"`
            });
          }
          continue;
        }

        // Check for duplicates using fingerprint
        const fingerprint = generateFingerprint(date, patientName, amount, procedure, department);
        
        if (existingFps.has(fingerprint)) {
          stats.skipped++;
          stats.updated++; // Count as "would be updated" for stats
          trackSkip('Duplicado (já existe)', amount);
          continue;
        }
        
        // Add to existing fingerprints to avoid duplicates within the same import
        existingFps.add(fingerprint);

        let matchedUserId = sellerName ? mappingByName.get(sellerName.toLowerCase()) : undefined;
        let matchedTeamId: string | null = null;
        let isInactiveSeller = false;
        const originalSellerName = sellerName;

        if (!matchedUserId && sellerName) {
          const firstName = sellerName.split(" ")[0].toLowerCase().trim();
          const profile = profileByName.get(sellerName.toLowerCase()) || profileByName.get(firstName);
          if (profile) {
            matchedUserId = profile.user_id;
            matchedTeamId = profile.team_id;
          }
        }

        // Se não encontrou o vendedor, marca como vendedor inativo e usa o admin como fallback
        if (!matchedUserId && user?.id) {
          matchedUserId = user.id;
          const me = profiles?.find((p) => p.user_id === user.id);
          matchedTeamId = (me?.team_id as string) || null;
          
          // Marcar como vendedor inativo apenas se tinha um nome de vendedor
          if (sellerName && sellerName.trim() !== '') {
            isInactiveSeller = true;
          }
        }

        // Se ainda não tem userId, ainda assim tentar importar com o admin
        if (!matchedUserId && user?.id) {
          matchedUserId = user.id;
          isInactiveSeller = true;
        }

        if (!matchedUserId) {
          stats.skipped++;
          trackSkip('Admin não disponível');
          if (errors.length < 100) {
            errors.push({ 
              row: i + 2,
              reason: 'Usuário administrador não disponível',
              data: `Vendedor: "${sellerName}", Paciente: "${patientName}", Valor: R$ ${amount.toLocaleString('pt-BR')}`
            });
          }
          continue;
        }

        if (!matchedTeamId) {
          const profile = profiles?.find((p) => p.user_id === matchedUserId);
          matchedTeamId = (profile?.team_id as string) || null;
        }

        // Se ainda não tem team, usar a equipe padrão pré-carregada (sem query)
        if (!matchedTeamId) {
          matchedTeamId = defaultTeamId;
        }

        // Se mesmo assim não tem team, pular
        if (!matchedTeamId) {
          stats.skipped++;
          trackSkip('Sem equipe disponível');
          if (errors.length < 100) {
            errors.push({ 
              row: i + 2,
              reason: 'Nenhuma equipe disponível no sistema',
              data: `Vendedor: "${sellerName}", Paciente: "${patientName}", Valor: R$ ${amount.toLocaleString('pt-BR')}`
            });
          }
          continue;
        }

        // Track summary stats
        const year = date.substring(0, 4);
        summary.totalValue += amount;
        summary.recordsByYear[year] = (summary.recordsByYear[year] || 0) + 1;
        summary.valueByYear[year] = (summary.valueByYear[year] || 0) + amount;
        
        if (patientName) {
          uniquePatientSet.add(patientName.toLowerCase());
        }
        
        const deptKey = department || 'Sem Departamento';
        if (!summary.recordsByDepartment[deptKey]) {
          summary.recordsByDepartment[deptKey] = { count: 0, value: 0, inactiveCount: 0, inactiveValue: 0 };
        }
        summary.recordsByDepartment[deptKey].count++;
        summary.recordsByDepartment[deptKey].value += amount;
        
        // Track inactive sellers
        if (isInactiveSeller) {
          summary.recordsByDepartment[deptKey].inactiveCount = (summary.recordsByDepartment[deptKey].inactiveCount || 0) + 1;
          summary.recordsByDepartment[deptKey].inactiveValue = (summary.recordsByDepartment[deptKey].inactiveValue || 0) + amount;
          summary.inactiveSellerCount = (summary.inactiveSellerCount || 0) + 1;
          summary.inactiveSellerValue = (summary.inactiveSellerValue || 0) + amount;
        }

        const registeredByAdmin = !sellerName || matchedUserId === user?.id || isInactiveSeller;

        const record = {
          date,
          amount,
          department: department || null,
          procedure_name: columnMapping.procedure ? String(row[columnMapping.procedure] || '').trim() : null,
          patient_prontuario: columnMapping.prontuario ? String(row[columnMapping.prontuario] || '').trim() : null,
          patient_cpf: normalizeCpf(row[columnMapping.cpf]) || null,
          patient_name: patientName || null,
          patient_email: columnMapping.email ? String(row[columnMapping.email] || '').trim() : null,
          patient_phone: columnMapping.phone ? String(row[columnMapping.phone] || '').trim() : null,
          origin: columnMapping.origin ? String(row[columnMapping.origin] || '').trim() : null,
          referral_name: columnMapping.referral_name ? String(row[columnMapping.referral_name] || '').trim() : null,
          executor_name: isInactiveSeller ? `[INATIVO] ${originalSellerName}` : (columnMapping.executor ? String(row[columnMapping.executor] || '').trim() : null),
          user_id: matchedUserId,
          team_id: matchedTeamId,
          attributed_to_user_id: matchedUserId,
          counts_for_individual: !isInactiveSeller, // Vendedor inativo não conta para metas individuais
          registered_by_admin: registeredByAdmin,
          notes: isInactiveSeller ? `Vendedor original: ${originalSellerName} (inativo)` : null,
        };

        recordsToInsert.push(record);
        recordRowMap.push(i + 2);
        stats.new++;
      } catch (err) {
        console.error("Error processing row:", err);
        stats.errors++;
        if (errors.length < 100) {
          errors.push({ 
            row: i + 2,
            reason: `Erro ao processar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
            data: JSON.stringify(row).substring(0, 100)
          });
        }
      }
    }

    summary.uniquePatients = uniquePatientSet.size;

    // Batch insert with progress updates
    const totalBatches = Math.ceil(recordsToInsert.length / BATCH_SIZE);
    for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
      const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
      const batchRowNumbers = recordRowMap.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      setProgress(50 + Math.round((batchNum / totalBatches) * 50));
      
      const { error } = await supabase.from(tableName).insert(batch);
      if (error) {
        console.error("Batch insert error:", error);
        stats.errors += batch.length;
        stats.new -= batch.length;
        if (errors.length < 100) {
          errors.push({ 
            row: batchRowNumbers[0],
            reason: `Erro no banco de dados: ${error.message}`,
            data: `Lote de ${batch.length} registros (linhas ${batchRowNumbers[0]}-${batchRowNumbers[batchRowNumbers.length - 1]})`
          });
        }
      }
    }

    return { stats, errors, summary };
  };

  // Auto-calculate RFV and check for missing data
  const autoCalculateRFVAndNotify = async (importType: string) => {
    try {
      // Calculate RFV
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-rfv`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({}),
        }
      );
      const data = await response.json();
      
      if (data.success) {
        // Check for customers missing data and create notification
        const missingData = data.stats.missingPhone + data.stats.missingEmail;
        
        if (missingData > 100) {
          // Create notification for team about missing data
          await supabase.from('notifications').insert({
            user_id: null, // broadcast to all
            team_id: null,
            title: '⚠️ Clientes sem dados de contato',
            message: `Há ${data.stats.missingPhone} clientes sem telefone e ${data.stats.missingEmail} sem email na matriz RFV. Considere atualizar os cadastros para ações de reativação.`,
            type: 'rfv_data_missing',
          });
        }

        toast({
          title: "RFV atualizado automaticamente!",
          description: `${data.stats.totalCustomers} clientes. ${data.stats.missingPhone} sem telefone, ${data.stats.missingEmail} sem email.`,
        });

        return data.stats;
      }
    } catch (err) {
      console.error("Auto RFV error:", err);
    }
    return null;
  };

  // Try to fetch missing data from Feegow API
  const enrichMissingDataFromFeegow = async () => {
    toast({ title: "Buscando dados no Feegow...", description: "Isso pode levar alguns segundos" });
    
    try {
      // Get customers missing contact data
      const { data: missingContacts } = await supabase
        .from('rfv_customers')
        .select('id, name, phone, email, cpf, prontuario')
        .or('phone.is.null,email.is.null')
        .limit(50); // Process 50 at a time
      
      if (!missingContacts || missingContacts.length === 0) {
        toast({ title: "Todos os clientes já têm dados de contato" });
        return;
      }

      let enriched = 0;
      
      for (const customer of missingContacts) {
        try {
          const response = await supabase.functions.invoke('feegow-patient-search', {
            body: { patientName: customer.name }
          });
          
          if (response.data?.success && response.data.patients?.length > 0) {
            const feegowPatient = response.data.patients[0];
            
            // Update rfv_customers with enriched data
            const updates: any = {};
            if (!customer.phone && feegowPatient.phone) updates.phone = feegowPatient.phone;
            if (!customer.phone && feegowPatient.cellphone) updates.whatsapp = feegowPatient.cellphone;
            if (!customer.email && feegowPatient.email) updates.email = feegowPatient.email;
            if (!customer.cpf && feegowPatient.cpf) updates.cpf = feegowPatient.cpf;
            
            if (Object.keys(updates).length > 0) {
              await supabase.from('rfv_customers').update(updates).eq('id', customer.id);
              
              // Also update patient_data if exists
              if (customer.prontuario) {
                await supabase.from('patient_data').update(updates).eq('prontuario', customer.prontuario);
              }
              
              enriched++;
            }
          }
        } catch (err) {
          // Silent fail for individual lookups
        }
      }

      toast({
        title: "Dados enriquecidos do Feegow",
        description: `${enriched} de ${missingContacts.length} clientes atualizados`,
      });
    } catch (err) {
      console.error("Feegow enrichment error:", err);
      toast({ title: "Erro ao buscar dados do Feegow", variant: "destructive" });
    }
  };

  // Main import function
  const handleImport = async () => {
    const dataToImport = filteredData.length > 0 ? filteredData : rawData;
    if (!dataToImport.length) {
      toast({ title: "Nenhum dado para importar", variant: "destructive" });
      return;
    }

    setImporting(true);
    setProgress(0);
    setImportErrors([]);
    setImportSummary(null);
    setShowErrors(false);

    try {
      let stats: ImportStats;
      let errors: ImportError[] = [];

      if (fileType === 'persona' || fileType === 'cadastros' || fileType === 'formulario') {
        stats = await importPersonaData();
      } else if (fileType === 'vendas' || fileType === 'executado') {
        const result = await importTransactionData();
        stats = result.stats;
        errors = result.errors;
        setImportSummary(result.summary);
        
        // Auto-calculate RFV after sales/executed imports
        setProgress(95);
        toast({ title: "Atualizando Matriz RFV...", description: "Aguarde..." });
        await autoCalculateRFVAndNotify(fileType);
      } else {
        toast({ title: "Tipo de arquivo não suportado", variant: "destructive" });
        return;
      }

      setImportStats(stats);
      setImportErrors(errors);
      
      if (errors.length > 0) {
        setShowErrors(true);
      }
      
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
      {/* Alert about data */}
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-600">Atenção: Reimportação Necessária</p>
              <p className="text-muted-foreground mt-1">
                Para ter dados completos de <strong>procedimento</strong>, <strong>origem</strong> e <strong>indicação</strong>, 
                você precisa reimportar as planilhas de Executado e Competência usando este importador.
                Os dados antigos não possuem esses campos detalhados.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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

              {/* Filtro de Ano para Vendas/Executado */}
              {(fileType === 'vendas' || fileType === 'executado') && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Filtrar por Ano</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o ano..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os anos</SelectItem>
                        {availableYears.map((year) => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedYear && selectedYear !== 'todos' && (
                    <div className="flex items-center space-x-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <Checkbox 
                        id="clearBeforeImport" 
                        checked={clearBeforeImport}
                        onCheckedChange={(checked) => setClearBeforeImport(checked === true)}
                      />
                      <div className="flex-1">
                        <Label htmlFor="clearBeforeImport" className="text-sm font-medium cursor-pointer">
                          Limpar dados de {selectedYear} antes de importar
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Remove todos os registros existentes de {selectedYear} antes da importação. Use para reimportação completa.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                      value={columnMapping[field] || "__none__"}
                      onValueChange={(val) => setColumnMapping(prev => ({ ...prev, [field]: val === "__none__" ? "" : val }))}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Não mapeado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Não mapeado</SelectItem>
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

      {/* Pre-Import Diagnostics Panel */}
      {diagnostics && (fileType === 'vendas' || fileType === 'executado') && !loading && (
        <Card className={diagnostics.zeroValueRows > 0 ? "border-red-500/50 bg-red-500/5" : "border-green-500/50 bg-green-500/5"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {diagnostics.zeroValueRows > 0 ? (
                <AlertCircle className="w-5 h-5 text-red-500" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
              Diagnóstico Pré-Importação
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDiagnostics(!showDiagnostics)}
              >
                {showDiagnostics ? 'Ocultar' : 'Detalhes'}
              </Button>
            </CardTitle>
            <CardDescription>
              Verifique esses valores ANTES de importar para garantir que a planilha será processada corretamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-background rounded-lg p-4 border">
                <div className="text-sm text-muted-foreground">Total de Linhas</div>
                <div className="text-2xl font-bold">{diagnostics.totalRows.toLocaleString('pt-BR')}</div>
              </div>
              <div className="bg-background rounded-lg p-4 border">
                <div className="text-sm text-muted-foreground">Total Parseado</div>
                <div className="text-2xl font-bold text-primary">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(diagnostics.parsedTotal)}
                </div>
              </div>
              <div className={`rounded-lg p-4 border ${diagnostics.zeroValueRows > 0 ? 'bg-red-500/10 border-red-500/50' : 'bg-background'}`}>
                <div className="text-sm text-muted-foreground">Linhas com Valor → Zero</div>
                <div className={`text-2xl font-bold ${diagnostics.zeroValueRows > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {diagnostics.zeroValueRows}
                </div>
              </div>
              <div className="bg-background rounded-lg p-4 border">
                <div className="text-sm text-muted-foreground">Coluna de Valor</div>
                <div className="text-sm font-medium truncate" title={columnMapping.amount}>
                  {columnMapping.amount || 'Não mapeada'}
                </div>
                {columnMapping.amount_paid && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Fallback: {columnMapping.amount_paid}
                  </div>
                )}
              </div>
            </div>
            
            {diagnostics.zeroValueRows > 0 && (
              <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/50">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-red-600">
                      ⚠️ {diagnostics.zeroValueRows} linhas têm valor na planilha mas serão importadas com R$ 0,00
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Isso pode indicar que a coluna de valor está mapeada incorretamente ou que o formato do número não é reconhecido.
                      {columnMapping.amount_paid && ' O sistema tentará usar "Valor Pago" como fallback.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {showDiagnostics && diagnostics.problemRows.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2 text-red-600">Amostras de Linhas Problemáticas (primeiras {diagnostics.problemRows.length})</h4>
                <ScrollArea className="h-[200px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Linha</TableHead>
                        <TableHead>Valor Bruto</TableHead>
                        <TableHead>Parseado</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Procedimento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {diagnostics.problemRows.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono font-bold">{row.row}</TableCell>
                          <TableCell className="font-mono text-red-600 text-xs">{row.bruteValue}</TableCell>
                          <TableCell className="font-mono text-red-600">R$ {row.parsedValue.toFixed(2)}</TableCell>
                          <TableCell className="text-xs">{row.date}</TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">{row.patient}</TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">{row.procedure}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}
            
            {diagnostics.zeroValueRows === 0 && (
              <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/50">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-medium">✓ Todos os valores foram parseados corretamente!</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Data Preview */}
      {rawData.length > 0 && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Preview ({filteredData.length > 0 ? filteredData.length : rawData.length} registros)
              {selectedYear && selectedYear !== 'todos' && filteredData.length !== rawData.length && (
                <Badge variant="secondary" className="ml-2">
                  Filtrado: {selectedYear} ({filteredData.length} de {rawData.length})
                </Badge>
              )}
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
                  {(filteredData.length > 0 ? filteredData : rawData).slice(0, 20).map((row, rowIdx) => (
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
              {importErrors.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowErrors(!showErrors)}
                  className="ml-auto"
                >
                  {showErrors ? 'Ocultar' : 'Ver'} Detalhes ({importErrors.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Details Panel */}
      {showErrors && importErrors.length > 0 && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Detalhes dos Erros/Ignorados (primeiros {importErrors.length})
            </CardTitle>
            <CardDescription>
              Esses registros não foram importados. Verifique e corrija na planilha original.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Linha</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Dados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importErrors.map((err, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono font-bold">{err.row}</TableCell>
                      <TableCell className="text-red-600">{err.reason}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                        {err.data}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Import Summary - Values Verification */}
      {importSummary && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Resumo da Importação - Verifique os Totais
            </CardTitle>
            <CardDescription>
              Compare esses valores com sua planilha para confirmar que a importação está correta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Totals */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-background rounded-lg p-4 border">
                <div className="text-sm text-muted-foreground">Valor Total Importado</div>
                <div className="text-2xl font-bold text-primary">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(importSummary.totalValue)}
                </div>
              </div>
              <div className="bg-background rounded-lg p-4 border">
                <div className="text-sm text-muted-foreground">Pacientes Únicos</div>
                <div className="text-2xl font-bold">{importSummary.uniquePatients.toLocaleString('pt-BR')}</div>
              </div>
              <div className="bg-background rounded-lg p-4 border">
                <div className="text-sm text-muted-foreground">Registros por Ano</div>
                <div className="text-lg font-medium">
                  {Object.entries(importSummary.recordsByYear).map(([year, count]) => (
                    <div key={year} className="flex justify-between">
                      <span>{year}:</span>
                      <span className="font-bold">{count.toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
              </div>
              {(importSummary.inactiveSellerCount ?? 0) > 0 && (
                <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/50">
                  <div className="text-sm text-amber-600 dark:text-amber-400">Vendedores Inativos</div>
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {(importSummary.inactiveSellerCount ?? 0).toLocaleString('pt-BR')} registros
                  </div>
                  <div className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(importSummary.inactiveSellerValue ?? 0)}
                  </div>
                </div>
              )}
            </div>

            {/* Value by Year */}
            <div>
              <h4 className="font-semibold mb-2">Valor por Ano</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {Object.entries(importSummary.valueByYear)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([year, value]) => (
                    <div key={year} className="flex justify-between items-center bg-background rounded p-3 border">
                      <span className="font-medium">{year}</span>
                      <span className="font-bold text-primary">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* By Department */}
            <div>
              <h4 className="font-semibold mb-2">Por Departamento</h4>
              <ScrollArea className="h-[200px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Departamento</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-right text-amber-600">Inativos</TableHead>
                      <TableHead className="text-right text-amber-600">Valor Inativos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(importSummary.recordsByDepartment)
                      .sort(([, a], [, b]) => b.value - a.value)
                      .map(([dept, data]) => (
                        <TableRow key={dept}>
                          <TableCell className="font-medium">{dept}</TableCell>
                          <TableCell className="text-right">{data.count.toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-right font-bold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}
                          </TableCell>
                          <TableCell className="text-right text-amber-600">
                            {(data.inactiveCount ?? 0) > 0 ? (data.inactiveCount ?? 0).toLocaleString('pt-BR') : '-'}
                          </TableCell>
                          <TableCell className="text-right text-amber-600">
                            {(data.inactiveValue ?? 0) > 0 
                              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.inactiveValue ?? 0) 
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            {/* Skipped Records Analysis - NEW */}
            {importSummary.skippedReasons && Object.keys(importSummary.skippedReasons).length > 0 && (
              <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/50">
                <h4 className="font-semibold mb-2 text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Registros NÃO Importados (Valores Perdidos)
                </h4>
                <div className="text-sm text-muted-foreground mb-3">
                  Esses valores estão na planilha mas NÃO foram importados:
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Valor Perdido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(importSummary.skippedReasons)
                      .sort(([, a], [, b]) => b.value - a.value)
                      .map(([reason, data]) => (
                        <TableRow key={reason}>
                          <TableCell className="font-medium text-red-600">{reason}</TableCell>
                          <TableCell className="text-right">{data.count.toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-right font-bold text-red-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}
                          </TableCell>
                        </TableRow>
                      ))}
                    <TableRow className="bg-red-500/20">
                      <TableCell className="font-bold">TOTAL NÃO IMPORTADO</TableCell>
                      <TableCell className="text-right font-bold">
                        {Object.values(importSummary.skippedReasons).reduce((acc, d) => acc + d.count, 0).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          Object.values(importSummary.skippedReasons).reduce((acc, d) => acc + d.value, 0)
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <div className="mt-3 text-sm bg-background rounded p-2 border">
                  <strong>Valor Total da Planilha (estimado):</strong>{' '}
                  <span className="font-bold text-lg">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      importSummary.totalValue + Object.values(importSummary.skippedReasons).reduce((acc, d) => acc + d.value, 0)
                    )}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {rawData.length > 0 && !loading && (
        <div className="flex gap-4 flex-wrap">
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
            Importar {filteredData.length > 0 ? filteredData.length : rawData.length} Registros
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

      {/* RFV Calculation and Feegow Enrichment Buttons */}
      {importStats && (fileType === 'vendas' || fileType === 'executado') && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Matriz RFV já foi calculada automaticamente</p>
                  <p className="text-muted-foreground">
                    A matriz RFV é atualizada após cada importação de vendas/executado
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={enrichMissingDataFromFeegow}
                  disabled={importing}
                  className="gap-2"
                >
                  <Users className="w-4 h-4" />
                  Buscar Dados Feegow
                </Button>
                <Button
                  onClick={async () => {
                    setImporting(true);
                    try {
                      const response = await fetch(
                        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-rfv`,
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                          },
                          body: JSON.stringify({}),
                        }
                      );
                      const data = await response.json();
                      if (data.success) {
                        toast({
                          title: "Matriz RFV recalculada!",
                          description: `${data.stats.totalCustomers} clientes processados. ${data.stats.missingEmail} sem email, ${data.stats.missingPhone} sem telefone.`,
                        });
                      } else {
                        throw new Error(data.error);
                      }
                    } catch (err) {
                      console.error("RFV error:", err);
                      toast({ title: "Erro ao calcular RFV", variant: "destructive" });
                    } finally {
                      setImporting(false);
                    }
                  }}
                  disabled={importing}
                  className="gap-2"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Recalcular RFV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Missing Data Alert */}
      {importStats && importStats.new > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-600">Clientes sem dados completos</p>
                <p className="text-muted-foreground mt-1">
                  Clientes sem CPF, telefone ou email não podem receber ações de reativação.
                  Use o botão "Buscar Dados Feegow" para tentar enriquecer automaticamente ou 
                  notifique a equipe para atualizar manualmente.
                </p>
                <Button
                  variant="link"
                  className="p-0 h-auto text-amber-600"
                  onClick={async () => {
                    await supabase.from('notifications').insert({
                      user_id: null,
                      team_id: null,
                      title: '📋 Ação Necessária: Atualizar Cadastros',
                      message: 'Existem clientes na base sem dados de contato completos. Por favor, verifiquem e atualizem os cadastros para possibilitar ações de reativação.',
                      type: 'data_update_required',
                    });
                    toast({ title: "Notificação enviada para a equipe!" });
                  }}
                >
                  Notificar equipe para atualizar cadastros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-primary mt-0.5" />
            <div className="text-sm space-y-2">
              <p className="font-medium">Importação Inteligente</p>
              <ul className="text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>Deduplicação:</strong> Usa fingerprint (data + paciente + valor + procedimento + departamento) para evitar duplicatas</li>
                <li><strong>Parsing Robusto:</strong> Reconhece formatos brasileiros (R$ 1.234,56) e americanos (1,234.56)</li>
                <li><strong>Fallback de Valor:</strong> Se "Valor" estiver vazio, usa "Valor Pago" automaticamente</li>
                <li><strong>Validação:</strong> Bloqueia linhas onde o valor não foi reconhecido corretamente</li>
                <li><strong>Diagnóstico:</strong> Mostra prévia dos totais ANTES de importar para você validar</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

