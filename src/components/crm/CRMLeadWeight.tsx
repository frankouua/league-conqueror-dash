import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Scale, TrendingDown, AlertTriangle, CheckCircle2, Clock, Loader2, Plus } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface WeightTracking {
  id: string;
  lead_id: string;
  recorded_at: string;
  weight: number;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

interface CRMLeadWeightProps {
  leadId: string;
  initialWeight?: number | null;
  targetWeight?: number | null;
  deadline?: string | null;
}

export function CRMLeadWeight({ leadId, initialWeight, targetWeight, deadline }: CRMLeadWeightProps) {
  const queryClient = useQueryClient();
  const [newWeight, setNewWeight] = useState('');
  const [notes, setNotes] = useState('');

  const { data: history, isLoading } = useQuery({
    queryKey: ['weight-tracking', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_weight_tracking')
        .select('*')
        .eq('lead_id', leadId)
        .order('recorded_at', { ascending: true });
      
      if (error) throw error;
      return data as WeightTracking[];
    },
  });

  const addWeightMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('weight-protocol', {
        body: {
          action: 'record_weight',
          lead_id: leadId,
          weight_kg: parseFloat(newWeight),
          notes: notes || null,
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weight-tracking', leadId] });
      setNewWeight('');
      setNotes('');
      toast.success('Peso registrado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar peso: ' + (error as Error).message);
    },
  });

  const currentWeight = history && history.length > 0 
    ? history[history.length - 1].weight 
    : initialWeight;

  const weightLost = initialWeight && currentWeight 
    ? initialWeight - currentWeight 
    : 0;

  const weightToLose = initialWeight && targetWeight 
    ? initialWeight - targetWeight 
    : 0;

  const progressPercent = weightToLose > 0 
    ? Math.min(100, (weightLost / weightToLose) * 100) 
    : 0;

  const daysRemaining = deadline 
    ? differenceInDays(new Date(deadline), new Date()) 
    : null;

  const getStatusBadge = () => {
    if (!targetWeight || !deadline) return null;
    
    const onTrack = weightLost >= (weightToLose * (1 - (daysRemaining || 0) / 90));
    
    if (currentWeight && currentWeight <= targetWeight) {
      return <Badge className="gap-1 bg-green-500"><CheckCircle2 className="h-3 w-3" />Meta Atingida!</Badge>;
    }
    
    if (daysRemaining && daysRemaining < 0) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Prazo Expirado</Badge>;
    }
    
    if (onTrack) {
      return <Badge className="gap-1 bg-green-500"><TrendingDown className="h-3 w-3" />No Caminho Certo</Badge>;
    }
    
    return <Badge className="gap-1 bg-yellow-500"><AlertTriangle className="h-3 w-3" />Atenção</Badge>;
  };

  const chartData = history?.map(h => ({
    date: format(new Date(h.recorded_at), 'dd/MM'),
    weight: h.weight,
  })) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          <h3 className="font-semibold">Protocolo de Peso</h3>
          {getStatusBadge()}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{initialWeight || '-'} kg</div>
            <div className="text-xs text-muted-foreground">Peso Inicial</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{currentWeight?.toFixed(1) || '-'} kg</div>
            <div className="text-xs text-muted-foreground">Peso Atual</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{targetWeight || '-'} kg</div>
            <div className="text-xs text-muted-foreground">Meta</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {daysRemaining !== null ? daysRemaining : '-'}
            </div>
            <div className="text-xs text-muted-foreground">Dias Restantes</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      {weightToLose > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progresso</span>
              <span className="font-medium">{progressPercent.toFixed(0)}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Perdidos: {weightLost.toFixed(1)} kg</span>
              <span>Faltam: {(weightToLose - weightLost).toFixed(1)} kg</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Evolução do Peso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                  {targetWeight && (
                    <ReferenceLine 
                      y={targetWeight} 
                      stroke="hsl(var(--destructive))" 
                      strokeDasharray="5 5"
                      label={{ value: 'Meta', position: 'right' }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Weight */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Registrar Peso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Peso (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="80.5"
              />
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Após consulta nutricional"
              />
            </div>
          </div>
          <Button
            onClick={() => addWeightMutation.mutate()}
            disabled={!newWeight || addWeightMutation.isPending}
            className="gap-2"
          >
            {addWeightMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Scale className="h-4 w-4" />
            )}
            Registrar Peso
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      {history && history.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {[...history].reverse().map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm"
                >
                  <div>
                    <span className="font-medium">{record.weight} kg</span>
                    {record.notes && (
                      <span className="text-muted-foreground ml-2">- {record.notes}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(record.recorded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
