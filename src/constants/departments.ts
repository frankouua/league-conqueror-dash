// Departamentos/Grupos de procedimento - fonte única de verdade
export const DEPARTMENTS = [
  { name: "01 - CIRURGIA PLÁSTICA", key: "cirurgia_plastica", label: "Cirurgia Plástica" },
  { name: "02 - CONSULTA CIRURGIA PLÁSTICA", key: "consulta_cirurgia_plastica", label: "Consulta Cirurgia Plástica" },
  { name: "03 - PÓS OPERATÓRIO", key: "pos_operatorio", label: "Pós Operatório" },
  { name: "04 - SOROTERAPIA / PROTOCOLOS NUTRICIONAIS", key: "soroterapia_protocolos", label: "Soroterapia / Protocolos Nutricionais" },
  { name: "08 - HARMONIZAÇÃO FACIAL E CORPORAL", key: "harmonizacao_facial_corporal", label: "Harmonização Facial e Corporal" },
  { name: "09 - SPA E ESTÉTICA", key: "spa_estetica", label: "Spa e Estética" },
  { name: "UNIQUE TRAVEL EXPERIENCE", key: "unique_travel", label: "Unique Travel Experience" },
  { name: "LUXSKIN", key: "luxskin", label: "Luxskin" },
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
