import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Target, TrendingUp } from 'lucide-react';
import { OriginStats } from '@/hooks/useProposalAnalytics';

interface ProposalOriginChartProps {
  originStats: OriginStats[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)', // green
  'hsl(38, 92%, 50%)', // amber
  'hsl(262, 83%, 58%)', // purple
  'hsl(199, 89%, 48%)', // sky
  'hsl(346, 77%, 49%)', // rose
  'hsl(173, 80%, 40%)', // teal
  'hsl(280, 65%, 60%)', // violet
];

const CATEGORY_LABELS: Record<string, string> = {
  paid: 'Tráfego Pago',
  influencer: 'Influencers',
  social: 'Redes Sociais',
  referral: 'Indicação',
  organic: 'Orgânico',
  other: 'Outros',
};

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}K`;
  }
  return `R$ ${value.toFixed(0)}`;
}

export function ProposalOriginChart({ originStats }: ProposalOriginChartProps) {
  const totalCount = originStats.reduce((sum, o) => sum + o.count, 0);
  
  const chartData = originStats.map((o, index) => ({
    name: o.origin.length > 20 ? o.origin.substring(0, 20) + '...' : o.origin,
    fullName: o.origin,
    value: o.count,
    percentage: totalCount > 0 ? (o.count / totalCount) * 100 : 0,
    conversionRate: o.conversionRate,
    totalValue: o.totalValue,
    color: COLORS[index % COLORS.length],
  }));

  // Aggregate by category
  const categoryData = originStats.reduce((acc, o) => {
    const cat = o.category || 'other';
    if (!acc[cat]) {
      acc[cat] = { count: 0, closed: 0, value: 0 };
    }
    acc[cat].count += o.count;
    acc[cat].closed += o.closedCount;
    acc[cat].value += o.totalValue;
    return acc;
  }, {} as Record<string, { count: number; closed: number; value: number }>);

  const categoryStats = Object.entries(categoryData)
    .map(([cat, stats]) => ({
      category: cat,
      label: CATEGORY_LABELS[cat] || cat,
      ...stats,
      conversionRate: stats.count > 0 ? (stats.closed / stats.count) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.fullName}</p>
          <div className="text-sm text-muted-foreground space-y-1 mt-1">
            <p>Propostas: {data.value} ({data.percentage.toFixed(1)}%)</p>
            <p>Conversão: {data.conversionRate.toFixed(1)}%</p>
            <p>Valor: {formatCurrency(data.totalValue)}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Análise de Origens
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    formatter={(value) => <span className="text-sm">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Sem dados de origem
              </div>
            )}
          </div>

          {/* Category breakdown */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Por Categoria</h4>
            {categoryStats.map((cat) => (
              <div key={cat.category} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{cat.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {cat.count} propostas • {cat.closed} fechadas
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="font-bold">{cat.conversionRate.toFixed(1)}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(cat.value)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
