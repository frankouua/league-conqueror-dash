import { useState } from 'react';
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  Sparkles, 
  Star, 
  Clock,
  UserX,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface QuickFilter {
  id: string;
  label: string;
  icon: typeof AlertTriangle;
  color: string;
  active: boolean;
}

interface CRMQuickFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: {
    staleOnly: boolean;
    priorityOnly: boolean;
    aiAnalyzedOnly: boolean;
    unassignedOnly: boolean;
    recentOnly: boolean;
    highValueOnly: boolean;
    qualifiedOnly: boolean;
    wonOnly: boolean;
    lostOnly: boolean;
  };
  onFiltersChange: (filters: CRMQuickFiltersProps['filters']) => void;
  activeFiltersCount: number;
}

export function CRMQuickFilters({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  activeFiltersCount,
}: CRMQuickFiltersProps) {
  const quickFilters: QuickFilter[] = [
    {
      id: 'staleOnly',
      label: 'Parados',
      icon: AlertTriangle,
      color: 'text-orange-500 bg-orange-500/10 hover:bg-orange-500/20',
      active: filters.staleOnly,
    },
    {
      id: 'priorityOnly',
      label: 'Prioritários',
      icon: Star,
      color: 'text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20',
      active: filters.priorityOnly,
    },
    {
      id: 'aiAnalyzedOnly',
      label: 'Com IA',
      icon: Sparkles,
      color: 'text-purple-500 bg-purple-500/10 hover:bg-purple-500/20',
      active: filters.aiAnalyzedOnly,
    },
    {
      id: 'unassignedOnly',
      label: 'Sem Responsável',
      icon: UserX,
      color: 'text-red-500 bg-red-500/10 hover:bg-red-500/20',
      active: filters.unassignedOnly,
    },
    {
      id: 'recentOnly',
      label: 'Recentes (24h)',
      icon: Clock,
      color: 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20',
      active: filters.recentOnly,
    },
    {
      id: 'highValueOnly',
      label: 'Alto Valor',
      icon: Filter,
      color: 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20',
      active: filters.highValueOnly,
    },
    {
      id: 'qualifiedOnly',
      label: 'Qualificados',
      icon: Filter,
      color: 'text-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20',
      active: filters.qualifiedOnly,
    },
  ];

  const toggleFilter = (filterId: string) => {
    onFiltersChange({
      ...filters,
      [filterId]: !filters[filterId as keyof typeof filters],
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      staleOnly: false,
      priorityOnly: false,
      aiAnalyzedOnly: false,
      unassignedOnly: false,
      recentOnly: false,
      highValueOnly: false,
      qualifiedOnly: false,
      wonOnly: false,
      lostOnly: false,
    });
    onSearchChange('');
  };

  const hasActiveFilters = activeFiltersCount > 0 || searchQuery.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Search and Filter Button Row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, telefone..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Filtros</h4>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={clearAllFilters}
                  >
                    Limpar
                  </Button>
                )}
              </div>
              <Separator />
              <div className="space-y-3">
                {quickFilters.map((filter) => (
                  <div key={filter.id} className="flex items-center gap-2">
                    <Checkbox
                      id={filter.id}
                      checked={filter.active}
                      onCheckedChange={() => toggleFilter(filter.id)}
                    />
                    <Label
                      htmlFor={filter.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <filter.icon className="w-4 h-4" />
                      {filter.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Quick Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {quickFilters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => toggleFilter(filter.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              filter.active
                ? filter.color + " ring-2 ring-offset-1 ring-current/30"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <filter.icon className="w-3.5 h-3.5" />
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}
