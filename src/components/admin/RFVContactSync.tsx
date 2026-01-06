import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Users, Phone, Mail, CheckCircle2, AlertCircle, Loader2, Link2, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SyncResult {
  total: number;
  matched: number;
  updated: number;
  noMatch: number;
  errors: number;
}

export default function RFVContactSync() {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  // Get counts for display
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["rfv-sync-stats"],
    queryFn: async () => {
      const [rfvResult, patientResult, rfvWithPhone, rfvWithEmail] = await Promise.all([
        supabase.from("rfv_customers").select("id", { count: "exact", head: true }),
        supabase.from("patient_data").select("id", { count: "exact", head: true }),
        supabase.from("rfv_customers").select("id", { count: "exact", head: true }).not("phone", "is", null),
        supabase.from("rfv_customers").select("id", { count: "exact", head: true }).not("email", "is", null),
      ]);

      return {
        rfvTotal: rfvResult.count || 0,
        patientTotal: patientResult.count || 0,
        rfvWithPhone: rfvWithPhone.count || 0,
        rfvWithEmail: rfvWithEmail.count || 0,
      };
    },
  });

  const handleSync = async () => {
    setIsSyncing(true);
    setProgress(0);
    setSyncResult(null);

    try {
      // Fetch all patient_data with contact info - include all contact fields
      const { data: patients, error: patientError } = await supabase
        .from("patient_data")
        .select("cpf, prontuario, phone, whatsapp, email, name")
        .or("phone.not.is.null,whatsapp.not.is.null,email.not.is.null");

      if (patientError) throw patientError;

      // Fetch all rfv_customers
      const { data: rfvCustomers, error: rfvError } = await supabase
        .from("rfv_customers")
        .select("id, cpf, prontuario, phone, email, whatsapp, name");

      if (rfvError) throw rfvError;

      if (!patients || !rfvCustomers) {
        toast({
          title: "Sem dados",
          description: "Não há dados para sincronizar.",
          variant: "destructive",
        });
        setIsSyncing(false);
        return;
      }

      // Create lookup maps for patient data
      const patientByCpf = new Map<string, typeof patients[0]>();
      const patientByProntuario = new Map<string, typeof patients[0]>();
      const patientByName = new Map<string, typeof patients[0]>();

      for (const p of patients) {
        if (p.cpf) {
          const normalizedCpf = p.cpf.replace(/\D/g, "");
          if (normalizedCpf.length >= 11) {
            patientByCpf.set(normalizedCpf, p);
          }
        }
        if (p.prontuario) {
          patientByProntuario.set(p.prontuario.trim(), p);
        }
        if (p.name) {
          const normalizedName = p.name.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          patientByName.set(normalizedName, p);
        }
      }

      const result: SyncResult = {
        total: rfvCustomers.length,
        matched: 0,
        updated: 0,
        noMatch: 0,
        errors: 0,
      };

      // Process in batches
      const BATCH_SIZE = 50;
      const updates: { id: string; phone?: string; email?: string; whatsapp?: string }[] = [];

      for (let i = 0; i < rfvCustomers.length; i++) {
        const rfv = rfvCustomers[i];
        let matchedPatient: typeof patients[0] | undefined;

        // Try to match by CPF first
        if (rfv.cpf) {
          const normalizedCpf = rfv.cpf.replace(/\D/g, "");
          matchedPatient = patientByCpf.get(normalizedCpf);
        }

        // Try prontuario if no CPF match
        if (!matchedPatient && rfv.prontuario) {
          matchedPatient = patientByProntuario.get(rfv.prontuario.trim());
        }

        // Try name as last resort
        if (!matchedPatient && rfv.name) {
          const normalizedName = rfv.name.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          matchedPatient = patientByName.get(normalizedName);
        }

        if (matchedPatient) {
          result.matched++;
          
          // Get contact from patient data - prefer whatsapp, then phone
          const patientPhone = matchedPatient.phone?.replace(/\D/g, '') || '';
          const patientWhatsapp = matchedPatient.whatsapp?.replace(/\D/g, '') || '';
          const patientEmail = matchedPatient.email?.trim() || '';
          
          // Filter out invalid placeholder numbers
          const validPatientPhone = patientPhone && patientPhone !== '00000000000' && patientPhone.length >= 10 ? patientPhone : '';
          const validPatientWhatsapp = patientWhatsapp && patientWhatsapp !== '00000000000' && patientWhatsapp.length >= 10 ? patientWhatsapp : '';
          
          // Check if we need to update - update if RFV field is empty AND patient has valid data
          const shouldUpdatePhone = !rfv.phone && (validPatientWhatsapp || validPatientPhone);
          const shouldUpdateEmail = !rfv.email && patientEmail && patientEmail.includes('@');
          const shouldUpdateWhatsapp = !rfv.whatsapp && validPatientWhatsapp;

          if (shouldUpdatePhone || shouldUpdateEmail || shouldUpdateWhatsapp) {
            updates.push({
              id: rfv.id,
              phone: rfv.phone || validPatientWhatsapp || validPatientPhone || undefined,
              email: rfv.email || (patientEmail.includes('@') ? patientEmail : undefined),
              whatsapp: rfv.whatsapp || validPatientWhatsapp || undefined,
            });
          }
        } else {
          result.noMatch++;
        }

        // Update progress
        setProgress(Math.round(((i + 1) / rfvCustomers.length) * 50));
      }

      // Apply updates in batches
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        
        for (const update of batch) {
          const { error } = await supabase
            .from("rfv_customers")
            .update({
              phone: update.phone,
              email: update.email,
              whatsapp: update.whatsapp,
            })
            .eq("id", update.id);

          if (error) {
            result.errors++;
            console.error("Error updating RFV customer:", error);
          } else {
            result.updated++;
          }
        }

        setProgress(50 + Math.round(((i + BATCH_SIZE) / updates.length) * 50));
      }

      setSyncResult(result);
      await refetchStats();

      toast({
        title: "✅ Sincronização Concluída!",
        description: `${result.updated} clientes RFV atualizados com dados de contato.`,
      });
    } catch (error) {
      console.error("Sync error:", error);
      toast({
        title: "Erro na sincronização",
        description: "Ocorreu um erro durante a sincronização.",
        variant: "destructive",
      });
    }

    setIsSyncing(false);
    setProgress(100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          Sincronizar Contatos com RFV
        </CardTitle>
        <CardDescription>
          Atualiza os clientes da matriz RFV com telefone, email e WhatsApp dos cadastros importados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <Database className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{stats?.patientTotal || 0}</p>
            <p className="text-xs text-muted-foreground">Cadastros</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold">{stats?.rfvTotal || 0}</p>
            <p className="text-xs text-muted-foreground">Clientes RFV</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <Phone className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold">{stats?.rfvWithPhone || 0}</p>
            <p className="text-xs text-muted-foreground">Com Telefone</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <Mail className="h-5 w-5 mx-auto mb-1 text-purple-500" />
            <p className="text-2xl font-bold">{stats?.rfvWithEmail || 0}</p>
            <p className="text-xs text-muted-foreground">Com Email</p>
          </div>
        </div>

        {/* Progress */}
        {isSyncing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sincronizando...</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Result */}
        {syncResult && (
          <Alert className={syncResult.errors > 0 ? "border-amber-500/50" : "border-emerald-500/50"}>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <AlertDescription>
              <div className="flex flex-wrap gap-2 mt-1">
                <Badge variant="outline">{syncResult.total} analisados</Badge>
                <Badge className="bg-emerald-500">{syncResult.matched} encontrados</Badge>
                <Badge className="bg-blue-500">{syncResult.updated} atualizados</Badge>
                <Badge variant="outline" className="text-muted-foreground">{syncResult.noMatch} sem match</Badge>
                {syncResult.errors > 0 && (
                  <Badge variant="destructive">{syncResult.errors} erros</Badge>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action */}
        <Button 
          onClick={handleSync} 
          disabled={isSyncing}
          className="w-full gap-2"
        >
          {isSyncing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Sincronizar Contatos
            </>
          )}
        </Button>

        {/* Info */}
        <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground space-y-1">
          <p><strong>Como funciona:</strong></p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Cruza clientes RFV com cadastros por CPF, Prontuário ou Nome</li>
            <li>Atualiza apenas campos vazios (não sobrescreve dados existentes)</li>
            <li>Útil após importar nova planilha de cadastros</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}