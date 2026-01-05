// Departamentos/Grupos de procedimento - fonte única de verdade
export const DEPARTMENTS = [
  { name: "01 - CIRURGIA PLÁSTICA", key: "cirurgia_plastica", label: "Cirurgia Plástica", avgTicket: 60789 },
  { name: "02 - CONSULTA CIRURGIA PLÁSTICA", key: "consulta_cirurgia_plastica", label: "Consulta Cirurgia Plástica", avgTicket: 743 },
  { name: "03 - PÓS OPERATÓRIO", key: "pos_operatorio", label: "Pós Operatório", avgTicket: 2285 },
  { name: "04 - SOROTERAPIA / PROTOCOLOS NUTRICIONAIS", key: "soroterapia_protocolos", label: "Soroterapia / Protocolos Nutricionais", avgTicket: 7934 },
  { name: "08 - HARMONIZAÇÃO FACIAL E CORPORAL", key: "harmonizacao_facial_corporal", label: "Harmonização Facial e Corporal", avgTicket: 4502 },
  { name: "09 - SPA E ESTÉTICA", key: "spa_estetica", label: "Spa e Estética", avgTicket: 136 },
  { name: "UNIQUE TRAVEL EXPERIENCE", key: "unique_travel", label: "Unique Travel Experience", avgTicket: 2500 },
  { name: "LUXSKIN", key: "luxskin", label: "Luxskin", avgTicket: 2499 },
] as const;

export type DepartmentKey = typeof DEPARTMENTS[number]["key"];

// Helper para validar se um departamento existe
export const isValidDepartment = (key: string): key is DepartmentKey => {
  return DEPARTMENTS.some(d => d.key === key);
};

// Helper para obter label do departamento
export const getDepartmentLabel = (key: string): string => {
  const dept = DEPARTMENTS.find(d => d.key === key);
  return dept?.label ?? key;
};

// Helper para obter nome completo do departamento
export const getDepartmentFullName = (key: string): string => {
  const dept = DEPARTMENTS.find(d => d.key === key);
  return dept?.name ?? key;
};

// Helper para obter ticket médio do departamento pelo nome
export const getDepartmentAvgTicket = (departmentName: string): number => {
  const nameLower = departmentName.toLowerCase().trim();
  
  // Match by name patterns
  if (nameLower.startsWith("02") || (nameLower.includes("consulta") && nameLower.includes("cirurgia"))) {
    return 743;
  }
  if (nameLower.startsWith("01") || (nameLower.includes("cirurgia") && nameLower.includes("plástica"))) {
    return 60789;
  }
  if (nameLower.startsWith("03") || nameLower.includes("pós") || (nameLower.includes("pos") && nameLower.includes("operat"))) {
    return 2285;
  }
  if (nameLower.startsWith("04") || nameLower.includes("soroterapia") || nameLower.includes("protocolo") || nameLower.includes("nutricional")) {
    return 7934;
  }
  if (nameLower.startsWith("08") || nameLower.includes("harmoniza")) {
    return 4502;
  }
  if (nameLower.startsWith("09") || nameLower.includes("spa") || nameLower.includes("estética") || nameLower.includes("estetica")) {
    return 136;
  }
  if (nameLower.includes("travel") || nameLower.includes("unique travel")) {
    return 2500;
  }
  if (nameLower.includes("luxskin")) {
    return 2499;
  }
  
  // Default fallback
  return 5000;
};
