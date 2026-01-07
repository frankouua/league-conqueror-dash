import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, User, Phone, Mail, Calendar, Loader2, CheckCircle2, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PatientData {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  cpf: string | null;
  prontuario: string | null;
  birth_date: string | null;
  origin: string | null;
  total_value_sold: number | null;
  total_value_executed: number | null;
}

interface CRMPatientSearchProps {
  onSelectPatient: (patient: PatientData) => void;
  onClose?: () => void;
}

export function CRMPatientSearch({ onSelectPatient, onClose }: CRMPatientSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: patients = [], isLoading, refetch } = useQuery({
    queryKey: ['patient-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];

      const { data, error } = await supabase
        .from('patient_data')
        .select('id, name, phone, whatsapp, email, cpf, prontuario, birth_date, origin, total_value_sold, total_value_executed')
        .or(`name.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,prontuario.ilike.%${searchTerm}%`)
        .limit(20);

      if (error) throw error;
      return data as PatientData[];
    },
    enabled: searchTerm.length >= 2,
  });

  const handleSelect = (patient: PatientData) => {
    setSelectedId(patient.id);
    onSelectPatient(patient);
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, CPF, telefone ou prontuário..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results */}
      {searchTerm.length >= 2 && (
        <ScrollArea className="h-[300px]">
          {patients.length > 0 ? (
            <div className="space-y-2">
              {patients.map((patient) => {
                const isSelected = selectedId === patient.id;
                const hasValue = (patient.total_value_sold || 0) + (patient.total_value_executed || 0) > 0;

                return (
                  <Card 
                    key={patient.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      isSelected && "ring-2 ring-primary bg-primary/5"
                    )}
                    onClick={() => handleSelect(patient)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium truncate">{patient.name}</span>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          
                          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {patient.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {patient.phone}
                              </div>
                            )}
                            {patient.email && (
                              <div className="flex items-center gap-1 truncate">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{patient.email}</span>
                              </div>
                            )}
                            {patient.cpf && (
                              <div>CPF: {patient.cpf}</div>
                            )}
                            {patient.prontuario && (
                              <div>Pront: {patient.prontuario}</div>
                            )}
                            {patient.birth_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(patient.birth_date), 'dd/MM/yyyy')}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          {patient.origin && (
                            <Badge variant="outline" className="text-xs">
                              {patient.origin}
                            </Badge>
                          )}
                          {hasValue && (
                            <Badge variant="secondary" className="text-xs text-green-600">
                              R$ {(((patient.total_value_sold || 0) + (patient.total_value_executed || 0)) / 1000).toFixed(1)}k
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : !isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Nenhum paciente encontrado</p>
              <p className="text-sm">Tente buscar por outro termo ou crie um novo lead</p>
            </div>
          ) : null}
        </ScrollArea>
      )}

      {searchTerm.length < 2 && (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Digite pelo menos 2 caracteres para buscar</p>
          <p className="text-sm">Busque por nome, CPF, telefone ou prontuário</p>
        </div>
      )}

      {/* Actions */}
      {onClose && (
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {selectedId && (
            <Button onClick={onClose}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Usar Paciente Selecionado
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
