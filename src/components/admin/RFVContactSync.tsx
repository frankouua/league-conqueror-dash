import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Users, Phone, Mail, CheckCircle2, Loader2, Link2, Database, UserCircle, Target, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SyncResult {
  total: number;
  matched: number;
  contactsUpdated: number;
  personaUpdated: number;
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
      const [rfvResult, patientResult, rfvWithPhone, rfvWithEmail, rfvWithProfession, rfvWithObjective] = await Promise.all([
        supabase.from("rfv_customers").select("id", { count: "exact", head: true }),
        supabase.from("patient_data").select("id", { count: "exact", head: true }),
        supabase.from("rfv_customers").select("id", { count: "exact", head: true }).not("phone", "is", null),
        supabase.from("rfv_customers").select("id", { count: "exact", head: true }).not("email", "is", null),
        supabase.from("rfv_customers").select("id", { count: "exact", head: true }).not("profession", "is", null),
        supabase.from("rfv_customers").select("id", { count: "exact", head: true }).not("main_objective", "is", null),
      ]);

      return {
        rfvTotal: rfvResult.count || 0,
        patientTotal: patientResult.count || 0,
        rfvWithPhone: rfvWithPhone.count || 0,
        rfvWithEmail: rfvWithEmail.count || 0,
        rfvWithProfession: rfvWithProfession.count || 0,
        rfvWithObjective: rfvWithObjective.count || 0,
      };
    },
  });

  const handleSync = async () => {
    setIsSyncing(true);
    setProgress(0);
    setSyncResult(null);

    try {
      // Fetch all patient_data with any useful data
      const { data: patients, error: patientError } = await supabase
        .from("patient_data")
        .select("cpf, prontuario, phone, whatsapp, email, name, profession, main_objective, why_not_done_yet, has_children, children_count, weight_kg, height_cm, country");

      if (patientError) throw patientError;

      // Fetch all rfv_customers
      const { data: rfvCustomers, error: rfvError } = await supabase
        .from("rfv_customers")
        .select("id, cpf, prontuario, phone, email, whatsapp, name, profession, main_objective, why_not_done_yet, has_children, children_count, weight_kg, height_cm, country");

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
        contactsUpdated: 0,
        personaUpdated: 0,
        noMatch: 0,
        errors: 0,
      };

      // Process in batches
      const BATCH_SIZE = 50;
      const updates: { id: string; data: Record<string, any>; hasContact: boolean; hasPersona: boolean }[] = [];

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
          
          const updateData: Record<string, any> = {};
          let hasContactUpdate = false;
          let hasPersonaUpdate = false;

          // === CONTACT DATA ===
          const patientPhone = matchedPatient.phone?.replace(/\D/g, '') || '';
          const patientWhatsapp = matchedPatient.whatsapp?.replace(/\D/g, '') || '';
          const patientEmail = matchedPatient.email?.trim() || '';
          
          const validPatientPhone = patientPhone && patientPhone !== '00000000000' && patientPhone.length >= 10 ? patientPhone : '';
          const validPatientWhatsapp = patientWhatsapp && patientWhatsapp !== '00000000000' && patientWhatsapp.length >= 10 ? patientWhatsapp : '';
          
          if (!rfv.phone && (validPatientWhatsapp || validPatientPhone)) {
            updateData.phone = validPatientWhatsapp || validPatientPhone;
            hasContactUpdate = true;
          }
          if (!rfv.email && patientEmail && patientEmail.includes('@')) {
            updateData.email = patientEmail;
            hasContactUpdate = true;
          }
          if (!rfv.whatsapp && validPatientWhatsapp) {
            updateData.whatsapp = validPatientWhatsapp;
            hasContactUpdate = true;
          }

          // === PERSONA DATA ===
          if (!rfv.profession && matchedPatient.profession) {
            updateData.profession = matchedPatient.profession;
            hasPersonaUpdate = true;
          }
          if (!rfv.main_objective && matchedPatient.main_objective) {
            updateData.main_objective = matchedPatient.main_objective;
            hasPersonaUpdate = true;
          }
          if (!rfv.why_not_done_yet && matchedPatient.why_not_done_yet) {
            updateData.why_not_done_yet = matchedPatient.why_not_done_yet;
            hasPersonaUpdate = true;
          }
          if (rfv.has_children === null && matchedPatient.has_children !== null) {
            updateData.has_children = matchedPatient.has_children;
            hasPersonaUpdate = true;
          }
          if (!rfv.children_count && matchedPatient.children_count) {
            updateData.children_count = matchedPatient.children_count;
            hasPersonaUpdate = true;
          }
          if (!rfv.weight_kg && matchedPatient.weight_kg) {
            updateData.weight_kg = matchedPatient.weight_kg;
            hasPersonaUpdate = true;
          }
          if (!rfv.height_cm && matchedPatient.height_cm) {
            updateData.height_cm = matchedPatient.height_cm;
            hasPersonaUpdate = true;
          }
          if (!rfv.country && matchedPatient.country) {
            updateData.country = matchedPatient.country;
            hasPersonaUpdate = true;
          }

          if (Object.keys(updateData).length > 0) {
            updates.push({
              id: rfv.id,
              data: updateData,
              hasContact: hasContactUpdate,
              hasPersona: hasPersonaUpdate,
            });
          }
        } else {
          result.noMatch++;
        }

        setProgress(Math.round(((i + 1) / rfvCustomers.length) * 50));
      }

      // Apply updates in batches
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        
        for (const update of batch) {
          const { error } = await supabase
            .from("rfv_customers")
            .update(update.data)
            .eq("id", update.id);

          if (error) {
            result.errors++;
            console.error("Error updating RFV customer:", error);
          } else {
            if (update.hasContact) result.contactsUpdated++;
            if (update.hasPersona) result.personaUpdated++;
          }
        }

        setProgress(50 + Math.round(((i + BATCH_SIZE) / updates.length) * 50));
      }

      setSyncResult(result);
      await refetchStats();

      toast({
        title: "✅ Sincronização Concluída!",
        description: `${result.contactsUpdated} contatos + ${result.personaUpdated} personas atualizados.`,
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
          Sincronizar Dados com RFV
        </CardTitle>
        <CardDescription>
          Cruza cadastros com clientes RFV: contatos, profissão, objetivos, impedimentos e mais.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <UserCircle className="h-5 w-5 mx-auto mb-1 text-pink-500" />
            <p className="text-2xl font-bold">{stats?.rfvWithProfession || 0}</p>
            <p className="text-xs text-muted-foreground">Com Profissão</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <Target className="h-5 w-5 mx-auto mb-1 text-orange-500" />
            <p className="text-2xl font-bold">{stats?.rfvWithObjective || 0}</p>
            <p className="text-xs text-muted-foreground">Com Objetivo</p>
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
                <Badge className="bg-blue-500">{syncResult.contactsUpdated} contatos</Badge>
                <Badge className="bg-pink-500">{syncResult.personaUpdated} personas</Badge>
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
              Sincronizar Todos os Dados
            </>
          )}
        </Button>

        {/* Info */}
        <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground space-y-1">
          <p><strong>Dados sincronizados:</strong></p>
          <ul className="list-disc list-inside space-y-0.5">
            <li><strong>Contatos:</strong> telefone, email, WhatsApp</li>
            <li><strong>Persona:</strong> profissão, objetivo, impedimento, filhos, peso, altura, país</li>
            <li>Cruza por CPF, Prontuário ou Nome</li>
            <li>Só atualiza campos vazios (não sobrescreve)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}