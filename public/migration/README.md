# 📦 Scripts de Migração - Unique League

## 🚀 Como usar

Execute os scripts **na ordem** no **SQL Editor** do Supabase de destino:

### Ordem de execução:

1. **`01_enums.sql`** - Cria os tipos ENUM
2. **`02_helper_functions.sql`** - Funções auxiliares para RLS
3. **`03_core_tables.sql`** - Tabelas principais (teams, profiles, records)
4. **`04_crm_tables.sql`** - Tabelas do CRM
5. **`05_additional_tables.sql`** - Tabelas adicionais (campaigns, rfv, etc)
6. **`06_rls_policies.sql`** - Políticas de segurança RLS
7. **`07_triggers.sql`** - Triggers de automação
8. **`08_initial_data.sql`** - Dados iniciais (teams, pipelines, stages)

## ⚠️ Importante

- Execute cada arquivo completamente antes de ir para o próximo
- Se der erro, verifique se o arquivo anterior foi executado
- Alguns erros de "already exists" são normais se rodar novamente

## 📊 Tabelas criadas

### Core (03)
- `teams` - Times
- `profiles` - Perfis de usuários
- `user_roles` - Papéis de usuários
- `predefined_goals` - Metas predefinidas
- `revenue_records` - Registros de receita
- `executed_records` - Registros de execução
- `nps_records` - Registros de NPS
- `testimonial_records` - Registros de depoimentos
- `referral_records` - Registros de indicações
- `other_indicators` - Outros indicadores

### CRM (04)
- `crm_pipelines` - Pipelines
- `crm_stages` - Etapas
- `crm_leads` - Leads
- `crm_lead_history` - Histórico de leads
- `crm_lead_interactions` - Interações
- `crm_tasks` - Tarefas
- `crm_lead_tasks` - Tarefas de leads
- `notifications` - Notificações
- `crm_notifications` - Notificações CRM

### Additional (05)
- `campaigns` - Campanhas
- `campaign_actions` - Ações de campanhas
- `campaign_materials` - Materiais
- `announcements` - Comunicados
- `rfv_customers` - Clientes RFV
- `referral_leads` - Leads de indicação
- `cancellations` - Cancelamentos
- `contestations` - Contestações
- `automation_logs` - Logs de automação
- `user_achievements` - Conquistas

## 🔐 Após migrar a estrutura

1. **Configure os secrets** no Supabase de destino:
   - `FEEGOW_API_TOKEN`
   - `CRON_SECRET`

2. **Importe os dados** usando a ferramenta de Data Import ou:
   - Export JSON do Lovable Cloud
   - INSERT statements gerados

3. **Crie o primeiro admin** usando a Edge Function `create-admin-user`

## 📝 Notas

- Total de ~144 tabelas no sistema original
- Este script cria as tabelas essenciais (~30 principais)
- Tabelas adicionais podem ser criadas conforme necessário
