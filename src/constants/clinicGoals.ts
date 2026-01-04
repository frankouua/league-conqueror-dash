/**
 * Metas Coletivas da Clínica - 2026
 * 
 * IMPORTANTE: Estas são as metas oficiais da clínica.
 * Altere APENAS aqui para atualizar em todo o sistema.
 */
export const CLINIC_GOALS = {
  META_1: 2500000, // R$ 2.500.000
  META_2: 2700000, // R$ 2.700.000
  META_3: 3000000, // R$ 3.000.000
} as const;

/**
 * Pontuação por atingimento de meta
 */
export const CLINIC_GOAL_POINTS = {
  META_1: 50,
  META_2: 50, // Adicional (total: 100)
  META_3: 100, // Adicional (total: 200)
} as const;
