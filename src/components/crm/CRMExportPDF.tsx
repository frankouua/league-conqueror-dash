import { useState } from 'react';
import { FileDown, Loader2, FileText, Users, TrendingUp } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { CRMLead, CRMPipeline, CRMStage } from '@/hooks/useCRM';

interface CRMExportPDFProps {
  leads: CRMLead[];
  pipeline?: CRMPipeline;
  stages: CRMStage[];
  stats?: {
    totalLeads: number;
    totalValue: number;
    wonLeads: number;
    wonValue: number;
    lostLeads: number;
    conversionRate: number;
  };
}

export function CRMExportPDF({ leads, pipeline, stages, stats }: CRMExportPDFProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const generateLeadsReport = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(41, 37, 36);
      doc.text('Relatório de Leads', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(`Pipeline: ${pipeline?.name || 'Todos'}`, 14, 30);
      doc.text(`Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 36);

      // Stats summary
      if (stats) {
        doc.setFillColor(249, 250, 251);
        doc.rect(14, 42, pageWidth - 28, 20, 'F');
        
        doc.setFontSize(9);
        doc.setTextColor(55, 65, 81);
        
        const statsY = 54;
        const colWidth = (pageWidth - 28) / 4;
        
        doc.text(`Total: ${stats.totalLeads}`, 18, statsY);
        doc.text(`Valor: ${formatCurrency(stats.totalValue)}`, 18 + colWidth, statsY);
        doc.text(`Ganhos: ${stats.wonLeads}`, 18 + colWidth * 2, statsY);
        doc.text(`Conversão: ${stats.conversionRate.toFixed(1)}%`, 18 + colWidth * 3, statsY);
      }

      // Leads table
      const tableData = leads.map((lead) => {
        const stage = stages.find(s => s.id === lead.stage_id);
        return [
          lead.name,
          lead.phone || '-',
          stage?.name || '-',
          lead.estimated_value ? formatCurrency(lead.estimated_value) : '-',
          lead.days_in_stage ? `${lead.days_in_stage}d` : '0d',
          lead.source || '-',
        ];
      });

      autoTable(doc, {
        startY: stats ? 68 : 45,
        head: [['Nome', 'Telefone', 'Estágio', 'Valor Est.', 'Tempo', 'Origem']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [55, 65, 81],
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 28 },
          4: { cellWidth: 18 },
          5: { cellWidth: 30 },
        },
      });

      // Footer
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(
          `Página ${i} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      doc.save(`leads-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast({ title: 'PDF exportado com sucesso!' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const generateFunnelReport = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(20);
      doc.setTextColor(41, 37, 36);
      doc.text('Relatório de Funil', 14, 22);

      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(`Pipeline: ${pipeline?.name || 'Todos'}`, 14, 30);
      doc.text(`Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 36);

      // Stages breakdown
      const stageData = stages
        .filter(s => s.pipeline_id === pipeline?.id)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        .map((stage) => {
          const stageLeads = leads.filter(l => l.stage_id === stage.id);
          const stageValue = stageLeads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);
          return [
            stage.name,
            stageLeads.length.toString(),
            formatCurrency(stageValue),
            `${((stageLeads.length / leads.length) * 100 || 0).toFixed(1)}%`,
          ];
        });

      autoTable(doc, {
        startY: 45,
        head: [['Estágio', 'Leads', 'Valor Total', '% do Funil']],
        body: stageData,
        theme: 'striped',
        headStyles: {
          fillColor: [16, 185, 129],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [55, 65, 81],
        },
      });

      // Summary
      const finalY = (doc as any).lastAutoTable.finalY || 100;
      
      doc.setFillColor(239, 246, 255);
      doc.rect(14, finalY + 10, pageWidth - 28, 30, 'F');
      
      doc.setFontSize(12);
      doc.setTextColor(30, 64, 175);
      doc.text('Resumo', 18, finalY + 22);
      
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81);
      doc.text(`Total de Leads: ${leads.length}`, 18, finalY + 32);
      doc.text(`Valor Total em Pipeline: ${formatCurrency(leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0))}`, pageWidth / 2, finalY + 32);

      doc.save(`funil-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast({ title: 'Relatório de funil exportado!' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const generatePerformanceReport = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(20);
      doc.setTextColor(41, 37, 36);
      doc.text('Relatório de Performance', 14, 22);

      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(`Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 30);

      // KPIs
      const kpiY = 45;
      const kpiWidth = (pageWidth - 42) / 3;
      
      // Won
      doc.setFillColor(220, 252, 231);
      doc.rect(14, kpiY, kpiWidth, 35, 'F');
      doc.setFontSize(8);
      doc.setTextColor(22, 163, 74);
      doc.text('LEADS GANHOS', 18, kpiY + 10);
      doc.setFontSize(18);
      doc.text(stats?.wonLeads?.toString() || '0', 18, kpiY + 25);
      doc.setFontSize(9);
      doc.text(formatCurrency(stats?.wonValue || 0), 18, kpiY + 32);

      // Lost
      doc.setFillColor(254, 226, 226);
      doc.rect(14 + kpiWidth + 7, kpiY, kpiWidth, 35, 'F');
      doc.setTextColor(220, 38, 38);
      doc.setFontSize(8);
      doc.text('LEADS PERDIDOS', 18 + kpiWidth + 7, kpiY + 10);
      doc.setFontSize(18);
      doc.text(stats?.lostLeads?.toString() || '0', 18 + kpiWidth + 7, kpiY + 25);

      // Conversion
      doc.setFillColor(219, 234, 254);
      doc.rect(14 + (kpiWidth + 7) * 2, kpiY, kpiWidth, 35, 'F');
      doc.setTextColor(37, 99, 235);
      doc.setFontSize(8);
      doc.text('TAXA DE CONVERSÃO', 18 + (kpiWidth + 7) * 2, kpiY + 10);
      doc.setFontSize(18);
      doc.text(`${(stats?.conversionRate || 0).toFixed(1)}%`, 18 + (kpiWidth + 7) * 2, kpiY + 25);

      // Top leads by value
      const topLeads = [...leads]
        .filter(l => l.estimated_value)
        .sort((a, b) => (b.estimated_value || 0) - (a.estimated_value || 0))
        .slice(0, 10);

      if (topLeads.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(41, 37, 36);
        doc.text('Top 10 Leads por Valor', 14, kpiY + 50);

        autoTable(doc, {
          startY: kpiY + 55,
          head: [['Nome', 'Valor Estimado', 'Estágio', 'Dias no Estágio']],
          body: topLeads.map((lead) => {
            const stage = stages.find(s => s.id === lead.stage_id);
            return [
              lead.name,
              formatCurrency(lead.estimated_value || 0),
              stage?.name || '-',
              `${lead.days_in_stage || 0}d`,
            ];
          }),
          theme: 'striped',
          headStyles: {
            fillColor: [124, 58, 237],
            textColor: 255,
            fontSize: 9,
          },
          bodyStyles: {
            fontSize: 8,
          },
        });
      }

      doc.save(`performance-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast({ title: 'Relatório de performance exportado!' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4 mr-2" />
          )}
          Exportar PDF
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Escolha o relatório</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={generateLeadsReport}>
          <Users className="h-4 w-4 mr-2" />
          Lista de Leads
        </DropdownMenuItem>
        <DropdownMenuItem onClick={generateFunnelReport}>
          <FileText className="h-4 w-4 mr-2" />
          Relatório de Funil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={generatePerformanceReport}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Relatório de Performance
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
