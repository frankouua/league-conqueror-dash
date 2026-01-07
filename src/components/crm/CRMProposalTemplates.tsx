import { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Download,
  Eye,
  DollarSign,
  Calendar,
  User,
  Building,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { CRMLead } from '@/hooks/useCRM';

interface ProposalTemplate {
  id: string;
  name: string;
  description: string;
  type: 'orcamento' | 'proposta' | 'contrato';
  sections: {
    title: string;
    content: string;
    variables: string[];
  }[];
  footer: string;
  createdAt: Date;
}

interface CRMProposalTemplatesProps {
  selectedLead?: CRMLead | null;
  onGenerate?: (html: string) => void;
}

// Sample templates
const defaultTemplates: ProposalTemplate[] = [
  {
    id: '1',
    name: 'Orçamento Padrão',
    description: 'Template básico para orçamentos',
    type: 'orcamento',
    sections: [
      {
        title: 'Dados do Cliente',
        content: 'Nome: {{nome}}\nTelefone: {{telefone}}\nEmail: {{email}}',
        variables: ['nome', 'telefone', 'email'],
      },
      {
        title: 'Procedimentos',
        content: '{{procedimentos}}',
        variables: ['procedimentos'],
      },
      {
        title: 'Valor Total',
        content: 'Investimento: R$ {{valor}}\nCondições: {{condicoes}}',
        variables: ['valor', 'condicoes'],
      },
    ],
    footer: 'Validade: 15 dias | Unique Clinic',
    createdAt: new Date(),
  },
  {
    id: '2',
    name: 'Proposta Comercial',
    description: 'Proposta completa com benefícios',
    type: 'proposta',
    sections: [
      {
        title: 'Apresentação',
        content: 'Prezado(a) {{nome}},\n\nÉ com grande satisfação que apresentamos nossa proposta personalizada.',
        variables: ['nome'],
      },
      {
        title: 'Solução Proposta',
        content: '{{descricao_proposta}}',
        variables: ['descricao_proposta'],
      },
      {
        title: 'Benefícios',
        content: '{{beneficios}}',
        variables: ['beneficios'],
      },
      {
        title: 'Investimento',
        content: 'Valor: R$ {{valor}}\nForma de pagamento: {{pagamento}}',
        variables: ['valor', 'pagamento'],
      },
    ],
    footer: 'Estamos à disposição para esclarecimentos.',
    createdAt: new Date(),
  },
  {
    id: '3',
    name: 'Contrato de Serviço',
    description: 'Contrato formal para fechamento',
    type: 'contrato',
    sections: [
      {
        title: 'Partes',
        content: 'CONTRATANTE: {{nome}}, CPF: {{cpf}}\nCONTRATADA: Unique Clinic',
        variables: ['nome', 'cpf'],
      },
      {
        title: 'Objeto',
        content: '{{objeto_contrato}}',
        variables: ['objeto_contrato'],
      },
      {
        title: 'Valores e Pagamento',
        content: 'Valor total: R$ {{valor}}\nForma: {{forma_pagamento}}',
        variables: ['valor', 'forma_pagamento'],
      },
      {
        title: 'Cláusulas',
        content: '{{clausulas}}',
        variables: ['clausulas'],
      },
    ],
    footer: 'Assinaturas: _________________ | _________________',
    createdAt: new Date(),
  },
];

export function CRMProposalTemplates({ selectedLead, onGenerate }: CRMProposalTemplatesProps) {
  const [templates, setTemplates] = useState<ProposalTemplate[]>(defaultTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<ProposalTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'orcamento': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'proposta': return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'contrato': return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      default: return '';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'orcamento': return 'Orçamento';
      case 'proposta': return 'Proposta';
      case 'contrato': return 'Contrato';
      default: return type;
    }
  };

  const handleSelectTemplate = (template: ProposalTemplate) => {
    setSelectedTemplate(template);
    // Pre-fill with lead data if available
    if (selectedLead) {
      setFormData({
        nome: selectedLead.name || '',
        telefone: selectedLead.phone || selectedLead.whatsapp || '',
        email: selectedLead.email || '',
        cpf: selectedLead.cpf || '',
        valor: selectedLead.estimated_value?.toString() || '',
        procedimentos: selectedLead.interested_procedures?.join(', ') || '',
      });
    }
    setShowEditor(true);
  };

  const handleGenerateDocument = () => {
    if (!selectedTemplate) return;
    
    setIsGenerating(true);
    
    // Generate HTML with replaced variables
    let html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px; }
            h2 { color: #333; margin-top: 30px; }
            .section { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; }
            .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e5e5e5; padding-top: 20px; }
            .date { text-align: right; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <p class="date">${new Date().toLocaleDateString('pt-BR')}</p>
          <h1>${selectedTemplate.name}</h1>
    `;

    selectedTemplate.sections.forEach((section) => {
      let content = section.content;
      section.variables.forEach((variable) => {
        const value = formData[variable] || `[${variable}]`;
        content = content.replace(new RegExp(`{{${variable}}}`, 'g'), value);
      });
      
      html += `
        <div class="section">
          <h2>${section.title}</h2>
          <p>${content.replace(/\n/g, '<br>')}</p>
        </div>
      `;
    });

    html += `
          <div class="footer">${selectedTemplate.footer}</div>
        </body>
      </html>
    `;

    setTimeout(() => {
      setIsGenerating(false);
      onGenerate?.(html);
      toast.success('Documento gerado com sucesso!');
      setShowPreview(true);
    }, 1000);
  };

  const handleDownload = () => {
    if (!selectedTemplate) return;
    
    // Create blob and download
    const blob = new Blob([`<html><body><h1>Documento</h1></body></html>`], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTemplate.name.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Download iniciado!');
  };

  // Get all unique variables from selected template
  const allVariables = selectedTemplate?.sections.flatMap(s => s.variables) || [];
  const uniqueVariables = [...new Set(allVariables)];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Templates de Propostas
            </CardTitle>
            <CardDescription>
              Crie orçamentos, propostas e contratos rapidamente
            </CardDescription>
          </div>
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card 
              key={template.id} 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => handleSelectTemplate(template)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                  <Badge variant="outline" className={getTypeColor(template.type)}>
                    {getTypeLabel(template.type)}
                  </Badge>
                </div>
                <h4 className="font-medium mb-1">{template.name}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <span>{template.sections.length} seções</span>
                  <span>•</span>
                  <span>{uniqueVariables.length} campos</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Template Editor Dialog */}
        <Dialog open={showEditor} onOpenChange={setShowEditor}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {selectedTemplate?.name}
              </DialogTitle>
              <DialogDescription>
                Preencha os campos para gerar o documento
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-4 pr-4">
                {selectedLead && (
                  <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{selectedLead.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Lead selecionado - dados preenchidos automaticamente
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                  </div>
                )}

                <Separator />

                {uniqueVariables.map((variable) => (
                  <div key={variable} className="space-y-2">
                    <Label htmlFor={variable} className="capitalize">
                      {variable.replace(/_/g, ' ')}
                    </Label>
                    {variable.includes('descricao') || variable.includes('clausulas') || variable.includes('beneficios') ? (
                      <Textarea
                        id={variable}
                        value={formData[variable] || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, [variable]: e.target.value }))}
                        placeholder={`Digite ${variable.replace(/_/g, ' ')}...`}
                        rows={3}
                      />
                    ) : (
                      <Input
                        id={variable}
                        value={formData[variable] || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, [variable]: e.target.value }))}
                        placeholder={`Digite ${variable.replace(/_/g, ' ')}...`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowEditor(false)}>
                Cancelar
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => setShowPreview(true)}>
                <Eye className="w-4 h-4" />
                Pré-visualizar
              </Button>
              <Button className="gap-2" onClick={handleGenerateDocument} disabled={isGenerating}>
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Gerar Documento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
