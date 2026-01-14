import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Edit2, Save, X, CalendarDays, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCRMLeads } from '@/hooks/useCRM';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CRMSurgeryDateEditorProps {
  leadId: string;
  leadName: string;
  pipelineId: string;
  surgeryDate: string | null;
  onUpdate?: () => void;
}

export function CRMSurgeryDateEditor({
  leadId,
  leadName,
  pipelineId,
  surgeryDate,
  onUpdate,
}: CRMSurgeryDateEditorProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { updateLead } = useCRMLeads(pipelineId);
  const [isEditing, setIsEditing] = useState(false);
  const [newDate, setNewDate] = useState(surgeryDate ? surgeryDate.split('T')[0] : '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const oldDate = surgeryDate;
      
      await updateLead.mutateAsync({
        id: leadId,
        surgery_date: newDate || null,
      });

      // Log history
      await supabase.from('crm_lead_history').insert({
        lead_id: leadId,
        action_type: 'surgery_date_change',
        performed_by: profile?.user_id,
        title: newDate ? 'Data da Cirurgia Atualizada' : 'Data da Cirurgia Removida',
        description: newDate 
          ? `Nova data: ${format(new Date(newDate), "dd/MM/yyyy", { locale: ptBR })}${oldDate ? ` (anterior: ${format(new Date(oldDate), "dd/MM/yyyy", { locale: ptBR })})` : ''}`
          : `Data anterior: ${oldDate ? format(new Date(oldDate), "dd/MM/yyyy", { locale: ptBR }) : 'Não definida'}`,
        old_value: oldDate,
        new_value: newDate || null,
      });

      toast({ title: 'Data da cirurgia atualizada!' });
      setIsEditing(false);
      onUpdate?.();
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Calculate days until surgery or since surgery
  const getDaysInfo = () => {
    if (!surgeryDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const surgery = new Date(surgeryDate);
    surgery.setHours(0, 0, 0, 0);
    
    const diff = differenceInDays(surgery, today);
    
    if (diff === 0) return { text: 'HOJE!', color: 'bg-red-500', urgent: true };
    if (diff > 0) return { text: `D-${diff}`, color: diff <= 7 ? 'bg-orange-500' : 'bg-blue-500', urgent: diff <= 3 };
    return { text: `D+${Math.abs(diff)}`, color: 'bg-green-500', urgent: false, postOp: true };
  };

  const daysInfo = getDaysInfo();

  if (isEditing) {
    return (
      <Card className="border-2 border-primary bg-primary/5">
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Data da Cirurgia</span>
          </div>
          
          <Input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="text-sm"
          />
          
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleSave} 
              disabled={saving}
              className="flex-1"
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              Salvar
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                setIsEditing(false);
                setNewDate(surgeryDate ? surgeryDate.split('T')[0] : '');
              }}
              disabled={saving}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "border-2 cursor-pointer transition-all hover:shadow-md",
        surgeryDate 
          ? daysInfo?.urgent 
            ? "border-red-500/50 bg-red-500/10" 
            : daysInfo?.postOp
              ? "border-green-500/50 bg-green-500/10"
              : "border-primary/50 bg-primary/5"
          : "border-dashed border-muted-foreground/30"
      )}
      onClick={() => setIsEditing(true)}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className={cn(
              "h-5 w-5",
              surgeryDate ? "text-primary" : "text-muted-foreground"
            )} />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Data da Cirurgia
              </p>
              {surgeryDate ? (
                <p className="font-bold text-lg">
                  {format(new Date(surgeryDate), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Clique para definir
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {daysInfo && (
              <Badge className={cn("text-white font-bold", daysInfo.color)}>
                {daysInfo.text}
              </Badge>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {surgeryDate && daysInfo && (
          <div className="mt-2 pt-2 border-t flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {daysInfo.postOp ? (
              <span>{Math.abs(differenceInDays(new Date(surgeryDate), new Date()))} dias pós-cirurgia</span>
            ) : daysInfo.text === 'HOJE!' ? (
              <span className="text-red-500 font-semibold">Cirurgia programada para HOJE!</span>
            ) : (
              <span>Faltam {differenceInDays(new Date(surgeryDate), new Date())} dias</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
