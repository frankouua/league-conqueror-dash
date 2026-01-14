import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Automação de Aniversário
// Conforme documento: Felicitações e ofertas especiais

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🎂 Iniciando automação de aniversário...");

    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Buscar clientes/leads com aniversário hoje
    const { data: birthdayLeads, error: leadsError } = await supabase
      .from('crm_leads')
      .select(`
        id, name, phone, email, assigned_to, birth_date
      `)
      .not('birth_date', 'is', null);

    if (leadsError) throw leadsError;

    // Filtrar aniversariantes do dia
    const todayBirthdays = (birthdayLeads || []).filter(lead => {
      if (!lead.birth_date) return false;
      const birthDate = new Date(lead.birth_date);
      return birthDate.getMonth() + 1 === month && birthDate.getDate() === day;
    });

    console.log(`🎉 ${todayBirthdays.length} aniversariantes hoje`);

    const messages: any[] = [];
    const notifications: any[] = [];

    for (const lead of todayBirthdays) {
      const firstName = lead.name.split(' ')[0];
      
      // Mensagem de aniversário
      const birthdayMessage = `🎂 Feliz Aniversário, ${firstName}! 🎉

A equipe da Unique deseja um dia incrível repleto de alegrias!

Como presente especial, preparamos uma condição exclusiva para você. Entre em contato para saber mais! 💝

Com carinho,
Equipe Unique`;

      messages.push({
        lead_id: lead.id,
        phone: lead.phone,
        message_content: birthdayMessage,
        template_type: 'birthday',
        scheduled_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        status: 'pending',
      });

      // Notificar vendedor responsável
      if (lead.assigned_to) {
        notifications.push({
          user_id: lead.assigned_to,
          title: '🎂 Aniversário de Cliente',
          message: `Hoje é aniversário de ${lead.name}! Mensagem automática enviada.`,
          type: 'birthday_notification',
        });
      }

      // Registrar no histórico
      await supabase.from('crm_lead_history').insert({
        lead_id: lead.id,
        action_type: 'birthday_message',
        title: 'Mensagem de aniversário enviada',
        description: 'Felicitação automática de aniversário',
        performed_by: '00000000-0000-0000-0000-000000000000',
      });

      // Criar tarefa de follow-up para o vendedor
      if (lead.assigned_to) {
        await supabase.from('crm_tasks').insert({
          lead_id: lead.id,
          title: 'Follow-up aniversário',
          description: `Ligar para ${lead.name} para reforçar felicitações e oferta especial`,
          due_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4h depois
          priority: 'medium',
          assigned_to: lead.assigned_to,
          status: 'pending',
        });
      }
    }

    // Buscar aniversariantes da próxima semana para preparação
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const upcomingBirthdays = (birthdayLeads || []).filter(lead => {
      if (!lead.birth_date) return false;
      const birthDate = new Date(lead.birth_date);
      const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      return thisYearBirthday > today && thisYearBirthday <= nextWeek;
    });

    // Notificar sobre aniversários próximos
    for (const lead of upcomingBirthdays) {
      if (lead.assigned_to) {
        const birthDate = new Date(lead.birth_date);
        const daysUntil = Math.ceil((new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate()).getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
        
        notifications.push({
          user_id: lead.assigned_to,
          title: '📅 Aniversário Próximo',
          message: `${lead.name} fará aniversário em ${daysUntil} dias`,
          type: 'upcoming_birthday',
        });
      }
    }

    // Inserir mensagens na fila
    if (messages.length > 0) {
      await supabase.from('crm_whatsapp_queue').insert(messages);
    }

    // Inserir notificações
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    // Log da automação
    await supabase.from('automation_logs').insert({
      automation_type: 'birthday',
      status: 'success',
      results: { 
        today_birthdays: todayBirthdays.length,
        upcoming_birthdays: upcomingBirthdays.length,
        messages_queued: messages.length,
      },
    });

    console.log(`✅ Aniversário: ${todayBirthdays.length} hoje, ${upcomingBirthdays.length} próximos`);

    return new Response(
      JSON.stringify({
        success: true,
        today_birthdays: todayBirthdays.length,
        upcoming_birthdays: upcomingBirthdays.length,
        messages_queued: messages.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Erro na automação de aniversário:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
