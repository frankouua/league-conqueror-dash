import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FEEGOW API response interfaces
interface FeegowInvoiceDetail {
  unidade_id?: number;
  responsavel?: string | null;
  movement_id?: number;
  invoice_id?: number;
  tipo_conta?: number;
  conta_id?: number;
  valor?: number | string;
  descricao?: string;
  data?: string;
}

interface FeegowInvoice {
  detalhes?: FeegowInvoiceDetail[];
  pagamentos?: any[];
  itens?: any[];
}

interface FeegowProfessional {
  profissional_id: number;
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
    let action = 'sync';
    
    try {
      const body = await req.json();
      dateStart = body.date_start || formatDateFeegow(new Date());
      dateEnd = body.date_end || formatDateFeegow(new Date());
      triggeredBy = body.triggered_by || 'manual';
      action = body.action || 'sync';
    } catch {
      // Default to today
      const today = new Date();
      dateStart = formatDateFeegow(today);
      dateEnd = formatDateFeegow(today);
    }

    // Handle diagnose action - test all endpoints
    if (action === 'diagnose') {
      console.log('Running FEEGOW API diagnostics...');
      
      const today = formatDateFeegow(new Date());
      const lastWeek = formatDateFeegow(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      
      const endpoints = [
        { name: 'employee/list', method: 'GET', url: 'https://api.feegow.com/v1/api/employee/list' },
        { name: 'professional/list', method: 'GET', url: 'https://api.feegow.com/v1/api/professional/list' },
        { name: 'patient/list', method: 'GET', url: 'https://api.feegow.com/v1/api/patient/list' },
        { name: 'financial/list-invoice', method: 'GET', url: `https://api.feegow.com/v1/api/financial/list-invoice?data_start=${lastWeek}&data_end=${today}&tipo_transacao=C` },
      ];

      const results: Record<string, any> = {};

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint.url, {
            method: endpoint.method,
            headers: {
              'Content-Type': 'application/json',
              'x-access-token': feegowToken,
            },
          });

          const responseText = await response.text();
          let responseData;
          try {
            responseData = JSON.parse(responseText);
          } catch {
            responseData = responseText;
          }

          results[endpoint.name] = {
            status: response.status,
            success: response.ok,
            data: typeof responseData === 'object' ? responseData : { raw: responseData.slice(0, 500) },
          };

          console.log(`${endpoint.name}: ${response.status} - ${response.ok ? 'OK' : 'FAILED'}`);
        } catch (error: unknown) {
          results[endpoint.name] = {
            status: 0,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: 'diagnose',
          results,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle list-units action
    if (action === 'list-units') {
      console.log('Fetching available units...');
      
      const unitsResponse = await fetch(
        `https://api.feegow.com/v1/api/company/units`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-access-token': feegowToken,
          },
        }
      );

      console.log('Units response status:', unitsResponse.status);
      
      if (unitsResponse.ok) {
        const unitsData = await unitsResponse.json();
        console.log('Units response:', JSON.stringify(unitsData));
        
        return new Response(
          JSON.stringify({
            success: true,
            action: 'list-units',
            data: unitsData,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const errorText = await unitsResponse.text();
        console.log('Units endpoint failed:', errorText);
        
        // Try alternative endpoint
        const altUnitsResponse = await fetch(
          `https://api.feegow.com/v1/api/unit/list`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'x-access-token': feegowToken,
            },
          }
        );

        console.log('Alt units response status:', altUnitsResponse.status);
        
        if (altUnitsResponse.ok) {
          const altUnitsData = await altUnitsResponse.json();
          console.log('Alt units response:', JSON.stringify(altUnitsData));
          
          return new Response(
            JSON.stringify({
              success: true,
              action: 'list-units',
              data: altUnitsData,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({
            success: false,
            action: 'list-units',
            error: 'Failed to fetch units',
            details: errorText,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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

    // Fetch professionals list to map IDs to names
    console.log('Fetching professionals list...');
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

    const professionalsMap: Record<number, string> = {};
    const sysUserToNameMap: Record<number, string> = {};
    
    if (professionalsResponse.ok) {
      const professionalsData = await professionalsResponse.json();
      console.log('Professionals response:', JSON.stringify(professionalsData).slice(0, 500));
      if (professionalsData.success && professionalsData.content) {
        for (const prof of professionalsData.content) {
          if (prof.profissional_id && prof.nome) {
            professionalsMap[prof.profissional_id] = prof.nome;
          }
          if (prof.sys_user && prof.nome) {
            sysUserToNameMap[prof.sys_user] = prof.nome;
          }
        }
      }
    } else {
      console.log('Failed to fetch professionals, will try to match by other fields');
    }

    console.log(`Loaded ${Object.keys(professionalsMap).length} professionals`);

    // Fetch invoices using financial/list-invoice endpoint (GET with query params)
    console.log('Fetching financial invoices with list-invoice endpoint...');
    
    let invoices: FeegowInvoice[] = [];
    
    // Use list-invoice endpoint with tipo_transacao=C (crédito/vendas)
    const invoiceUrl = `https://api.feegow.com/v1/api/financial/list-invoice?data_start=${dateStart}&data_end=${dateEnd}&tipo_transacao=C`;
    console.log('Fetching:', invoiceUrl);
    
    const invoiceResponse = await fetch(invoiceUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': feegowToken,
      },
    });

    console.log('financial/list-invoice response status:', invoiceResponse.status);

    if (invoiceResponse.ok) {
      const invoiceData = await invoiceResponse.json();
      console.log('financial/list-invoice response preview:', JSON.stringify(invoiceData).slice(0, 3000));
      
      if (invoiceData.success && invoiceData.content) {
        invoices = Array.isArray(invoiceData.content) 
          ? invoiceData.content 
          : [invoiceData.content];
        
        // Log first invoice structure to understand the data
        if (invoices.length > 0) {
          console.log('Sample invoice structure:', JSON.stringify(invoices[0], null, 2));
          console.log('Available invoice keys:', Object.keys(invoices[0]).join(', '));
        }
      }
    } else {
      const errorText = await invoiceResponse.text();
      console.log('financial/list-invoice failed. Error:', errorText);
    }

    console.log(`Found ${invoices.length} invoice records`);

    // Flatten all invoice details into individual records
    const allDetails: FeegowInvoiceDetail[] = [];
    for (const invoice of invoices) {
      if (invoice.detalhes && Array.isArray(invoice.detalhes)) {
        for (const detail of invoice.detalhes) {
          allDetails.push(detail);
        }
      }
    }

    console.log(`Extracted ${allDetails.length} individual details from invoices`);

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

    for (const detail of allDetails) {
      try {
        // Get amount
        const amount = parseAmount(String(detail.valor || 0));

        if (amount <= 0) {
          console.log(`Skipping detail ${detail.movement_id || detail.conta_id}: zero amount`);
          skipped++;
          continue;
        }

        // Get date
        const dateStr = detail.data;
        if (!dateStr) {
          console.log(`Skipping detail ${detail.movement_id || detail.conta_id}: no date`);
          skipped++;
          continue;
        }
        const date = parseFeegowDate(dateStr);

        // Get seller name from responsavel field
        let sellerName = detail.responsavel || null;

        if (!sellerName) {
          console.log(`Skipping detail ${detail.movement_id || detail.conta_id}: no seller (responsavel is null)`);
          skipped++;
          continue;
        }

        // Check for duplicates using movement_id in notes
        const feegowId = `feegow_mov_${detail.movement_id || detail.invoice_id}_${detail.conta_id}`;
        
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

        // First, check feegow_user_mapping table for exact match
        const { data: mappedUser } = await supabase
          .from('feegow_user_mapping')
          .select('user_id')
          .eq('feegow_name', sellerName)
          .maybeSingle();

        let matchedUser: any = null;

        if (mappedUser) {
          // Found in mapping table, get full profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('user_id, team_id, department, full_name')
            .eq('user_id', mappedUser.user_id)
            .maybeSingle();
          matchedUser = profileData;
        } else {
          // Try to find user by name (partial match on first name)
          const { data: profileData } = await supabase
            .from('profiles')
            .select('user_id, team_id, department, full_name')
            .ilike('full_name', `%${sellerName.split(' ')[0]}%`)
            .maybeSingle();
          matchedUser = profileData;
        }

        if (!matchedUser) {
          if (!notFoundSellers.includes(sellerName)) {
            notFoundSellers.push(sellerName);
          }
          console.log(`No user found for seller: ${sellerName}`);
          skipped++;
          continue;
        }

        // Map department from user's department (no unit name available in detail)
        const department = matchedUser.department || 'comercial';

        // Insert revenue record
        const { error: insertError } = await supabase
          .from('revenue_records')
          .insert({
            amount,
            date,
            user_id: matchedUser.user_id,
            team_id: matchedUser.team_id,
            department,
            notes: `FEEGOW Sync | ID: ${feegowId} | Vendedor: ${sellerName} | ${detail.descricao || 'N/A'}`,
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
        console.error(`Error processing detail:`, err);
        errors++;
      }
    }

    const result = {
      success: true,
      message: `Sync completed`,
      stats: {
        total_invoices: invoices.length,
        total_details: allDetails.length,
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
          total_accounts: allDetails.length,
          paid_accounts: allDetails.length,
          inserted,
          skipped,
          errors,
          sellers_not_found: notFoundSellers,
        })
        .eq('id', logId);
    }

    // Create notifications for admins if there are unmapped sellers
    if (notFoundSellers.length > 0 && supabase) {
      // Get all admin user IDs
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles && adminRoles.length > 0) {
        const notifications = adminRoles.map((admin: any) => ({
          user_id: admin.user_id,
          title: 'Vendedores FEEGOW não mapeados',
          message: `${notFoundSellers.length} vendedor(es) não encontrado(s): ${notFoundSellers.slice(0, 3).join(', ')}${notFoundSellers.length > 3 ? '...' : ''}. Configure o mapeamento no painel Admin.`,
          type: 'feegow_sync_warning',
        }));

        await supabase.from('notifications').insert(notifications);
      }
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

      // Create error notification for admins
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles && adminRoles.length > 0) {
        const notifications = adminRoles.map((admin: any) => ({
          user_id: admin.user_id,
          title: 'Erro na sincronização FEEGOW',
          message: `A sincronização falhou: ${errorMessage.slice(0, 100)}`,
          type: 'feegow_sync_error',
        }));

        await supabase.from('notifications').insert(notifications);
      }
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
