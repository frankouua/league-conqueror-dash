import { useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, FileSpreadsheet, Users, CheckCircle2, AlertCircle, 
  Loader2, RefreshCw, Phone, Mail, MapPin, User, Hash
} from "lucide-react";

interface ColumnMapping {
  prontuario: string;
  cpf: string;
  name: string;
  email: string;
  phone: string;
  cellphone: string;
  birth_date: string;
  age: string;
  gender: string;
  rg: string;
  marital_status: string;
  profession: string;
  address: string;
  house_number: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  country: string;
  nationality: string;
  origin: string;
  referral_name: string;
  influencer_name: string;
  last_appointment: string;
  has_children: string;
  children_count: string;
  height: string;
  weight: string;
  instagram: string;
  // Form fields - dreams, desires, fears
  main_objective: string;
  why_not_done_yet: string;
  dreams: string;
  desires: string;
  fears: string;
  expectations: string;
  preferred_procedures: string;
}

interface ImportStats {
  total: number;
  new: number;
  updated: number;
  skipped: number;
  errors: number;
  rfvUpdated: number;
}

const PATIENT_FIELDS: Record<keyof ColumnMapping, string[]> = {
  prontuario: ["Prontuário", "Prontuario", "Cod Paciente", "Código", "ID"],
  cpf: ["CPF", "CPF do Paciente", "CPF Cliente", "Cpf"],
  name: ["Nome", "Paciente", "Nome do Paciente", "Cliente", "Nome Completo"],
  email: ["E-mail", "Email", "E-mail do Paciente", "Correio Eletrônico"],
  phone: ["Telefone", "Tel", "Fone", "Telefone Fixo"],
  cellphone: ["Celular", "Telefone/WhatsApp", "WhatsApp", "Cel", "Celular/WhatsApp", "Telefone Celular"],
  birth_date: ["Nascimento", "Data de Nascimento", "Dt Nascimento", "Data Nasc"],
  age: ["Idade", "Idade do Paciente"],
  gender: ["Sexo", "Gênero", "Genero"],
  rg: ["RG", "Identidade", "Documento"],
  marital_status: ["Estado Civil", "Estado civil", "Situação Civil"],
  profession: ["Profissão", "Profissao", "Ocupação"],
  address: ["Endereço", "Endereco", "Logradouro", "Rua"],
  house_number: ["Número", "Numero", "Nº", "Num Casa", "Número da Casa"],
  neighborhood: ["Bairro"],
  city: ["Cidade", "Municipio", "Município", "Cidade que está morando"],
  state: ["Estado", "UF"],
  cep: ["CEP", "Cep", "Código Postal"],
  country: ["País", "Pais", "Qual país você está morando", "País que mora"],
  nationality: ["Nacionalidade", "Natural de"],
  origin: ["Origem", "Como nos conheceu", "Onde nos conheceu", "Canal"],
  referral_name: ["Indicação", "Indicado por", "Quem indicou", "Nome Indicação"],
  influencer_name: ["Influenciador", "Influencer", "Digital Influencer", "Divulgador"],
  last_appointment: ["Último Atendimento", "Ultima Consulta", "Última Consulta", "Data Último Atendimento"],
  has_children: ["Tem filhos", "Você tem filhos", "Filhos"],
  children_count: ["Quantos filhos", "Número de filhos", "Quantidade filhos"],
  height: ["Altura", "Altura (cm)", "Altura cm"],
  weight: ["Peso", "Peso (kg)", "Peso kg"],
  instagram: ["Instagram", "@instagram", "Perfil Instagram", "Insta"],
  // Form fields - dreams, desires, fears
  main_objective: ["Qual seu objetivo principal", "Objetivo principal", "Objetivo", "Qual seu objetivo principal ao realizar sua cirurgia/procedimento"],
  why_not_done_yet: ["Porque não realizou a cirurgia ainda", "Por que ainda não fez", "Motivo de não ter feito"],
  dreams: ["Sonhos", "Quais são seus sonhos", "Seu maior sonho"],
  desires: ["Desejos", "O que deseja", "Seus desejos"],
  fears: ["Medos", "Quais seus medos", "O que te dá medo", "Receios"],
  expectations: ["Expectativas", "O que espera", "Suas expectativas"],
  preferred_procedures: ["Procedimentos de interesse", "Procedimentos desejados", "Quais procedimentos"],
};

export default function PatientDataImport() {
  const { user, profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    prontuario: "",
    cpf: "",
    name: "",
    email: "",
    phone: "",
    cellphone: "",
    birth_date: "",
    age: "",
    gender: "",
    rg: "",
    marital_status: "",
    profession: "",
    address: "",
    house_number: "",
    neighborhood: "",
    city: "",
    state: "",
    cep: "",
    country: "",
    nationality: "",
    origin: "",
    referral_name: "",
    influencer_name: "",
    last_appointment: "",
    has_children: "",
    children_count: "",
    height: "",
    weight: "",
    instagram: "",
    main_objective: "",
    why_not_done_yet: "",
    dreams: "",
    desires: "",
    fears: "",
    expectations: "",
    preferred_procedures: "",
  });
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);
    setImportStats(null);

    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
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

  const loadSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
    
    if (data.length > 0) {
      const cols = Object.keys(data[0]);
      setColumns(cols);
      setRawData(data);
      autoMapColumns(cols);
    }
  };

  const autoMapColumns = (cols: string[]) => {
    const newMapping: ColumnMapping = { ...columnMapping };
    
    for (const [field, possibleNames] of Object.entries(PATIENT_FIELDS)) {
      for (const col of cols) {
        const colLower = col.toLowerCase().trim();
        for (const name of possibleNames) {
          if (colLower.includes(name.toLowerCase())) {
            (newMapping as any)[field] = col;
            break;
          }
        }
        if ((newMapping as any)[field]) break;
      }
    }
    
    setColumnMapping(newMapping);
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbook) {
      loadSheet(workbook, sheetName);
    }
  };

  const normalizeCpf = (cpf: any): string => {
    if (!cpf) return "";
    return String(cpf).replace(/\D/g, "").padStart(11, "0");
  };

  const normalizePhone = (phone: any): string => {
    if (!phone) return "";
    return String(phone).replace(/\D/g, "");
  };

  const parseDate = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === "number") {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
      }
    }
    if (typeof value === "string") {
      if (value.includes("T")) return value.split("T")[0];
      const parts = value.split(/[-\/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) return value;
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }
    return null;
  };

  const getValue = (row: any, field: keyof ColumnMapping): any => {
    const col = columnMapping[field];
    return col ? row[col] : null;
  };

  const handleImport = async () => {
    if (!user || rawData.length === 0) return;

    setImporting(true);
    setProgress(0);

    const stats: ImportStats = { total: 0, new: 0, updated: 0, skipped: 0, errors: 0, rfvUpdated: 0 };

    try {
      const BATCH_SIZE = 50;
      
      for (let i = 0; i < rawData.length; i += BATCH_SIZE) {
        const batch = rawData.slice(i, i + BATCH_SIZE);
        
        for (const row of batch) {
          stats.total++;
          
          try {
            const prontuario = getValue(row, "prontuario")?.toString().trim() || null;
            const cpf = normalizeCpf(getValue(row, "cpf"));
            const name = getValue(row, "name")?.toString().trim() || null;
            
            // Skip rows without identifying info
            if (!prontuario && !cpf && !name) {
              stats.skipped++;
              continue;
            }

            const phone = normalizePhone(getValue(row, "phone"));
            const cellphone = normalizePhone(getValue(row, "cellphone"));
            const primaryPhone = cellphone || phone;

            const patientData: any = {
              prontuario,
              cpf: cpf || null,
              name: name || "Desconhecido",
              email: getValue(row, "email")?.toString().trim() || null,
              phone: primaryPhone || null,
              whatsapp: cellphone || null,
              birth_date: parseDate(getValue(row, "birth_date")),
              age: parseInt(getValue(row, "age")) || null,
              gender: getValue(row, "gender")?.toString().trim() || null,
              marital_status: getValue(row, "marital_status")?.toString().trim() || null,
              profession: getValue(row, "profession")?.toString().trim() || null,
              address: getValue(row, "address")?.toString().trim() || null,
              neighborhood: getValue(row, "neighborhood")?.toString().trim() || null,
              city: getValue(row, "city")?.toString().trim() || null,
              state: getValue(row, "state")?.toString().trim() || null,
              cep: getValue(row, "cep")?.toString().replace(/\D/g, "") || null,
              country: getValue(row, "country")?.toString().trim() || null,
              nationality: getValue(row, "nationality")?.toString().trim() || null,
              origin: getValue(row, "origin")?.toString().trim() || null,
              referral_name: getValue(row, "referral_name")?.toString().trim() || null,
              influencer_name: getValue(row, "influencer_name")?.toString().trim() || null,
              last_contact_date: parseDate(getValue(row, "last_appointment")),
              has_children: getValue(row, "has_children")?.toString().toLowerCase().includes("sim") || null,
              children_count: parseInt(getValue(row, "children_count")) || null,
              height_cm: parseInt(getValue(row, "height")) || null,
              weight_kg: parseInt(getValue(row, "weight")) || null,
              instagram_handle: getValue(row, "instagram")?.toString().trim() || null,
              main_objective: getValue(row, "main_objective")?.toString().trim() || null,
              why_not_done_yet: getValue(row, "why_not_done_yet")?.toString().trim() || null,
              data_source: "patient_import",
              created_by: user.id,
            };

            // Handle house number in address
            const houseNumber = getValue(row, "house_number")?.toString().trim();
            if (houseNumber && patientData.address) {
              patientData.address = `${patientData.address}, ${houseNumber}`;
            }

            // Check for existing patient by prontuario or CPF
            let existingId: string | null = null;
            
            if (prontuario) {
              const { data: existing } = await supabase
                .from("patient_data")
                .select("id")
                .eq("prontuario", prontuario)
                .maybeSingle();
              if (existing) existingId = existing.id;
            }
            
            if (!existingId && cpf) {
              const { data: existing } = await supabase
                .from("patient_data")
                .select("id")
                .eq("cpf", cpf)
                .maybeSingle();
              if (existing) existingId = existing.id;
            }

            if (existingId) {
              // Update existing - only update non-null values
              const updateData: any = {};
              for (const [key, value] of Object.entries(patientData)) {
                if (value !== null && value !== undefined && value !== "") {
                  updateData[key] = value;
                }
              }
              
              const { error } = await supabase
                .from("patient_data")
                .update(updateData)
                .eq("id", existingId);
              
              if (error) throw error;
              stats.updated++;
            } else {
              // Insert new
              const { error } = await supabase
                .from("patient_data")
                .insert(patientData);
              
              if (error) throw error;
              stats.new++;
            }

            // Also update RFV customers with phone/email
            if ((cpf || prontuario) && (patientData.phone || patientData.email)) {
              let rfvQuery = supabase.from("rfv_customers").select("id");
              
              if (cpf) {
                rfvQuery = rfvQuery.eq("cpf", cpf);
              } else if (prontuario) {
                rfvQuery = rfvQuery.eq("prontuario", prontuario);
              }
              
              const { data: rfvCustomer } = await rfvQuery.maybeSingle();
              
              if (rfvCustomer) {
                const rfvUpdate: any = {};
                if (patientData.phone) {
                  rfvUpdate.phone = patientData.phone;
                  rfvUpdate.whatsapp = patientData.phone;
                }
                if (patientData.email) rfvUpdate.email = patientData.email;
                if (prontuario && !rfvCustomer) rfvUpdate.prontuario = prontuario;
                
                const { error: rfvError } = await supabase
                  .from("rfv_customers")
                  .update(rfvUpdate)
                  .eq("id", rfvCustomer.id);
                
                if (!rfvError) stats.rfvUpdated++;
              }
            }

          } catch (err) {
            console.error("Error importing row:", err);
            stats.errors++;
          }
        }
        
        setProgress(Math.round(((i + batch.length) / rawData.length) * 100));
      }

      setImportStats(stats);
      
      toast({
        title: "Importação concluída!",
        description: `${stats.new} novos, ${stats.updated} atualizados, ${stats.rfvUpdated} RFV atualizados`,
      });

    } catch (err) {
      console.error("Import error:", err);
      toast({ title: "Erro na importação", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const mappedFieldsCount = Object.values(columnMapping).filter(Boolean).length;
  const requiredFieldsMapped = !!(columnMapping.name || columnMapping.prontuario || columnMapping.cpf);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Importar Cadastros de Pacientes
        </CardTitle>
        <CardDescription>
          Suba uma planilha com dados de pacientes para completar os cadastros (telefone, email, endereço, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="patient-file">Selecionar Planilha</Label>
              <Input
                id="patient-file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="mt-1"
              />
            </div>
            {file && (
              <Badge variant="secondary" className="mt-6">
                <FileSpreadsheet className="h-3 w-3 mr-1" />
                {file.name}
              </Badge>
            )}
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando arquivo...
            </div>
          )}
        </div>

        {/* Sheet Selection */}
        {sheets.length > 1 && (
          <div>
            <Label>Selecionar Aba</Label>
            <Select value={selectedSheet} onValueChange={handleSheetChange}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sheets.map((sheet) => (
                  <SelectItem key={sheet} value={sheet}>
                    {sheet}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Column Mapping */}
        {columns.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Mapeamento de Colunas</Label>
              <Badge variant={requiredFieldsMapped ? "default" : "destructive"}>
                {mappedFieldsCount} campos mapeados
              </Badge>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Mapeie as colunas da sua planilha. É necessário pelo menos Nome, Prontuário ou CPF.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Identification */}
              <div className="space-y-3 p-3 border rounded-lg">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4" /> Identificação
                </h4>
                {(["prontuario", "cpf", "name", "rg"] as const).map((field) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs capitalize">{field === "cpf" ? "CPF" : field === "rg" ? "RG" : field}</Label>
                    <Select
                      value={columnMapping[field]}
                      onValueChange={(v) => setColumnMapping({ ...columnMapping, [field]: v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecionar coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Não mapear --</SelectItem>
                        {columns.map((col) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Contact */}
              <div className="space-y-3 p-3 border rounded-lg">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4" /> Contato
                </h4>
                {(["email", "phone", "cellphone"] as const).map((field) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs capitalize">{field === "cellphone" ? "Celular/WhatsApp" : field === "phone" ? "Telefone Fixo" : "E-mail"}</Label>
                    <Select
                      value={columnMapping[field]}
                      onValueChange={(v) => setColumnMapping({ ...columnMapping, [field]: v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecionar coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Não mapear --</SelectItem>
                        {columns.map((col) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Personal */}
              <div className="space-y-3 p-3 border rounded-lg">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" /> Dados Pessoais
                </h4>
                {(["birth_date", "age", "gender", "marital_status", "profession"] as const).map((field) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs">
                      {field === "birth_date" ? "Nascimento" : 
                       field === "age" ? "Idade" : 
                       field === "gender" ? "Sexo" : 
                       field === "marital_status" ? "Estado Civil" : "Profissão"}
                    </Label>
                    <Select
                      value={columnMapping[field]}
                      onValueChange={(v) => setColumnMapping({ ...columnMapping, [field]: v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecionar coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Não mapear --</SelectItem>
                        {columns.map((col) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Address */}
              <div className="space-y-3 p-3 border rounded-lg">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4" /> Endereço
                </h4>
                {(["address", "house_number", "neighborhood", "city", "state", "cep", "country", "nationality"] as const).map((field) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs">
                      {field === "address" ? "Endereço" : 
                       field === "house_number" ? "Número" : 
                       field === "neighborhood" ? "Bairro" : 
                       field === "city" ? "Cidade" : 
                       field === "state" ? "Estado" : 
                       field === "cep" ? "CEP" :
                       field === "country" ? "País" : "Nacionalidade"}
                    </Label>
                    <Select
                      value={columnMapping[field]}
                      onValueChange={(v) => setColumnMapping({ ...columnMapping, [field]: v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecionar coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Não mapear --</SelectItem>
                        {columns.map((col) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Origin */}
              <div className="space-y-3 p-3 border rounded-lg">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4" /> Origem / Indicação
                </h4>
                {(["origin", "referral_name", "influencer_name", "last_appointment", "instagram"] as const).map((field) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs">
                      {field === "origin" ? "Origem" : 
                       field === "referral_name" ? "Indicação" : 
                       field === "influencer_name" ? "Influenciador" :
                       field === "instagram" ? "Instagram" : "Último Atendimento"}
                    </Label>
                    <Select
                      value={columnMapping[field]}
                      onValueChange={(v) => setColumnMapping({ ...columnMapping, [field]: v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecionar coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Não mapear --</SelectItem>
                        {columns.map((col) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Additional Info */}
              <div className="space-y-3 p-3 border rounded-lg">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" /> Informações Adicionais
                </h4>
                {(["has_children", "children_count", "height", "weight"] as const).map((field) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs">
                      {field === "has_children" ? "Tem Filhos?" : 
                       field === "children_count" ? "Qtd Filhos" : 
                       field === "height" ? "Altura" : "Peso"}
                    </Label>
                    <Select
                      value={columnMapping[field]}
                      onValueChange={(v) => setColumnMapping({ ...columnMapping, [field]: v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecionar coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Não mapear --</SelectItem>
                        {columns.map((col) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Form Fields - Dreams, Desires, Fears */}
              <div className="space-y-3 p-3 border rounded-lg border-primary/30 bg-primary/5">
                <h4 className="font-medium flex items-center gap-2 text-sm text-primary">
                  💭 Formulário (Sonhos, Desejos, Medos)
                </h4>
                {(["main_objective", "why_not_done_yet", "dreams", "desires", "fears", "expectations", "preferred_procedures"] as const).map((field) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs">
                      {field === "main_objective" ? "Objetivo Principal" : 
                       field === "why_not_done_yet" ? "Por que não fez ainda?" : 
                       field === "dreams" ? "Sonhos" : 
                       field === "desires" ? "Desejos" : 
                       field === "fears" ? "Medos" :
                       field === "expectations" ? "Expectativas" : "Procedimentos Desejados"}
                    </Label>
                    <Select
                      value={columnMapping[field]}
                      onValueChange={(v) => setColumnMapping({ ...columnMapping, [field]: v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecionar coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Não mapear --</SelectItem>
                        {columns.map((col) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Preview */}
        {rawData.length > 0 && (
          <div className="space-y-2">
            <Label>Prévia dos Dados ({rawData.length} linhas)</Label>
            <ScrollArea className="h-[200px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.slice(0, 8).map((col) => (
                      <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawData.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      {columns.slice(0, 8).map((col) => (
                        <TableCell key={col} className="text-xs truncate max-w-[150px]">
                          {row[col]?.toString() || "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {/* Progress */}
        {importing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Importando...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Import Stats */}
        {importStats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{importStats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{importStats.new}</p>
              <p className="text-xs text-muted-foreground">Novos</p>
            </div>
            <div className="text-center p-3 bg-blue-500/10 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{importStats.updated}</p>
              <p className="text-xs text-muted-foreground">Atualizados</p>
            </div>
            <div className="text-center p-3 bg-purple-500/10 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{importStats.rfvUpdated}</p>
              <p className="text-xs text-muted-foreground">RFV Atualizados</p>
            </div>
            <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{importStats.skipped}</p>
              <p className="text-xs text-muted-foreground">Pulados</p>
            </div>
            <div className="text-center p-3 bg-red-500/10 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{importStats.errors}</p>
              <p className="text-xs text-muted-foreground">Erros</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleImport}
            disabled={!requiredFieldsMapped || importing || rawData.length === 0}
            className="gap-2"
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Importar {rawData.length} Cadastros
              </>
            )}
          </Button>

          {importStats && (
            <Button
              variant="outline"
              onClick={() => {
                setFile(null);
                setWorkbook(null);
                setSheets([]);
                setColumns([]);
                setRawData([]);
                setImportStats(null);
                setProgress(0);
              }}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Nova Importação
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
