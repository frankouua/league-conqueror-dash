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

    const BATCH_SIZE = 500; // Increased for faster imports
    const recordsToInsert: any[] = [];
    const progressInterval = Math.max(1, Math.floor(rawData.length / 20)); // Update progress ~20 times total

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      stats.total++;
      
      // Update progress less frequently to avoid re-render overhead
      if (i % progressInterval === 0) {
        setProgress(Math.round((i / rawData.length) * 50)); // 0-50% for processing
      }

      try {
        const sellerName = columnMapping.seller
          ? String(row[columnMapping.seller] || "").trim()
          : "";
        const date = parseDate(row[columnMapping.date]);
        const amount = parseAmount(row[columnMapping.amount]);

        // Date is mandatory; seller can be empty in contas a receber exports.
        if (!date) {
          stats.skipped++;
          continue;
        }

        // Find user/team: prefer explicit seller mapping; otherwise fall back to the importing user.
        let matchedUserId = sellerName ? mappingByName.get(sellerName.toLowerCase()) : undefined;
        let matchedTeamId: string | null = null;

        if (!matchedUserId && sellerName) {
          const firstName = sellerName.split(" ")[0].toLowerCase().trim();
          const profile = profileByName.get(sellerName.toLowerCase()) || profileByName.get(firstName);
          if (profile) {
            matchedUserId = profile.user_id;
            matchedTeamId = profile.team_id;
          }
        }

        // Fallback: attribute to the admin/importing user so we don't lose rows.
        if (!matchedUserId && user?.id) {
          matchedUserId = user.id;
          const me = profiles?.find((p) => p.user_id === user.id);
          matchedTeamId = (me?.team_id as string) || null;
        }

        if (!matchedUserId) {
          stats.skipped++;
          continue;
        }

        if (!matchedTeamId) {
          const profile = profiles?.find((p) => p.user_id === matchedUserId);
          matchedTeamId = (profile?.team_id as string) || null;
        }

        if (!matchedTeamId) {
          stats.skipped++;
          continue;
        }

        const registeredByAdmin = !sellerName || matchedUserId === user?.id;

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
          executor_name: columnMapping.executor ? String(row[columnMapping.executor] || '').trim() : null,
          user_id: matchedUserId,
          team_id: matchedTeamId,
          attributed_to_user_id: matchedUserId,
          counts_for_individual: true,
          registered_by_admin: registeredByAdmin,
        };

        recordsToInsert.push(record);
        stats.new++;
      } catch (err) {
        console.error("Error processing row:", err);
        stats.errors++;
      }
    }

    // Batch insert with progress updates
    const totalBatches = Math.ceil(recordsToInsert.length / BATCH_SIZE);
    for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
      const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      setProgress(50 + Math.round((batchNum / totalBatches) * 50)); // 50-100% for inserting
      
      const { error } = await supabase.from(tableName).insert(batch);
      if (error) {
        console.error("Batch insert error:", error);
        stats.errors += batch.length;
        stats.new -= batch.length;
      }
    }

    return stats;
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
    if (!rawData.length) {
      toast({ title: "Nenhum dado para importar", variant: "destructive" });
      return;
    }

    setImporting(true);
    setProgress(0);

    try {
      let stats: ImportStats;

      if (fileType === 'persona' || fileType === 'cadastros' || fileType === 'formulario') {
        stats = await importPersonaData();
      } else if (fileType === 'vendas' || fileType === 'executado') {
        stats = await importTransactionData();
        
        // Auto-calculate RFV after sales/executed imports
        setProgress(95);
        toast({ title: "Atualizando Matriz RFV...", description: "Aguarde..." });
        await autoCalculateRFVAndNotify(fileType);
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
