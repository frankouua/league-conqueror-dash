import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link2, Plus, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface Mapping {
  id: string;
  feegow_name: string;
  user_id: string;
  created_at: string;
}

interface Profile {
  user_id: string;
  full_name: string;
  department: string | null;
}

const FeegowUserMapping = () => {
  const queryClient = useQueryClient();
  const [feegowName, setFeegowName] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  const { data: mappings, isLoading: mappingsLoading } = useQuery({
    queryKey: ["feegow-user-mappings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feegow_user_mapping")
        .select("*")
        .order("feegow_name");

      if (error) throw error;
      return data as Mapping[];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, department")
        .order("full_name");

      if (error) throw error;
      return data as Profile[];
    },
  });

  // Get unmapped sellers from recent sync logs
  const { data: unmappedSellers } = useQuery({
    queryKey: ["unmapped-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feegow_sync_logs")
        .select("sellers_not_found")
        .not("sellers_not_found", "is", null)
        .order("started_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      // Flatten and deduplicate
      const allSellers = data
        .flatMap((log) => log.sellers_not_found || [])
        .filter((name, idx, arr) => arr.indexOf(name) === idx);

      return allSellers as string[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async ({ feegowName, userId }: { feegowName: string; userId: string }) => {
      const { error } = await supabase
        .from("feegow_user_mapping")
        .insert({ feegow_name: feegowName, user_id: userId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feegow-user-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmapped-sellers"] });
      setFeegowName("");
      setSelectedUserId("");
      toast.success("Mapeamento adicionado");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("feegow_user_mapping")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feegow-user-mappings"] });
      toast.success("Mapeamento removido");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleAdd = () => {
    if (!feegowName.trim() || !selectedUserId) {
      toast.error("Preencha o nome FEEGOW e selecione um usuário");
      return;
    }
    addMutation.mutate({ feegowName: feegowName.trim(), userId: selectedUserId });
  };

  const handleQuickMap = (seller: string) => {
    setFeegowName(seller);
  };

  const getUserName = (userId: string) => {
    const profile = profiles?.find((p) => p.user_id === userId);
    return profile?.full_name || "Usuário desconhecido";
  };

  return (
    <div className="space-y-6">
      {/* Unmapped Sellers Alert */}
      {unmappedSellers && unmappedSellers.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-amber-500">
              <UserCheck className="w-5 h-5" />
              Vendedores Não Mapeados
            </CardTitle>
            <CardDescription>
              Clique em um nome para preencher automaticamente o formulário
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unmappedSellers.map((seller) => (
                <Button
                  key={seller}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickMap(seller)}
                  className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                >
                  {seller}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Mapping Form */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Mapeamento FEEGOW → Usuário
          </CardTitle>
          <CardDescription>
            Vincule nomes do FEEGOW aos usuários do sistema quando não batem automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="feegowName">Nome no FEEGOW</Label>
              <Input
                id="feegowName"
                placeholder="Ex: João Silva"
                value={feegowName}
                onChange={(e) => setFeegowName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userId">Usuário do Sistema</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {profiles?.map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.full_name}
                      {profile.department && ` (${profile.department})`}
                    </SelectItem>
                  ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleAdd}
            disabled={addMutation.isPending}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Mapeamento
          </Button>
        </CardContent>
      </Card>

      {/* Existing Mappings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mapeamentos Existentes</CardTitle>
          <CardDescription>
            {mappings?.length || 0} mapeamento(s) configurado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mappingsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : mappings && mappings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome FEEGOW</TableHead>
                  <TableHead>Usuário Sistema</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell className="font-medium">{mapping.feegow_name}</TableCell>
                    <TableCell>{getUserName(mapping.user_id)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(mapping.id)}
                        disabled={deleteMutation.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum mapeamento configurado
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeegowUserMapping;
