// Cargos que são considerados vendedores e têm metas
// Coordenadores, gerentes, assistentes e outros NÃO são vendedores

export const SELLER_POSITIONS = [
  'comercial_1_captacao',
  'comercial_2_closer', 
  'comercial_3_experiencia',
  'comercial_4_farmer',
  'sdr'
] as const;

export type SellerPosition = typeof SELLER_POSITIONS[number];

// Cargos de gestão/liderança que NÃO têm metas individuais
export const MANAGEMENT_POSITIONS = [
  'coordenador',
  'gerente',
  'assistente',
  'outro'
] as const;

/**
 * Verifica se um cargo é de vendedor (tem metas)
 */
export function isSeller(position: string | null | undefined): boolean {
  if (!position) return false;
  return SELLER_POSITIONS.includes(position as SellerPosition);
}

/**
 * Verifica se um cargo é de gestão (sem metas individuais)
 */
export function isManagement(position: string | null | undefined): boolean {
  if (!position) return true; // Se não tem cargo definido, não é vendedor
  return MANAGEMENT_POSITIONS.includes(position as any);
}

/**
 * Labels amigáveis para os cargos de vendedores
 */
export const SELLER_POSITION_LABELS: Record<string, string> = {
  comercial_1_captacao: "Comercial 1 - Captação",
  comercial_2_closer: "Comercial 2 - Closer",
  comercial_3_experiencia: "Comercial 3 - Customer Success",
  comercial_4_farmer: "Comercial 4 - Farmer",
  sdr: "SDR",
};

/**
 * Retorna o label do cargo ou "Vendedor" como fallback
 */
export function getPositionLabel(position: string | null | undefined): string {
  if (!position) return "Vendedor";
  return SELLER_POSITION_LABELS[position] || position;
}
