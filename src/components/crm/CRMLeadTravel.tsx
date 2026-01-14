import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plane, Hotel, Car, CheckCircle2, Clock, Loader2, Save, MapPin, Heart, Users } from 'lucide-react';

interface LeadTravel {
  id: string;
  lead_id: string;
  origin_city: string | null;
  origin_state: string | null;
  arrival_date: string | null;
  arrival_time: string | null;
  arrival_flight: string | null;
  departure_date: string | null;
  departure_time: string | null;
  departure_flight: string | null;
  has_companion: boolean;
  companion_name: string | null;
  companion_phone: string | null;
  companion_relationship: string | null;
  hotel_name: string | null;
  hotel_address: string | null;
  hotel_check_in: string | null;
  hotel_check_out: string | null;
  hotel_confirmed: boolean;
  driver_name: string | null;
  driver_phone: string | null;
  driver_confirmed: boolean;
  needs_home_care: boolean;
  home_care_nurse: string | null;
  home_care_phone: string | null;
  home_care_days: number | null;
  all_confirmed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CRMLeadTravelProps {
  leadId: string;
}

export function CRMLeadTravel({ leadId }: CRMLeadTravelProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState<Partial<LeadTravel>>({
    origin_city: '',
    origin_state: '',
    arrival_date: '',
    arrival_time: '',
    arrival_flight: '',
    departure_date: '',
    departure_time: '',
    departure_flight: '',
    has_companion: false,
    companion_name: '',
    companion_phone: '',
    companion_relationship: '',
    hotel_name: '',
    hotel_address: '',
    hotel_check_in: '',
    hotel_check_out: '',
    hotel_confirmed: false,
    driver_name: '',
    driver_phone: '',
    driver_confirmed: false,
    needs_home_care: false,
    home_care_nurse: '',
    home_care_phone: '',
    home_care_days: null,
    notes: '',
  });

  const { data: travel, isLoading } = useQuery({
    queryKey: ['lead-travel', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_travel')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();
      
      if (error) throw error;
      return data as LeadTravel | null;
    },
  });

  useEffect(() => {
    if (travel) {
      setFormData({
        origin_city: travel.origin_city || '',
        origin_state: travel.origin_state || '',
        arrival_date: travel.arrival_date || '',
        arrival_time: travel.arrival_time || '',
        arrival_flight: travel.arrival_flight || '',
        departure_date: travel.departure_date || '',
        departure_time: travel.departure_time || '',
        departure_flight: travel.departure_flight || '',
        has_companion: travel.has_companion || false,
        companion_name: travel.companion_name || '',
        companion_phone: travel.companion_phone || '',
        companion_relationship: travel.companion_relationship || '',
        hotel_name: travel.hotel_name || '',
        hotel_address: travel.hotel_address || '',
        hotel_check_in: travel.hotel_check_in || '',
        hotel_check_out: travel.hotel_check_out || '',
        hotel_confirmed: travel.hotel_confirmed || false,
        driver_name: travel.driver_name || '',
        driver_phone: travel.driver_phone || '',
        driver_confirmed: travel.driver_confirmed || false,
        needs_home_care: travel.needs_home_care || false,
        home_care_nurse: travel.home_care_nurse || '',
        home_care_phone: travel.home_care_phone || '',
        home_care_days: travel.home_care_days || null,
        notes: travel.notes || '',
      });
    }
  }, [travel]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Calculate organization status
      const items = [
        formData.arrival_date && formData.arrival_time,
        formData.departure_date && formData.departure_time,
        formData.hotel_confirmed,
        formData.driver_confirmed || !formData.driver_name,
        !formData.has_companion || formData.companion_name,
      ];
      const allConfirmed = items.every(Boolean);

      if (travel?.id) {
        const { error } = await supabase
          .from('lead_travel')
          .update({
            ...formData,
            all_confirmed: allConfirmed,
            updated_at: new Date().toISOString(),
          })
          .eq('id', travel.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lead_travel')
          .insert({
            lead_id: leadId,
            ...formData,
            all_confirmed: allConfirmed,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-travel', leadId] });
      setIsEditing(false);
      toast.success('Dados de viagem salvos!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar: ' + (error as Error).message);
    },
  });

  const getStatusBadge = (allConfirmed: boolean) => {
    if (allConfirmed) {
      return <Badge className="gap-1 bg-green-500"><CheckCircle2 className="h-3 w-3" />Completo</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pendente</Badge>;
  };

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
          <Plane className="h-5 w-5" />
          <h3 className="font-semibold">Unique Travel</h3>
          {travel && getStatusBadge(travel.all_confirmed)}
        </div>
        <Button
          variant={isEditing ? 'default' : 'outline'}
          size="sm"
          onClick={() => isEditing ? saveMutation.mutate() : setIsEditing(true)}
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isEditing ? (
            <>
              <Save className="h-4 w-4" />
              Salvar
            </>
          ) : (
            'Editar'
          )}
        </Button>
      </div>

      {/* Origin */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Origem
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input
              value={formData.origin_city || ''}
              onChange={(e) => setFormData({ ...formData, origin_city: e.target.value })}
              disabled={!isEditing}
              placeholder="São Paulo"
            />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Input
              value={formData.origin_state || ''}
              onChange={(e) => setFormData({ ...formData, origin_state: e.target.value })}
              disabled={!isEditing}
              placeholder="SP"
            />
          </div>
        </CardContent>
      </Card>

      {/* Arrival */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plane className="h-4 w-4" />
            Chegada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Chegada</Label>
              <Input
                type="date"
                value={formData.arrival_date || ''}
                onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label>Horário</Label>
              <Input
                type="time"
                value={formData.arrival_time || ''}
                onChange={(e) => setFormData({ ...formData, arrival_time: e.target.value })}
                disabled={!isEditing}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Número do Voo</Label>
            <Input
              value={formData.arrival_flight || ''}
              onChange={(e) => setFormData({ ...formData, arrival_flight: e.target.value })}
              disabled={!isEditing}
              placeholder="LA1234"
            />
          </div>
        </CardContent>
      </Card>

      {/* Departure */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plane className="h-4 w-4 rotate-45" />
            Partida
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Partida</Label>
              <Input
                type="date"
                value={formData.departure_date || ''}
                onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label>Horário</Label>
              <Input
                type="time"
                value={formData.departure_time || ''}
                onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
                disabled={!isEditing}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Número do Voo</Label>
            <Input
              value={formData.departure_flight || ''}
              onChange={(e) => setFormData({ ...formData, departure_flight: e.target.value })}
              disabled={!isEditing}
              placeholder="LA4321"
            />
          </div>
        </CardContent>
      </Card>

      {/* Hotel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Hotel className="h-4 w-4" />
            Hospedagem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Hotel</Label>
            <Input
              value={formData.hotel_name || ''}
              onChange={(e) => setFormData({ ...formData, hotel_name: e.target.value })}
              disabled={!isEditing}
              placeholder="Hotel Exemplo"
            />
          </div>
          <div className="space-y-2">
            <Label>Endereço</Label>
            <Input
              value={formData.hotel_address || ''}
              onChange={(e) => setFormData({ ...formData, hotel_address: e.target.value })}
              disabled={!isEditing}
              placeholder="Rua Exemplo, 123"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Check-in</Label>
              <Input
                type="date"
                value={formData.hotel_check_in || ''}
                onChange={(e) => setFormData({ ...formData, hotel_check_in: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label>Check-out</Label>
              <Input
                type="date"
                value={formData.hotel_check_out || ''}
                onChange={(e) => setFormData({ ...formData, hotel_check_out: e.target.value })}
                disabled={!isEditing}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={formData.hotel_confirmed || false}
              onCheckedChange={(checked) => setFormData({ ...formData, hotel_confirmed: checked })}
              disabled={!isEditing}
            />
            <Label>Reserva Confirmada</Label>
          </div>
        </CardContent>
      </Card>

      {/* Driver */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Car className="h-4 w-4" />
            Motorista
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Motorista</Label>
              <Input
                value={formData.driver_name || ''}
                onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={formData.driver_phone || ''}
                onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                disabled={!isEditing}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={formData.driver_confirmed || false}
              onCheckedChange={(checked) => setFormData({ ...formData, driver_confirmed: checked })}
              disabled={!isEditing}
            />
            <Label>Motorista Confirmado</Label>
          </div>
        </CardContent>
      </Card>

      {/* Companion */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Acompanhante
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={formData.has_companion || false}
              onCheckedChange={(checked) => setFormData({ ...formData, has_companion: checked })}
              disabled={!isEditing}
            />
            <Label>Terá Acompanhante</Label>
          </div>
          
          {formData.has_companion && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={formData.companion_name || ''}
                    onChange={(e) => setFormData({ ...formData, companion_name: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={formData.companion_phone || ''}
                    onChange={(e) => setFormData({ ...formData, companion_phone: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Parentesco/Relação</Label>
                <Input
                  value={formData.companion_relationship || ''}
                  onChange={(e) => setFormData({ ...formData, companion_relationship: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Mãe, Esposo(a), Amigo(a)..."
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Home Care */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Home Care
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={formData.needs_home_care || false}
              onCheckedChange={(checked) => setFormData({ ...formData, needs_home_care: checked })}
              disabled={!isEditing}
            />
            <Label>Precisa de Enfermeira Home Care</Label>
          </div>
          
          {formData.needs_home_care && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Enfermeira</Label>
                  <Input
                    value={formData.home_care_nurse || ''}
                    onChange={(e) => setFormData({ ...formData, home_care_nurse: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={formData.home_care_phone || ''}
                    onChange={(e) => setFormData({ ...formData, home_care_phone: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dias de Acompanhamento</Label>
                <Input
                  type="number"
                  value={formData.home_care_days || ''}
                  onChange={(e) => setFormData({ ...formData, home_care_days: parseInt(e.target.value) || null })}
                  disabled={!isEditing}
                  placeholder="3"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Observações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Notas Gerais</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={!isEditing}
              placeholder="Outras observações..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
