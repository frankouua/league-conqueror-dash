import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Upload, FileSpreadsheet, Check, AlertCircle, Loader2, 
  ArrowRight, RefreshCw, X, ChevronDown, ChevronUp 
} from 'lucide-react';

interface ColumnMapping {
  [targetField: string]: string | null;
}

interface ParsedRow {
  [key: string]: any;
}

const PROPOSAL_FIELDS = {
  prontuario: { label: 'Prontuário', possibleNames: ['Prontuário', 'Prontuario', 'Código', 'Cod', 'ID Paciente'] },
  patient_name: { label: 'Nome Paciente', possibleNames: ['Paciente', 'Nome', 'Cliente', 'Nome Paciente', 'Nome do Paciente'] },
  cpf: { label: 'CPF', possibleNames: ['CPF', 'Cpf', 'Documento'] },
  phone: { label: 'Telefone', possibleNames: ['Telefone', 'Tel', 'Celular', 'Fone', 'WhatsApp'] },
  email: { label: 'Email', possibleNames: ['Email', 'E-mail', 'E-Mail'] },
  consultation_date: { label: 'Data Consulta', possibleNames: ['Data Consulta', 'Consulta', 'Data Atendimento', 'Data da Consulta'] },
  contract_date: { label: 'Data Contrato', possibleNames: ['Data Contrato', 'Fechamento', 'Data Fechamento', 'Data do Contrato'] },
  execution_date: { label: 'Data Execução', possibleNames: ['Data Execução', 'Execução', 'Data Procedimento', 'Data do Procedimento'] },
  negotiation_status: { label: 'Status', possibleNames: ['Status', 'Status Negociação', 'Situação', 'Estado'] },
  origin: { label: 'Origem', possibleNames: ['Origem', 'Como Conheceu', 'Canal', 'Fonte'] },
  origin_detail: { label: 'Detalhe Origem', possibleNames: ['Campanha', 'Detalhe Origem', 'Blogueira', 'Influencer', 'Nome Campanha'] },
  contract_value: { label: 'Valor Contrato', possibleNames: ['Valor Contrato', 'Valor', 'Valor Fechado', 'Valor Total'] },
  seller_name: { label: 'Vendedor', possibleNames: ['Vendedor', 'Responsável', 'Consultor', 'Vendedora', 'Atendente'] },
  country: { label: 'País', possibleNames: ['País', 'Pais', 'Country', 'Nacionalidade', 'País de Origem'] },
  city: { label: 'Cidade', possibleNames: ['Cidade', 'City', 'Município', 'Municipio', 'Cidade do Paciente'] },
  notes: { label: 'Observações', possibleNames: ['Observações', 'Obs', 'Notas', 'Observação', 'Comentários'] },
};

// Normalizar origem para categoria
function normalizeOriginCategory(origin: string | null): string {
  if (!origin) return 'other';
  const lower = origin.toLowerCase();
  
  if (lower.includes('tráfego') || lower.includes('trafego') || lower.includes('ads') || 
      lower.includes('google') || lower.includes('facebook') || lower.includes('meta')) {
    return 'paid';
  }
  if (lower.includes('blogueira') || lower.includes('influencer') || lower.includes('influenciador')) {
    return 'influencer';
  }
  if (lower.includes('instagram') || lower.includes('insta') || lower.includes('rede social') ||
      lower.includes('facebook') || lower.includes('tiktok')) {
    return 'social';
  }
  if (lower.includes('indicação') || lower.includes('indicacao') || lower.includes('referral') ||
      lower.includes('indicou') || lower.includes('amigo') || lower.includes('familiar')) {
    return 'referral';
  }
  if (lower.includes('orgânico') || lower.includes('organico') || lower.includes('site') ||
      lower.includes('pesquisa') || lower.includes('seo')) {
    return 'organic';
  }
  
  return 'other';
}

// Parse value from various formats
function parseValue(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  
  const str = String(value)
    .replace(/R\$\s*/gi, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

// Parse date from various formats
function parseDate(value: any): string | null {
  if (!value) return null;
  
  // Excel serial date
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return date.toISOString().split('T')[0];
  }
  
  const str = String(value).trim();
  
  // DD/MM/YYYY
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return str;
  }
  
  // Try native parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  
  return null;
}

export function ProposalUpload({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(true);
  const [importResults, setImportResults] = useState<{ success: number; errors: number; messages: string[] } | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  const parseFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(firstSheet, { defval: '' });
      
      if (jsonData.length === 0) {
        toast.error('Planilha vazia ou sem dados válidos');
        return;
      }

      const fileHeaders = Object.keys(jsonData[0]);
      setHeaders(fileHeaders);
      setRawData(jsonData);

      // Auto-detect column mappings
      const autoMapping: ColumnMapping = {};
      Object.entries(PROPOSAL_FIELDS).forEach(([field, config]) => {
        const match = fileHeaders.find(header => 
          config.possibleNames.some(name => 
            header.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(header.toLowerCase())
          )
        );
        autoMapping[field] = match || null;
      });
      setColumnMapping(autoMapping);
      
      toast.success(`${jsonData.length} linhas encontradas na planilha`);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Erro ao processar a planilha');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMappingChange = (field: string, value: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: value === 'none' ? null : value
    }));
  };

  const handleImport = async () => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    if (!columnMapping.patient_name) {
      toast.error('O campo "Nome Paciente" é obrigatório');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportResults(null);

    const batchId = crypto.randomUUID();
    const errors: string[] = [];
    let successCount = 0;

    try {
      // Get user profile for seller mapping
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name');
      
      const sellerMap = new Map<string, string>();
      profiles?.forEach(p => {
        if (p.full_name) {
          sellerMap.set(p.full_name.toLowerCase(), p.id);
        }
      });

      // Process in batches
      const batchSize = 50;
      for (let i = 0; i < rawData.length; i += batchSize) {
        const batch = rawData.slice(i, i + batchSize);
        const records = batch.map((row, idx) => {
          try {
            const patientName = row[columnMapping.patient_name!];
            if (!patientName) {
              throw new Error(`Linha ${i + idx + 2}: Nome do paciente vazio`);
            }

            const sellerName = columnMapping.seller_name ? row[columnMapping.seller_name] : null;
            const sellerId = sellerName ? sellerMap.get(String(sellerName).toLowerCase()) : null;

            const origin = columnMapping.origin ? row[columnMapping.origin] : null;
            const consultDate = columnMapping.consultation_date ? parseDate(row[columnMapping.consultation_date]) : null;

            return {
              prontuario: columnMapping.prontuario ? String(row[columnMapping.prontuario] || '') : null,
              patient_name: String(patientName),
              cpf: columnMapping.cpf ? String(row[columnMapping.cpf] || '') : null,
              phone: columnMapping.phone ? String(row[columnMapping.phone] || '') : null,
              email: columnMapping.email ? String(row[columnMapping.email] || '') : null,
              consultation_date: consultDate,
              contract_date: columnMapping.contract_date ? parseDate(row[columnMapping.contract_date]) : null,
              execution_date: columnMapping.execution_date ? parseDate(row[columnMapping.execution_date]) : null,
              negotiation_status: columnMapping.negotiation_status ? String(row[columnMapping.negotiation_status] || '') : null,
              origin: origin ? String(origin) : null,
              origin_category: normalizeOriginCategory(origin ? String(origin) : null),
              origin_detail: columnMapping.origin_detail ? String(row[columnMapping.origin_detail] || '') : null,
              contract_value: columnMapping.contract_value ? parseValue(row[columnMapping.contract_value]) : null,
              seller_id: sellerId || null,
              seller_name: sellerName ? String(sellerName) : null,
              country: columnMapping.country ? String(row[columnMapping.country] || '') : null,
              city: columnMapping.city ? String(row[columnMapping.city] || '') : null,
              notes: columnMapping.notes ? String(row[columnMapping.notes] || '') : null,
              import_batch_id: batchId,
              year: consultDate ? new Date(consultDate).getFullYear() : null,
              month: consultDate ? new Date(consultDate).getMonth() + 1 : null,
            };
          } catch (e: any) {
            errors.push(e.message);
            return null;
          }
        }).filter(Boolean);

        if (records.length > 0) {
          const { error } = await supabase
            .from('proposal_control')
            .insert(records);
          
          if (error) {
            errors.push(`Erro no lote ${Math.floor(i / batchSize) + 1}: ${error.message}`);
          } else {
            successCount += records.length;
          }
        }

        setImportProgress(Math.round(((i + batch.length) / rawData.length) * 100));
      }

      // Log the import
      await supabase.from('proposal_import_logs').insert({
        batch_id: batchId,
        file_name: file?.name,
        total_rows: rawData.length,
        imported_rows: successCount,
        error_rows: errors.length,
        errors: errors.length > 0 ? errors : null,
        column_mapping: columnMapping,
        imported_by: user.id,
      });

      setImportResults({
        success: successCount,
        errors: errors.length,
        messages: errors.slice(0, 10), // Show first 10 errors
      });

      if (successCount > 0) {
        toast.success(`${successCount} propostas importadas com sucesso!`);
        onSuccess?.();
      }
      if (errors.length > 0) {
        toast.warning(`${errors.length} erros durante a importação`);
      }

    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('Erro durante a importação: ' + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setRawData([]);
    setHeaders([]);
    setColumnMapping({});
    setImportResults(null);
    setImportProgress(0);
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!file && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload de Planilha
            </CardTitle>
            <CardDescription>
              Arraste ou selecione a planilha de controle de propostas (.xlsx)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-primary font-medium">Solte o arquivo aqui...</p>
              ) : (
                <>
                  <p className="font-medium">Arraste a planilha aqui</p>
                  <p className="text-sm text-muted-foreground mt-1">ou clique para selecionar</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing */}
      {isProcessing && (
        <Card>
          <CardContent className="py-10">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>Processando planilha...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Column Mapping */}
      {file && headers.length > 0 && !isProcessing && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                {file.name}
              </CardTitle>
              <CardDescription>
                {rawData.length} linhas • {headers.length} colunas
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={resetUpload}>
              <X className="h-4 w-4 mr-1" /> Trocar arquivo
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mapping Grid */}
            <div>
              <h4 className="font-medium mb-3">Mapeamento de Colunas</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(PROPOSAL_FIELDS).map(([field, config]) => (
                  <div key={field} className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-2">
                      {config.label}
                      {field === 'patient_name' && <Badge variant="destructive" className="text-xs">Obrigatório</Badge>}
                    </label>
                    <Select
                      value={columnMapping[field] || 'none'}
                      onValueChange={(v) => handleMappingChange(field, v)}
                    >
                      <SelectTrigger className={columnMapping[field] ? 'border-green-500' : ''}>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Não mapear --</SelectItem>
                        {headers.map(header => (
                          <SelectItem key={header} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div>
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 mb-2"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Preview dos Dados ({Math.min(5, rawData.length)} primeiras linhas)
              </Button>
              
              {showPreview && (
                <ScrollArea className="h-[200px] rounded border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.slice(0, 8).map(h => (
                          <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>
                        ))}
                        {headers.length > 8 && <TableHead>...</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rawData.slice(0, 5).map((row, idx) => (
                        <TableRow key={idx}>
                          {headers.slice(0, 8).map(h => (
                            <TableCell key={h} className="max-w-[150px] truncate">
                              {String(row[h] || '')}
                            </TableCell>
                          ))}
                          {headers.length > 8 && <TableCell>...</TableCell>}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </div>

            {/* Import Progress */}
            {isImporting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Importando...</span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} />
              </div>
            )}

            {/* Import Results */}
            {importResults && (
              <div className={`rounded-lg p-4 ${
                importResults.errors > 0 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-green-500/10 border border-green-500/30'
              }`}>
                <div className="flex items-center gap-4 mb-2">
                  {importResults.errors > 0 ? (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                  <span className="font-medium">
                    {importResults.success} importadas • {importResults.errors} erros
                  </span>
                </div>
                {importResults.messages.length > 0 && (
                  <ul className="text-sm text-muted-foreground ml-9 list-disc">
                    {importResults.messages.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                    {importResults.errors > 10 && (
                      <li className="text-yellow-500">... e mais {importResults.errors - 10} erros</li>
                    )}
                  </ul>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={resetUpload} disabled={isImporting}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Resetar
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={isImporting || !columnMapping.patient_name}
              >
                {isImporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Importar {rawData.length} Propostas
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
