import { useQuery, UseQueryOptions, QueryKey } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

/**
 * Hook otimizado para queries com caching agressivo e deduplicação
 * Reduz chamadas à API e melhora performance percebida
 */
export function useOptimizedQuery<TData = unknown, TError = unknown>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError, TData, QueryKey>, 'queryKey' | 'queryFn'>
) {
  // Memoize query function to prevent unnecessary re-renders
  const memoizedQueryFn = useCallback(queryFn, [JSON.stringify(queryKey)]);

  // Default options for optimal performance
  const optimizedOptions = useMemo(() => ({
    staleTime: 1000 * 60 * 2, // 2 minutes - data considered fresh
    gcTime: 1000 * 60 * 10,   // 10 minutes - cache retention
    refetchOnWindowFocus: false,
    refetchOnMount: 'always' as const,
    retry: 1,
    ...options,
  }), [options]);

  return useQuery({
    queryKey,
    queryFn: memoizedQueryFn,
    ...optimizedOptions,
  });
}

/**
 * Hook para queries que raramente mudam (configurações, enums, etc)
 */
export function useStaticQuery<TData = unknown, TError = unknown>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError, TData, QueryKey>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey,
    queryFn,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60,    // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    ...options,
  });
}

/**
 * Hook para queries em tempo real que precisam de refresh mais frequente
 */
export function useRealtimeQuery<TData = unknown, TError = unknown>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError, TData, QueryKey>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey,
    queryFn,
    staleTime: 1000 * 15, // 15 seconds
    gcTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchInterval: 1000 * 30, // Refresh every 30 seconds
    ...options,
  });
}
