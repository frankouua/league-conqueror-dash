import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileSpreadsheet, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AVAILABLE_FILES = [
  { name: "Planilha Persona", path: "/uploads/PLANILHA_persona.xlsx" },
  { name: "Análise ICP", path: "/uploads/ANALISEESTRATEGICA-ICP_COMPLETA.xlsx" },
  { name: "Vendas Competência 2023-2024-2025", path: "/uploads/VENDAS_COMPETENCIA_2023_2024_2025.xlsx" },
];

const AnalyzePersona = () => {
  const { user, role, isLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [totalRows, setTotalRows] = useState(0);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  const loadFile = async (filePath: string) => {
    setLoading(true);
    setError(null);
    setSheets([]);
    setData([]);
    setColumns([]);
    
    try {
      const response = await fetch(filePath);
      const arrayBuffer = await response.arrayBuffer();
      const wb = XLSX.read(arrayBuffer);
      
      setWorkbook(wb);
      setSheets(wb.SheetNames);
      
      if (wb.SheetNames.length > 0) {
        loadSheet(wb, wb.SheetNames[0]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Error loading file:", err);
      setError("Erro ao carregar arquivo");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFile && user && role === 'admin') {
      loadFile(selectedFile);
    }
  }, [selectedFile, user, role]);

  const loadSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    setSelectedSheet(sheetName);
    const worksheet = wb.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });
    
    setTotalRows(jsonData.length);
    
    if (jsonData.length > 0) {
      const cols = Object.keys(jsonData[0]);
      setColumns(cols);
      setData(jsonData.slice(0, 100)); // Show first 100 rows
    } else {
      setColumns([]);
      setData([]);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || role !== 'admin') {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">Análise de Planilhas</span>
          </div>
          <h1 className="text-3xl font-black text-gradient-gold mb-2">
            Analisador de Planilhas
          </h1>
        </div>

        {/* File Selector */}
        <Card className="max-w-xl mx-auto mb-6">
          <CardHeader>
            <CardTitle>Selecione uma Planilha</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedFile} onValueChange={setSelectedFile}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um arquivo..." />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_FILES.map((file) => (
                  <SelectItem key={file.path} value={file.path}>
                    {file.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {error ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6 text-center text-destructive">
              {error}
            </CardContent>
          </Card>
        ) : selectedFile && (
          <div className="space-y-6">
            {/* Sheet Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  Abas Encontradas: {sheets.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {sheets.map((sheet) => (
                    <Button
                      key={sheet}
                      variant={selectedSheet === sheet ? "default" : "outline"}
                      size="sm"
                      onClick={() => workbook && loadSheet(workbook, sheet)}
                    >
                      {sheet}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Columns Info */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Colunas da aba "{selectedSheet}" ({columns.length} colunas)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {columns.map((col, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {col}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Data Preview */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Preview dos Dados (primeiras {Math.min(data.length, 100)} linhas de {totalRows} total)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] w-full">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-background">#</TableHead>
                          {columns.slice(0, 15).map((col, idx) => (
                            <TableHead key={idx} className="min-w-[150px] whitespace-nowrap">
                              {col}
                            </TableHead>
                          ))}
                          {columns.length > 15 && (
                            <TableHead>... +{columns.length - 15} colunas</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.slice(0, 50).map((row, rowIdx) => (
                          <TableRow key={rowIdx}>
                            <TableCell className="sticky left-0 bg-background font-medium">
                              {rowIdx + 1}
                            </TableCell>
                            {columns.slice(0, 15).map((col, colIdx) => (
                              <TableCell key={colIdx} className="max-w-[200px] truncate">
                                {String(row[col] || "").substring(0, 50)}
                              </TableCell>
                            ))}
                            {columns.length > 15 && (
                              <TableCell className="text-muted-foreground">...</TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Full Column Details */}
            <Card>
              <CardHeader>
                <CardTitle>Todas as Colunas (para mapeamento)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
                  {columns.map((col, idx) => (
                    <div key={idx} className="p-2 bg-muted rounded flex items-center gap-2">
                      <span className="text-muted-foreground">{idx + 1}.</span>
                      <span className="font-mono">{col}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default AnalyzePersona;
