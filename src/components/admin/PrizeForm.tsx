import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trophy, Medal, Crown, Loader2, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

const PRIZE_TYPES = [
  { 
    value: 'monthly', 
    label: 'Mensal - R$ 1.000',
    icon: Trophy,
    defaultAmount: 1000,
    defaultItems: ['Troféu Rotativo Ouro CPI', 'Pulseiras dos Campeões']
  },
  { 
    value: 'semester', 
    label: 'Semestral - R$ 5.000',
    icon: Medal,
    defaultAmount: 5000,
    defaultItems: ['Medalhas de Elite', 'Troféu Elite CPI']
  },
  { 
    value: 'annual', 
    label: 'Anual - R$ 10.000',
    icon: Crown,
    defaultAmount: 10000,
    defaultItems: ['Taça Suprema Unique League', 'Hall da Fama']
  },
];

export default function PrizeForm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    team_id: '',
    prize_type: 'monthly',
    period_month: new Date().getMonth() + 1,
    period_semester: new Date().getMonth() < 6 ? 1 : 2,
    year: currentYear,
    amount: 1000,
    items: ['Troféu Rotativo Ouro CPI', 'Pulseiras dos Campeões'],
    extra_rewards: '',
    notes: '',
  });

  const [newItem, setNewItem] = useState('');

  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const createPrizeMutation = useMutation({
    mutationFn: async () => {
      const prizeData = {
        team_id: formData.team_id,
        prize_type: formData.prize_type,
        period_month: formData.prize_type === 'monthly' ? formData.period_month : null,
        period_semester: formData.prize_type === 'semester' ? formData.period_semester : null,
        year: formData.year,
        amount: formData.amount,
        items: formData.items,
        extra_rewards: formData.extra_rewards || null,
        notes: formData.notes || null,
        awarded_by: user?.id,
      };

      const { error } = await supabase.from('team_prizes').insert(prizeData);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Premiação registrada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['team-prizes'] });
      // Reset form but keep team selected
      const prizeType = PRIZE_TYPES.find(p => p.value === 'monthly')!;
      setFormData(prev => ({
        ...prev,
        prize_type: 'monthly',
        amount: prizeType.defaultAmount,
        items: prizeType.defaultItems,
        extra_rewards: '',
        notes: '',
      }));
    },
    onError: (error) => {
      toast.error('Erro ao registrar premiação');
      console.error(error);
    },
  });

  const handlePrizeTypeChange = (type: string) => {
    const prizeType = PRIZE_TYPES.find(p => p.value === type)!;
    setFormData(prev => ({
      ...prev,
      prize_type: type,
      amount: prizeType.defaultAmount,
      items: prizeType.defaultItems,
    }));
  };

  const addItem = () => {
    if (newItem.trim()) {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, newItem.trim()],
      }));
      setNewItem('');
    }
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.team_id) {
      toast.error('Selecione uma equipe');
      return;
    }
    createPrizeMutation.mutate();
  };

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Registrar Premiação
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Team Selection */}
          <div className="space-y-2">
            <Label>Equipe Vencedora</Label>
            <Select
              value={formData.team_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, team_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a equipe" />
              </SelectTrigger>
              <SelectContent>
                {teams?.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prize Type */}
          <div className="space-y-2">
            <Label>Tipo de Premiação</Label>
            <Select
              value={formData.prize_type}
              onValueChange={handlePrizeTypeChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIZE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="w-4 h-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period Selection based on type */}
          <div className="grid grid-cols-2 gap-4">
            {formData.prize_type === 'monthly' && (
              <div className="space-y-2">
                <Label>Mês</Label>
                <Select
                  value={formData.period_month.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, period_month: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.prize_type === 'semester' && (
              <div className="space-y-2">
                <Label>Semestre</Label>
                <Select
                  value={formData.period_semester.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, period_semester: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1º Semestre</SelectItem>
                    <SelectItem value="2">2º Semestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Ano</Label>
              <Select
                value={formData.year.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, year: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Valor do Prêmio (R$)</Label>
            <Input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              min={0}
              step={100}
            />
          </div>

          {/* Items */}
          <div className="space-y-2">
            <Label>Itens da Premiação</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.items.map((item, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1">
                  {item}
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar item..."
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
              />
              <Button type="button" variant="outline" size="icon" onClick={addItem}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Extra Rewards (for annual) */}
          {formData.prize_type === 'annual' && (
            <div className="space-y-2">
              <Label>Prêmio Extra</Label>
              <Input
                placeholder="Ex: Passagem aérea para viagem 2026"
                value={formData.extra_rewards}
                onChange={(e) => setFormData(prev => ({ ...prev, extra_rewards: e.target.value }))}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              placeholder="Observações adicionais..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full gap-2"
            disabled={createPrizeMutation.isPending}
          >
            {createPrizeMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trophy className="w-4 h-4" />
            )}
            Registrar Premiação
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
