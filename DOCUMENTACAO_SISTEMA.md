# 📚 DOCUMENTAÇÃO COMPLETA DO SISTEMA

## 🏢 Visão Geral

Este é um **Sistema de Gestão Comercial e CRM** desenvolvido para clínicas de estética/saúde. O sistema integra metas de vendas, gamificação por equipes, CRM completo, análise RFV, e múltiplas ferramentas de produtividade para vendedores.

**Stack Tecnológico:**
- **Frontend:** React 18 + TypeScript + Vite
- **Estilização:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Lovable Cloud)
- **Estado:** TanStack React Query
- **Gráficos:** Recharts
- **Roteamento:** React Router DOM

---

## 🗺️ ESTRUTURA DE PÁGINAS

### Páginas Públicas
| Rota | Página | Descrição |
|------|--------|-----------|
| `/auth` | Auth.tsx | Login de usuários |
| `/register` | Register.tsx | Cadastro de novos usuários |
| `/reset-password` | ResetPassword.tsx | Recuperação de senha |
| `/pending-approval` | PendingApproval.tsx | Aguardando aprovação de cadastro |
| `/tv` | TVDisplay.tsx | Display para TV (rankings em tempo real) |

### Páginas Protegidas (Todos os Usuários)
| Rota | Página | Descrição |
|------|--------|-----------|
| `/` | Index.tsx | **Dashboard Principal** - Metas, rankings, progresso |
| `/crm` | CRM.tsx | **CRM Completo** - Gestão de leads e vendas |
| `/comercial` | Comercial.tsx | Hub Comercial - Acesso rápido a ferramentas de vendas |
| `/calendario` | Calendario.tsx | Calendário unificado de eventos e tarefas |
| `/alavancas` | Alavancas.tsx | Estratégias de alavancagem de vendas |
| `/onboarding-goals` | OnboardingGoals.tsx | Definição de metas individuais |
| `/data-reports` | DataReports.tsx | Relatórios e análises de dados |
| `/guides` | Guides.tsx | Guias e treinamentos |
| `/referral-leads` | ReferralLeads.tsx | Gestão de leads por indicação |
| `/campanhas` | Campaigns.tsx | Campanhas de vendas ativas |
| `/guias-comerciais` | CommercialGuides.tsx | Scripts e guias comerciais |
| `/cancellations` | Cancellations.tsx | Gestão de cancelamentos |
| `/assistente-comercial` | CommercialAssistantPage.tsx | Assistente IA para vendedores |
| `/rfv` | RFVDashboard.tsx | Dashboard RFV (Recência, Frequência, Valor) |

### Páginas Apenas Admin
| Rota | Página | Descrição |
|------|--------|-----------|
| `/admin` | Admin.tsx | **Painel Administrativo** - Gestão completa |
| `/historical-upload` | HistoricalUpload.tsx | Upload de dados históricos |
| `/sales-dashboard` | SalesDashboard.tsx | Dashboard executivo de vendas |
| `/analyze-persona` | AnalyzePersona.tsx | Análise de personas/ICP |

---

## 🧩 COMPONENTES PRINCIPAIS

### Dashboard e Metas
| Componente | Descrição |
|------------|-----------|
| `MultiPeriodGoalTracker` | Tracker de metas por período (hoje/semana/quinzena/mês) |
| `DailyGoalsPanel` | Painel de metas diárias |
| `SmartDailyGoals` | Metas diárias inteligentes com projeção |
| `MyPeriodGoalTracker` | Tracker pessoal de metas por período |
| `GoalProgressDashboard` | Dashboard de progresso de metas |
| `GoalTrackingDashboard` | Acompanhamento detalhado de metas |
| `GoalAchievementSummary` | Resumo de conquistas de metas |
| `GoalGapAnalysis` | Análise de gap entre meta e realizado |
| `ClinicGoalsCard` | Card com metas da clínica |
| `DepartmentGoalsCard` | Card com metas por departamento |
| `ProceduresGoalTracker` | Tracker de metas por procedimento |
| `SalesForecastPanel` | Painel de previsão de vendas com IA |

### Equipes e Rankings
| Componente | Descrição |
|------------|-----------|
| `TeamRankingCard` | Card de ranking das equipes |
| `TeamComparisonCard` | Comparativo entre equipes |
| `TeamProgressTable` | Tabela de progresso das equipes |
| `TeamQuantityTable` | Tabela de quantidade vendida por equipe |
| `TeamMembersOverview` | Visão geral dos membros da equipe |
| `MonthlyTeamRankingChart` | Gráfico de ranking mensal |
| `ChampionsDisplay` | Display de campeões/melhores vendedores |

### Gamificação
| Componente | Descrição |
|------------|-----------|
| `AchievementsBadgesDisplay` | Badges de conquistas |
| `TeamBadgesDisplay` | Badges da equipe |
| `TeamPrizesDisplay` | Premiações da equipe |
| `StreakRecordsDisplay` | Records de sequências |
| `RecentAchievements` | Conquistas recentes |
| `PrizeRulesAndHistory` | Regras e histórico de prêmios |
| `TimeCounters` | Contadores de tempo (fim do mês, etc.) |

### Análises e Gráficos
| Componente | Descrição |
|------------|-----------|
| `StrategicOverview` | Visão estratégica executiva |
| `ExecutiveKPIs` | KPIs executivos |
| `EvolutionChart` | Gráfico de evolução |
| `HistoricalComparison` | Comparativo histórico |
| `HistoricalTrendsPanel` | Painel de tendências históricas |
| `ConsolidatedTrendsPanel` | Painel de tendências consolidadas |
| `MonthComparisonPanel` | Comparativo entre meses |
| `SoldVsExecutedPanel` | Vendido vs Executado |
| `QuickInsightsPanel` | Insights rápidos |

### Vendedor Individual
| Componente | Descrição |
|------------|-----------|
| `SellerDashboard` | Dashboard individual do vendedor |
| `SellerDepartmentProgress` | Progresso por departamento |
| `SellerUnifiedCalendar` | Calendário unificado do vendedor |
| `IndividualDepartmentProgress` | Progresso individual por departamento |
| `IndividualGoalsForm` | Formulário de metas individuais |
| `PersonalGoalsByDepartment` | Metas pessoais por departamento |
| `MyGoalsDashboard` | Dashboard "Minhas Metas" |

### Campanhas
| Componente | Descrição |
|------------|-----------|
| `CampaignsWidget` | Widget de campanhas ativas |
| `CampaignCalendar` | Calendário de campanhas |
| `CampaignHistory` | Histórico de campanhas |
| `CampaignResultsDashboard` | Resultados de campanhas |

### Estratégias
| Componente | Descrição |
|------------|-----------|
| `CancellationStrategies` | Estratégias anti-cancelamento |
| `EngagementStrategies` | Estratégias de engajamento |
| `InfluencerStrategies` | Estratégias com influenciadores |
| `LoyaltyStrategies` | Estratégias de fidelização |
| `ReactivationStrategies` | Estratégias de reativação |

### Assistentes IA
| Componente | Descrição |
|------------|-----------|
| `CommercialAssistant` | Assistente comercial flutuante (todos) |
| `AnalyticsAIFloating` | Assistente de analytics (admin) |

### UI Comum
| Componente | Descrição |
|------------|-----------|
| `Header` | Cabeçalho com navegação |
| `NavLink` | Links de navegação |
| `NotificationsDropdown` | Dropdown de notificações |
| `AnnouncementsDropdown` | Dropdown de comunicados |
| `ProfileEditDialog` | Edição de perfil |
| `OnlineIndicator` | Indicador de usuário online |
| `OnlineUsersWidget` | Widget de usuários online |
| `DashboardFilters` | Filtros do dashboard |
| `DashboardQuickActions` | Ações rápidas |
| `PaceBadge` | Badge de ritmo (meta) |

---

## 🎯 SISTEMA CRM (72 Componentes)

### Visão Geral CRM
| Componente | Descrição |
|------------|-----------|
| `CRMKanban` | **Kanban principal** - Visualização de leads por etapa |
| `CRMOverviewDashboard` | Dashboard geral do CRM |
| `CRMDailyOverview` | Visão diária do CRM |
| `CRMStats` | Estatísticas gerais |
| `CRMNavigationMenu` | Menu de navegação do CRM |

### Gestão de Leads
| Componente | Descrição |
|------------|-----------|
| `CRMLeadDetail` | Detalhes completos do lead |
| `CRMLeadEditForm` | Formulário de edição de lead |
| `CRMNewLeadDialog` | Dialog para novo lead |
| `CRMLeadTimeline` | Timeline de interações |
| `CRMLeadInteractions` | Registro de interações |
| `CRMLeadActivities` | Atividades do lead |
| `CRMLeadTasks` | Tarefas relacionadas ao lead |
| `CRMLeadChecklist` | Checklist de ações por lead |
| `CRMLeadScoreCard` | Score do lead |
| `CRMQuickActions` | Ações rápidas (ligar, WhatsApp, email) |
| `CRMQuickFilters` | Filtros rápidos |
| `CRMGlobalSearch` | Busca global de leads |
| `CRMBulkActions` | Ações em massa |
| `CRMTransferDialog` | Transferência de leads |
| `CRMPatientSearch` | Busca de pacientes |
| `CRMTemperatureBadge` | Badge de temperatura do lead |

### Pipelines e Etapas
| Componente | Descrição |
|------------|-----------|
| `CRMPipelineSelector` | Seletor de pipeline |
| `CRMPipelineJourney` | Jornada visual do pipeline |
| `CRMPipelineManager` | Gerenciador de pipelines |
| `CRMPipelineMetrics` | Métricas por pipeline |
| `CRMConversionFunnel` | Funil de conversão |

### IA e Automação
| Componente | Descrição |
|------------|-----------|
| `CRMAIAssistant` | Assistente IA integrado |
| `CRMSmartSuggestions` | Sugestões inteligentes |
| `CRMSmartAlerts` | Alertas inteligentes |
| `CRMPredictiveAnalytics` | Analytics preditivo |
| `CRMProcedureRecommendations` | Recomendações de procedimentos |
| `CRMSalesCoach` | Coach de vendas IA |
| `CRMSalesCoachGeneral` | Coach geral de vendas |
| `CRMRealtimeScriptSuggestions` | Sugestões de scripts em tempo real |
| `CRMLeadScriptSuggestions` | Sugestões de scripts por lead |
| `CRMChatScriptsPanel` | Painel de scripts de chat |
| `CRMAutomations` | Automações configuráveis |
| `CRMMarketingAutomations` | Automações de marketing |

### Comunicação
| Componente | Descrição |
|------------|-----------|
| `CRMWhatsAppChat` | Chat WhatsApp integrado |
| `CRMWhatsAppConnections` | Conexões WhatsApp |
| `CRMWhatsAppMonitor` | Monitor de WhatsApp |
| `CRMWhatsAppTemplates` | Templates de mensagens |
| `CRMGroupChat` | Chat em grupo |
| `CRMInternalChat` | Chat interno da equipe |
| `CRMContactPoints` | Pontos de contato |

### Performance e Métricas
| Componente | Descrição |
|------------|-----------|
| `CRMPerformanceDashboard` | Dashboard de performance |
| `CRMSalesMetrics` | Métricas de vendas |
| `CRMTeamPerformance` | Performance da equipe |
| `CRMTeamRoutine` | Rotina da equipe |
| `CRMVendedoresKPIsDashboard` | KPIs dos vendedores |
| `CRMLeaderboard` | Ranking de vendedores |
| `CRMGamificationDashboard` | Dashboard de gamificação |
| `CRMCadenceAnalytics` | Analytics de cadência |
| `CRMSentimentDashboard` | Dashboard de sentimento |

### Integrações
| Componente | Descrição |
|------------|-----------|
| `CRMIntegrations` | Central de integrações |
| `CRMRFVIntegration` | Integração com RFV |
| `CRMRFVMatrixImport` | Importação de matriz RFV |
| `CRMCampaignIntegration` | Integração com campanhas |
| `CRMProtocolIntegration` | Integração com protocolos |
| `CRMCalendarIntegration` | Integração com calendário |
| `CRMGoalIntegration` | Integração com metas |
| `CRMWebhooksManager` | Gerenciador de webhooks |

### Pós-Venda e Cirurgias
| Componente | Descrição |
|------------|-----------|
| `CRMPostSaleFlow` | Fluxo pós-venda |
| `CRMSurgeryDashboard` | Dashboard de cirurgias |

### Outros CRM
| Componente | Descrição |
|------------|-----------|
| `CRMBANTDisplay` | Display BANT (Budget, Authority, Need, Timeline) |
| `CRMAlertsDashboard` | Dashboard de alertas |
| `CRMActivityFeed` | Feed de atividades |
| `CRMNotificationsBell` | Sino de notificações |
| `CRMNotificationsPanel` | Painel de notificações |
| `CRMExportButton` | Botão de exportação |
| `CRMExportPDF` | Exportação em PDF |
| `CRMProposalTemplates` | Templates de propostas |
| `CRMKeyboardShortcuts` | Atalhos de teclado |

---

## ⚙️ PAINEL ADMINISTRATIVO (24 Componentes)

| Componente | Descrição |
|------------|-----------|
| `UserManagement` | Gestão de usuários |
| `CardForm` | Formulário de cartões (amarelo/vermelho) |
| `CardHistory` | Histórico de cartões aplicados |
| `SpecialEventsForm` | Cadastro de eventos especiais |
| `SpecialEventsHistory` | Histórico de eventos |
| `SalesSpreadsheetUpload` | **Upload de planilhas de vendas** |
| `ComprehensiveDataImport` | Importação abrangente de dados |
| `PatientDataImport` | Importação de dados de pacientes |
| `RecordsEditor` | Editor de registros |
| `AnnouncementsManager` | Gestão de comunicados |
| `AdminAnnouncements` | Comunicados administrativos |
| `CampaignsManager` | Gestão de campanhas |
| `CampaignTemplates` | Templates de campanhas |
| `CampaignMaterials` | Materiais de campanhas |
| `AlertsManager` | Gestão de alertas |
| `GoalNotifications` | Notificações de metas |
| `PrizeForm` | Cadastro de prêmios |
| `ProtocolsManager` | Gestão de protocolos |
| `PeriodLockManager` | Bloqueio de períodos |
| `ContestationAdmin` | Administração de contestações |
| `AnalyticsAI` | Analytics com IA |
| `CommercialAssistantReport` | Relatório do assistente |
| `FeegowEnrichment` | Enriquecimento Feegow |
| `RFVContactSync` | Sincronização de contatos RFV |

---

## 📝 FORMULÁRIOS (6 Componentes)

| Componente | Pasta | Descrição |
|------------|-------|-----------|
| `CancellationForm` | forms/ | Formulário de cancelamento |
| `NPSForm` | forms/ | Formulário de NPS |
| `OtherIndicatorsForm` | forms/ | Outros indicadores |
| `ReferralForm` | forms/ | Formulário de indicação |
| `RevenueForm` | forms/ | Formulário de receita |
| `TestimonialForm` | forms/ | Formulário de depoimento |
| `IndividualTeamFields` | forms/ | Campos de equipe individual |

---

## 📚 TREINAMENTOS (7 Componentes)

| Componente | Descrição |
|------------|-----------|
| `TrainingAcademy` | Academia de treinamentos |
| `TrainingLeaderboard` | Ranking de treinamentos |
| `TrainingLibrary` | Biblioteca de materiais |
| `TrainingMaterialViewer` | Visualizador de materiais |
| `TrainingQuizzes` | Quizzes de treinamento |
| `TrainingSimulations` | Simulações de vendas |
| `TrainingTracks` | Trilhas de aprendizado |

---

## 🪝 HOOKS CUSTOMIZADOS (19 Hooks)

| Hook | Descrição |
|------|-----------|
| `useAuth` | Autenticação e perfil do usuário |
| `useCRM` | Operações do CRM (leads, pipelines, etc.) |
| `useTeamScores` | Pontuação das equipes |
| `useFilteredTeamScores` | Pontuação filtrada |
| `useTeamProgressData` | Dados de progresso das equipes |
| `useUserTeamStats` | Estatísticas do time do usuário |
| `useGoalProgress` | Progresso de metas |
| `useGoalNotifications` | Notificações de metas |
| `usePredefinedGoals` | Metas predefinidas |
| `useAchievements` | Sistema de conquistas |
| `useAchievementChecker` | Verificador de conquistas |
| `useChampions` | Dados de campeões |
| `useStreakRecords` | Recordes de sequência |
| `useCommercialAssistant` | Assistente comercial IA |
| `useKnowledgeBaseReads` | Leituras da base de conhecimento |
| `useTrainingAcademy` | Academia de treinamentos |
| `useJourneyChecklist` | Checklist de jornada |
| `useUserPresence` | Presença online do usuário |
| `use-toast` | Sistema de notificações toast |
| `use-mobile` | Detecção de dispositivo móvel |

---

## ⚡ EDGE FUNCTIONS (34 Funções)

### Alertas e Notificações
| Função | Descrição |
|--------|-----------|
| `morning-summary` | Resumo matinal para vendedores |
| `daily-seller-alerts` | Alertas diários para vendedores |
| `weekly-report` | Relatório semanal |
| `pace-alert` | Alerta de ritmo de vendas |
| `campaign-alerts` | Alertas de campanhas |
| `check-critical-sellers` | Verificação de vendedores críticos |
| `check-crm-alerts` | Verificação de alertas do CRM |
| `check-stale-leads` | Verificação de leads parados |
| `check-stale-referral-leads` | Verificação de leads de indicação parados |
| `referral-lead-notifications` | Notificações de leads por indicação |

### IA e Analytics
| Função | Descrição |
|--------|-----------|
| `analytics-ai` | Analytics com IA |
| `commercial-ai-assistant` | Assistente comercial IA |
| `crm-ai-qualify` | Qualificação de leads com IA |
| `crm-generate-scripts` | Geração de scripts com IA |
| `get-script-suggestion` | Sugestões de scripts |
| `get-procedure-recommendation` | Recomendações de procedimentos |
| `rfv-ai-strategy` | Estratégias RFV com IA |
| `predict-churn` | Previsão de churn |
| `sales-forecast` | Previsão de vendas |
| `training-simulation` | Simulação de treinamento |
| `daily-ai-manager` | Gerenciador diário de IA |

### Integrações Feegow
| Função | Descrição |
|--------|-----------|
| `sync-feegow` | Sincronização com Feegow |
| `sync-feegow-cron` | Sincronização agendada |
| `sync-feegow-patients` | Sincronização de pacientes |
| `feegow-patient-search` | Busca de pacientes no Feegow |
| `feegow-enrich-contacts` | Enriquecimento de contatos |
| `feegow-full-enrichment` | Enriquecimento completo |
| `test-feegow-api` | Teste de API Feegow |

### Importação e Dados
| Função | Descrição |
|--------|-----------|
| `import-spreadsheet-data` | Importação de planilhas |
| `import-rfv-to-crm` | Importação RFV para CRM |
| `calculate-rfv` | Cálculo de RFV |

### Administração
| Função | Descrição |
|--------|-----------|
| `admin-reset-password` | Reset de senha pelo admin |
| `alexa-results` | Resultados para Alexa (voz) |
| `crm-webhook` | Webhook do CRM |

---

## 🗄️ TABELAS DO BANCO DE DADOS

### Usuários e Autenticação
- `profiles` - Perfis de usuários
- `user_roles` - Papéis de usuários (admin, member)
- `user_approval_requests` - Solicitações de aprovação
- `user_presence` - Presença online

### Equipes
- `teams` - Equipes (Lioness, Tróia)
- `cards` - Cartões amarelos/vermelhos

### Metas e Resultados
- `predefined_goals` - Metas predefinidas
- `individual_goals` - Metas individuais
- `department_goals` - Metas por departamento
- `quantity_goals` - Metas de quantidade
- `revenue_records` - Registros de receita/vendas
- `executed_records` - Registros de executados

### CRM
- `crm_pipelines` - Pipelines do CRM
- `crm_stages` - Etapas dos pipelines
- `crm_leads` - Leads
- `crm_lead_history` - Histórico de leads
- `crm_lead_interactions` - Interações com leads
- `crm_lead_checklist_progress` - Progresso de checklists
- `crm_tasks` - Tarefas
- `crm_automations` - Automações
- `crm_automation_logs` - Logs de automações
- `crm_chat_messages` - Mensagens de chat
- `crm_form_responses` - Respostas de formulários

### Campanhas
- `campaigns` - Campanhas
- `campaign_actions` - Ações de campanhas
- `campaign_materials` - Materiais de campanhas
- `campaign_alerts` - Alertas de campanhas
- `campaign_suggestions` - Sugestões de campanhas
- `campaign_checklist_progress` - Progresso de checklists

### Cancelamentos
- `cancellations` - Cancelamentos
- `cancellation_history` - Histórico de cancelamentos

### Comunicações
- `notifications` - Notificações
- `announcements` - Comunicados
- `announcement_reads` - Leituras de comunicados

### Calendário
- `calendar_events` - Eventos do calendário
- `calendar_event_invitations` - Convites de eventos

### Indicações
- `referral_leads` - Leads por indicação

### RFV
- `rfv_customers` - Clientes RFV
- `rfv_action_history` - Histórico de ações RFV

### Gamificação
- `achievements` - Conquistas disponíveis
- `user_achievements` - Conquistas dos usuários
- `streak_records` - Recordes de sequência
- `prizes` - Prêmios

### Treinamentos
- `training_materials` - Materiais de treinamento
- `training_progress` - Progresso de treinamentos
- `training_user_stats` - Estatísticas de usuários
- `training_xp_history` - Histórico de XP

### Procedimentos Recorrentes
- `recurrent_procedures` - Procedimentos recorrentes
- `lead_recurrence_history` - Histórico de recorrência

### Dados de Pacientes
- `patient_data` - Dados de pacientes

### Outros
- `special_events` - Eventos especiais
- `contestations` - Contestações
- `audit_log` - Log de auditoria
- `sales_upload_logs` - Logs de uploads
- `upload_deletion_logs` - Logs de exclusões
- `feegow_user_mapping` - Mapeamento Feegow
- `ai_conversations` - Conversas com IA
- `ai_messages` - Mensagens de IA

---

## 🔐 SISTEMA DE AUTENTICAÇÃO

### Fluxo de Cadastro
1. Usuário acessa `/register`
2. Preenche dados (nome, email, senha, equipe, cargo)
3. Sistema cria perfil com `is_approved = false`
4. Usuário é redirecionado para `/pending-approval`
5. Admin aprova na página de gestão de usuários
6. Usuário recebe notificação e pode acessar o sistema

### Papéis (Roles)
- **admin** - Acesso total ao sistema
- **member** - Acesso às funcionalidades de vendedor

### Cargos (Positions)
- Pré-vendedor
- Vendedor
- Vendedor (Pré-agenda)
- Closer
- Especialista de Vendas
- Consultor
- Atendente
- SDR
- BDR
- Account Executive
- Coordenador
- Gerente
- Diretor

---

## 🎮 SISTEMA DE GAMIFICAÇÃO

### Equipes
- **Lioness Team** - Equipe das leoas
- **Tróia Team** - Equipe de Tróia

### Pontuação
- Vendas
- NPS
- Depoimentos
- Indicações
- Outros indicadores
- Cartões (amarelo -5pts, vermelho -10pts)

### Conquistas (Achievements)
- Badges por metas atingidas
- Recordes de sequência (streaks)
- Premiações mensais

---

## 📊 PIPELINES DO CRM

### Tipos de Pipeline
1. **Social Selling** - Captação via redes sociais
2. **SDR** - Qualificação inicial
3. **Sales** - Vendas tradicionais
4. **Indicações** - Leads por indicação
5. **Reativação** - Clientes inativos
6. **Pós-Venda** - Acompanhamento pós-venda
7. **Cirurgias** - Pipeline específico para cirurgias

### Etapas Padrão
- Novo Lead
- Primeiro Contato
- Qualificação
- Apresentação
- Proposta
- Negociação
- Fechamento
- Ganho/Perdido

---

## 📁 CONSTANTES E CONFIGURAÇÕES

| Arquivo | Descrição |
|---------|-----------|
| `clinicGoals.ts` | Metas da clínica |
| `commercialScripts.ts` | Scripts comerciais |
| `departments.ts` | Departamentos disponíveis |
| `positionDetails.ts` | Detalhes dos cargos |
| `sellerPositions.ts` | Posições de vendedores |

---

## 🔌 INTEGRAÇÕES EXTERNAS

### Feegow (Sistema de Gestão Médica)
- Sincronização de pacientes
- Enriquecimento de dados
- Busca de prontuários

### Lovable AI (IA Nativa)
- Assistente comercial
- Qualificação de leads
- Geração de scripts
- Previsões e analytics

---

## 📱 RECURSOS DE UI

### Componentes UI (shadcn/ui)
Localização: `src/components/ui/`

- Accordion, Alert, Avatar, Badge, Button
- Calendar, Card, Carousel, Chart, Checkbox
- Collapsible, Command, Context Menu
- Dialog, Drawer, Dropdown Menu
- Form, Hover Card
- Input, Input OTP
- Label, Menubar, Navigation Menu
- Pagination, Popover, Progress
- Radio Group, Resizable, Scroll Area, Select
- Separator, Sheet, Sidebar, Skeleton, Slider
- Sonner (toasts), Switch
- Table, Tabs, Textarea, Toast, Toggle, Tooltip

---

## 📂 ARQUIVOS DE CONHECIMENTO

### Localização: `public/knowledge-base/`
- `faq.csv` - Perguntas frequentes
- `procedimentos.csv` - Lista de procedimentos
- `scripts.json` - Scripts comerciais
- `estudos_caso/` - Estudos de caso
- `manuais/` - Manuais
- `protocolos/` - Protocolos

### Uploads: `public/uploads/`
- Planilhas de análise estratégica
- Dados históricos de vendas
- Manuais e e-books
- Planilhas de persona

---

## ✅ STATUS DE FUNCIONALIDADES

### ✅ Funcionalidades Implementadas
- [x] Sistema de autenticação com aprovação
- [x] Dashboard principal com metas
- [x] Sistema de equipes e gamificação
- [x] CRM completo com Kanban
- [x] Múltiplos pipelines
- [x] Upload de planilhas de vendas
- [x] Sistema de campanhas
- [x] Gestão de cancelamentos
- [x] Sistema de indicações
- [x] Dashboard RFV
- [x] Assistente comercial IA
- [x] Analytics com IA
- [x] Sistema de notificações
- [x] Comunicados
- [x] Calendário de eventos
- [x] Academia de treinamentos
- [x] Display para TV
- [x] Integração Feegow
- [x] Automações do CRM
- [x] Previsão de vendas
- [x] Análise de churn
- [x] Coach de vendas IA
- [x] Cadência de contatos
- [x] Procedimentos recorrentes

### ⚠️ Pontos de Atenção
- [ ] Integração WhatsApp (estrutura pronta, falta conexão real)
- [ ] Envio de emails automáticos (edge function preparada)
- [ ] Integração com calendário Google
- [ ] Dashboard mobile otimizado
- [ ] Relatórios em PDF customizados
- [ ] Backup automático de dados

---

## 🔧 CONFIGURAÇÕES DE AMBIENTE

### Secrets Configurados
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `LOVABLE_API_KEY`
- `FEEGOW_API_TOKEN`
- `CRON_SECRET`

### Storage Buckets
- `avatars` - Fotos de perfil (público)
- `protocol-materials` - Materiais de protocolos (público)

---

## 📈 MÉTRICAS MONITORADAS

### Vendas
- Valor vendido (competência)
- Valor executado
- Ticket médio
- Taxa de conversão
- Ciclo de vendas

### CRM
- Leads por etapa
- Tempo médio em cada etapa
- Taxa de conversão por pipeline
- Leads parados (stale)
- Score de leads

### Gamificação
- Pontuação por equipe
- Ranking mensal
- Streaks (sequências)
- Conquistas desbloqueadas

### Performance
- Metas vs Realizado
- Projeção de fechamento
- Gap de vendas
- Comparativo YoY

---

*Documentação gerada automaticamente em 09/01/2026*
*Sistema: Unique CPA - Gestão Comercial & CRM*
