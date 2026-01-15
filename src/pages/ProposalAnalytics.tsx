import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, Download, Filter, RefreshCw, BarChart3, FileSpreadsheet } from 'lucide-react';
import { useProposalAnalytics, ProposalFilters } from '@/hooks/useProposalAnalytics';
import { ProposalUpload } from '@/components/proposals/ProposalUpload';
import { ProposalKPICards } from '@/components/proposals/ProposalKPICards';
import { ProposalSellerRanking } from '@/components/proposals/ProposalSellerRanking';
import { ProposalOriginChart } from '@/components/proposals/ProposalOriginChart';
import { ProposalTimeAnalysis } from '@/components/proposals/ProposalTimeAnalysis';
import { ProposalYearComparison } from '@/components/proposals/ProposalYearComparison';

const CURRENT_YEAR = new Date().getFullYear();

export default function ProposalAnalytics() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filters, setFilters] = useState<ProposalFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const {
    proposals,
    isLoading,
    refetch,
    kpis,
    sellerStats,
    originStats,
    yearlyStats,
    uniqueStatuses,
    uniqueOrigins
  } = useProposalAnalytics(filters);

  React.useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleFilterChange = (key: keyof ProposalFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const exportToCSV = () => {
    if (proposals.length === 0) return;

    const headers = [
      'Prontuário', 'Paciente', 'CPF', 'Telefone', 'Email',
      'Data Consulta', 'Data Contrato', 'Data Execução',
      'Status', 'Origem', 'Categoria Origem', 'Detalhe Origem',
      'Valor Contrato', 'Vendedor', 'Observações'
    ];

    const rows = proposals.map(p => [
      p.prontuario || '',
      p.patient_name,
      p.cpf || '',
      p.phone || '',
      p.email || '',
      p.consultation_date || '',
      p.contract_date || '',
      p.execution_date || '',
      p.negotiation_status || '',
      p.origin || '',
      p.origin_category || '',
      p.origin_detail || '',
      p.contract_value || '',
      p.seller_name || '',
      p.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `propostas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Análise de Propostas
            </h1>
            <p className="text-muted-foreground">
              KPIs de conversão, tempos e comparativos anuais
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {Object.values(filters).filter(Boolean).length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {Object.values(filters).filter(Boolean).length}
                </Badge>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={proposals.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Ano</label>
                  <Select 
                    value={filters.year?.toString() || 'all'} 
                    onValueChange={(v) => handleFilterChange('year', v === 'all' ? undefined : parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os anos</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Status</label>
                  <Select 
                    value={filters.status || 'all'} 
                    onValueChange={(v) => handleFilterChange('status', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      {uniqueStatuses.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Origem</label>
                  <Select 
                    value={filters.originCategory || 'all'} 
                    onValueChange={(v) => handleFilterChange('originCategory', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as origens</SelectItem>
                      {uniqueOrigins.map(origin => (
                        <SelectItem key={origin} value={origin}>{origin}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Data Início</label>
                  <input
                    type="date"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={filters.startDate || ''}
                    onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Data Fim</label>
                  <input
                    type="date"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={filters.endDate || ''}
                    onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
                  />
                </div>

                <div className="flex items-end">
                  <Button variant="ghost" onClick={clearFilters} className="w-full">
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6 mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : proposals.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma proposta encontrada</h3>
                  <p className="text-muted-foreground mb-4">
                    Faça o upload da planilha de controle de propostas para começar
                  </p>
                  <Button onClick={() => setActiveTab('upload')}>
                    <Upload className="h-4 w-4 mr-2" />
                    Fazer Upload
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* KPI Cards */}
                <ProposalKPICards kpis={kpis} />

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Seller Ranking */}
                  <ProposalSellerRanking sellerStats={sellerStats} />
                  
                  {/* Time Analysis */}
                  <ProposalTimeAnalysis 
                    avgConsultationToContract={kpis.avgConsultationToContract}
                    avgContractToExecution={kpis.avgContractToExecution}
                    avgClosingTime={kpis.avgClosingTime}
                  />
                </div>

                {/* Origin Analysis */}
                <ProposalOriginChart originStats={originStats} />

                {/* Year Comparison */}
                <ProposalYearComparison yearlyStats={yearlyStats} />
              </>
            )}
          </TabsContent>

          <TabsContent value="upload" className="mt-6">
            <ProposalUpload onSuccess={() => {
              refetch();
              setActiveTab('dashboard');
            }} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
