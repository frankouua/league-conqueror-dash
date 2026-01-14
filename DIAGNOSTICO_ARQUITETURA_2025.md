# 🏥 Diagnóstico de Arquitetura do Sistema
## Unique CPA - Sistema de Gestão Comercial & CRM

**Data:** Janeiro 2025  
**Versão:** 1.0  
**Classificação:** Interno - Estratégico

---

## 📋 Sumário Executivo

Este documento apresenta um diagnóstico completo da arquitetura atual do sistema Unique CPA, identificando **15 problemas críticos** que impactam diretamente a qualidade dos dados, a eficiência operacional e a capacidade de escalar o negócio.

### Principais Descobertas

| Categoria | Problemas Encontrados | Impacto |
|-----------|----------------------|---------|
| Entidade de Contato | Fragmentação em 7 tabelas | 🔴 Crítico |
| Integridade de Dados | Ausência de FKs obrigatórias | 🔴 Crítico |
| Duplicação de Dados | Sem constraints UNIQUE | 🔴 Crítico |
| Rastreabilidade | Histórico fragmentado | 🟠 Alto |
| Padronização | Nomenclatura inconsistente | 🟡 Médio |

### Visão Geral do Problema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SITUAÇÃO ATUAL - FRAGMENTADA                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                 │
│   │  crm_leads   │    │ patient_data │    │rfv_customers │                 │
│   │  name, cpf   │    │  name, cpf   │    │  name, cpf   │                 │
│   │  email, phone│    │ email, phone │    │ email, phone │                 │
│   └──────┬───────┘    └──────────────┘    └──────────────┘                 │
│          │ (opcional)         ╲                  ╱                          │
│          ▼                     ╲                ╱                           │
│   ┌──────────────┐              ╲              ╱                            │
│   │referral_leads│               ╲            ╱                             │
│   │referred_name │                ╲          ╱                              │
│   │   phone      │                 ╲        ╱                               │
│   └──────────────┘                  ╲      ╱                                │
│                                      ╲    ╱                                 │
│   ┌──────────────┐    ┌──────────────┐ ╲  ╱  ┌──────────────┐              │
│   │revenue_records│   │executed_records│ ╳  │ cancellations │              │
│   │ patient_name │    │ patient_name  │╱ ╲  │ patient_name  │              │
│   │ patient_cpf  │    │ patient_cpf   │    │ patient_phone │              │
│   └──────────────┘    └──────────────┘     └──────────────┘              │
│                                                                             │
│   ⚠️  MESMA PESSOA = 7 REGISTROS DIFERENTES SEM CONEXÃO                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔴 Problema #1: Entidades de Contato Fragmentadas

### Situação Atual

O mesmo paciente/contato pode existir em **7 tabelas diferentes** sem nenhuma garantia de vínculo entre elas:

| Tabela | Campos de Identificação | Propósito |
|--------|------------------------|-----------|
| `crm_leads` | name, email, phone, cpf, prontuario | Leads do CRM |
| `patient_data` | nome_paciente, email, telefone, cpf, prontuario | Dados de pacientes |
| `rfv_customers` | name, email, phone, cpf, prontuario | Análise RFV |
| `referral_leads` | referred_name, referred_phone, referred_email | Indicações |
| `revenue_records` | patient_name, patient_cpf | Vendas |
| `executed_records` | patient_name, patient_cpf | Procedimentos executados |
| `cancellations` | patient_name, patient_phone, patient_email | Cancelamentos |

### Por Que é um Problema

```
CENÁRIO REAL:
─────────────────────────────────────────────────────────────────

Maria Silva compra um procedimento:
  → Entra como LEAD no crm_leads (id: abc123)
  → Dados são importados em patient_data (id: def456)
  → Sistema calcula RFV e cria rfv_customers (id: ghi789)
  → Venda é registrada em revenue_records (sem FK, só texto)
  → Procedimento executado em executed_records (sem FK)

RESULTADO:
  • 5 registros da mesma pessoa
  • Nenhum vínculo garantido entre eles
  • Se Maria mudar o telefone, precisa atualizar em 5 lugares
  • Se quisermos ver "toda a jornada de Maria", precisamos
    fazer match por CPF/nome manualmente (sujeito a erros)

IMPACTO NO NEGÓCIO:
  ❌ Impossível ter visão 360° do paciente
  ❌ Dados inconsistentes entre sistemas
  ❌ Decisões baseadas em informações parciais
  ❌ Retrabalho para consolidar informações
```

### Como Deveria Ser

```
ARQUITETURA IDEAL:
─────────────────────────────────────────────────────────────────

                    ┌─────────────────────────┐
                    │       contacts          │
                    │ ─────────────────────── │
                    │ id (PK)                 │
                    │ cpf (UNIQUE)            │
                    │ email (UNIQUE)          │
                    │ phone                   │
                    │ prontuario (UNIQUE)     │
                    │ feegow_id (UNIQUE)      │
                    │ status: lead|cliente|   │
                    │         recorrente|     │
                    │         inativo         │
                    │ lifecycle_stage         │
                    │ first_contact_at        │
                    │ became_client_at        │
                    │ total_lifetime_value    │
                    └───────────┬─────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   crm_leads     │   │  transactions   │   │  rfv_metrics    │
│ ────────────────│   │ ────────────────│   │ ────────────────│
│ contact_id (FK) │   │ contact_id (FK) │   │ contact_id (FK) │
│ pipeline_id     │   │ type: venda|    │   │ recency_score   │
│ stage_id        │   │       exec|canc │   │ frequency_score │
│ deal_value      │   │ amount          │   │ value_score     │
│ ...             │   │ procedure       │   │ segment         │
└─────────────────┘   └─────────────────┘   └─────────────────┘

BENEFÍCIOS:
  ✅ Uma única fonte de verdade para o contato
  ✅ Atualização em um lugar reflete em todo sistema
  ✅ Visão 360° instantânea do paciente
  ✅ Integridade referencial garantida
  ✅ Histórico completo de jornada
```

### Dados Atuais (Estimativa de Duplicação)

```sql
-- Análise de potencial duplicação atual

-- Leads sem vínculo com patient_data
SELECT COUNT(*) FROM crm_leads WHERE patient_data_id IS NULL;
-- Resultado esperado: ~70% dos leads

-- Leads sem vínculo com RFV
SELECT COUNT(*) FROM crm_leads WHERE rfv_customer_id IS NULL;
-- Resultado esperado: ~90% dos leads

-- Clientes RFV sem vínculo com patient_data
SELECT COUNT(*) FROM rfv_customers WHERE patient_data_id IS NULL;
-- Resultado esperado: ~95% dos registros
```

---

## 🔴 Problema #2: Registros Transacionais Sem Foreign Keys

### Situação Atual

As tabelas de transações (vendas, procedimentos, cancelamentos) usam **campos de texto** para identificar o paciente, em vez de foreign keys:

```sql
-- Estrutura ATUAL de revenue_records
CREATE TABLE revenue_records (
  id UUID PRIMARY KEY,
  date DATE,
  patient_name TEXT,        -- ❌ Texto livre
  patient_cpf TEXT,         -- ❌ Sem FK
  procedure_name TEXT,
  value NUMERIC,
  seller_name TEXT,         -- ❌ Texto em vez de user_id
  ...
);

-- Estrutura ATUAL de executed_records
CREATE TABLE executed_records (
  id UUID PRIMARY KEY,
  execution_date DATE,
  patient_name TEXT,        -- ❌ Texto livre
  patient_cpf TEXT,         -- ❌ Sem FK
  procedure_name TEXT,
  value NUMERIC,
  ...
);

-- Estrutura ATUAL de cancellations
CREATE TABLE cancellations (
  id UUID PRIMARY KEY,
  patient_name TEXT,        -- ❌ Texto livre
  patient_phone TEXT,       -- ❌ Sem FK
  patient_email TEXT,
  contract_value NUMERIC,
  ...
);
```

### Por Que é um Problema

```
PROBLEMAS IDENTIFICADOS:
─────────────────────────────────────────────────────────────────

1. INCONSISTÊNCIA DE DADOS
   • "Maria Silva" vs "MARIA SILVA" vs "Maria da Silva"
   • "11999991234" vs "011999991234" vs "+5511999991234"
   • Mesmo paciente aparece como pessoas diferentes

2. IMPOSSIBILIDADE DE JOIN CONFIÁVEL
   • Não conseguimos ligar vendas ao histórico do cliente
   • Relatórios mostram dados parciais
   • BI fica comprometido

3. DADOS ÓRFÃOS
   • Vendas que não conseguimos atribuir a nenhum paciente
   • Procedimentos sem histórico de quem vendeu
   • Perda de rastreabilidade

4. COMPLIANCE E AUDITORIA
   • Difícil rastrear todas as interações de um paciente
   • LGPD: como garantir exclusão de todos os dados?
   • Auditoria médica comprometida

EXEMPLO REAL DE FALHA:
─────────────────────────────────────────────────────────────────

revenue_records:
  | patient_name    | patient_cpf   | value    |
  | Maria Silva     | 12345678900   | 5000.00  |
  | Maria S.        | 123.456.789-00| 3000.00  |
  | MARIA SILVA     | 12345678900   | 2000.00  |

  → Sistema não sabe que é a MESMA pessoa
  → RFV calcula errado (3 clientes de R$5k, R$3k, R$2k)
  → Deveria ser 1 cliente de R$10k (Campeão!)
```

### Como Deveria Ser

```sql
-- Estrutura IDEAL com FKs obrigatórias

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id),  -- ✅ FK obrigatória
  transaction_type TEXT NOT NULL,  -- 'venda', 'execucao', 'cancelamento'
  transaction_date DATE NOT NULL,
  procedure_id UUID REFERENCES procedures(id),       -- ✅ FK para procedimento
  amount NUMERIC NOT NULL,
  seller_id UUID REFERENCES profiles(user_id),       -- ✅ FK para vendedor
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(user_id)
);

-- Índices para performance
CREATE INDEX idx_transactions_contact ON transactions(contact_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_seller ON transactions(seller_id);

BENEFÍCIOS:
  ✅ Integridade referencial garantida
  ✅ JOINs confiáveis e performáticos
  ✅ Não existe "Maria Silva" texto, existe contact_id
  ✅ Histórico completo por paciente instantâneo
  ✅ Métricas de vendedor por FK, não por nome
```

---

## 🔴 Problema #3: Links Opcionais Entre Entidades Relacionadas

### Situação Atual

Campos que deveriam ser obrigatórios são opcionais, quebrando a integridade:

| Tabela | Campo | Tipo | Problema |
|--------|-------|------|----------|
| `crm_leads` | `patient_data_id` | UUID NULL | Lead pode não ter dados de paciente |
| `crm_leads` | `rfv_customer_id` | UUID NULL | Lead pode não ter RFV |
| `referral_leads` | `crm_lead_id` | UUID NULL | Indicação pode não virar lead |
| `protocol_offers` | `customer_id` | TEXT NULL | Oferta sem cliente |
| `revenue_records` | `user_id` | UUID NULL | Venda sem vendedor |
| `executed_records` | `user_id` | UUID NULL | Execução sem responsável |

### Por Que é um Problema

```
CENÁRIO:
─────────────────────────────────────────────────────────────────

HOJE (com campos opcionais):

  crm_leads:
    id: abc123
    name: "João Santos"
    patient_data_id: NULL      ← Sem vínculo!
    rfv_customer_id: NULL      ← Sem vínculo!

  patient_data:
    id: def456
    nome_paciente: "João Santos"
    cpf: "98765432100"
    
  rfv_customers:
    id: ghi789
    name: "Joao Santos"        ← Note: sem acento
    cpf: "987.654.321-00"      ← Note: formatado diferente

RESULTADO:
  • Sistema mostra João como 3 pessoas diferentes
  • RFV não reflete realidade do cliente
  • Vendedor não vê histórico completo
  • Decisões comerciais baseadas em dados parciais

IMPACTO FINANCEIRO:
─────────────────────────────────────────────────────────────────

  Se João é um cliente CAMPEÃO (alto RFV) mas no CRM aparece como
  LEAD NOVO, o vendedor pode:
  
  ❌ Oferecer desconto desnecessário
  ❌ Não priorizar o atendimento
  ❌ Perder oportunidade de cross-sell
  ❌ Não reconhecer a importância do cliente
```

### Como Deveria Ser

```sql
-- Estrutura com vínculos OBRIGATÓRIOS

-- crm_leads DEVE ter um contact_id
ALTER TABLE crm_leads
  ADD COLUMN contact_id UUID NOT NULL REFERENCES contacts(id);

-- Toda transação DEVE ter contact_id e seller_id
ALTER TABLE transactions
  ADD CONSTRAINT transactions_contact_required 
    CHECK (contact_id IS NOT NULL);
    
ALTER TABLE transactions
  ADD CONSTRAINT transactions_seller_required 
    CHECK (seller_id IS NOT NULL);

-- RFV é calculado por contato, não por texto
CREATE TABLE rfv_metrics (
  contact_id UUID PRIMARY KEY REFERENCES contacts(id),
  recency_score INTEGER NOT NULL,
  frequency_score INTEGER NOT NULL,
  value_score INTEGER NOT NULL,
  segment TEXT NOT NULL,
  last_calculated_at TIMESTAMPTZ DEFAULT now()
);

RESULTADO:
  ✅ Impossível criar lead sem contato
  ✅ Impossível registrar venda sem vendedor
  ✅ RFV sempre vinculado ao contato correto
  ✅ Visão 360° garantida por design
```

---

## 🔴 Problema #4: Dados Duplicados em Tabelas de Transação

### Situação Atual

As tabelas `revenue_records` e `executed_records` duplicam informações que deveriam estar centralizadas:

```sql
-- revenue_records contém:
  patient_name       -- Duplicado de contacts
  patient_cpf        -- Duplicado de contacts
  procedure_name     -- Deveria ser procedure_id
  seller_name        -- Deveria ser seller_id
  department         -- Deveria ser department_id
  team_name          -- Duplicado de teams
  origin             -- Campo de texto livre

-- executed_records contém:
  patient_name       -- Duplicado de contacts
  patient_cpf        -- Duplicado de contacts
  procedure_name     -- Deveria ser procedure_id
  professional_name  -- Deveria ser professional_id
  category           -- Deveria ser category_id
```

### Por Que é um Problema

```
PROBLEMAS:
─────────────────────────────────────────────────────────────────

1. INCONSISTÊNCIA INEVITÁVEL
   ┌────────────────────────────────────────────────────────────┐
   │ revenue_records                                            │
   │   patient_name: "Maria Silva"                              │
   │   seller_name: "João Vendedor"                             │
   │   team_name: "Time Lioness"                                │
   └────────────────────────────────────────────────────────────┘
   
   Maria mudou de nome para "Maria Santos" (casou)
   João foi transferido para "Time Troia"
   
   → Dados ANTIGOS ficam com informações DESATUALIZADAS
   → Relatórios históricos mostram dados inconsistentes

2. ESPAÇO DE ARMAZENAMENTO
   • "João Pedro Santos da Silva" × 10.000 registros = muito texto
   • UUID (16 bytes) × 10.000 = muito mais eficiente

3. DIFICULDADE DE MANUTENÇÃO
   • Precisa atualizar em múltiplos lugares
   • Risco de esquecer alguma tabela
   • Código de atualização mais complexo

4. PERFORMANCE DE QUERIES
   • JOIN por texto é mais lento que por UUID
   • Índices de texto são maiores
   • Comparação case-sensitive pode falhar
```

### Como Deveria Ser

```sql
-- Estrutura NORMALIZADA

CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES contacts(id),
  procedure_id UUID REFERENCES procedures(id),
  seller_id UUID REFERENCES profiles(user_id),
  team_id UUID REFERENCES teams(id),
  transaction_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_date DATE NOT NULL,
  origin_id UUID REFERENCES lead_origins(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Para relatórios, usamos VIEWs:
CREATE VIEW v_transactions_complete AS
SELECT 
  t.*,
  c.name as contact_name,
  c.cpf as contact_cpf,
  p.name as procedure_name,
  pr.full_name as seller_name,
  tm.name as team_name
FROM transactions t
JOIN contacts c ON t.contact_id = c.id
LEFT JOIN procedures p ON t.procedure_id = p.id
LEFT JOIN profiles pr ON t.seller_id = pr.user_id
LEFT JOIN teams tm ON t.team_id = tm.id;

BENEFÍCIOS:
  ✅ Fonte única de verdade
  ✅ Atualização automática em relatórios
  ✅ Performance otimizada
  ✅ Espaço de armazenamento reduzido
```

---

## 🔴 Problema #5: Métricas Calculadas Armazenadas em Múltiplos Lugares

### Situação Atual

Valores que deveriam ser calculados dinamicamente estão sendo armazenados e ficam desatualizados:

| Tabela | Campos Calculados | Problema |
|--------|------------------|----------|
| `crm_leads` | `total_value`, `total_procedures` | Desatualiza se venda for editada |
| `rfv_customers` | `total_spent`, `purchase_count`, `last_purchase_date` | Precisa recalcular manualmente |
| `patient_data` | `total_spent`, `procedure_count` | Duplica cálculo do RFV |
| `profiles` | `total_sales` (implícito) | Não existe, deveria existir |

### Por Que é um Problema

```
CENÁRIO DE DESATUALIZAÇÃO:
─────────────────────────────────────────────────────────────────

1. Venda registrada em revenue_records
2. Sistema atualiza crm_leads.total_value = 5000
3. Sistema atualiza rfv_customers.total_spent = 5000
4. Sistema atualiza patient_data.total_spent = 5000

5. ⚠️  Venda é ESTORNADA

6. revenue_records é atualizado/deletado
7. ❌ crm_leads.total_value ainda mostra 5000
8. ❌ rfv_customers.total_spent ainda mostra 5000
9. ❌ patient_data.total_spent ainda mostra 5000

RESULTADO:
  • 3 lugares com dados ERRADOS
  • RFV classifica cliente errado
  • Decisões baseadas em dados falsos
```

### Como Deveria Ser

```sql
-- Métricas calculadas sob demanda via VIEW ou FUNCTION

CREATE OR REPLACE FUNCTION get_contact_metrics(p_contact_id UUID)
RETURNS TABLE (
  total_spent NUMERIC,
  total_procedures INTEGER,
  first_purchase_date DATE,
  last_purchase_date DATE,
  avg_ticket NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(amount), 0) as total_spent,
    COUNT(*)::INTEGER as total_procedures,
    MIN(transaction_date) as first_purchase_date,
    MAX(transaction_date) as last_purchase_date,
    COALESCE(AVG(amount), 0) as avg_ticket
  FROM transactions
  WHERE contact_id = p_contact_id
    AND transaction_type IN ('venda', 'execucao');
END;
$$ LANGUAGE plpgsql;

-- Para performance, podemos usar MATERIALIZED VIEW com refresh
CREATE MATERIALIZED VIEW mv_contact_metrics AS
SELECT 
  contact_id,
  SUM(amount) as total_spent,
  COUNT(*) as total_procedures,
  MIN(transaction_date) as first_purchase_date,
  MAX(transaction_date) as last_purchase_date,
  AVG(amount) as avg_ticket
FROM transactions
WHERE transaction_type IN ('venda', 'execucao')
GROUP BY contact_id;

-- Refresh periódico (ou via trigger)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_contact_metrics;

BENEFÍCIOS:
  ✅ Sempre atualizado
  ✅ Uma única fonte de cálculo
  ✅ Sem risco de inconsistência
  ✅ Performance controlada
```

---

## 🔴 Problema #6: Ausência de Constraints UNIQUE

### Situação Atual

Tabelas críticas não possuem constraints de unicidade, permitindo duplicações:

```sql
-- patient_data: NENHUM campo único
-- Pode existir:
  | id  | cpf         | prontuario | nome_paciente |
  | 1   | 12345678900 | 1001       | Maria Silva   |
  | 2   | 12345678900 | 1001       | MARIA SILVA   |  ← DUPLICADO!
  | 3   | 12345678900 | 1002       | Maria S.      |  ← DUPLICADO!

-- rfv_customers: NENHUM campo único
-- Pode existir:
  | id  | cpf         | name        | segment   |
  | 1   | 12345678900 | Maria Silva | Campeões  |
  | 2   | 12345678900 | Maria Silva | Em Risco  |  ← DUPLICADO com segmento diferente!

-- crm_leads: NENHUM campo único
-- Pode existir múltiplos leads para mesmo email/telefone
```

### Por Que é um Problema

```
IMPACTO DIRETO:
─────────────────────────────────────────────────────────────────

1. DUPLICAÇÃO DE ESFORÇOS
   • Vendedor A trabalha lead "maria@email.com"
   • Vendedor B trabalha lead "maria@email.com" (duplicado)
   • Dois vendedores, mesmo cliente, esforço dobrado

2. MÉTRICAS INCORRETAS
   • Dashboard mostra 1000 clientes
   • Realidade: 700 clientes únicos + 300 duplicados
   • Decisões estratégicas baseadas em números inflados

3. COMUNICAÇÃO DUPLICADA
   • Cliente recebe 2 emails da mesma campanha
   • Cliente recebe 2 WhatsApps do mesmo vendedor
   • Imagem da empresa prejudicada

4. RFV FRAGMENTADO
   • Mesmo cliente em 2 segmentos diferentes
   • Estratégia de retenção inconsistente
   • Oportunidades perdidas

EXEMPLO REAL:
─────────────────────────────────────────────────────────────────

  Cliente "João" (CPF: 123.456.789-00) aparece:
  
  ┌─────────────┬───────────────────┬────────────┐
  │ Tabela      │ Registros         │ Valor      │
  ├─────────────┼───────────────────┼────────────┤
  │ rfv_customers│ ID 1 (João)      │ R$ 5.000   │
  │ rfv_customers│ ID 2 (JOAO)      │ R$ 3.000   │
  │ rfv_customers│ ID 3 (João S.)   │ R$ 2.000   │
  └─────────────┴───────────────────┴────────────┘
  
  Sistema calcula:
  ❌ 3 clientes de valor médio (R$3.333 cada)
  
  Realidade:
  ✅ 1 cliente de alto valor (R$10.000 - CAMPEÃO!)
```

### Como Deveria Ser

```sql
-- Constraints UNIQUE obrigatórias

-- Tabela contacts com unicidade garantida
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf TEXT,
  email TEXT,
  phone TEXT,
  prontuario TEXT,
  feegow_id TEXT,
  -- Constraints
  CONSTRAINT uq_contacts_cpf UNIQUE (cpf) WHERE cpf IS NOT NULL,
  CONSTRAINT uq_contacts_email UNIQUE (email) WHERE email IS NOT NULL,
  CONSTRAINT uq_contacts_prontuario UNIQUE (prontuario) WHERE prontuario IS NOT NULL,
  CONSTRAINT uq_contacts_feegow UNIQUE (feegow_id) WHERE feegow_id IS NOT NULL
);

-- Função para buscar ou criar contato (upsert inteligente)
CREATE OR REPLACE FUNCTION find_or_create_contact(
  p_cpf TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_contact_id UUID;
BEGIN
  -- Tenta encontrar por CPF
  IF p_cpf IS NOT NULL THEN
    SELECT id INTO v_contact_id FROM contacts WHERE cpf = p_cpf;
    IF FOUND THEN RETURN v_contact_id; END IF;
  END IF;
  
  -- Tenta encontrar por email
  IF p_email IS NOT NULL THEN
    SELECT id INTO v_contact_id FROM contacts WHERE email = p_email;
    IF FOUND THEN RETURN v_contact_id; END IF;
  END IF;
  
  -- Não encontrou, cria novo
  INSERT INTO contacts (cpf, email, phone, name)
  VALUES (p_cpf, p_email, p_phone, p_name)
  RETURNING id INTO v_contact_id;
  
  RETURN v_contact_id;
END;
$$ LANGUAGE plpgsql;

BENEFÍCIOS:
  ✅ Impossível criar duplicados
  ✅ Sistema força consolidação
  ✅ Métricas sempre corretas
  ✅ Um cliente = um registro
```

---

## 🟠 Problema #7: Tabelas Órfãs e Mal Relacionadas

### Situação Atual

Algumas tabelas existem isoladas, sem relacionamentos claros com o resto do sistema:

| Tabela | Problema |
|--------|----------|
| `nps_records` | Contém `respondent_name` (texto) sem FK para contato |
| `testimonial_records` | Contém `patient_name` (texto) sem FK |
| `other_indicators` | Campos genéricos sem estrutura |
| `quantity_goals` | Relacionamento fraco com metas individuais |
| `referral_records` | Separada de `referral_leads` sem vínculo claro |

### Por Que é um Problema

```
EXEMPLO - NPS:
─────────────────────────────────────────────────────────────────

HOJE:
  nps_records:
    | respondent_name | score | date       |
    | Maria Silva     | 9     | 2025-01-10 |
    
  → Quem é Maria Silva? 
  → É a mesma Maria do CRM?
  → Qual o histórico dela?
  → Ela é cliente recorrente?
  
  NÃO SABEMOS! Não tem FK.

DEVERIA SER:
  nps_responses:
    | contact_id | score | date       |
    | uuid-123   | 9     | 2025-01-10 |
    
  → JOIN com contacts e temos TUDO
  → Histórico completo
  → Correlação NPS × Valor × Recorrência
```

---

## 🟠 Problema #8: Histórico Fragmentado em Múltiplas Tabelas

### Situação Atual

O histórico de ações está espalhado em várias tabelas sem conexão:

```
┌─────────────────────────────────────────────────────────────────┐
│                    HISTÓRICOS FRAGMENTADOS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  crm_lead_history        → Ações no CRM                         │
│  referral_lead_history   → Ações em indicações                  │
│  cancellation_history    → Ações em cancelamentos               │
│  rfv_action_history      → Ações de retenção RFV                │
│  audit_log               → Log genérico de auditoria            │
│  crm_chat_messages       → Mensagens internas                   │
│  crm_lead_interactions   → Interações com cliente               │
│                                                                  │
│  ⚠️  7 tabelas de histórico diferentes!                         │
│  ⚠️  Impossível ver timeline unificada do paciente              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Por Que é um Problema

```
PERGUNTA DO GESTOR:
─────────────────────────────────────────────────────────────────

"O que aconteceu com o paciente João desde que ele entrou?"

RESPOSTA ATUAL:
  → Preciso consultar 7 tabelas
  → Fazer UNION de formatos diferentes
  → Ordenar manualmente
  → Esperar que nada tenha ficado de fora

RESPOSTA IDEAL:
  SELECT * FROM contact_timeline 
  WHERE contact_id = 'uuid-joao'
  ORDER BY created_at DESC;
  
  → Uma query, toda a jornada
```

### Como Deveria Ser

```sql
-- Timeline unificada

CREATE TABLE contact_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id),
  event_type TEXT NOT NULL,  -- 'lead_created', 'sale', 'nps', 'cancellation', etc.
  event_subtype TEXT,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  performed_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_timeline_contact ON contact_timeline(contact_id, created_at DESC);

-- Trigger automático para popular timeline
CREATE OR REPLACE FUNCTION log_to_timeline()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO contact_timeline (contact_id, event_type, title, metadata)
  VALUES (
    NEW.contact_id,
    TG_ARGV[0],  -- tipo do evento
    TG_ARGV[1],  -- título
    row_to_json(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 🟠 Problema #9: Campos JSON Não Estruturados

### Situação Atual

Diversos campos usam JSONB sem validação de schema:

| Tabela | Campo | Conteúdo |
|--------|-------|----------|
| `crm_leads` | `custom_fields` | Qualquer coisa |
| `crm_automations` | `actions` | Ações sem validação |
| `action_templates` | `form_fields` | Campos de formulário |
| `crm_cadences` | `trigger_config` | Configuração de trigger |

### Por Que é um Problema

```
EXEMPLO:
─────────────────────────────────────────────────────────────────

crm_leads.custom_fields pode conter:

  Lead 1: {"interesse": "botox", "budget": "5000"}
  Lead 2: {"INTERESSE": "Botox", "orcamento": "5k"}
  Lead 3: {"procedimento_interesse": "BOTOX", "valor_disponivel": 5000}

→ 3 formas diferentes de armazenar A MESMA INFORMAÇÃO
→ Impossível fazer relatório confiável
→ Validação inexistente
```

### Como Deveria Ser

```sql
-- Campos estruturados com validação

-- Para campos customizáveis, usar schema validation
ALTER TABLE crm_leads 
ADD CONSTRAINT valid_custom_fields 
CHECK (
  custom_fields IS NULL OR
  jsonb_typeof(custom_fields) = 'object'
);

-- Ou melhor: criar tabelas específicas
CREATE TABLE lead_custom_values (
  id UUID PRIMARY KEY,
  lead_id UUID REFERENCES crm_leads(id),
  field_id UUID REFERENCES custom_field_definitions(id),
  value_text TEXT,
  value_number NUMERIC,
  value_date DATE,
  value_boolean BOOLEAN
);

CREATE TABLE custom_field_definitions (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL,  -- 'text', 'number', 'date', 'boolean', 'select'
  options JSONB,  -- para tipo 'select'
  is_required BOOLEAN DEFAULT false
);
```

---

## 🟠 Problema #10: Sistemas de Pontuação Duplicados

### Situação Atual

Múltiplos sistemas de gamificação e scoring coexistem:

```
GAMIFICAÇÃO DE EQUIPES:
  → team_scores
  → cards
  → individual_goals

GAMIFICAÇÃO CRM:
  → crm_achievements
  → crm_user_achievements
  → crm_gamification_stats
  → crm_leaderboards

PONTUAÇÃO DE AÇÕES:
  → action_templates.points_value
  → action_dispatches.points_earned
  → action_responses.points_earned
```

### Por Que é um Problema

- Lógica de pontuação duplicada
- Difícil manter consistência
- Usuário pode ter pontuações diferentes dependendo de onde olha

---

## 🟡 Problema #11: Tabelas de Configuração Sem Versionamento

### Situação Atual

Configurações são alteradas sem histórico:

| Tabela | Problema |
|--------|----------|
| `whatsapp_config` | Sem audit trail |
| `email_config` | Sem histórico de mudanças |
| `sms_config` | Sem versionamento |
| `clicksign_config` | Sem controle de alterações |
| `crm_alert_config` | Sem log de quem alterou |

### Impacto

- Não sabemos quem mudou uma configuração
- Não conseguimos reverter para versão anterior
- Problemas de compliance

---

## 🟡 Problema #12: Pipelines/Stages Desacoplados

### Situação Atual

Algumas entidades usam ENUMs hardcoded em vez de pipelines configuráveis:

```sql
-- referral_leads usa ENUM
referral_lead_status: 
  'nova' | 'em_contato' | 'agendou' | 'nao_agendou' | 'ganho' | 'perdido' | ...

-- cancellations usa ENUM
cancellation_status:
  'pending_retention' | 'retained' | 'cancelled_with_fine' | ...

-- Enquanto crm_leads usa sistema de pipelines flexível
crm_leads → crm_stages → crm_pipelines
```

### Por Que é um Problema

- Não pode adicionar novos status sem migration
- Não pode customizar fluxo
- Código precisa conhecer todos os valores possíveis

---

## 🟡 Problema #13: Falta de Soft Delete

### Situação Atual

A maioria das tabelas não suporta soft delete:

```sql
-- Quando deletamos um lead, ele DESAPARECE
DELETE FROM crm_leads WHERE id = 'xxx';

-- Perdemos:
  → Todo histórico
  → Métricas históricas
  → Auditoria
  → Possibilidade de recuperar
```

### Como Deveria Ser

```sql
-- Soft delete padrão
ALTER TABLE crm_leads ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE crm_leads ADD COLUMN deleted_by UUID;

-- View para queries normais
CREATE VIEW active_leads AS
SELECT * FROM crm_leads WHERE deleted_at IS NULL;

-- Política RLS inclui filtro
CREATE POLICY "Ver apenas não deletados"
ON crm_leads FOR SELECT
USING (deleted_at IS NULL);
```

---

## 🟡 Problema #14: Campos de Auditoria Inconsistentes

### Situação Atual

Campos de auditoria não são padronizados:

| Padrão Esperado | Tabelas que TÊM | Tabelas que NÃO TÊM |
|-----------------|-----------------|---------------------|
| `created_at` | Maioria | Algumas |
| `updated_at` | ~60% | ~40% |
| `created_by` | ~30% | ~70% |
| `updated_by` | ~10% | ~90% |

---

## 🟡 Problema #15: Nomenclatura Inconsistente

### Situação Atual

| Conceito | Variações Encontradas |
|----------|----------------------|
| Paciente/Contato | `patient_name`, `nome_paciente`, `name`, `client_name`, `referred_name` |
| Telefone | `phone`, `telefone`, `patient_phone`, `referred_phone`, `contact_phone` |
| CPF | `cpf`, `patient_cpf`, `documento` |
| Responsável | `user_id`, `seller_id`, `created_by`, `assigned_to`, `owner_id` |
| Data | `date`, `created_at`, `execution_date`, `transaction_date`, `sale_date` |

### Impacto

- Confusão ao desenvolver
- Queries mais complexas
- Documentação mais difícil
- Onboarding de devs mais lento

---

## 📊 Matriz de Priorização

| # | Problema | Impacto | Esforço | Prioridade |
|---|----------|---------|---------|------------|
| 1 | Entidades fragmentadas | 🔴 Crítico | Alto | ⭐⭐⭐⭐⭐ |
| 2 | Sem FKs em transações | 🔴 Crítico | Alto | ⭐⭐⭐⭐⭐ |
| 3 | Links opcionais | 🔴 Crítico | Médio | ⭐⭐⭐⭐ |
| 6 | Sem UNIQUE constraints | 🔴 Crítico | Baixo | ⭐⭐⭐⭐ |
| 4 | Dados duplicados | 🟠 Alto | Alto | ⭐⭐⭐ |
| 5 | Métricas duplicadas | 🟠 Alto | Médio | ⭐⭐⭐ |
| 8 | Histórico fragmentado | 🟠 Alto | Médio | ⭐⭐⭐ |
| 7 | Tabelas órfãs | 🟠 Alto | Baixo | ⭐⭐ |
| 9 | JSON sem schema | 🟡 Médio | Médio | ⭐⭐ |
| 10 | Scoring duplicado | 🟡 Médio | Médio | ⭐⭐ |
| 11 | Config sem versão | 🟡 Médio | Baixo | ⭐ |
| 12 | Pipelines desacoplados | 🟡 Médio | Médio | ⭐ |
| 13 | Sem soft delete | 🟡 Médio | Baixo | ⭐ |
| 14 | Auditoria inconsistente | 🟡 Médio | Baixo | ⭐ |
| 15 | Nomenclatura | 🟡 Médio | Baixo | ⭐ |

---

## 🎯 Plano de Ação Recomendado

### Fase 1: Fundação (2-3 semanas)
1. Criar tabela `contacts` unificada
2. Adicionar constraints UNIQUE
3. Migrar dados existentes com deduplicação
4. Atualizar frontend para usar nova estrutura

### Fase 2: Integridade (2-3 semanas)
1. Adicionar FKs obrigatórias em transações
2. Criar tabela `transactions` unificada
3. Migrar `revenue_records` e `executed_records`
4. Criar timeline unificada

### Fase 3: Padronização (1-2 semanas)
1. Padronizar nomenclatura
2. Adicionar soft delete
3. Padronizar campos de auditoria
4. Documentar padrões

### Fase 4: Otimização (1-2 semanas)
1. Remover campos calculados duplicados
2. Criar views e functions para métricas
3. Otimizar índices
4. Testes de performance

---

## 📈 Benefícios Esperados

| Área | Antes | Depois |
|------|-------|--------|
| Visão do Cliente | Fragmentada em 7 tabelas | Unificada em 1 |
| Tempo para encontrar histórico | Minutos (múltiplas queries) | Segundos (1 query) |
| Risco de dados duplicados | Alto | Zero |
| Confiabilidade de métricas | Baixa | Alta |
| Onboarding de devs | Semanas | Dias |
| Manutenção de código | Complexa | Simples |

---

## 🏁 Conclusão

O sistema atual funciona, mas está construído sobre uma fundação frágil. A fragmentação de dados de contato é o problema central que causa efeito cascata em todo o resto.

**A recomendação é priorizar a criação da entidade `contacts` unificada**, pois ela resolve ou facilita a resolução de quase todos os outros problemas identificados.

Com a arquitetura corrigida, o sistema se tornará um verdadeiro **"supersistema"** capaz de:

- ✅ Visão 360° instantânea de qualquer paciente
- ✅ Jornada completa de ponta a ponta
- ✅ Métricas confiáveis e em tempo real
- ✅ Decisões baseadas em dados consistentes
- ✅ Escalabilidade para crescimento futuro

---

**Documento preparado por:** Sistema de Análise Arquitetural  
**Data:** Janeiro 2025  
**Versão:** 1.0
