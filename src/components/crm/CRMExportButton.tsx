import { useState } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CRMLead } from '@/hooks/useCRM';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface CRMExportButtonProps {
  leads: CRMLead[];
  pipelineName?: string;
}

export function CRMExportButton({ leads, pipelineName }: CRMExportButtonProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = () => {
    setIsExporting(true);
    try {
      const headers = [
        'Nome',
        'Email',
        'Telefone',
        'WhatsApp',
        'CPF',
        'Prontuário',
        'Origem',
        'Valor Estimado',
        'Valor Contrato',
        'Lead Score',
        'Budget',
        'Authority',
        'Need',
        'Timing',
        'Procedimentos',
        'Tags',
        'Prioridade',
        'Parado',
        'Criado em',
        'Última atividade',
      ];

      const rows = leads.map(lead => [
        lead.name,
        lead.email || '',
        lead.phone || '',
        lead.whatsapp || '',
        lead.cpf || '',
        lead.prontuario || '',
        lead.source || '',
        lead.estimated_value?.toString() || '',
        lead.contract_value?.toString() || '',
        lead.lead_score?.toString() || '',
        lead.budget_score?.toString() || '',
        lead.authority_score?.toString() || '',
        lead.need_score?.toString() || '',
        lead.timing_score?.toString() || '',
        lead.interested_procedures?.join(', ') || '',
        lead.tags?.join(', ') || '',
        lead.is_priority ? 'Sim' : 'Não',
        lead.is_stale ? 'Sim' : 'Não',
        format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm'),
        lead.last_activity_at ? format(new Date(lead.last_activity_at), 'dd/MM/yyyy HH:mm') : '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const fileName = `crm-leads${pipelineName ? `-${pipelineName.toLowerCase().replace(/\s+/g, '-')}` : ''}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: `${leads.length} leads exportados com sucesso!` });
    } catch (error) {
      toast({ title: 'Erro ao exportar', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToJSON = () => {
    setIsExporting(true);
    try {
      const jsonContent = JSON.stringify(leads.map(lead => ({
        nome: lead.name,
        email: lead.email,
        telefone: lead.phone,
        whatsapp: lead.whatsapp,
        cpf: lead.cpf,
        prontuario: lead.prontuario,
        origem: lead.source,
        detalhe_origem: lead.source_detail,
        valor_estimado: lead.estimated_value,
        valor_contrato: lead.contract_value,
        lead_score: lead.lead_score,
        bant: {
          budget: lead.budget_score,
          authority: lead.authority_score,
          need: lead.need_score,
          timing: lead.timing_score,
        },
        procedimentos: lead.interested_procedures,
        tags: lead.tags,
        notas: lead.notes,
        prioridade: lead.is_priority,
        parado: lead.is_stale,
        criado_em: lead.created_at,
        ultima_atividade: lead.last_activity_at,
        ganho_em: lead.won_at,
        perdido_em: lead.lost_at,
        motivo_perda: lead.lost_reason,
      })), null, 2);

      const blob = new Blob([jsonContent], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const fileName = `crm-leads${pipelineName ? `-${pipelineName.toLowerCase().replace(/\s+/g, '-')}` : ''}-${format(new Date(), 'yyyy-MM-dd')}.json`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: `${leads.length} leads exportados com sucesso!` });
    } catch (error) {
      toast({ title: 'Erro ao exportar', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting || leads.length === 0}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exportar CSV ({leads.length} leads)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          <Download className="h-4 w-4 mr-2" />
          Exportar JSON ({leads.length} leads)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
