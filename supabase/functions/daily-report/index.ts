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

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

    console.log(`Generating daily report for ${todayStr}`);

    // Get today's revenue
    const { data: todayRevenue } = await supabase
      .from('revenue_records')
      .select('valor, team_id')
      .gte('record_date', todayStr)
      .lt('record_date', new Date(today.getTime() + 86400000).toISOString().split('T')[0]);

    // Get month revenue
    const { data: monthRevenue } = await supabase
      .from('revenue_records')
      .select('valor, team_id')
      .gte('record_date', startOfMonth)
      .lte('record_date', todayStr);

    // Get leads stats
    const { data: todayLeads } = await supabase
      .from('crm_leads')
      .select('id, status, temperature')
      .gte('created_at', todayStr);

    const { data: wonLeads } = await supabase
      .from('crm_leads')
      .select('id, estimated_value')
      .eq('status', 'won')
      .gte('won_at', todayStr);

    // Get today's tasks
    const { data: pendingTasks } = await supabase
      .from('crm_tasks')
      .select('id, status, priority')
      .eq('status', 'pending')
      .lte('due_date', new Date(today.getTime() + 86400000).toISOString());

    const { data: completedTasks } = await supabase
      .from('crm_tasks')
      .select('id')
      .eq('status', 'completed')
      .gte('completed_at', todayStr);

    // Calculate metrics
    const todayTotal = (todayRevenue || []).reduce((sum, r) => sum + (r.valor || 0), 0);
    const monthTotal = (monthRevenue || []).reduce((sum, r) => sum + (r.valor || 0), 0);
    
    // Team breakdown
    const teamTotals: Record<string, number> = {};
    for (const r of monthRevenue || []) {
      if (r.team_id) {
        teamTotals[r.team_id] = (teamTotals[r.team_id] || 0) + (r.valor || 0);
      }
    }

    // Get team names
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name');

    const teamNames: Record<string, string> = {};
    for (const t of teams || []) {
      teamNames[t.id] = t.name;
    }

    // Get goals
    const { data: monthGoal } = await supabase
      .from('clinic_goals')
      .select('valor_meta')
      .eq('mes', today.getMonth() + 1)
      .eq('ano', today.getFullYear())
      .eq('tipo', 'receita')
      .single();

    const goalValue = monthGoal?.valor_meta || 0;
    const goalProgress = goalValue > 0 ? (monthTotal / goalValue * 100).toFixed(1) : 0;

    // Calculate daily target
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dayOfMonth = today.getDate();
    const dailyTarget = goalValue / daysInMonth;
    const expectedByNow = dailyTarget * dayOfMonth;
    const pace = expectedByNow > 0 ? ((monthTotal / expectedByNow) * 100).toFixed(1) : 100;

    // Build report
    const report = {
      date: todayStr,
      summary: {
        today_revenue: todayTotal,
        month_revenue: monthTotal,
        goal_value: goalValue,
        goal_progress: parseFloat(String(goalProgress)),
        pace: parseFloat(String(pace)),
        daily_target: dailyTarget
      },
      leads: {
        new_today: todayLeads?.length || 0,
        hot: todayLeads?.filter(l => l.temperature === 'hot').length || 0,
        warm: todayLeads?.filter(l => l.temperature === 'warm').length || 0,
        won_today: wonLeads?.length || 0,
        won_value: (wonLeads || []).reduce((sum, l) => sum + (l.estimated_value || 0), 0)
      },
      tasks: {
        pending: pendingTasks?.length || 0,
        high_priority: pendingTasks?.filter(t => t.priority === 'high').length || 0,
        completed_today: completedTasks?.length || 0
      },
      teams: Object.entries(teamTotals).map(([id, total]) => ({
        id,
        name: teamNames[id] || 'Equipe',
        month_total: total
      })).sort((a, b) => b.month_total - a.month_total)
    };

    // Generate notification message
    const paceEmoji = parseFloat(String(pace)) >= 100 ? '🚀' : parseFloat(String(pace)) >= 80 ? '📈' : '⚠️';
    const message = `${paceEmoji} *Resumo do Dia ${today.toLocaleDateString('pt-BR')}*

💰 *Faturamento*
• Hoje: R$ ${todayTotal.toLocaleString('pt-BR')}
• Mês: R$ ${monthTotal.toLocaleString('pt-BR')} (${goalProgress}% da meta)
• Ritmo: ${pace}%

👥 *Leads*
• Novos hoje: ${report.leads.new_today}
• Vendas ganhas: ${report.leads.won_today} (R$ ${report.leads.won_value.toLocaleString('pt-BR')})

✅ *Tarefas*
• Pendentes: ${report.tasks.pending} (${report.tasks.high_priority} urgentes)
• Concluídas hoje: ${report.tasks.completed_today}`;

    // Get admin users
    const { data: admins } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('role', 'admin');

    // Send notifications
    const notifications = (admins || []).map(admin => ({
      user_id: admin.user_id,
      title: '📊 Relatório Diário',
      message,
      type: 'info'
    }));

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    // Log automation
    await supabase
      .from('automation_logs')
      .insert({
        automation_type: 'daily-report',
        status: 'completed',
        results: report
      });

    console.log('Daily report generated successfully');

    return new Response(JSON.stringify({
      success: true,
      report,
      notificationsSent: notifications.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Daily report error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
