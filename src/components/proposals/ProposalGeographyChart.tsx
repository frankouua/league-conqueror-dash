import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';
import { Globe, MapPin, TrendingUp, DollarSign } from 'lucide-react';
import type { CountryStats, CityStats } from '@/hooks/useProposalAnalytics';

interface ProposalGeographyChartProps {
  countryStats: CountryStats[];
  cityStats: CityStats[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8B5CF6',
  '#F59E0B',
  '#10B981',
  '#EF4444',
  '#6366F1',
];

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}K`;
  }
  return `R$ ${value.toFixed(0)}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  
  const data = payload[0].payload;
  
  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium">{label || data.name}</p>
      <div className="mt-1 space-y-1 text-muted-foreground">
        <p>Propostas: <span className="text-foreground font-medium">{data.count}</span></p>
        <p>Fechadas: <span className="text-green-500 font-medium">{data.closedCount}</span></p>
        <p>Conversão: <span className="text-foreground font-medium">{data.conversionRate?.toFixed(1)}%</span></p>
        <p>Valor: <span className="text-amber-500 font-medium">{formatCurrency(data.totalValue || 0)}</span></p>
      </div>
    </div>
  );
}

export function ProposalGeographyChart({ countryStats, cityStats }: ProposalGeographyChartProps) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const filteredCities = selectedCountry 
    ? cityStats.filter(c => c.country === selectedCountry)
    : cityStats;

  const topCountries = countryStats.slice(0, 10);
  const topCities = filteredCities.slice(0, 10);

  // Summary stats
  const totalCountries = countryStats.filter(c => c.country !== 'Não informado').length;
  const totalCities = cityStats.filter(c => c.city !== 'Não informada').length;
  const bestConversionCountry = [...countryStats]
    .filter(c => c.count >= 5 && c.country !== 'Não informado')
    .sort((a, b) => b.conversionRate - a.conversionRate)[0];
  const bestConversionCity = [...cityStats]
    .filter(c => c.count >= 3 && c.city !== 'Não informada')
    .sort((a, b) => b.conversionRate - a.conversionRate)[0];

  // Pie chart data for countries
  const pieData = topCountries.slice(0, 6).map((c, i) => ({
    name: c.country,
    value: c.count,
    fill: COLORS[i % COLORS.length],
    ...c
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Análise Geográfica
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Globe className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{totalCountries}</p>
            <p className="text-xs text-muted-foreground">Países</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <MapPin className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{totalCities}</p>
            <p className="text-xs text-muted-foreground">Cidades</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-sm font-bold truncate">{bestConversionCountry?.country || '-'}</p>
            <p className="text-xs text-muted-foreground">
              Melhor País ({bestConversionCountry?.conversionRate?.toFixed(0)}%)
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <p className="text-sm font-bold truncate">{bestConversionCity?.city || '-'}</p>
            <p className="text-xs text-muted-foreground">
              Melhor Cidade ({bestConversionCity?.conversionRate?.toFixed(0)}%)
            </p>
          </div>
        </div>

        <Tabs defaultValue="countries" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="countries">Por País</TabsTrigger>
            <TabsTrigger value="cities">Por Cidade</TabsTrigger>
          </TabsList>

          <TabsContent value="countries" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Bar Chart */}
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={topCountries} 
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" />
                    <YAxis 
                      type="category" 
                      dataKey="country" 
                      tick={{ fontSize: 12 }}
                      width={75}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Propostas" radius={[0, 4, 4, 0]}>
                      {topCountries.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                          cursor="pointer"
                          onClick={() => setSelectedCountry(
                            selectedCountry === entry.country ? null : entry.country
                          )}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart */}
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => 
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Country Table */}
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {countryStats.map((country, idx) => (
                  <div 
                    key={country.country}
                    className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                      selectedCountry === country.country 
                        ? 'bg-primary/10 border border-primary' 
                        : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedCountry(
                      selectedCountry === country.country ? null : country.country
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        #{idx + 1}
                      </span>
                      <span className="font-medium">{country.country}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <Badge variant="secondary">{country.count} propostas</Badge>
                      <span className="text-green-500 font-medium">
                        {country.conversionRate.toFixed(1)}%
                      </span>
                      <span className="text-amber-500 font-medium w-20 text-right">
                        {formatCurrency(country.totalValue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="cities" className="space-y-4">
            {selectedCountry && (
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="gap-1">
                  <Globe className="h-3 w-3" />
                  {selectedCountry}
                </Badge>
                <button 
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedCountry(null)}
                >
                  Limpar filtro
                </button>
              </div>
            )}

            {/* City Bar Chart */}
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={topCities} 
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="city" 
                    tick={{ fontSize: 12 }}
                    width={95}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Propostas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                    {topCities.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* City Table */}
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {filteredCities.map((city, idx) => (
                  <div 
                    key={`${city.city}-${city.country}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        #{idx + 1}
                      </span>
                      <div>
                        <span className="font-medium">{city.city}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({city.country})
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <Badge variant="secondary">{city.count} propostas</Badge>
                      <span className="text-green-500 font-medium">
                        {city.conversionRate.toFixed(1)}%
                      </span>
                      <span className="text-amber-500 font-medium w-20 text-right">
                        {formatCurrency(city.totalValue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
