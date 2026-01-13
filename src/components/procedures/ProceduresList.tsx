import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, Package, Sparkles, Syringe, Sun, Leaf, 
  Heart, Stethoscope, Zap, Dna, Scissors, Activity,
  Filter, SortAsc, SortDesc
} from "lucide-react";

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  spa: { label: "Spa Day", icon: Sparkles, color: "bg-pink-500" },
  soroterapia: { label: "Soroterapia", icon: Zap, color: "bg-yellow-500" },
  injetaveis: { label: "Injetáveis", icon: Syringe, color: "bg-purple-500" },
  laser: { label: "Laser", icon: Sun, color: "bg-orange-500" },
  peeling: { label: "Peeling", icon: Leaf, color: "bg-green-500" },
  implantes: { label: "Implantes", icon: Heart, color: "bg-red-500" },
  cirurgia: { label: "Cirurgia", icon: Scissors, color: "bg-blue-600" },
  tecnologia: { label: "Tecnologia", icon: Activity, color: "bg-indigo-500" },
  consulta: { label: "Consulta", icon: Stethoscope, color: "bg-teal-500" },
  microagulhamento: { label: "Microagulhamento", icon: Syringe, color: "bg-rose-500" },
  pos_operatorio: { label: "Pós-Operatório", icon: Heart, color: "bg-cyan-500" },
  regenerativo: { label: "Regenerativo", icon: Sparkles, color: "bg-emerald-500" },
  genetica: { label: "Genética", icon: Dna, color: "bg-violet-500" },
  outros: { label: "Outros", icon: Package, color: "bg-gray-500" },
};

const formatCurrency = (value: number | null) => {
  if (!value) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const ProceduresList = () => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const { data: procedures = [], isLoading } = useQuery({
    queryKey: ["procedures-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procedures")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const categories = [...new Set(procedures.map(p => p.category).filter(Boolean))];

  const filteredProcedures = procedures
    .filter(p => {
      const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const nameA = a.name?.toLowerCase() || "";
      const nameB = b.name?.toLowerCase() || "";
      return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

  const stats = {
    total: procedures.length,
    categories: categories.length,
    avgPrice: procedures.length > 0 
      ? procedures.reduce((sum, p) => sum + (p.price || 0), 0) / procedures.length 
      : 0,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Procedimentos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Filter className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-500">{stats.categories}</p>
                <p className="text-sm text-muted-foreground">Categorias</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Activity className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{formatCurrency(stats.avgPrice)}</p>
                <p className="text-sm text-muted-foreground">Preço Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-primary" />
            Lista de Procedimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar procedimento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map(cat => {
                  const config = CATEGORY_CONFIG[cat || "outros"];
                  return (
                    <SelectItem key={cat} value={cat || "outros"}>
                      {config?.label || cat}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>
          </div>

          {/* Categories Quick Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge
              variant={categoryFilter === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setCategoryFilter("all")}
            >
              Todos ({procedures.length})
            </Badge>
            {categories.map(cat => {
              const config = CATEGORY_CONFIG[cat || "outros"];
              const count = procedures.filter(p => p.category === cat).length;
              const Icon = config?.icon || Package;
              return (
                <Badge
                  key={cat}
                  variant={categoryFilter === cat ? "default" : "outline"}
                  className="cursor-pointer gap-1"
                  onClick={() => setCategoryFilter(cat || "outros")}
                >
                  <Icon className="h-3 w-3" />
                  {config?.label || cat} ({count})
                </Badge>
              );
            })}
          </div>

          {/* Table */}
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Procedimento</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Promocional</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Carregando procedimentos...
                    </TableCell>
                  </TableRow>
                ) : filteredProcedures.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum procedimento encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProcedures.map((proc) => {
                    const config = CATEGORY_CONFIG[proc.category || "outros"];
                    const Icon = config?.icon || Package;
                    return (
                      <TableRow key={proc.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-md ${config?.color || "bg-gray-500"}/20`}>
                              <Icon className={`h-4 w-4 ${config?.color?.replace("bg-", "text-") || "text-gray-500"}`} />
                            </div>
                            <div>
                              <p className="font-medium">{proc.name}</p>
                              {proc.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-xs">
                                  {proc.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {config?.label || proc.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(proc.price)}
                        </TableCell>
                        <TableCell className="text-right">
                          {proc.promotional_price ? (
                            <span className="text-green-600 font-medium">
                              {formatCurrency(proc.promotional_price)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
          
          <div className="mt-4 text-sm text-muted-foreground text-center">
            Exibindo {filteredProcedures.length} de {procedures.length} procedimentos
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProceduresList;
