import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, BarChart, Bar 
} from 'recharts';
import { CalendarDays, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { YearlyStats } from '@/hooks/useProposalAnalytics';

interface ProposalYearComparisonProps {
  yearlyStats: YearlyStats[];
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const YEAR_COLORS: Record<number, string> = {
  2023: 'hsl(200, 80%, 50%)',
  2024: 'hsl(142, 76%, 36%)',
  2025: 'hsl(38, 92%, 50%)',
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

export function ProposalYearComparison({ yearlyStats }: ProposalYearComparisonProps) {
  // Organize data by month for comparison
  const comparisonData = useMemo(() => {
    const monthData: Record<number, Record<number, YearlyStats>> = {};
    
    yearlyStats.forEach(stat => {
      if (!monthData[stat.month]) {
        monthData[stat.month] = {};
      }
      monthData[stat.month][stat.year] = stat;
    });

    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const data: any = { month: MONTH_NAMES[i] };
      
      [2023, 2024, 2025].forEach(year => {
        const stat = monthData[month]?.[year];
        data[`proposals_${year}`] = stat?.proposals || 0;
        data[`value_${year}`] = stat?.closedValue || 0;
        data[`conversion_${year}`] = stat?.conversionRate || 0;
      });
      
      return data;
    });
  }, [yearlyStats]);

  // Calculate year totals
  const yearTotals = useMemo(() => {
    const totals: Record<number, { proposals: number; value: number; conversion: number; count: number }> = {};
    
    yearlyStats.forEach(stat => {
      if (!totals[stat.year]) {
        totals[stat.year] = { proposals: 0, value: 0, conversion: 0, count: 0 };
      }
      totals[stat.year].proposals += stat.proposals;
      totals[stat.year].value += stat.closedValue;
      totals[stat.year].conversion += stat.conversionRate;
      totals[stat.year].count++;
    });

    return Object.entries(totals)
      .map(([year, data]) => ({
        year: parseInt(year),
        proposals: data.proposals,
        value: data.value,
        avgConversion: data.count > 0 ? data.conversion / data.count : 0,
      }))
      .sort((a, b) => a.year - b.year);
  }, [yearlyStats]);

  // Calculate growth rates
  const getGrowth = (current: number, previous: number) => {
    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const GrowthIndicator = ({ value }: { value: number | null }) => {
    if (value === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    
    const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
    const color = value > 0 ? 'text-green-500' : value < 0 ? 'text-red-500' : 'text-muted-foreground';
    
    return (
      <span className={`flex items-center gap-1 text-sm ${color}`}>
        <Icon className="h-4 w-4" />
        {value > 0 ? '+' : ''}{value.toFixed(1)}%
      </span>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="text-sm flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}: {
                entry.name.includes('Valor') 
                  ? formatCurrency(entry.value)
                  : entry.name.includes('Conversão')
                    ? `${entry.value.toFixed(1)}%`
                    : entry.value
              }</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Comparativo Anual
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Year Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {yearTotals.map((yearData, index) => {
            const previousYear = yearTotals[index - 1];
            const proposalGrowth = previousYear ? getGrowth(yearData.proposals, previousYear.proposals) : null;
            const valueGrowth = previousYear ? getGrowth(yearData.value, previousYear.value) : null;
            
            return (
              <div 
                key={yearData.year}
                className="p-4 rounded-lg border"
                style={{ borderColor: YEAR_COLORS[yearData.year] || 'hsl(var(--border))' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <Badge 
                    style={{ backgroundColor: YEAR_COLORS[yearData.year] }}
                    className="text-white"
                  >
                    {yearData.year}
                  </Badge>
                  <GrowthIndicator value={proposalGrowth} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Propostas</span>
                    <span className="font-bold">{yearData.proposals}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Valor</span>
                    <span className="font-bold">{formatCurrency(yearData.value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Conversão</span>
                    <span className="font-bold">{yearData.avgConversion.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Proposals Chart */}
        <div>
          <h4 className="font-medium text-sm mb-3">Propostas por Mês</h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar name="2023" dataKey="proposals_2023" fill={YEAR_COLORS[2023]} />
                <Bar name="2024" dataKey="proposals_2024" fill={YEAR_COLORS[2024]} />
                <Bar name="2025" dataKey="proposals_2025" fill={YEAR_COLORS[2025]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Value Chart */}
        <div>
          <h4 className="font-medium text-sm mb-3">Valor Fechado por Mês</h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  name="Valor 2023" 
                  type="monotone" 
                  dataKey="value_2023" 
                  stroke={YEAR_COLORS[2023]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line 
                  name="Valor 2024" 
                  type="monotone" 
                  dataKey="value_2024" 
                  stroke={YEAR_COLORS[2024]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line 
                  name="Valor 2025" 
                  type="monotone" 
                  dataKey="value_2025" 
                  stroke={YEAR_COLORS[2025]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
