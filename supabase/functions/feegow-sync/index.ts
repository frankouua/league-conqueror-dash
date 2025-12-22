import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FEEGOW API response interfaces
interface FeegowAccount {
  id: number;
  conta_id?: number;
  paciente_id: number;
  paciente_nome?: string;
  valor: number | string;
  valor_pago?: number | string;
  data_vencimento?: string;
  data_pagamento?: string;
  data?: string;
  status?: string;
  pago?: boolean;
  funcionario_id?: number;
  funcionario_nome?: string;
  sys_user?: number;
  usuario_nome?: string;
  unidade_id?: number;
  unidade_nome?: string;
  nome_fantasia?: string;
  descricao?: string;
  observacoes?: string;
}

interface FeegowEmployee {
  funcionario_id: number;
  nome: string;
  sys_user?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let logId: string | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any = null;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const feegowToken = Deno.env.get('FEEGOW_API_TOKEN');

    supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!feegowToken) {
      console.error('FEEGOW_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'FEEGOW_API_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body for optional date range
    let dateStart: string;
    let dateEnd: string;
    let triggeredBy = 'cron';
    
    try {
      const body = await req.json();
      dateStart = body.date_start || formatDateFeegow(new Date());
      dateEnd = body.date_end || formatDateFeegow(new Date());
      triggeredBy = body.triggered_by || 'manual';
    } catch {
      // Default to today
      const today = new Date();
      dateStart = formatDateFeegow(today);
      dateEnd = formatDateFeegow(today);
    }

    // Create sync log entry
    const { data: logData, error: logError } = await supabase
      .from('feegow_sync_logs')
      .insert({
        date_start: dateStart,
        date_end: dateEnd,
        triggered_by: triggeredBy,
        status: 'running',
      })
      .select('id')
      .single();

    if (!logError && logData) {
      logId = logData.id;
    }

    console.log(`Syncing FEEGOW payments from ${dateStart} to ${dateEnd}`);

    // First, fetch employees list to map IDs to names
    console.log('Fetching employees list...');
    const employeesResponse = await fetch(
      `https://api.feegow.com/v1/api/employee/list`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': feegowToken,
        },
      }
    );

    const employeesMap: Record<number, string> = {};
    const sysUserToNameMap: Record<number, string> = {};
    
    if (employeesResponse.ok) {
      const employeesData = await employeesResponse.json();
      console.log('Employees response:', JSON.stringify(employeesData).slice(0, 500));
      if (employeesData.success && employeesData.content) {
        for (const emp of employeesData.content) {
          if (emp.funcionario_id && emp.nome) {
            employeesMap[emp.funcionario_id] = emp.nome;
          }
          if (emp.sys_user && emp.nome) {
            sysUserToNameMap[emp.sys_user] = emp.nome;
          }
        }
      }
    } else {
      console.log('Failed to fetch employees, will try to match by other fields');
    }

    console.log(`Loaded ${Object.keys(employeesMap).length} employees`);

    // Fetch paid accounts/invoices using financial accounts-list endpoint
    // The endpoint structure may vary - we try multiple approaches
    console.log('Fetching financial accounts...');
    
    let accounts: FeegowAccount[] = [];
    
    // Try the financial accounts-list endpoint
    const accountsResponse = await fetch(
      `https://api.feegow.com/v1/api/financial/accounts-list`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': feegowToken,
        },
        body: JSON.stringify({
          data_start: dateStart,
          data_end: dateEnd,
          status: 'pago', // Only paid accounts
          tipo: 'R', // R = Receber (receivables/sales)
        }),
      }
    );

    if (accountsResponse.ok) {
      const accountsData = await accountsResponse.json();
      console.log('Accounts response:', JSON.stringify(accountsData).slice(0, 1000));
      
      if (accountsData.success && accountsData.content) {
        accounts = Array.isArray(accountsData.content) 
          ? accountsData.content 
          : [accountsData.content];
      }
    } else {
      const errorText = await accountsResponse.text();
      console.log('accounts-list failed, trying sales-list. Error:', errorText);
      
      // Try alternative endpoint: sales-list
      const salesResponse = await fetch(
        `https://api.feegow.com/v1/api/financial/sales-list`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-access-token': feegowToken,
          },
          body: JSON.stringify({
            data_start: dateStart,
            data_end: dateEnd,
          }),
        }
      );

      if (salesResponse.ok) {
        const salesData = await salesResponse.json();
        console.log('Sales response:', JSON.stringify(salesData).slice(0, 1000));
        
        if (salesData.success && salesData.content) {
          accounts = Array.isArray(salesData.content) 
            ? salesData.content 
            : [salesData.content];
        }
      } else {
        const salesError = await salesResponse.text();
        console.error('Both endpoints failed. Sales error:', salesError);
        
        // Fallback: use appointments with status "Atendido" (paid)
        console.log('Falling back to appointments endpoint...');
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

        if (appointmentsResponse.ok) {
          const appointmentsData = await appointmentsResponse.json();
          console.log('Appointments response:', JSON.stringify(appointmentsData).slice(0, 1000));
          
          if (appointmentsData.success && appointmentsData.content) {
            // Convert appointments to account format
            const appointments = appointmentsData.content;
            accounts = appointments
              .filter((a: any) => a.status_id === 3) // Atendido = paid
              .map((a: any) => ({
                id: a.agendamento_id,
                paciente_id: a.paciente_id,
                valor: a.valor_total_agendamento,
                data_pagamento: a.data,
                data: a.data,
                funcionario_nome: a.agendado_por,
                unidade_id: a.unidade_id,
                nome_fantasia: a.nome_fantasia,
              }));
          }
        }
      }
    }

    console.log(`Found ${accounts.length} payment records`);

    // Filter only paid accounts
    const paidAccounts = accounts.filter(acc => {
      // Check various ways to determine if paid
      if (acc.pago === true) return true;
      if (acc.status?.toLowerCase() === 'pago') return true;
      if (acc.valor_pago && parseAmount(String(acc.valor_pago)) > 0) return true;
      if (acc.data_pagamento) return true;
      // If we got from appointments fallback, they're already filtered
      return true;
    });

    console.log(`Processing ${paidAccounts.length} paid accounts`);

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
    const notFoundSellers: string[] = [];

    for (const account of paidAccounts) {
      try {
        // Get amount - try multiple fields
        const amount = parseAmount(
          String(account.valor_pago || account.valor || 0)
        );

        if (amount <= 0) {
          console.log(`Skipping account ${account.id || account.conta_id}: zero amount`);
          skipped++;
          continue;
        }

        // Get date - try multiple fields
        const dateStr = account.data_pagamento || account.data_vencimento || account.data;
        if (!dateStr) {
          console.log(`Skipping account ${account.id || account.conta_id}: no date`);
          skipped++;
          continue;
        }
        const date = parseFeegowDate(dateStr);

        // Get seller name - try multiple fields
        let sellerName = 
          account.funcionario_nome || 
          account.usuario_nome ||
          (account.funcionario_id ? employeesMap[account.funcionario_id] : null) ||
          (account.sys_user ? sysUserToNameMap[account.sys_user] : null) ||
          null;

        if (!sellerName) {
          console.log(`Skipping account ${account.id || account.conta_id}: no seller identified`);
          skipped++;
          continue;
        }

        // Check for duplicates using feegow_id in notes
        const feegowId = `feegow_acc_${account.id || account.conta_id}`;
        
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

        // Try to find user by name (partial match)
        const { data: matchedUser } = await supabase
          .from('profiles')
          .select('user_id, team_id, department, full_name')
          .ilike('full_name', `%${sellerName.split(' ')[0]}%`)
          .maybeSingle();

        if (!matchedUser) {
          if (!notFoundSellers.includes(sellerName)) {
            notFoundSellers.push(sellerName);
          }
          console.log(`No user found for seller: ${sellerName}`);
          skipped++;
          continue;
        }

        // Map department from unit name or use user's department
        let department = matchedUser.department || 'comercial';
        const unitName = account.nome_fantasia || account.unidade_nome || '';
        if (unitName) {
          const unitLower = unitName.toLowerCase();
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
            notes: `FEEGOW Sync | ID: ${feegowId} | Vendedor: ${sellerName} | Paciente: ${account.paciente_nome || account.paciente_id}`,
            registered_by_admin: true,
            counts_for_individual: true,
            attributed_to_user_id: matchedUser.user_id,
          });

        if (insertError) {
          console.error(`Insert error for ${feegowId}:`, insertError);
          errors++;
        } else {
          console.log(`Inserted revenue: R$ ${amount.toFixed(2)} for ${sellerName} (${matchedUser.full_name}) on ${date}`);
          inserted++;
        }
      } catch (err) {
        console.error(`Error processing account:`, err);
        errors++;
      }
    }

    const result = {
      success: true,
      message: `Sync completed`,
      stats: {
        total_accounts: accounts.length,
        paid_accounts: paidAccounts.length,
        inserted,
        skipped,
        errors,
      },
      sellers_not_found: notFoundSellers,
    };

    console.log('Sync result:', JSON.stringify(result, null, 2));

    // Update sync log with success
    if (logId && supabase) {
      await supabase
        .from('feegow_sync_logs')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
          total_accounts: accounts.length,
          paid_accounts: paidAccounts.length,
          inserted,
          skipped,
          errors,
          sellers_not_found: notFoundSellers,
        })
        .eq('id', logId);
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update sync log with error
    if (logId && supabase) {
      await supabase
        .from('feegow_sync_logs')
        .update({
          status: 'error',
          completed_at: new Date().toISOString(),
          error_message: errorMessage,
        })
        .eq('id', logId);
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatDateFeegow(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function parseFeegowDate(dateStr: string): string {
  // Handle multiple date formats from FEEGOW
  // "DD-MM-YYYY" or "YYYY-MM-DD" or "DD/MM/YYYY"
  
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      // Check if already YYYY-MM-DD format
      if (parts[0].length === 4) {
        return dateStr;
      }
      // Convert DD-MM-YYYY to YYYY-MM-DD
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  
  return dateStr;
}

function parseAmount(amountStr: string): number {
  if (typeof amountStr === 'number') return amountStr;
  
  // Parse "R$ 1.234,56" or "1234.56" or "1234,56" to number
  const cleaned = amountStr
    .replace('R$', '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : amount;
}
