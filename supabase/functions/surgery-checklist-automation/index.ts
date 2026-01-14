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

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const results: any[] = [];

    // Fetch leads with scheduled surgery dates
    const { data: leadsWithSurgery, error: leadsError } = await supabase
      .from('crm_leads')
      .select(`
        id, 
        name, 
        surgery_date, 
        assigned_to,
        phone,
        email,
        interested_procedures
      `)
      .not('surgery_date', 'is', null)
      .is('lost_at', null);

    if (leadsError) throw leadsError;

    // Fetch checklist templates
    const { data: checklists, error: checklistError } = await supabase
      .from('crm_surgery_checklist')
      .select('*')
      .eq('is_active', true)
      .order('order_index');

    if (checklistError) throw checklistError;

    for (const lead of leadsWithSurgery || []) {
      const surgeryDate = new Date(lead.surgery_date);
      const daysUntilSurgery = Math.floor((surgeryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      for (const checklist of checklists || []) {
        // Check if this checklist should trigger today
        if (checklist.day_offset !== -daysUntilSurgery) continue;

        // Check if checklist items already exist for this lead
        const { data: existingItems } = await supabase
          .from('crm_lead_surgery_checklist')
          .select('id')
          .eq('lead_id', lead.id)
          .eq('checklist_id', checklist.id);

        if (existingItems && existingItems.length > 0) continue;

        // Create checklist items for this lead
        const items = checklist.items || [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          await supabase.from('crm_lead_surgery_checklist').insert({
            lead_id: lead.id,
            checklist_id: checklist.id,
            item_index: i,
            item_title: item.title,
            item_description: item.description,
            is_completed: false,
            due_date: today,
          });
        }

        // Create task for the assigned user
        if (lead.assigned_to) {
          await supabase.from('crm_lead_tasks').insert({
            lead_id: lead.id,
            title: `${checklist.name} - ${lead.name}`,
            description: `Checklist de cirurgia: ${checklist.description}`,
            due_date: today,
            assigned_to: lead.assigned_to,
            priority: checklist.is_required ? 'high' : 'medium',
            task_type: 'surgery_checklist',
          });

          // Create notification
          await supabase.from('notifications').insert({
            user_id: lead.assigned_to,
            title: `📋 Checklist de Cirurgia: ${checklist.name}`,
            message: `Paciente: ${lead.name} - Cirurgia em ${Math.abs(daysUntilSurgery)} dias`,
            type: 'surgery_checklist',
            metadata: { lead_id: lead.id, checklist_id: checklist.id, surgery_date: lead.surgery_date },
          });
        }

        results.push({
          leadId: lead.id,
          leadName: lead.name,
          checklistName: checklist.name,
          daysUntilSurgery,
          itemsCreated: items.length,
        });
      }

      // Check for D-1 (tomorrow) - special handling
      if (daysUntilSurgery === 1) {
        // Check if D-1 alert already sent
        const { data: existingAlert } = await supabase
          .from('notifications')
          .select('id')
          .eq('type', 'surgery_tomorrow')
          .eq('metadata->>lead_id', lead.id)
          .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .single();

        if (!existingAlert && lead.assigned_to) {
          await supabase.from('notifications').insert({
            user_id: lead.assigned_to,
            title: '🏥 Cirurgia AMANHÃ!',
            message: `${lead.name} - ${lead.interested_procedures?.[0] || 'Procedimento'}. Confirmar checklist completo!`,
            type: 'surgery_tomorrow',
            metadata: { lead_id: lead.id, surgery_date: lead.surgery_date },
          });

          // Notify coordinators
          const { data: coordinators } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('position', 'Coordenador(a)');

          for (const coord of coordinators || []) {
            await supabase.from('notifications').insert({
              user_id: coord.user_id,
              title: '🏥 Cirurgia Amanhã - Verificar',
              message: `Paciente ${lead.name} tem cirurgia amanhã. Responsável: verificar checklist.`,
              type: 'surgery_tomorrow',
              metadata: { lead_id: lead.id },
            });
          }
        }
      }

      // Check for D-Day
      if (daysUntilSurgery === 0) {
        const { data: existingAlert } = await supabase
          .from('notifications')
          .select('id')
          .eq('type', 'surgery_today')
          .eq('metadata->>lead_id', lead.id)
          .gte('created_at', new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString())
          .single();

        if (!existingAlert && lead.assigned_to) {
          await supabase.from('notifications').insert({
            user_id: lead.assigned_to,
            title: '🎯 Cirurgia HOJE!',
            message: `${lead.name} - Acompanhar paciente no hospital`,
            type: 'surgery_today',
            metadata: { lead_id: lead.id },
          });
        }
      }

      // Check for post-surgery follow-ups (D+1, D+7, D+30, D+90)
      const daysSinceSurgery = -daysUntilSurgery;
      const followUpDays = [1, 7, 30, 90];

      if (followUpDays.includes(daysSinceSurgery)) {
        const { data: existingFollowUp } = await supabase
          .from('notifications')
          .select('id')
          .eq('type', `post_surgery_d${daysSinceSurgery}`)
          .eq('metadata->>lead_id', lead.id)
          .single();

        if (!existingFollowUp && lead.assigned_to) {
          let followUpMessage = '';
          switch (daysSinceSurgery) {
            case 1:
              followUpMessage = 'Ligar para verificar recuperação imediata';
              break;
            case 7:
              followUpMessage = 'Agendar retorno e verificar recuperação';
              break;
            case 30:
              followUpMessage = 'Solicitar NPS e depoimento';
              break;
            case 90:
              followUpMessage = 'Verificar oportunidades de cross-sell e indicações';
              break;
          }

          await supabase.from('notifications').insert({
            user_id: lead.assigned_to,
            title: `📅 D+${daysSinceSurgery}: ${lead.name}`,
            message: followUpMessage,
            type: `post_surgery_d${daysSinceSurgery}`,
            metadata: { lead_id: lead.id, days_since_surgery: daysSinceSurgery },
          });

          // Create follow-up task
          await supabase.from('crm_lead_tasks').insert({
            lead_id: lead.id,
            title: `D+${daysSinceSurgery}: ${followUpMessage}`,
            description: `Follow-up pós-cirurgia - ${lead.name}`,
            due_date: today,
            assigned_to: lead.assigned_to,
            priority: daysSinceSurgery <= 7 ? 'high' : 'medium',
            task_type: 'post_surgery_followup',
          });

          results.push({
            leadId: lead.id,
            leadName: lead.name,
            followUpType: `D+${daysSinceSurgery}`,
            action: followUpMessage,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedLeads: leadsWithSurgery?.length || 0,
        actionsTriggered: results.length,
        results,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in surgery checklist automation:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
