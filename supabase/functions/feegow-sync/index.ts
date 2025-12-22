import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeegowAppointment {
  agendamento_id: number;
  data: string;
  paciente_id: number;
  profissional_id: number;
  status_id: number;
  valor_total_agendamento: string;
  agendado_por: string;
  unidade_id: number;
  nome_fantasia?: string;
  procedimentos?: Array<{ procedimentoID: number; plano: number }>;
}

interface FeegowProfessional {
  profissional_id: number;
  nome: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const feegowToken = Deno.env.get('FEEGOW_API_TOKEN');

    if (!feegowToken) {
      console.error('FEEGOW_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'FEEGOW_API_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for optional date range
    let dateStart: string;
    let dateEnd: string;
    
    try {
      const body = await req.json();
      dateStart = body.date_start || formatDate(new Date());
      dateEnd = body.date_end || formatDate(new Date());
    } catch {
      // Default to today
      const today = new Date();
      dateStart = formatDate(today);
      dateEnd = formatDate(today);
    }

    console.log(`Syncing FEEGOW appointments from ${dateStart} to ${dateEnd}`);

    // Fetch completed appointments (status_id = 3 = "Atendido")
    const appointmentsResponse = await fetch(
      `https://api.feegow.com/v1/api/appoints/search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': feegowToken,
        },
        body: JSON.stringify({
          data_start: dateStart,
          data_end: dateEnd,
          list_procedures: 1,
        }),
      }
    );

    if (!appointmentsResponse.ok) {
      const errorText = await appointmentsResponse.text();
      console.error('FEEGOW API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch from FEEGOW', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appointmentsData = await appointmentsResponse.json();
    
    if (!appointmentsData.success) {
      console.error('FEEGOW API returned error:', appointmentsData);
      return new Response(
        JSON.stringify({ error: 'FEEGOW API error', details: appointmentsData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appointments: FeegowAppointment[] = appointmentsData.content || [];
    
    // Filter only completed appointments (status_id = 3)
    const completedAppointments = appointments.filter(a => a.status_id === 3);
    
    console.log(`Found ${completedAppointments.length} completed appointments out of ${appointments.length} total`);

    // Fetch professionals list to map IDs to names
    const professionalsResponse = await fetch(
      `https://api.feegow.com/v1/api/professional/list`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': feegowToken,
        },
      }
    );

    let professionalsMap: Record<number, string> = {};
    
    if (professionalsResponse.ok) {
      const professionalsData = await professionalsResponse.json();
      if (professionalsData.success && professionalsData.content) {
        for (const prof of professionalsData.content) {
          professionalsMap[prof.profissional_id] = prof.nome;
        }
      }
    }

    console.log(`Loaded ${Object.keys(professionalsMap).length} professionals`);

    // Department mapping based on unit name
    const departmentMapping: Record<string, string> = {
      'comercial': 'comercial',
      'atendimento': 'atendimento',
      'marketing': 'marketing',
      'administrativo': 'administrativo',
      'clinico': 'clinico',
    };

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const appointment of completedAppointments) {
      try {
        // Parse amount from "R$ 300,00" format
        const amountStr = appointment.valor_total_agendamento || 'R$ 0,00';
        const amount = parseAmount(amountStr);

        if (amount <= 0) {
          console.log(`Skipping appointment ${appointment.agendamento_id}: zero amount`);
          skipped++;
          continue;
        }

        // Parse date from "DD-MM-YYYY" to "YYYY-MM-DD"
        const date = parseFeegowDate(appointment.data);

        // Get professional name
        const professionalName = professionalsMap[appointment.profissional_id] || 
                                 appointment.agendado_por || 
                                 'Unknown';

        // Check for duplicates using feegow_id in notes
        const feegowId = `feegow_${appointment.agendamento_id}`;
        
        const { data: existingRecord } = await supabase
          .from('revenue_records')
          .select('id')
          .ilike('notes', `%${feegowId}%`)
          .maybeSingle();

        if (existingRecord) {
          console.log(`Skipping duplicate: ${feegowId}`);
          skipped++;
          continue;
        }

        // Try to find user by name
        const { data: matchedUser } = await supabase
          .from('profiles')
          .select('user_id, team_id, department')
          .ilike('full_name', `%${professionalName}%`)
          .maybeSingle();

        if (!matchedUser) {
          console.log(`No user found for professional: ${professionalName}`);
          skipped++;
          continue;
        }

        // Map department
        let department = matchedUser.department || 'comercial';
        if (appointment.nome_fantasia) {
          const unitLower = appointment.nome_fantasia.toLowerCase();
          for (const [key, value] of Object.entries(departmentMapping)) {
            if (unitLower.includes(key)) {
              department = value;
              break;
            }
          }
        }

        // Insert revenue record
        const { error: insertError } = await supabase
          .from('revenue_records')
          .insert({
            amount,
            date,
            user_id: matchedUser.user_id,
            team_id: matchedUser.team_id,
            department,
            notes: `FEEGOW Sync | ID: ${feegowId} | Profissional: ${professionalName}`,
            registered_by_admin: true,
            counts_for_individual: true,
            attributed_to_user_id: matchedUser.user_id,
          });

        if (insertError) {
          console.error(`Insert error for ${feegowId}:`, insertError);
          errors++;
        } else {
          console.log(`Inserted revenue: ${amount} for ${professionalName} on ${date}`);
          inserted++;
        }
      } catch (err) {
        console.error(`Error processing appointment ${appointment.agendamento_id}:`, err);
        errors++;
      }
    }

    const result = {
      success: true,
      message: `Sync completed`,
      stats: {
        total_appointments: appointments.length,
        completed_appointments: completedAppointments.length,
        inserted,
        skipped,
        errors,
      },
    };

    console.log('Sync result:', result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function parseFeegowDate(dateStr: string): string {
  // Convert "DD-MM-YYYY" to "YYYY-MM-DD"
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

function parseAmount(amountStr: string): number {
  // Parse "R$ 1.234,56" to 1234.56
  const cleaned = amountStr
    .replace('R$', '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : amount;
}
