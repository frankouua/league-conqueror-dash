// Mapeamento de nome da instância para informações de exibição
export const instanceDisplayConfig: Record<string, { name: string; badge: string; badgeColor: string }> = {
  'INGRED_SOCIAL': { name: 'Ingred', badge: 'Social Selling', badgeColor: 'bg-pink-500 text-white' },
  'KETLEY_SDR': { name: 'Ketley', badge: 'SDR', badgeColor: 'bg-blue-500 text-white' },
  'ANA_PAULA_SDR': { name: 'Ana Paula', badge: 'SDR', badgeColor: 'bg-blue-500 text-white' },
  'VIVI_CS': { name: 'Vivi', badge: 'Customer Success', badgeColor: 'bg-teal-700 text-white' },
  'BIANCA_CLOSER': { name: 'Bianca', badge: 'Closer', badgeColor: 'bg-orange-500 text-white' },
  'KAMYLLE_FARMER': { name: 'Kamylle', badge: 'Farmer', badgeColor: 'bg-purple-500 text-white' },
  'LARISSA_CLOSER': { name: 'Larissa', badge: 'Closer', badgeColor: 'bg-orange-500 text-white' },
  'RODRIGO_SOCIAL': { name: 'Rodrigo', badge: 'Social Selling', badgeColor: 'bg-pink-500 text-white' },
  'PAULA_CS': { name: 'Paula', badge: 'Customer Success', badgeColor: 'bg-teal-700 text-white' },
  'LAYS_CLOSER': { name: 'Lays', badge: 'Farmer', badgeColor: 'bg-purple-500 text-white' },
  'DIEGO_COORDENADOR': { name: 'Diego', badge: 'Coordenador', badgeColor: 'bg-red-500 text-white' },
  'UNIQUE_API_OFICIAL': { name: 'Unique', badge: 'API Oficial', badgeColor: 'bg-green-700 text-white' },
  'UNIQUE_API_NAO_OFICIAL': { name: 'Unique', badge: 'API Não Oficial', badgeColor: 'bg-green-700 text-white' },
};

export function getInstanceDisplayInfo(instanceName: string): { name: string; badge: string; badgeColor: string } {
  const config = instanceDisplayConfig[instanceName];
  if (config) return config;
  
  // Fallback: format name and try to extract role from name
  const formatted = instanceName
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  
  return {
    name: formatted,
    badge: 'Membro',
    badgeColor: 'bg-muted text-muted-foreground'
  };
}
