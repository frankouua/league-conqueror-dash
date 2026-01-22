/**
 * SCRIPT DE MIGRAÇÃO: Lovable Cloud → Supabase Externo
 * 
 * COMO USAR:
 * 1. Instale as dependências: npm install @supabase/supabase-js
 * 2. Configure as variáveis abaixo
 * 3. Execute: node migrate-to-external.js
 * 
 * IMPORTANTE: Este script usa a SERVICE_ROLE_KEY do seu Supabase EXTERNO
 */

const { createClient } = require('@supabase/supabase-js');

// ============================================
// CONFIGURAÇÃO - PREENCHA AQUI
// ============================================

// ORIGEM: Lovable Cloud (não precisa mudar)
const SOURCE_URL = 'https://mbnjjwatnqjjqxogmaju.supabase.co';
const SOURCE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ibmpqd2F0bnFqanF4b2dtYWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzkxNTMsImV4cCI6MjA4MTU1NTE1M30.ZBR4ujq5Bfw0IP4WFS6xQccEqLp2WA-zl7EUSyS5zl4';

// DESTINO: Seu Supabase Externo (PREENCHA AQUI!)
const DEST_URL = 'https://SEU_PROJECT_ID.supabase.co'; // ← ALTERE
const DEST_SERVICE_KEY = 'SUA_SERVICE_ROLE_KEY_AQUI';  // ← ALTERE

// ============================================
// ORDEM DE MIGRAÇÃO (respeita foreign keys)
// ============================================
const MIGRATION_ORDER = [
  // Base
  'teams',
  'profiles', 
  'user_roles',
  
  // CRM Core
  'crm_pipelines',
  'crm_stages',
  'crm_lost_reasons',
  'crm_automations',
  'crm_surgery_checklist',
  
  // Goals
  'predefined_goals',
  'department_goals',
  'individual_goals',
  
  // Campaigns
  'campaigns',
  'campaign_actions',
  'campaign_materials',
  'announcements',
  
  // Customer Data
  'rfv_customers',
  'patient_data',
  'contacts',
  
  // CRM Leads (principal)
  'crm_leads',
  'crm_lead_history',
  'crm_lead_interactions',
  'crm_tasks',
  'crm_lead_tasks',
  'crm_notifications',
  'notifications',
  
  // Registros financeiros
  'revenue_records',
  'executed_records',
  'nps_records',
  'testimonial_records',
  'referral_records',
  'referral_leads',
  'cancellations',
  
  // Extras
  'user_achievements',
  'protocols',
  'recurrent_procedures',
];

// ============================================
// FUNÇÕES DE MIGRAÇÃO
// ============================================

async function migrateTable(sourceClient, destClient, tableName, batchSize = 500) {
  console.log(`\n📦 Migrando: ${tableName}`);
  
  let offset = 0;
  let totalMigrated = 0;
  let hasMore = true;
  
  while (hasMore) {
    // Buscar dados da origem
    const { data, error, count } = await sourceClient
      .from(tableName)
      .select('*', { count: 'exact' })
      .range(offset, offset + batchSize - 1);
    
    if (error) {
      console.error(`   ❌ Erro ao ler ${tableName}: ${error.message}`);
      return { table: tableName, status: 'error', error: error.message };
    }
    
    if (!data || data.length === 0) {
      if (totalMigrated === 0) {
        console.log(`   ⚪ Tabela vazia`);
        return { table: tableName, status: 'empty', count: 0 };
      }
      hasMore = false;
      continue;
    }
    
    // Inserir no destino com upsert
    const { error: insertError } = await destClient
      .from(tableName)
      .upsert(data, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });
    
    if (insertError) {
      console.error(`   ❌ Erro ao inserir ${tableName}: ${insertError.message}`);
      return { 
        table: tableName, 
        status: 'partial_error', 
        migrated: totalMigrated,
        error: insertError.message 
      };
    }
    
    totalMigrated += data.length;
    console.log(`   ✅ Batch ${offset}-${offset + data.length} (${totalMigrated}/${count || '?'} registros)`);
    
    offset += batchSize;
    hasMore = data.length === batchSize;
    
    // Pequeno delay para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`   🎉 Concluído: ${totalMigrated} registros migrados`);
  return { table: tableName, status: 'success', count: totalMigrated };
}

async function runMigration() {
  console.log('🚀 INICIANDO MIGRAÇÃO LOVABLE CLOUD → SUPABASE EXTERNO');
  console.log('='.repeat(60));
  
  // Validar configuração
  if (DEST_URL.includes('SEU_PROJECT_ID') || DEST_SERVICE_KEY.includes('SUA_SERVICE')) {
    console.error('\n❌ ERRO: Configure as variáveis DEST_URL e DEST_SERVICE_KEY no início do script!');
    process.exit(1);
  }
  
  // Criar clientes
  const sourceClient = createClient(SOURCE_URL, SOURCE_ANON_KEY);
  const destClient = createClient(DEST_URL, DEST_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  console.log(`\n📌 Origem: ${SOURCE_URL}`);
  console.log(`📌 Destino: ${DEST_URL}`);
  console.log(`📌 Tabelas: ${MIGRATION_ORDER.length}`);
  
  const results = [];
  const startTime = Date.now();
  
  for (const table of MIGRATION_ORDER) {
    try {
      const result = await migrateTable(sourceClient, destClient, table);
      results.push(result);
    } catch (err) {
      console.error(`   ❌ Erro inesperado em ${table}: ${err.message}`);
      results.push({ table, status: 'error', error: err.message });
    }
  }
  
  // Resumo final
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const successful = results.filter(r => r.status === 'success').length;
  const errors = results.filter(r => r.status === 'error' || r.status === 'partial_error').length;
  const empty = results.filter(r => r.status === 'empty').length;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA MIGRAÇÃO');
  console.log('='.repeat(60));
  console.log(`✅ Sucesso: ${successful} tabelas`);
  console.log(`⚪ Vazias: ${empty} tabelas`);
  console.log(`❌ Erros: ${errors} tabelas`);
  console.log(`⏱️ Tempo total: ${elapsed}s`);
  
  if (errors > 0) {
    console.log('\n⚠️ Tabelas com erro:');
    results.filter(r => r.status === 'error' || r.status === 'partial_error')
      .forEach(r => console.log(`   - ${r.table}: ${r.error}`));
  }
  
  console.log('\n✨ Migração concluída!');
}

// Executar
runMigration().catch(console.error);
