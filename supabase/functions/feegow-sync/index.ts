import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FEEGOW API response interfaces
interface FeegowSale {
  id?: number;
  venda_id?: number;
  data?: string;
  data_venda?: string;
  valor?: number | string;
  valor_total?: number | string;
  paciente_id?: number;
  paciente_nome?: string;
  vendedor?: string;
  vendedor_nome?: string;
  vendedor_id?: number;
  funcionario_id?: number;
  funcionario_nome?: string;
  usuario?: string;
  usuario_nome?: string;
  agendador?: string;
  scheduler?: string;
  responsavel?: string;
  atendente?: string;
  status?: string;
  procedimentos?: any[];
  itens?: any[];
  unidade_id?: number;
  [key: string]: any; // Allow any other fields for discovery
}

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
    let useNewEndpoint = true; // Toggle between sales and invoice endpoint
    
    try {
      const body = await req.json();
      dateStart = body.date_start || formatDateFeegow(new Date());
      dateEnd = body.date_end || formatDateFeegow(new Date());
      triggeredBy = body.triggered_by || 'manual';
      action = body.action || 'sync';
      useNewEndpoint = body.use_sales_endpoint !== false; // Default to true
    } catch {
      // Default to today
      const today = new Date();
      dateStart = formatDateFeegow(today);
      dateEnd = formatDateFeegow(today);
    }

    // =====================================================
    // DIAGNOSE ACTION - Test /financial/sales endpoint
    // =====================================================
    if (action === 'diagnose') {
      console.log('🔍 Running FEEGOW API diagnostics on /financial/sales...');
      
      const today = formatDateFeegow(new Date());
      const lastWeek = formatDateFeegow(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      
      const results: Record<string, any> = {};

      // Test 1: /financial/sales (POST)
      console.log('Testing /financial/sales (POST)...');
      try {
        const salesResponse = await fetch('https://api.feegow.com/v1/api/financial/sales', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-access-token': feegowToken,
          },
          body: JSON.stringify({
            data_start: lastWeek,
            data_end: today,
          }),
        });

        const salesText = await salesResponse.text();
        let salesData;
        try {
          salesData = JSON.parse(salesText);
        } catch {
          salesData = { raw: salesText };
        }

        // Analyze seller fields if data exists
        let sellerFieldsFound: string[] = [];
        let sampleSales: any[] = [];
        
        if (salesData.success && salesData.content) {
          const content = salesData.content;
          sampleSales = Array.isArray(content) ? content.slice(0, 2) : 
                        (content.vendas && Array.isArray(content.vendas)) ? content.vendas.slice(0, 2) :
                        (content.sales && Array.isArray(content.sales)) ? content.sales.slice(0, 2) : 
                        (content.data && Array.isArray(content.data)) ? content.data.slice(0, 2) : [];
          
          if (sampleSales.length > 0) {
            const firstSale = sampleSales[0];
            const sellerKeywords = ['vendedor', 'seller', 'funcionario', 'employee', 'usuario', 'user', 'agendador', 'responsavel', 'atendente', 'scheduler'];
            
            for (const key of Object.keys(firstSale)) {
              const keyLower = key.toLowerCase();
              if (sellerKeywords.some(kw => keyLower.includes(kw))) {
                sellerFieldsFound.push(`${key}: ${JSON.stringify(firstSale[key])}`);
              }
            }
            
            // Also show all keys for analysis
            results['sales_all_keys'] = Object.keys(firstSale);
          }
        }

        const salesCount = sampleSales.length > 0 ? 
          (Array.isArray(salesData.content) ? salesData.content.length : 
           salesData.content?.vendas?.length || salesData.content?.sales?.length || salesData.content?.data?.length || 0) : 0;

        results['financial_sales_POST'] = {
          status: salesResponse.status,
          success: salesData.success,
          recordCount: salesCount,
          sellerFieldsFound,
          sampleSales,
        };

        console.log(`/financial/sales (POST): ${salesResponse.status} - Records: ${salesCount}`);
        console.log('Seller fields found:', sellerFieldsFound);
      } catch (error: unknown) {
        results['financial_sales_POST'] = {
          status: 0,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }

      // Test 2: /financial/sales (GET with query params)
      console.log('Testing /financial/sales (GET)...');
      try {
        const salesGetResponse = await fetch(
          `https://api.feegow.com/v1/api/financial/sales?data_start=${lastWeek}&data_end=${today}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'x-access-token': feegowToken,
            },
          }
        );

        const salesGetText = await salesGetResponse.text();
        let salesGetData;
        try {
          salesGetData = JSON.parse(salesGetText);
        } catch {
          salesGetData = { raw: salesGetText.slice(0, 500) };
        }

        results['financial_sales_GET'] = {
          status: salesGetResponse.status,
          success: salesGetData.success || false,
          preview: typeof salesGetData === 'object' ? JSON.stringify(salesGetData).slice(0, 500) : salesGetText.slice(0, 500),
        };
      } catch (error: unknown) {
        results['financial_sales_GET'] = {
          status: 0,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }

      // Test 3: Original invoice endpoint for comparison
      console.log('Testing /financial/list-invoice (GET)...');
      try {
        const invoiceResponse = await fetch(
          `https://api.feegow.com/v1/api/financial/list-invoice?data_start=${lastWeek}&data_end=${today}&tipo_transacao=C`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'x-access-token': feegowToken,
            },
          }
        );

        const invoiceData = await invoiceResponse.json();
        results['financial_list-invoice'] = {
          status: invoiceResponse.status,
          success: invoiceData.success || false,
          recordCount: invoiceData.content?.length || 0,
        };
      } catch (error: unknown) {
        results['financial_list-invoice'] = {
          status: 0,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }

      // Test 4: Appointments for scheduler info
      console.log('Testing /appoints/search...');
      try {
        const appointsResponse = await fetch(
          `https://api.feegow.com/v1/api/appoints/search?data_start=${lastWeek}&data_end=${today}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'x-access-token': feegowToken,
            },
          }
        );

        const appointsData = await appointsResponse.json();
        
        // Show sample with agendado_por field
        let sampleAppoints: any[] = [];
        if (appointsData.content && Array.isArray(appointsData.content)) {
          sampleAppoints = appointsData.content.slice(0, 2).map((a: any) => ({
            paciente_id: a.paciente_id,
            data: a.data,
            agendado_por: a.agendado_por,
            status_id: a.status_id,
          }));
        }

        results['appoints_search'] = {
          status: appointsResponse.status,
          success: appointsData.success || false,
          recordCount: appointsData.content?.length || 0,
          sampleAppoints,
        };
      } catch (error: unknown) {
        results['appoints_search'] = {
          status: 0,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'diagnose', 
          message: 'Diagnóstico completo. Veja os resultados abaixo para identificar campos de vendedor.',
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
    // SYNC ACTION
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
    console.log(`Using endpoint: ${useNewEndpoint ? '/financial/sales' : '/financial/list-invoice + appoints'}`);

    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    let totalAmount = 0;
    const sellersNotFound: Set<string> = new Set();

    // Get user mappings
    const { data: userMappings, error: mappingError } = await supabase
      .from('feegow_user_mapping')
      .select('feegow_name, user_id');

    if (mappingError) {
      console.error('Error fetching user mappings:', mappingError);
      throw mappingError;
    }

    const nameToUserId: Map<string, string> = new Map();
    for (const mapping of userMappings || []) {
      nameToUserId.set(mapping.feegow_name.toLowerCase().trim(), mapping.user_id);
    }
    console.log(`Loaded ${nameToUserId.size} user mappings`);

    // Get profiles
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
    // TRY /financial/sales ENDPOINT FIRST
    // =====================================================
    if (useNewEndpoint) {
      console.log('Trying /financial/sales endpoint...');
      
      const salesResponse = await fetch('https://api.feegow.com/v1/api/financial/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': feegowToken,
        },
        body: JSON.stringify({
          data_start: dateStart,
          data_end: dateEnd,
        }),
      });

      if (salesResponse.ok) {
        const salesData = await salesResponse.json();
        
        if (salesData.success && salesData.content) {
          // Extract sales array
          const content = salesData.content;
          let sales: FeegowSale[] = [];
          
          if (Array.isArray(content)) {
            sales = content;
          } else if (content.vendas && Array.isArray(content.vendas)) {
            sales = content.vendas;
          } else if (content.sales && Array.isArray(content.sales)) {
            sales = content.sales;
          } else if (content.data && Array.isArray(content.data)) {
            sales = content.data;
          }

          console.log(`📋 Found ${sales.length} sales from /financial/sales`);

          // Process each sale
          for (const sale of sales) {
            try {
              // Extract seller name from various possible fields
              const sellerName = sale.vendedor || sale.vendedor_nome || 
                                sale.funcionario_nome || sale.usuario_nome || 
                                sale.agendador || sale.usuario || sale.responsavel ||
                                sale.atendente || sale.scheduler || '';
              
              const saleId = sale.venda_id || sale.id || `sale_${Date.now()}_${Math.random().toString(36).slice(2)}`;
              const saleDate = sale.data_venda || sale.data || dateStart;
              const saleValue = parseAmount(String(sale.valor_total || sale.valor || 0));

              if (saleValue <= 0) {
                console.log(`⏭️ Skipping sale ${saleId}: zero or negative value`);
                skipped++;
                continue;
              }

              if (!sellerName) {
                console.log(`⏭️ Skipping sale ${saleId}: no seller name found`);
                skipped++;
                continue;
              }

              // Find user by seller name
              const normalizedName = sellerName.toLowerCase().trim();
              let userId = nameToUserId.get(normalizedName);

              // Try partial match if exact match fails
              if (!userId) {
                for (const [feegowName, uid] of nameToUserId.entries()) {
                  if (normalizedName.includes(feegowName) || feegowName.includes(normalizedName)) {
                    userId = uid;
                    break;
                  }
                }
              }

              if (!userId) {
                sellersNotFound.add(sellerName);
                skipped++;
                continue;
              }

              const profile = userToProfile.get(userId);
              if (!profile) {
                console.log(`⚠️ No profile found for user ${userId}`);
                skipped++;
                continue;
              }

              const parsedDate = parseFeegowDate(saleDate);
              const feegowId = `feegow_sale_${saleId}`;

              // Check for duplicate
              const { data: existing } = await supabase
                .from('revenue_records')
                .select('id')
                .ilike('notes', `%${feegowId}%`)
                .maybeSingle();

              if (existing) {
                skipped++;
                continue;
              }

              // Insert revenue record
              const { error: insertError } = await supabase
                .from('revenue_records')
                .insert({
                  user_id: userId,
                  team_id: profile.team_id,
                  amount: saleValue,
                  date: parsedDate,
                  department: profile.department,
                  notes: `FEEGOW Sync | ${feegowId} | Vendedor: ${sellerName} | Paciente: ${sale.paciente_nome || sale.paciente_id || 'N/A'}`,
                  registered_by_admin: true,
                  counts_for_individual: true,
                  attributed_to_user_id: userId,
                });

              if (insertError) {
                console.error(`Insert error for sale ${saleId}:`, insertError);
                errors++;
              } else {
                console.log(`✅ Inserted: R$ ${saleValue.toFixed(2)} -> ${sellerName} (${profile.full_name}) on ${parsedDate}`);
                inserted++;
                totalAmount += saleValue;
              }
            } catch (saleError) {
              console.error('Error processing sale:', saleError);
              errors++;
            }
          }

          // If /financial/sales worked, return the result
          const sellersNotFoundArray = [...sellersNotFound];
          const result = {
            success: true,
            message: 'Sync completed using /financial/sales endpoint',
            endpoint_used: '/financial/sales',
            stats: {
              total_sales: sales.length,
              total_amount: totalAmount,
              inserted,
              skipped,
              errors,
            },
            sellers_not_found: sellersNotFoundArray,
          };

          // Update sync log
          if (logId) {
            await supabase
              .from('feegow_sync_logs')
              .update({
                status: 'success',
                completed_at: new Date().toISOString(),
                total_accounts: sales.length,
                paid_accounts: sales.length,
                inserted,
                skipped,
                errors,
                sellers_not_found: sellersNotFoundArray,
              })
              .eq('id', logId);
          }

          // Notify about unmapped sellers
          if (sellersNotFoundArray.length > 0) {
            const { data: adminRoles } = await supabase
              .from('user_roles')
              .select('user_id')
              .eq('role', 'admin');

            if (adminRoles && adminRoles.length > 0) {
              const notifications = adminRoles.map((admin: any) => ({
                user_id: admin.user_id,
                title: 'Vendedores FEEGOW não mapeados',
                message: `${sellersNotFoundArray.length} vendedor(es) não encontrado(s): ${sellersNotFoundArray.slice(0, 3).join(', ')}${sellersNotFoundArray.length > 3 ? '...' : ''}`,
                type: 'feegow_sync_warning',
              }));

              await supabase.from('notifications').insert(notifications);
            }
          }

          console.log('=== SYNC RESULT ===');
          console.log(JSON.stringify(result, null, 2));

          return new Response(
            JSON.stringify(result),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      console.log('⚠️ /financial/sales failed or returned no data, falling back to invoice+appoints method...');
    }

    // =====================================================
    // FALLBACK: Use invoice + appointments method
    // =====================================================
    console.log('Using fallback method: /financial/list-invoice + /appoints/search');
    
    // Fetch invoices
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

    // Collect patient IDs
    const patientIdsFromInvoices = new Set<number>();
    for (const invoice of invoices) {
      if (invoice.paciente_id) {
        patientIdsFromInvoices.add(invoice.paciente_id);
      }
    }

    // Fetch appointments with lookback
    const lookbackStartDate = new Date();
    const [day, month, year] = dateStart.split('-').map(Number);
    lookbackStartDate.setFullYear(year, month - 1, day);
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

    const appointsData = await appointsResponse.json();
    const appointments: FeegowAppointment[] = appointsData.content || [];
    console.log(`Fetched ${appointments.length} appointments`);

    // Build patient to scheduler map
    const patientToScheduler: Map<number, string> = new Map();
    const sortedAppointments = [...appointments].sort((a, b) => {
      const dateA = parseFeegowDate(a.data);
      const dateB = parseFeegowDate(b.data);
      return dateA.localeCompare(dateB);
    });

    for (const appt of sortedAppointments) {
      if (appt.paciente_id && appt.agendado_por && patientIdsFromInvoices.has(appt.paciente_id)) {
        if (!patientToScheduler.has(appt.paciente_id)) {
          patientToScheduler.set(appt.paciente_id, appt.agendado_por);
        }
      }
    }
    console.log(`Built scheduler map for ${patientToScheduler.size} patients`);

    // Process invoices
    let noSchedulerCount = 0;
    let noMappingCount = 0;
    let noProfileCount = 0;
    let duplicateCount = 0;
    let zeroPaidCount = 0;

    for (const invoice of invoices) {
      try {
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

        totalAmount += paidAmount;

        const schedulerName = patientToScheduler.get(invoice.paciente_id);
        
        if (!schedulerName) {
          noSchedulerCount++;
          skipped++;
          continue;
        }

        const userId = nameToUserId.get(schedulerName.toLowerCase().trim());
        
        if (!userId) {
          sellersNotFound.add(schedulerName);
          noMappingCount++;
          skipped++;
          continue;
        }

        const profile = userToProfile.get(userId);
        if (!profile) {
          noProfileCount++;
          skipped++;
          continue;
        }

        const invoiceDate = parseFeegowDate(invoice.data);
        const feegowId = `feegow_invoice_${invoice.conta_id}`;

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
          console.log(`✅ Inserted: R$ ${paidAmount.toFixed(2)} -> ${schedulerName} (${profile.full_name}) on ${invoiceDate}`);
          inserted++;
        }
      } catch (err) {
        console.error('Error processing invoice:', err);
        errors++;
      }
    }

    const sellersNotFoundArray = [...sellersNotFound];
    
    const result = {
      success: true,
      message: 'Sync completed using invoice+appoints fallback',
      endpoint_used: '/financial/list-invoice + /appoints/search',
      stats: {
        total_appointments: appointments.length,
        patients_with_scheduler: patientToScheduler.size,
        total_invoices: invoices.length,
        total_amount: totalAmount,
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
    if (logId) {
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

    // Notify about unmapped sellers
    if (sellersNotFoundArray.length > 0) {
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles && adminRoles.length > 0) {
        const notifications = adminRoles.map((admin: any) => ({
          user_id: admin.user_id,
          title: 'Vendedores FEEGOW não mapeados',
          message: `${sellersNotFoundArray.length} vendedor(es) não encontrado(s): ${sellersNotFoundArray.slice(0, 3).join(', ')}${sellersNotFoundArray.length > 3 ? '...' : ''}`,
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

    if (logId && supabase) {
      await supabase
        .from('feegow_sync_logs')
        .update({
          status: 'error',
          completed_at: new Date().toISOString(),
          error_message: errorMessage,
        })
        .eq('id', logId);

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
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return dateStr.split('T')[0];
      }
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  
  return dateStr;
}

function parseAmount(amountStr: string): number {
  if (typeof amountStr === 'number') return amountStr;
  if (!amountStr) return 0;
  
  const cleaned = amountStr
    .replace('R$', '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : amount;
}
