import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

export interface ProposalData {
  id: string;
  prontuario: string | null;
  patient_name: string;
  cpf: string | null;
  phone: string | null;
  email: string | null;
  consultation_date: string | null;
  contract_date: string | null;
  execution_date: string | null;
  negotiation_status: string | null;
  stage: string | null;
  origin: string | null;
  origin_detail: string | null;
  origin_category: string | null;
  campaign_name: string | null;
  influencer_name: string | null;
  contract_value: number | null;
  estimated_value: number | null;
  seller_id: string | null;
  seller_name: string | null;
  crm_lead_id: string | null;
  feegow_id: string | null;
  country: string | null;
  city: string | null;
  notes: string | null;
  import_batch_id: string | null;
  year: number | null;
  month: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProposalFilters {
  startDate?: string;
  endDate?: string;
  year?: number;
  sellerId?: string;
  status?: string;
  originCategory?: string;
  minValue?: number;
  maxValue?: number;
}

export interface SellerStats {
  sellerId: string | null;
  sellerName: string;
  totalProposals: number;
  closedProposals: number;
  conversionRate: number;
  totalValue: number;
  avgClosingDays: number;
}

export interface OriginStats {
  origin: string;
  category: string;
  count: number;
  closedCount: number;
  conversionRate: number;
  totalValue: number;
}

export interface YearlyStats {
  year: number;
  month: number;
  proposals: number;
  closedValue: number;
  conversionRate: number;
}

export interface CountryStats {
  country: string;
  count: number;
  closedCount: number;
  conversionRate: number;
  totalValue: number;
}

export interface CityStats {
  city: string;
  country: string;
  count: number;
  closedCount: number;
  conversionRate: number;
  totalValue: number;
}

export function useProposalAnalytics(filters: ProposalFilters = {}) {
  const { data: proposals = [], isLoading, refetch } = useQuery({
    queryKey: ['proposal-control', filters],
    queryFn: async () => {
      let query = supabase
        .from('proposal_control')
        .select('*')
        .order('consultation_date', { ascending: false });

      if (filters.startDate) {
        query = query.gte('consultation_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('consultation_date', filters.endDate);
      }
      if (filters.year) {
        query = query.eq('year', filters.year);
      }
      if (filters.sellerId) {
        query = query.eq('seller_id', filters.sellerId);
      }
      if (filters.status) {
        query = query.eq('negotiation_status', filters.status);
      }
      if (filters.originCategory) {
        query = query.eq('origin_category', filters.originCategory);
      }
      if (filters.minValue) {
        query = query.gte('contract_value', filters.minValue);
      }
      if (filters.maxValue) {
        query = query.lte('contract_value', filters.maxValue);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProposalData[];
    }
  });

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!proposals.length) {
      return {
        totalProposals: 0,
        closedProposals: 0,
        conversionRate: 0,
        totalContractedValue: 0,
        avgClosingTime: 0,
        avgConsultationToContract: 0,
        avgContractToExecution: 0,
      };
    }

    const closedProposals = proposals.filter(p => 
      p.contract_date && (p.negotiation_status?.toLowerCase().includes('fechad') || 
                          p.negotiation_status?.toLowerCase().includes('ganho') ||
                          p.negotiation_status?.toLowerCase().includes('won'))
    );

    const totalContractedValue = closedProposals.reduce((sum, p) => sum + (p.contract_value || 0), 0);

    // Calculate average times
    let consultationToContractDays: number[] = [];
    let contractToExecutionDays: number[] = [];

    proposals.forEach(p => {
      if (p.consultation_date && p.contract_date) {
        const days = Math.floor(
          (new Date(p.contract_date).getTime() - new Date(p.consultation_date).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (days > 0 && days < 365) consultationToContractDays.push(days);
      }
      if (p.contract_date && p.execution_date) {
        const days = Math.floor(
          (new Date(p.execution_date).getTime() - new Date(p.contract_date).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (days > 0 && days < 365) contractToExecutionDays.push(days);
      }
    });

    const avgConsultationToContract = consultationToContractDays.length > 0
      ? Math.round(consultationToContractDays.reduce((a, b) => a + b, 0) / consultationToContractDays.length)
      : 0;

    const avgContractToExecution = contractToExecutionDays.length > 0
      ? Math.round(contractToExecutionDays.reduce((a, b) => a + b, 0) / contractToExecutionDays.length)
      : 0;

    return {
      totalProposals: proposals.length,
      closedProposals: closedProposals.length,
      conversionRate: proposals.length > 0 ? (closedProposals.length / proposals.length) * 100 : 0,
      totalContractedValue,
      avgClosingTime: avgConsultationToContract + avgContractToExecution,
      avgConsultationToContract,
      avgContractToExecution,
    };
  }, [proposals]);

  // Stats by seller
  const sellerStats = useMemo((): SellerStats[] => {
    const sellerMap = new Map<string, {
      sellerId: string | null;
      sellerName: string;
      proposals: ProposalData[];
    }>();

    proposals.forEach(p => {
      const key = p.seller_id || p.seller_name || 'Não identificado';
      if (!sellerMap.has(key)) {
        sellerMap.set(key, {
          sellerId: p.seller_id,
          sellerName: p.seller_name || 'Não identificado',
          proposals: []
        });
      }
      sellerMap.get(key)!.proposals.push(p);
    });

    return Array.from(sellerMap.values()).map(({ sellerId, sellerName, proposals }) => {
      const closed = proposals.filter(p => 
        p.contract_date && (p.negotiation_status?.toLowerCase().includes('fechad') || 
                            p.negotiation_status?.toLowerCase().includes('ganho') ||
                            p.negotiation_status?.toLowerCase().includes('won'))
      );

      let closingDays: number[] = [];
      proposals.forEach(p => {
        if (p.consultation_date && p.contract_date) {
          const days = Math.floor(
            (new Date(p.contract_date).getTime() - new Date(p.consultation_date).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (days > 0 && days < 365) closingDays.push(days);
        }
      });

      return {
        sellerId,
        sellerName,
        totalProposals: proposals.length,
        closedProposals: closed.length,
        conversionRate: proposals.length > 0 ? (closed.length / proposals.length) * 100 : 0,
        totalValue: closed.reduce((sum, p) => sum + (p.contract_value || 0), 0),
        avgClosingDays: closingDays.length > 0 
          ? Math.round(closingDays.reduce((a, b) => a + b, 0) / closingDays.length)
          : 0
      };
    }).sort((a, b) => b.conversionRate - a.conversionRate);
  }, [proposals]);

  // Stats by origin
  const originStats = useMemo((): OriginStats[] => {
    const originMap = new Map<string, ProposalData[]>();

    proposals.forEach(p => {
      const key = p.origin || p.origin_category || 'Não identificado';
      if (!originMap.has(key)) {
        originMap.set(key, []);
      }
      originMap.get(key)!.push(p);
    });

    return Array.from(originMap.entries()).map(([origin, items]) => {
      const closed = items.filter(p => 
        p.contract_date && (p.negotiation_status?.toLowerCase().includes('fechad') || 
                            p.negotiation_status?.toLowerCase().includes('ganho') ||
                            p.negotiation_status?.toLowerCase().includes('won'))
      );

      return {
        origin,
        category: items[0]?.origin_category || 'other',
        count: items.length,
        closedCount: closed.length,
        conversionRate: items.length > 0 ? (closed.length / items.length) * 100 : 0,
        totalValue: closed.reduce((sum, p) => sum + (p.contract_value || 0), 0)
      };
    }).sort((a, b) => b.count - a.count);
  }, [proposals]);

  // Yearly comparison
  const yearlyStats = useMemo((): YearlyStats[] => {
    const yearMonthMap = new Map<string, ProposalData[]>();

    proposals.forEach(p => {
      if (p.consultation_date) {
        const date = new Date(p.consultation_date);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        if (!yearMonthMap.has(key)) {
          yearMonthMap.set(key, []);
        }
        yearMonthMap.get(key)!.push(p);
      }
    });

    return Array.from(yearMonthMap.entries()).map(([key, items]) => {
      const [year, month] = key.split('-').map(Number);
      const closed = items.filter(p => 
        p.contract_date && (p.negotiation_status?.toLowerCase().includes('fechad') || 
                            p.negotiation_status?.toLowerCase().includes('ganho') ||
                            p.negotiation_status?.toLowerCase().includes('won'))
      );

      return {
        year,
        month,
        proposals: items.length,
        closedValue: closed.reduce((sum, p) => sum + (p.contract_value || 0), 0),
        conversionRate: items.length > 0 ? (closed.length / items.length) * 100 : 0
      };
    }).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }, [proposals]);

  // Unique statuses for filter
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>();
    proposals.forEach(p => {
      if (p.negotiation_status) statuses.add(p.negotiation_status);
    });
    return Array.from(statuses).sort();
  }, [proposals]);

  // Unique origins for filter
  const uniqueOrigins = useMemo(() => {
    const origins = new Set<string>();
    proposals.forEach(p => {
      if (p.origin_category) origins.add(p.origin_category);
      else if (p.origin) origins.add(p.origin);
    });
    return Array.from(origins).sort();
  }, [proposals]);

  // Stats by country
  const countryStats = useMemo((): CountryStats[] => {
    const countryMap = new Map<string, ProposalData[]>();

    proposals.forEach(p => {
      const key = p.country || 'Não informado';
      if (!countryMap.has(key)) {
        countryMap.set(key, []);
      }
      countryMap.get(key)!.push(p);
    });

    return Array.from(countryMap.entries()).map(([country, items]) => {
      const closed = items.filter(p => 
        p.contract_date && (p.negotiation_status?.toLowerCase().includes('fechad') || 
                            p.negotiation_status?.toLowerCase().includes('ganho') ||
                            p.negotiation_status?.toLowerCase().includes('won'))
      );

      return {
        country,
        count: items.length,
        closedCount: closed.length,
        conversionRate: items.length > 0 ? (closed.length / items.length) * 100 : 0,
        totalValue: closed.reduce((sum, p) => sum + (p.contract_value || 0), 0)
      };
    }).sort((a, b) => b.count - a.count);
  }, [proposals]);

  // Stats by city
  const cityStats = useMemo((): CityStats[] => {
    const cityMap = new Map<string, { country: string; items: ProposalData[] }>();

    proposals.forEach(p => {
      const cityKey = p.city || 'Não informada';
      if (!cityMap.has(cityKey)) {
        cityMap.set(cityKey, { country: p.country || 'Não informado', items: [] });
      }
      cityMap.get(cityKey)!.items.push(p);
    });

    return Array.from(cityMap.entries()).map(([city, { country, items }]) => {
      const closed = items.filter(p => 
        p.contract_date && (p.negotiation_status?.toLowerCase().includes('fechad') || 
                            p.negotiation_status?.toLowerCase().includes('ganho') ||
                            p.negotiation_status?.toLowerCase().includes('won'))
      );

      return {
        city,
        country,
        count: items.length,
        closedCount: closed.length,
        conversionRate: items.length > 0 ? (closed.length / items.length) * 100 : 0,
        totalValue: closed.reduce((sum, p) => sum + (p.contract_value || 0), 0)
      };
    }).sort((a, b) => b.count - a.count);
  }, [proposals]);

  // Unique countries for filter
  const uniqueCountries = useMemo(() => {
    const countries = new Set<string>();
    proposals.forEach(p => {
      if (p.country) countries.add(p.country);
    });
    return Array.from(countries).sort();
  }, [proposals]);

  // Unique cities for filter
  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    proposals.forEach(p => {
      if (p.city) cities.add(p.city);
    });
    return Array.from(cities).sort();
  }, [proposals]);

  return {
    proposals,
    isLoading,
    refetch,
    kpis,
    sellerStats,
    originStats,
    yearlyStats,
    countryStats,
    cityStats,
    uniqueStatuses,
    uniqueOrigins,
    uniqueCountries,
    uniqueCities
  };
}

export function useProposalImportLogs() {
  return useQuery({
    queryKey: ['proposal-import-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposal_import_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    }
  });
}
