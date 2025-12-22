import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Users, Building2, Calendar, DollarSign, BarChart3 } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

interface RevenueRecord {
  id: string;
  amount: number;
  date: string;
  user_id: string;
  department: string | null;
  notes: string | null;
  attributed_to_user_id: string | null;
}

interface Profile {
  user_id: string;
  full_name: string;
  department: string | null;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "#8884d8", "#82ca9d", "#ffc658"];

const DEPARTMENT_LABELS: Record<string, string> = {
  comercial: "Comercial",
  atendimento: "Atendimento",
  marketing: "Marketing",
  administrativo: "Administrativo",
  clinico: "Clínico",
};

const SalesDashboard = () => {
  const today = new Date();
  const [dateStart, setDateStart] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [dateEnd, setDateEnd] = useState(format(endOfMonth(today), "yyyy-MM-dd"));
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  const { data: revenues, isLoading: revenuesLoading } = useQuery({
    queryKey: ["sales-dashboard-revenues", dateStart, dateEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_records")
        .select("*")
        .gte("date", dateStart)
        .lte("date", dateEnd)
        .order("date", { ascending: true });

      if (error) throw error;
      return data as RevenueRecord[];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["all-profiles-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, department");

      if (error) throw error;
      return data as Profile[];
    },
  });

  const filteredRevenues = useMemo(() => {
    if (!revenues) return [];
    if (selectedDepartment === "all") return revenues;
    return revenues.filter((r) => r.department === selectedDepartment);
  }, [revenues, selectedDepartment]);

  const stats = useMemo(() => {
    if (!filteredRevenues.length) return { total: 0, avgPerSale: 0, totalSales: 0 };
    const total = filteredRevenues.reduce((sum, r) => sum + Number(r.amount), 0);
    return {
      total,
      avgPerSale: total / filteredRevenues.length,
      totalSales: filteredRevenues.length,
    };
  }, [filteredRevenues]);

  // By Seller
  const sellerData = useMemo(() => {
    if (!filteredRevenues.length || !profiles) return [];
    const byUser: Record<string, number> = {};
    
    filteredRevenues.forEach((r) => {
      const userId = r.attributed_to_user_id || r.user_id;
      byUser[userId] = (byUser[userId] || 0) + Number(r.amount);
    });

    return Object.entries(byUser)
      .map(([userId, amount]) => ({
        name: profiles.find((p) => p.user_id === userId)?.full_name || "Desconhecido",
        value: amount,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredRevenues, profiles]);

  // By Department
  const departmentData = useMemo(() => {
    if (!filteredRevenues.length) return [];
    const byDept: Record<string, number> = {};
    
    filteredRevenues.forEach((r) => {
      const dept = r.department || "não definido";
      byDept[dept] = (byDept[dept] || 0) + Number(r.amount);
    });

    return Object.entries(byDept).map(([dept, amount]) => ({
      name: DEPARTMENT_LABELS[dept] || dept,
      value: amount,
    }));
  }, [filteredRevenues]);

  // By Day (for line chart)
  const dailyData = useMemo(() => {
    if (!filteredRevenues.length) return [];
    const byDay: Record<string, number> = {};
    
    filteredRevenues.forEach((r) => {
      byDay[r.date] = (byDay[r.date] || 0) + Number(r.amount);
    });

    return Object.entries(byDay)
      .map(([date, amount]) => ({
        date,
        dateFormatted: format(parseISO(date), "dd/MM", { locale: ptBR }),
        amount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRevenues]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm font-medium">Dashboard de Vendas</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gradient-gold mb-2">
            Análise de Faturamento
          </h1>
          <p className="text-muted-foreground">
            Visualize vendas por vendedor, departamento e período
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data Inicial
                </Label>
                <Input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data Final
                </Label>
                <Input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Departamento
                </Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(DEPARTMENT_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Faturamento Total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gradient-gold">
                {formatCurrency(stats.total)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Ticket Médio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(stats.avgPerSale)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total de Vendas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                {stats.totalSales}
              </p>
            </CardContent>
          </Card>
        </div>

        {revenuesLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Revenue Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Evolução Diária
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="dateFormatted" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => `Data: ${label}`}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))" }}
                        name="Faturamento"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Sellers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Top Vendedores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sellerData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        type="number" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Faturamento" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* By Department */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Por Departamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={departmentData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {departmentData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <footer className="mt-16 pb-8 text-center">
          <p className="text-muted-foreground text-sm">
            © 2026 Unique CPI • Copa Unique League
          </p>
        </footer>
      </main>
    </div>
  );
};

export default SalesDashboard;
