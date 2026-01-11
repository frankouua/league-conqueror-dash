import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Upload, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Database,
  RotateCcw,
  Shield,
  Loader2,
  Clock,
  Trash2
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ParsedRow {
  date: string;
  client_name: string;
  procedure_name?: string;
  department?: string;
  value_sold?: number;
  value_received?: number;
  seller_name?: string;
  professional_name?: string;
  phone?: string;
  email?: string;
  origin?: string;
  referred_by?: string;
  status?: string;
  notes?: string;
}

interface ValidationResult {
  totalRows: number;
  validRows: number[];
  errors: { row: number; field: string; message: string }[];
  warnings: { row: number; message: string }[];
  duplicates: { row: number; key: string }[];
  summary: {
    valid: number;
    invalid: number;
    duplicates: number;
  };
}

interface ImportLog {
  id: string;
  import_id: string;
  backup_id: string;
  file_type: string;
  total_rows: number;
  imported_rows: number;
  duplicate_rows: number;
  error_rows: number;
  status: string;
  duration_seconds: number;
  rfv_recalculated: boolean;
  created_at: string;
}

interface Backup {
  id: string;
  backup_name: string;
  backup_date: string;
  backup_type: string;
  revenue_records_count: number;
  executed_records_count: number;
  status: string;
  expires_at: string;
}

const HistoricalDataImport = () => {
  const [vendasData, setVendasData] = useState<ParsedRow[]>([]);
  const [executadoData, setExecutadoData] = useState<ParsedRow[]>([]);
  const [vendasFile, setVendasFile] = useState<string | null>(null);
  const [executadoFile, setExecutadoFile] = useState<string | null>(null);
  const [validation, setValidation] = useState<{ vendas?: ValidationResult; executado?: ValidationResult } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStep, setImportStep] = useState("");
  const [confirmBackup, setConfirmBackup] = useState(false);
  const [clearOldData, setClearOldData] = useState(false);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Load history on mount
  useState(() => {
    loadHistory();
  });

  const loadHistory = async () => {
    const [logsResult, backupsResult] = await Promise.all([
      supabase
        .from("data_import_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("data_import_backups")
        .select("*")
        .neq("status", "expired")
        .order("created_at", { ascending: false })
        .limit(10)
    ]);

    if (logsResult.data) setImportLogs(logsResult.data);
    if (backupsResult.data) setBackups(backupsResult.data);
  };

  const parseExcelFile = useCallback((file: File, type: "vendas" | "executado") => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

        const rows: ParsedRow[] = jsonData.map((row: any) => {
          // Map columns based on file type
          // IMPORTANT: Always use "Valor" (total contracted value) first, not "Valor Pago"
          if (type === "vendas") {
            return {
              date: findColumn(row, ["Data", "DATA", "data"]),
              client_name: findColumn(row, ["Cliente", "CLIENTE", "cliente", "Nome", "NOME"]),
              procedure_name: findColumn(row, ["Procedimento", "PROCEDIMENTO", "procedimento"]),
              department: findColumn(row, ["Departamento", "DEPARTAMENTO", "departamento", "Grupo"]),
              // Priority: "Valor" first (contracted value), then fallbacks
              value_sold: parseAmount(findColumn(row, ["Valor", "VALOR", "Valor Vendido", "VALOR VENDIDO", "Valor Total", "Valor Contrato"])),
              seller_name: findColumn(row, ["Vendedor", "VENDEDOR", "vendedor"]),
              status: findColumn(row, ["Status", "STATUS", "status"]),
              notes: findColumn(row, ["Observações", "OBSERVAÇÕES", "observacoes", "Obs"])
            };
          } else {
            return {
              date: findColumn(row, ["Data", "DATA", "data"]),
              client_name: findColumn(row, ["Cliente", "CLIENTE", "cliente", "Nome", "NOME"]),
              phone: findColumn(row, ["Telefone", "TELEFONE", "telefone", "Fone"]),
              email: findColumn(row, ["Email", "EMAIL", "E-mail", "e-mail"]),
              procedure_name: findColumn(row, ["Procedimento", "PROCEDIMENTO", "procedimento"]),
              department: findColumn(row, ["Departamento", "DEPARTAMENTO", "departamento", "Grupo"]),
              // Priority: "Valor" first (contracted value), then fallbacks
              value_sold: parseAmount(findColumn(row, ["Valor", "VALOR", "Valor Vendido", "VALOR VENDIDO", "Valor Total"])),
              value_received: parseAmount(findColumn(row, ["Valor", "VALOR", "Valor Recebido", "VALOR RECEBIDO", "Valor Total"])),
              professional_name: findColumn(row, ["Profissional Executante", "PROFISSIONAL", "Profissional", "Executante"]),
              origin: findColumn(row, ["Origem", "ORIGEM", "origem"]),
              referred_by: findColumn(row, ["Indicado Por", "INDICADO POR", "Indicador", "Indicação"]),
              status: findColumn(row, ["Status", "STATUS", "status"]),
              notes: findColumn(row, ["Observações", "OBSERVAÇÕES", "observacoes", "Obs"])
            };
          }
        });

        // Filter out empty rows
        const validRows = rows.filter(row => row.date && row.client_name);

        if (type === "vendas") {
          setVendasData(validRows);
          setVendasFile(file.name);
        } else {
          setExecutadoData(validRows);
          setExecutadoFile(file.name);
        }

        toast.success(`Arquivo ${file.name} carregado: ${validRows.length} registros`);
      } catch (error) {
        console.error("Error parsing file:", error);
        toast.error("Erro ao processar arquivo. Verifique o formato.");
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const findColumn = (row: any, possibleNames: string[]): string => {
    for (const name of possibleNames) {
      if (row[name] !== undefined && row[name] !== null && row[name] !== "") {
        return String(row[name]);
      }
    }
    return "";
  };

  const parseAmount = (value: any): number => {
    if (!value) return 0;
    const str = String(value).replace(/[R$\s]/g, "").replace(",", ".");
    return parseFloat(str) || 0;
  };

  const onDropVendas = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      parseExcelFile(acceptedFiles[0], "vendas");
    }
  }, [parseExcelFile]);

  const onDropExecutado = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      parseExcelFile(acceptedFiles[0], "executado");
    }
  }, [parseExcelFile]);

  const { getRootProps: getVendasRootProps, getInputProps: getVendasInputProps, isDragActive: isVendasDragActive } = 
    useDropzone({ onDrop: onDropVendas, accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] } });

  const { getRootProps: getExecutadoRootProps, getInputProps: getExecutadoInputProps, isDragActive: isExecutadoDragActive } = 
    useDropzone({ onDrop: onDropExecutado, accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] } });

  const handleValidate = async () => {
    if (vendasData.length === 0 && executadoData.length === 0) {
      toast.error("Carregue pelo menos um arquivo");
      return;
    }

    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-historical-data", {
        body: {
          action: "validate",
          fileType: vendasData.length > 0 && executadoData.length > 0 ? "both" : vendasData.length > 0 ? "vendas" : "executado",
          data: vendasData,
          executadoData: executadoData,
          periodStart: "2023-01-01",
          periodEnd: "2025-12-31"
        }
      });

      if (error) throw error;
      setValidation(data.vendas ? data : { [vendasData.length > 0 ? "vendas" : "executado"]: data });
      toast.success("Validação concluída");
    } catch (error) {
      console.error("Validation error:", error);
      toast.error("Erro na validação");
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!confirmBackup) {
      toast.error("Confirme o backup antes de importar");
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportStep("Iniciando importação...");

    try {
      setImportStep("Criando backup dos dados atuais...");
      setImportProgress(10);

      const { data, error } = await supabase.functions.invoke("import-historical-data", {
        body: {
          action: "import",
          fileType: vendasData.length > 0 && executadoData.length > 0 ? "both" : vendasData.length > 0 ? "vendas" : "executado",
          data: vendasData,
          executadoData: executadoData,
          clearOldData,
          periodStart: "2023-01-01",
          periodEnd: "2025-12-31"
        }
      });

      if (error) throw error;

      setImportProgress(100);
      setImportStep("Concluído!");
      setImportResult(data);
      
      toast.success("Importação concluída com sucesso!");
      loadHistory();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Erro na importação");
    } finally {
      setIsImporting(false);
    }
  };

  const handleRollback = async (backupId: string) => {
    if (!confirm("Tem certeza que deseja restaurar este backup? Esta ação irá substituir os dados atuais.")) {
      return;
    }

    setIsRollingBack(true);
    try {
      const { data, error } = await supabase.functions.invoke("rollback-import", {
        body: { backupId }
      });

      if (error) throw error;
      
      toast.success("Rollback concluído com sucesso!");
      loadHistory();
      setImportResult(null);
      setValidation(null);
    } catch (error) {
      console.error("Rollback error:", error);
      toast.error("Erro no rollback");
    } finally {
      setIsRollingBack(false);
    }
  };

  const clearFiles = () => {
    setVendasData([]);
    setExecutadoData([]);
    setVendasFile(null);
    setExecutadoFile(null);
    setValidation(null);
    setImportResult(null);
    setConfirmBackup(false);
    setClearOldData(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-500" />
            Importação de Dados Históricos
          </CardTitle>
          <CardDescription>
            Upload seguro de planilhas Vendas Competência e Executado (2023-2025) com backup, validação e recálculo RFV
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="upload">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">1. Upload</TabsTrigger>
          <TabsTrigger value="validation">2. Validação</TabsTrigger>
          <TabsTrigger value="history">3. Histórico</TabsTrigger>
        </TabsList>

        {/* Tab 1: Upload */}
        <TabsContent value="upload" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Vendas Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                  Vendas Competência
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  {...getVendasRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isVendasDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
                >
                  <input {...getVendasInputProps()} />
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  {vendasFile ? (
                    <div>
                      <p className="font-medium text-primary">{vendasFile}</p>
                      <p className="text-sm text-muted-foreground">{vendasData.length} registros</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Arraste o arquivo XLSX ou clique para selecionar
                    </p>
                  )}
                </div>
                {vendasData.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Preview (primeiras 5 linhas):</p>
                    <ScrollArea className="h-32 rounded border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vendasData.slice(0, 5).map((row, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-xs">{row.date}</TableCell>
                              <TableCell className="text-xs">{row.client_name}</TableCell>
                              <TableCell className="text-xs">
                                {row.value_sold?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Executado Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-green-500" />
                  Executado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  {...getExecutadoRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isExecutadoDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
                >
                  <input {...getExecutadoInputProps()} />
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  {executadoFile ? (
                    <div>
                      <p className="font-medium text-primary">{executadoFile}</p>
                      <p className="text-sm text-muted-foreground">{executadoData.length} registros</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Arraste o arquivo XLSX ou clique para selecionar
                    </p>
                  )}
                </div>
                {executadoData.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Preview (primeiras 5 linhas):</p>
                    <ScrollArea className="h-32 rounded border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {executadoData.slice(0, 5).map((row, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-xs">{row.date}</TableCell>
                              <TableCell className="text-xs">{row.client_name}</TableCell>
                              <TableCell className="text-xs">
                                {(row.value_received || row.value_sold)?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleValidate} disabled={isValidating || (vendasData.length === 0 && executadoData.length === 0)}>
              {isValidating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Validar Dados
            </Button>
            <Button variant="outline" onClick={clearFiles}>
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          </div>
        </TabsContent>

        {/* Tab 2: Validation */}
        <TabsContent value="validation" className="space-y-4">
          {validation ? (
            <>
              {/* Validation Summary */}
              <div className="grid md:grid-cols-2 gap-4">
                {validation.vendas && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Vendas Competência</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 bg-green-500/10 rounded">
                          <p className="text-2xl font-bold text-green-600">{validation.vendas.summary.valid}</p>
                          <p className="text-xs text-muted-foreground">Válidos</p>
                        </div>
                        <div className="text-center p-2 bg-red-500/10 rounded">
                          <p className="text-2xl font-bold text-red-600">{validation.vendas.summary.invalid}</p>
                          <p className="text-xs text-muted-foreground">Inválidos</p>
                        </div>
                        <div className="text-center p-2 bg-yellow-500/10 rounded">
                          <p className="text-2xl font-bold text-yellow-600">{validation.vendas.summary.duplicates}</p>
                          <p className="text-xs text-muted-foreground">Duplicatas</p>
                        </div>
                      </div>
                      {validation.vendas.errors.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-red-600 mb-1">Erros:</p>
                          <ScrollArea className="h-24">
                            {validation.vendas.errors.slice(0, 10).map((err, i) => (
                              <p key={i} className="text-xs text-red-500">
                                Linha {err.row}: {err.message}
                              </p>
                            ))}
                          </ScrollArea>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {validation.executado && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Executado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 bg-green-500/10 rounded">
                          <p className="text-2xl font-bold text-green-600">{validation.executado.summary.valid}</p>
                          <p className="text-xs text-muted-foreground">Válidos</p>
                        </div>
                        <div className="text-center p-2 bg-red-500/10 rounded">
                          <p className="text-2xl font-bold text-red-600">{validation.executado.summary.invalid}</p>
                          <p className="text-xs text-muted-foreground">Inválidos</p>
                        </div>
                        <div className="text-center p-2 bg-yellow-500/10 rounded">
                          <p className="text-2xl font-bold text-yellow-600">{validation.executado.summary.duplicates}</p>
                          <p className="text-xs text-muted-foreground">Duplicatas</p>
                        </div>
                      </div>
                      {validation.executado.errors.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-red-600 mb-1">Erros:</p>
                          <ScrollArea className="h-24">
                            {validation.executado.errors.slice(0, 10).map((err, i) => (
                              <p key={i} className="text-xs text-red-500">
                                Linha {err.row}: {err.message}
                              </p>
                            ))}
                          </ScrollArea>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Import Confirmation */}
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Confirmação de Importação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="backup"
                      checked={confirmBackup}
                      onCheckedChange={(checked) => setConfirmBackup(checked as boolean)}
                    />
                    <label htmlFor="backup" className="text-sm font-medium">
                      Confirmo que um backup será criado antes da importação (obrigatório)
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="clear"
                      checked={clearOldData}
                      onCheckedChange={(checked) => setClearOldData(checked as boolean)}
                    />
                    <label htmlFor="clear" className="text-sm text-muted-foreground">
                      Limpar dados antigos do período 2023-2025 antes de importar
                    </label>
                  </div>

                  {isImporting && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{importStep}</span>
                        <span>{importProgress}%</span>
                      </div>
                      <Progress value={importProgress} />
                    </div>
                  )}

                  <Button 
                    onClick={handleImport} 
                    disabled={!confirmBackup || isImporting}
                    className="w-full"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4 mr-2" />
                        Iniciar Importação
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Import Result */}
              {importResult && (
                <Alert className="border-green-500/30 bg-green-500/5">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle>Importação Concluída!</AlertTitle>
                  <AlertDescription>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                      {importResult.vendas && (
                        <>
                          <div>
                            <p className="text-sm font-medium">Vendas Importadas</p>
                            <p className="text-2xl font-bold text-green-600">{importResult.vendas.imported}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Duplicatas Ignoradas</p>
                            <p className="text-2xl font-bold text-yellow-600">{importResult.vendas.duplicates}</p>
                          </div>
                        </>
                      )}
                      {importResult.executado && (
                        <>
                          <div>
                            <p className="text-sm font-medium">Executado Importados</p>
                            <p className="text-2xl font-bold text-green-600">{importResult.executado.imported}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Duplicatas Ignoradas</p>
                            <p className="text-2xl font-bold text-yellow-600">{importResult.executado.duplicates}</p>
                          </div>
                        </>
                      )}
                    </div>
                    {importResult.rfv?.success && (
                      <p className="mt-2 text-sm">
                        ✓ RFV recalculado: {importResult.rfv.updated} clientes atualizados
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tempo de importação: {importResult.duration_seconds}s
                    </p>
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Validação Pendente</AlertTitle>
              <AlertDescription>
                Carregue os arquivos e clique em "Validar Dados" para ver o resultado da validação.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Tab 3: History */}
        <TabsContent value="history" className="space-y-4">
          {/* Backups */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500" />
                Backups Disponíveis
              </CardTitle>
              <CardDescription>Backups válidos para rollback (expiram em 7 dias)</CardDescription>
            </CardHeader>
            <CardContent>
              {backups.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Registros</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expira</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.map((backup) => (
                      <TableRow key={backup.id}>
                        <TableCell className="text-sm">
                          {format(parseISO(backup.backup_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{backup.backup_type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {backup.revenue_records_count + backup.executed_records_count}
                        </TableCell>
                        <TableCell>
                          <Badge variant={backup.status === "completed" ? "default" : "secondary"}>
                            {backup.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(parseISO(backup.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {backup.status === "completed" && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleRollback(backup.id)}
                              disabled={isRollingBack}
                            >
                              {isRollingBack ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3 h-3" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum backup disponível</p>
              )}
            </CardContent>
          </Card>

          {/* Import Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-500" />
                Histórico de Importações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {importLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Importados</TableHead>
                      <TableHead>Duplicatas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>RFV</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(parseISO(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.file_type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{log.total_rows}</TableCell>
                        <TableCell className="text-sm text-green-600">{log.imported_rows}</TableCell>
                        <TableCell className="text-sm text-yellow-600">{log.duplicate_rows}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={log.status === "completed" ? "default" : log.status === "failed" ? "destructive" : "secondary"}
                          >
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.rfv_recalculated ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-muted-foreground" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma importação realizada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HistoricalDataImport;
