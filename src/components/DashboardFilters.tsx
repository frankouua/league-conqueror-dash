import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X, Users, Building2 } from "lucide-react";
import { DEPARTMENTS } from "@/constants/departments";

interface DashboardFiltersProps {
  onSellerFilterChange: (sellerId: string | null) => void;
  onDepartmentFilterChange: (department: string | null) => void;
  selectedSeller: string | null;
  selectedDepartment: string | null;
}

export function DashboardFilters({
  onSellerFilterChange,
  onDepartmentFilterChange,
  selectedSeller,
  selectedDepartment,
}: DashboardFiltersProps) {
  // Fetch all profiles (sellers)
  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-filters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, department")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const hasActiveFilters = selectedSeller || selectedDepartment;

  const clearFilters = () => {
    onSellerFilterChange(null);
    onDepartmentFilterChange(null);
  };

  const selectedSellerName = profiles?.find(p => p.user_id === selectedSeller)?.full_name;
  const selectedDeptLabel = DEPARTMENTS.find(d => d.key === selectedDepartment)?.label;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-xl border border-border">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium">Filtros:</span>
      </div>

      {/* Seller Filter */}
      <Select
        value={selectedSeller || "all"}
        onValueChange={(v) => onSellerFilterChange(v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[200px] bg-background">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <SelectValue placeholder="Todas as vendedoras" />
          </div>
        </SelectTrigger>
        <SelectContent className="bg-background border-border z-50 max-h-[300px]">
          <SelectItem value="all">Todas as vendedoras</SelectItem>
          {profiles?.map((profile) => (
            <SelectItem key={profile.user_id} value={profile.user_id}>
              {profile.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Department Filter */}
      <Select
        value={selectedDepartment || "all"}
        onValueChange={(v) => onDepartmentFilterChange(v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[220px] bg-background">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <SelectValue placeholder="Todos os departamentos" />
          </div>
        </SelectTrigger>
        <SelectContent className="bg-background border-border z-50 max-h-[300px]">
          <SelectItem value="all">Todos os departamentos</SelectItem>
          {DEPARTMENTS.map((dept) => (
            <SelectItem key={dept.key} value={dept.key}>
              {dept.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 ml-2">
          {selectedSeller && (
            <Badge variant="secondary" className="gap-1">
              <Users className="w-3 h-3" />
              {selectedSellerName}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => onSellerFilterChange(null)}
              />
            </Badge>
          )}
          {selectedDepartment && (
            <Badge variant="secondary" className="gap-1">
              <Building2 className="w-3 h-3" />
              {selectedDeptLabel}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => onDepartmentFilterChange(null)}
              />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-destructive hover:text-destructive"
          >
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
