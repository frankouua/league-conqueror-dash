import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Checking recurrence opportunities...');

    // Get all leads with executed procedures
    const { data: leadsWithProcedures } = await supabase
      .from('crm_leads')
      .select(`
        id, name, phone, email, assigned_to, tags,
        executed_records(
          id, procedimento, quantity, record_date
        )
      `)
      .eq('status', 'won')
      .not('executed_records', 'is', null);

    // Define recurrence intervals (in days)
    const recurrenceIntervals: Record<string, number> = {
      'botox': 120, // 4 months
      'preenchimento': 365, // 1 year
      'harmonizacao': 180, // 6 months
      'bioestimulador': 180,
      'limpeza de pele': 30,
      'peeling': 60,
      'laser': 90,
      'depilacao': 30,
      'microagulhamento': 45,
      'skinbooster': 90,
      'fios': 365,
      'sculptra': 365,
      'radiesse': 365
    };

    const today = new Date();
    const opportunities: any[] = [];
    const tasksToCreate: any[] = [];
    const notificationsToCreate: any[] = [];

    for (const lead of leadsWithProcedures || []) {
      const executedRecords = (lead as any).executed_records || [];
      
      for (const record of executedRecords) {
        const procedureName = record.procedimento?.toLowerCase() || '';
        
        // Find matching interval
        let intervalDays = 90; // default
        for (const [key, days] of Object.entries(recurrenceIntervals)) {
          if (procedureName.includes(key)) {
            intervalDays = days;
            break;
          }
        }

        const lastDate = new Date(record.record_date);
        const nextDate = new Date(lastDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
        const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

        // Check if due for recurrence (within 30 days or overdue)
        if (daysUntil <= 30) {
          const urgency = daysUntil <= 0 ? 'overdue' : daysUntil <= 7 ? 'urgent' : daysUntil <= 14 ? 'soon' : 'upcoming';
          
          opportunities.push({
            lead_id: lead.id,
            lead_name: lead.name,
            phone: lead.phone,
            procedure: record.procedimento,
            last_date: record.record_date,
            next_date: nextDate.toISOString().split('T')[0],
            days_until: daysUntil,
            urgency,
            assigned_to: lead.assigned_to
          });

          // Create task if overdue or urgent
          if ((urgency === 'overdue' || urgency === 'urgent') && lead.assigned_to) {
            tasksToCreate.push({
              lead_id: lead.id,
              title: `🔄 Recorrência: ${record.procedimento}`,
              description: `Paciente ${lead.name} está ${daysUntil <= 0 ? 'com procedimento vencido' : 'próximo da data'} para ${record.procedimento}.\n\nÚltimo: ${new Date(record.record_date).toLocaleDateString('pt-BR')}\nPrevisto: ${nextDate.toLocaleDateString('pt-BR')}`,
              due_date: daysUntil <= 0 ? today.toISOString() : nextDate.toISOString(),
              priority: urgency === 'overdue' ? 'high' : 'medium',
              status: 'pending',
              assigned_to: lead.assigned_to
            });
          }

          // Create notification for overdue
          if (urgency === 'overdue' && lead.assigned_to) {
            notificationsToCreate.push({
              user_id: lead.assigned_to,
              title: '⚠️ Recorrência Vencida',
              message: `${lead.name} deveria ter feito ${record.procedimento} há ${Math.abs(daysUntil)} dias`,
              type: 'warning',
              action_url: `/crm?leadId=${lead.id}`
            });
          }
        }
      }
    }

    // Update leads with recurrence tags
    const leadsToUpdate = opportunities
      .filter(o => o.urgency === 'overdue' || o.urgency === 'urgent')
      .map(o => o.lead_id);

    if (leadsToUpdate.length > 0) {
      for (const leadId of [...new Set(leadsToUpdate)]) {
        const { data: currentLead } = await supabase
          .from('crm_leads')
          .select('tags')
          .eq('id', leadId)
          .single();

        const currentTags = currentLead?.tags || [];
        if (!currentTags.includes('recorrencia_pendente')) {
          await supabase
            .from('crm_leads')
            .update({ 
              tags: [...currentTags, 'recorrencia_pendente'],
              temperature: 'hot'
            })
            .eq('id', leadId);
        }
      }
    }

    // Insert tasks (avoid duplicates)
    for (const task of tasksToCreate) {
      const { data: existing } = await supabase
        .from('crm_tasks')
        .select('id')
        .eq('lead_id', task.lead_id)
        .ilike('title', `%${task.title.split(':')[1]?.trim() || task.title}%`)
        .eq('status', 'pending')
        .single();

      if (!existing) {
        await supabase.from('crm_tasks').insert(task);
      }
    }

    // Insert notifications
    if (notificationsToCreate.length > 0) {
      await supabase.from('notifications').insert(notificationsToCreate);
    }

    // Log automation
    await supabase
      .from('automation_logs')
      .insert({
        automation_type: 'check-recurrence',
        status: 'completed',
        results: {
          total_opportunities: opportunities.length,
          overdue: opportunities.filter(o => o.urgency === 'overdue').length,
          urgent: opportunities.filter(o => o.urgency === 'urgent').length,
          tasks_created: tasksToCreate.length,
          notifications_sent: notificationsToCreate.length
        }
      });

    console.log(`Found ${opportunities.length} recurrence opportunities`);

    return new Response(JSON.stringify({
      success: true,
      opportunities: opportunities.slice(0, 50), // Limit response size
      summary: {
        total: opportunities.length,
        by_urgency: {
          overdue: opportunities.filter(o => o.urgency === 'overdue').length,
          urgent: opportunities.filter(o => o.urgency === 'urgent').length,
          soon: opportunities.filter(o => o.urgency === 'soon').length,
          upcoming: opportunities.filter(o => o.urgency === 'upcoming').length
        },
        tasks_created: tasksToCreate.length,
        notifications_sent: notificationsToCreate.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Recurrence check error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
