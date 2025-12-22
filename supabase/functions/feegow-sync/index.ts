import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FEEGOW API response interfaces
interface FeegowAppointment {
  paciente_id: number;
  paciente_nome?: string;
  agendado_por: string | null;
  agendado_por_id?: number | null;
  data: string;
  hora?: string;
  profissional_id?: number;
  profissional_nome?: string;
  status?: string;
}

interface FeegowPayment {
  valor: number | string;
  data_pagamento?: string;
  forma_pagamento?: string;
}

interface FeegowInvoice {
  conta_id: number;
  paciente_id: number;
  paciente_nome?: string;
  data: string;
  valor_total?: number;
  status?: string;
  detalhes?: any[];
  pagamentos?: FeegowPayment[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let logId: string | null = null;
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

    // Handle diagnose action - test endpoints
    if (action === 'diagnose') {
      console.log('Running FEEGOW API diagnostics...');
      
      const today = formatDateFeegow(new Date());
      const lastWeek = formatDateFeegow(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      
      const endpoints = [
        { name: 'appoints/search', method: 'GET', url: `https://api.feegow.com/v1/api/appoints/search?data_start=${lastWeek}&data_end=${today}` },
        { name: 'appoints/status', method: 'GET', url: `https://api.feegow.com/v1/api/appoints/status` },
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

          let sampleData = null;
          let allData = null;
          if (responseData.content && Array.isArray(responseData.content)) {
            if (responseData.content.length > 0) {
              sampleData = {
                keys: Object.keys(responseData.content[0]),
                sample: responseData.content[0],
                count: responseData.content.length
              };
            }
            // For status endpoint, return all data
            if (endpoint.name === 'appoints/status') {
              allData = responseData.content;
            }
          }

          results[endpoint.name] = {
            status: response.status,
            success: response.ok,
            sampleData,
            allData,
            recordCount: responseData.content?.length || 0,
          };

          console.log(`${endpoint.name}: ${response.status} - Records: ${responseData.content?.length || 0}`);
        } catch (error: unknown) {
          results[endpoint.name] = {
            status: 0,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }

      return new Response(
        JSON.stringify({ success: true, action: 'diagnose', results }),
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

      if (unitsResponse.ok) {
        const unitsData = await unitsResponse.json();
        return new Response(
          JSON.stringify({ success: true, action: 'list-units', data: unitsData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const errorText = await unitsResponse.text();
        return new Response(
          JSON.stringify({ success: false, action: 'list-units', error: 'Failed to fetch units', details: errorText }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // =====================================================
    // SYNC ACTION - Cross appointments with invoices
    // =====================================================
    
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

    console.log(`=== FEEGOW SYNC START ===`);
    console.log(`Period: ${dateStart} to ${dateEnd}`);

    // =====================================================
    // STEP 1: Fetch invoices/payments first
    // =====================================================
    console.log('Step 1: Fetching invoices...');
    
    const invoiceResponse = await fetch(
      `https://api.feegow.com/v1/api/financial/list-invoice?data_start=${dateStart}&data_end=${dateEnd}&tipo_transacao=C`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': feegowToken,
        },
      }
    );

    if (!invoiceResponse.ok) {
      const errorText = await invoiceResponse.text();
      throw new Error(`Failed to fetch invoices: ${invoiceResponse.status} - ${errorText}`);
    }

    const invoiceData = await invoiceResponse.json();
    const invoices: FeegowInvoice[] = invoiceData.content || [];
    console.log(`Fetched ${invoices.length} invoices`);

    // Collect unique patient IDs from invoices
    const patientIdsFromInvoices = new Set<number>();
    for (const invoice of invoices) {
      if (invoice.paciente_id) {
        patientIdsFromInvoices.add(invoice.paciente_id);
      }
    }
    console.log(`Found ${patientIdsFromInvoices.size} unique patients with invoices`);

    // =====================================================
    // STEP 2: Fetch appointments - look back further to find scheduler
    // We need to find when the patient was originally scheduled
    // =====================================================
    console.log('Step 2: Fetching appointments (looking back 150 days for scheduler info)...');
    
    // Look back 150 days from the start date to find scheduler info (API limit is 6 months)
    const lookbackStartDate = new Date(dateStart);
    lookbackStartDate.setDate(lookbackStartDate.getDate() - 150);
    const lookbackDateStr = formatDateFeegow(lookbackStartDate);
    
    const appointsResponse = await fetch(
      `https://api.feegow.com/v1/api/appoints/search?data_start=${lookbackDateStr}&data_end=${dateEnd}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': feegowToken,
        },
      }
    );

    if (!appointsResponse.ok) {
      const errorText = await appointsResponse.text();
      throw new Error(`Failed to fetch appointments: ${appointsResponse.status} - ${errorText}`);
    }

    const appointsData = await appointsResponse.json();
    const appointments: FeegowAppointment[] = appointsData.content || [];
    console.log(`Fetched ${appointments.length} appointments from ${lookbackDateStr} to ${dateEnd}`);

    // Build map: paciente_id -> agendado_por (use FIRST appointment = original scheduler)
    const patientToScheduler: Map<number, string> = new Map();
    const patientToSchedulerDetails: Map<number, { name: string; date: string }> = new Map();
    
    // Sort appointments by date (oldest first) to get the original scheduler
    const sortedAppointments = [...appointments].sort((a, b) => {
      const dateA = parseFeegowDate(a.data);
      const dateB = parseFeegowDate(b.data);
      return dateA.localeCompare(dateB);
    });
    
    for (const appt of sortedAppointments) {
      // Only process appointments for patients that have invoices
      if (appt.paciente_id && appt.agendado_por && patientIdsFromInvoices.has(appt.paciente_id)) {
        // Only set if not already set (keep the FIRST/oldest scheduler)
        if (!patientToScheduler.has(appt.paciente_id)) {
          patientToScheduler.set(appt.paciente_id, appt.agendado_por);
          patientToSchedulerDetails.set(appt.paciente_id, { 
            name: appt.agendado_por, 
            date: parseFeegowDate(appt.data) 
          });
        }
      }
    }
    
    console.log(`Built scheduler map for ${patientToScheduler.size} of ${patientIdsFromInvoices.size} patients with invoices`)

    // =====================================================
    // STEP 3: Get user mappings from database
    // =====================================================
    console.log('Step 3: Loading user mappings...');
    
    const { data: userMappings, error: mappingError } = await supabase
      .from('feegow_user_mapping')
      .select('feegow_name, user_id');

    if (mappingError) {
      console.error('Error fetching user mappings:', mappingError);
      throw mappingError;
    }

    // Create map: feegow_name (lowercase) -> user_id
    const nameToUserId: Map<string, string> = new Map();
    for (const mapping of userMappings || []) {
      nameToUserId.set(mapping.feegow_name.toLowerCase().trim(), mapping.user_id);
    }
    console.log(`Loaded ${nameToUserId.size} user mappings`);

    // =====================================================
    // STEP 4: Get user profiles for team_id
    // =====================================================
    const userIds = [...new Set(nameToUserId.values())];
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, team_id, department, full_name')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    const userToProfile: Map<string, { team_id: string; department: string; full_name: string }> = new Map();
    for (const profile of profiles || []) {
      if (profile.team_id) {
        userToProfile.set(profile.user_id, {
          team_id: profile.team_id,
          department: profile.department || 'comercial',
          full_name: profile.full_name,
        });
      }
    }
    console.log(`Loaded profiles for ${userToProfile.size} users`);

    // =====================================================
    // STEP 5: Process invoices and create revenue records
    // =====================================================
    console.log('Step 5: Processing invoices...');
    
    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    let noSchedulerCount = 0;
    let noMappingCount = 0;
    let noProfileCount = 0;
    let duplicateCount = 0;
    let zeroPaidCount = 0;
    const sellersNotFound: Set<string> = new Set();
    let totalPaidAmount = 0;

    for (const invoice of invoices) {
      try {
        // Calculate total paid amount from pagamentos array
        let paidAmount = 0;
        if (invoice.pagamentos && Array.isArray(invoice.pagamentos)) {
          for (const pagamento of invoice.pagamentos) {
            const valor = parseAmount(String(pagamento.valor || 0));
            paidAmount += valor;
          }
        }

        if (paidAmount <= 0) {
          zeroPaidCount++;
          skipped++;
          continue;
        }

        totalPaidAmount += paidAmount;

        // Find the scheduler/seller for this patient
        const schedulerName = patientToScheduler.get(invoice.paciente_id);
        
        if (!schedulerName) {
          noSchedulerCount++;
          skipped++;
          continue;
        }

        // Find user_id for this scheduler in mappings
        const userId = nameToUserId.get(schedulerName.toLowerCase().trim());
        
        if (!userId) {
          sellersNotFound.add(schedulerName);
          noMappingCount++;
          skipped++;
          continue;
        }

        // Get profile (team_id) for this user
        const profile = userToProfile.get(userId);
        if (!profile) {
          console.warn(`No profile found for user ${userId} (${schedulerName})`);
          noProfileCount++;
          skipped++;
          continue;
        }

        // Parse invoice date
        const invoiceDate = parseFeegowDate(invoice.data);

        // Create unique identifier for deduplication
        const feegowId = `feegow_invoice_${invoice.conta_id}`;

        // Check if record already exists
        const { data: existing } = await supabase
          .from('revenue_records')
          .select('id')
          .ilike('notes', `%${feegowId}%`)
          .maybeSingle();

        if (existing) {
          duplicateCount++;
          skipped++;
          continue;
        }

        // Insert revenue record
        const { error: insertError } = await supabase
          .from('revenue_records')
          .insert({
            user_id: userId,
            team_id: profile.team_id,
            amount: paidAmount,
            date: invoiceDate,
            department: profile.department,
            notes: `FEEGOW Sync | ${feegowId} | Vendedor: ${schedulerName} | Paciente: ${invoice.paciente_nome || invoice.paciente_id}`,
            registered_by_admin: true,
            counts_for_individual: true,
            attributed_to_user_id: userId,
          });

        if (insertError) {
          console.error(`Insert error for invoice ${invoice.conta_id}:`, insertError);
          errors++;
        } else {
          console.log(`Inserted: R$ ${paidAmount.toFixed(2)} -> ${schedulerName} (${profile.full_name}) on ${invoiceDate}`);
          inserted++;
        }
      } catch (err) {
        console.error('Error processing invoice:', err);
        errors++;
      }
    }

    // =====================================================
    // STEP 6: Update sync log and create notifications
    // =====================================================
    const sellersNotFoundArray = [...sellersNotFound];
    
    const result = {
      success: true,
      message: 'Sync completed',
      stats: {
        total_appointments: appointments.length,
        patients_with_scheduler: patientToScheduler.size,
        total_invoices: invoices.length,
        total_paid_amount: totalPaidAmount,
        inserted,
        skipped,
        errors,
        breakdown: {
          zero_paid: zeroPaidCount,
          no_scheduler: noSchedulerCount,
          no_mapping: noMappingCount,
          no_profile: noProfileCount,
          duplicates: duplicateCount,
        },
      },
      sellers_not_found: sellersNotFoundArray,
    };

    console.log('=== SYNC RESULT ===');
    console.log(JSON.stringify(result, null, 2));

    // Update sync log
    if (logId && supabase) {
      await supabase
        .from('feegow_sync_logs')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
          total_accounts: invoices.length,
          paid_accounts: appointments.length,
          inserted,
          skipped,
          errors,
          sellers_not_found: sellersNotFoundArray,
        })
        .eq('id', logId);
    }

    // Create notifications for admins if there are unmapped sellers
    if (sellersNotFoundArray.length > 0 && supabase) {
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles && adminRoles.length > 0) {
        const notifications = adminRoles.map((admin: any) => ({
          user_id: admin.user_id,
          title: 'Vendedores FEEGOW não mapeados',
          message: `${sellersNotFoundArray.length} vendedor(es) não encontrado(s): ${sellersNotFoundArray.slice(0, 3).join(', ')}${sellersNotFoundArray.length > 3 ? '...' : ''}. Configure o mapeamento no painel Admin.`,
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
