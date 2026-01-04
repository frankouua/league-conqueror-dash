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
    // EXPLORE-FINANCIAL ACTION - Explore financial/account endpoints
    // =====================================================
    if (action === 'explore-financial') {
      console.log('🔍 Exploring Feegow financial endpoints (contas a receber)...');
      
      const today = formatDateFeegow(new Date());
      const lastMonth = formatDateFeegow(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      
      const results: Record<string, any> = {};

      // Test 1: /financial/account/list - Listar contas (main endpoint for accounts receivable)
      console.log('Testing /financial/account/list (POST)...');
      try {
        const accountListResponse = await fetch('https://api.feegow.com/v1/api/financial/account/list', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-access-token': feegowToken,
          },
          body: JSON.stringify({
            data_start: lastMonth,
            data_end: today,
            tipo_transacao: 'C', // C = Contas a receber (Credit/Revenue)
          }),
        });

        const accountListText = await accountListResponse.text();
        let accountListData;
        try {
          accountListData = JSON.parse(accountListText);
        } catch {
          accountListData = { raw: accountListText.slice(0, 1000) };
        }

        // Analyze fields if data exists
        let sampleAccounts: any[] = [];
        let allKeys: string[] = [];
        let userFields: string[] = [];
        
        if (accountListData.success && accountListData.content) {
          const content = accountListData.content;
          sampleAccounts = Array.isArray(content) ? content.slice(0, 3) : 
                           (content.contas && Array.isArray(content.contas)) ? content.contas.slice(0, 3) :
                           (content.accounts && Array.isArray(content.accounts)) ? content.accounts.slice(0, 3) : 
                           (content.data && Array.isArray(content.data)) ? content.data.slice(0, 3) : [];
          
          if (sampleAccounts.length > 0) {
            const firstAccount = sampleAccounts[0];
            allKeys = Object.keys(firstAccount);
            
            // Look for user/seller fields
            const userKeywords = ['usuario', 'user', 'vendedor', 'seller', 'funcionario', 'employee', 'responsavel', 'atendente', 'cadastrado', 'criado', 'sys_user', 'created'];
            for (const key of allKeys) {
              const keyLower = key.toLowerCase();
              if (userKeywords.some(kw => keyLower.includes(kw))) {
                userFields.push(`${key}: ${JSON.stringify(firstAccount[key])}`);
              }
            }
          }
        }

        results['financial_account_list'] = {
          status: accountListResponse.status,
          success: accountListData.success || false,
          recordCount: Array.isArray(accountListData.content) ? accountListData.content.length : 
                       accountListData.content?.contas?.length || accountListData.content?.accounts?.length || accountListData.total || 0,
          allKeys,
          userFieldsFound: userFields,
          sampleAccounts,
        };

        console.log(`/financial/account/list: ${accountListResponse.status} - Records: ${results['financial_account_list'].recordCount}`);
      } catch (error: unknown) {
        results['financial_account_list'] = {
          status: 0,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }

      // Test 2: /financial/account/list with different params
      console.log('Testing /financial/account/list (GET with query)...');
      try {
        const accountGetResponse = await fetch(
          `https://api.feegow.com/v1/api/financial/account/list?data_start=${lastMonth}&data_end=${today}&tipo_transacao=C`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'x-access-token': feegowToken,
            },
          }
        );

        const accountGetText = await accountGetResponse.text();
        let accountGetData;
        try {
          accountGetData = JSON.parse(accountGetText);
        } catch {
          accountGetData = { raw: accountGetText.slice(0, 1000) };
        }

        results['financial_account_list_GET'] = {
          status: accountGetResponse.status,
          preview: typeof accountGetData === 'object' ? JSON.stringify(accountGetData).slice(0, 800) : accountGetText.slice(0, 800),
        };
      } catch (error: unknown) {
        results['financial_account_list_GET'] = {
          status: 0,
          error: error instanceof Error ? error.message : String(error),
        };
      }

      // Test 3: /financial/list-invoice with more detail
      console.log('Testing /financial/list-invoice for user fields...');
      try {
        const invoiceResponse = await fetch(
          `https://api.feegow.com/v1/api/financial/list-invoice?data_start=${lastMonth}&data_end=${today}&tipo_transacao=C`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'x-access-token': feegowToken,
            },
          }
        );

        const invoiceData = await invoiceResponse.json();
        let sampleInvoices: any[] = [];
        let allKeys: string[] = [];
        let userFields: string[] = [];
        
        if (invoiceData.success && invoiceData.content) {
          sampleInvoices = invoiceData.content.slice(0, 3);
          if (sampleInvoices.length > 0) {
            allKeys = Object.keys(sampleInvoices[0]);
            const userKeywords = ['usuario', 'user', 'vendedor', 'seller', 'funcionario', 'employee', 'responsavel', 'atendente', 'cadastrado', 'criado', 'sys_user', 'created'];
            for (const key of allKeys) {
              const keyLower = key.toLowerCase();
              if (userKeywords.some(kw => keyLower.includes(kw))) {
                userFields.push(`${key}: ${JSON.stringify(sampleInvoices[0][key])}`);
              }
            }
          }
        }

        results['financial_list_invoice'] = {
          status: invoiceResponse.status,
          success: invoiceData.success || false,
          recordCount: invoiceData.content?.length || 0,
          allKeys,
          userFieldsFound: userFields,
          sampleInvoices,
        };
      } catch (error: unknown) {
        results['financial_list_invoice'] = {
          status: 0,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }

      // Test 4: /employee/list - Get employees/users
      console.log('Testing /employee/list...');
      try {
        const employeeResponse = await fetch(
          'https://api.feegow.com/v1/api/employee/list',
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'x-access-token': feegowToken,
            },
          }
        );

        const employeeData = await employeeResponse.json();
        let sampleEmployees: any[] = [];
        
        if (employeeData.success && employeeData.content) {
          sampleEmployees = employeeData.content.slice(0, 5).map((e: any) => ({
            id: e.id || e.funcionario_id || e.user_id,
            nome: e.nome || e.name || e.funcionario_nome,
            tipo: e.tipo || e.type,
            ativo: e.ativo ?? e.active,
          }));
        }

        results['employee_list'] = {
          status: employeeResponse.status,
          success: employeeData.success || false,
          recordCount: employeeData.content?.length || 0,
          sampleEmployees,
        };
      } catch (error: unknown) {
        results['employee_list'] = {
          status: 0,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }

      // Test 5: Try specific account details endpoint
      console.log('Testing /financial/account-details...');
      try {
        const accountDetailsResponse = await fetch(
          'https://api.feegow.com/v1/api/financial/account-details',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-access-token': feegowToken,
            },
            body: JSON.stringify({
              data_start: lastMonth,
              data_end: today,
            }),
          }
        );

        const accountDetailsText = await accountDetailsResponse.text();
        results['financial_account_details'] = {
          status: accountDetailsResponse.status,
          preview: accountDetailsText.slice(0, 800),
        };
      } catch (error: unknown) {
        results['financial_account_details'] = {
          status: 0,
          error: error instanceof Error ? error.message : String(error),
        };
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'explore-financial', 
          message: 'Exploração de endpoints financeiros (contas a receber). Procurando campos de usuário/vendedor.',
          dateRange: { start: lastMonth, end: today },
          results,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================================================
    // LIST-SELLERS ACTION - Get unique sellers from Feegow
    // =====================================================
    if (action === 'list-sellers') {
      console.log('📋 Listing unique sellers from Feegow appointments...');
      
      const today = formatDateFeegow(new Date());
      // Look back 60 days
      const lookback = formatDateFeegow(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000));
      
      const appointsResponse = await fetch(
        `https://api.feegow.com/v1/api/appoints/search?data_start=${lookback}&data_end=${today}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-access-token': feegowToken,
          },
        }
      );

      if (!appointsResponse.ok) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch appointments' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const appointsData = await appointsResponse.json();
      const appointments = appointsData.content || [];
      
      // Collect unique scheduler names
      const schedulerCounts: Map<string, number> = new Map();
      for (const appt of appointments) {
        if (appt.agendado_por) {
          const name = appt.agendado_por.trim();
          schedulerCounts.set(name, (schedulerCounts.get(name) || 0) + 1);
        }
      }
      
      // Sort by count (most frequent first)
      const sortedSellers = [...schedulerCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));
      
      // Get existing mappings
      const { data: existingMappings } = await supabase
        .from('feegow_user_mapping')
        .select('feegow_name');
      
      const mappedNames = new Set(existingMappings?.map((m: { feegow_name: string }) => m.feegow_name.toLowerCase()) || []);
      
      // Mark which are mapped
      const sellersWithStatus = sortedSellers.map(s => ({
        ...s,
        mapped: mappedNames.has(s.name.toLowerCase()),
      }));
      
      // Get system users for matching suggestions
      const { data: systemUsers } = await supabase
        .from('profiles')
        .select('user_id, full_name, team_id')
        .not('team_id', 'is', null);
      
      return new Response(
        JSON.stringify({
          success: true,
          action: 'list-sellers',
          total_appointments: appointments.length,
          unique_sellers: sellersWithStatus.length,
          sellers: sellersWithStatus,
          system_users: systemUsers?.map((u: { user_id: string; full_name: string }) => ({ user_id: u.user_id, name: u.full_name })) || [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================================================
    // DEBUG-DATA ACTION - Debug appointment data for sales
    // =====================================================
    if (action === 'debug-data') {
      console.log('🔍 Analyzing appointments as sales source...');
      
      const today = formatDateFeegow(new Date());
      const weekAgo = formatDateFeegow(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      
      // Fetch appointments
      const appointsResponse = await fetch(
        `https://api.feegow.com/v1/api/appoints/search?data_start=${weekAgo}&data_end=${today}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-access-token': feegowToken,
          },
        }
      );
      
      const appointsData = await appointsResponse.json();
      const appointments = appointsData.content || [];
      
      // Fetch status types
      const statusResponse = await fetch(
        `https://api.feegow.com/v1/api/appoints/status`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-access-token': feegowToken,
          },
        }
      );
      
      const statusData = await statusResponse.json();
      const statusList = statusData.content || [];
      
      // Count by status
      const statusCounts: Record<number, { status: string; count: number; totalValue: number }> = {};
      for (const appt of appointments) {
        const statusId = appt.status_id;
        if (!statusCounts[statusId]) {
          const statusInfo = statusList.find((s: any) => s.id === statusId);
          statusCounts[statusId] = { 
            status: statusInfo?.status || 'Unknown', 
            count: 0, 
            totalValue: 0 
          };
        }
        statusCounts[statusId].count++;
        const valor = parseAmount(appt.valor_total_agendamento || appt.valor || '0');
        statusCounts[statusId].totalValue += valor;
      }
      
      // Get attended appointments (status_id = 3 usually means "Atendido")
      const attendedAppts = appointments.filter((a: any) => a.status_id === 3);
      
      // Sample attended appointments
      const sampleAttended = attendedAppts.slice(0, 5).map((a: any) => ({
        agendamento_id: a.agendamento_id,
        data: a.data,
        paciente_id: a.paciente_id,
        agendado_por: a.agendado_por,
        valor: a.valor_total_agendamento || a.valor,
        status_id: a.status_id,
      }));
      
      // Group by seller
      const sellerSales: Record<string, { count: number; total: number }> = {};
      for (const appt of attendedAppts) {
        const seller = appt.agendado_por || 'Unknown';
        if (!sellerSales[seller]) {
          sellerSales[seller] = { count: 0, total: 0 };
        }
        sellerSales[seller].count++;
        sellerSales[seller].total += parseAmount(appt.valor_total_agendamento || appt.valor || '0');
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          action: 'debug-data',
          message: 'Usando agendamentos atendidos (status_id=3) como fonte de vendas',
          statusTypes: statusList,
          statusCounts,
          totalAppointments: appointments.length,
          attendedAppointments: attendedAppts.length,
          sampleAttended,
          sellerSales,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
    // SYNC USING ATTENDED APPOINTMENTS (status_id = 3)
    // =====================================================
    console.log('Fetching attended appointments (status_id = 3)...');
    
    const appointsResponse = await fetch(
      `https://api.feegow.com/v1/api/appoints/search?data_start=${dateStart}&data_end=${dateEnd}`,
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
    const allAppointments = appointsData.content || [];
    
    // Filter only attended appointments (status_id = 3)
    const attendedAppointments = allAppointments.filter((a: any) => a.status_id === 3);
    
    console.log(`Found ${allAppointments.length} total appointments, ${attendedAppointments.length} attended`);

    let zeroValueCount = 0;
    let noSellerCount = 0;
    let noMappingCount = 0;
    let noProfileCount = 0;
    let duplicateCount = 0;

    for (const appt of attendedAppointments) {
      try {
        const sellerName = appt.agendado_por;
        const apptId = appt.agendamento_id;
        const apptDate = appt.data;
        const apptValue = parseAmount(appt.valor_total_agendamento || appt.valor || '0');

        // Skip zero value appointments
        if (apptValue <= 0) {
          zeroValueCount++;
          skipped++;
          continue;
        }

        // Skip if no seller
        if (!sellerName) {
          noSellerCount++;
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

        const parsedDate = parseFeegowDate(apptDate);
        const feegowId = `feegow_appt_${apptId}`;

        // Check for duplicate
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
            amount: apptValue,
            date: parsedDate,
            department: profile.department,
            notes: `FEEGOW Sync | ${feegowId} | Vendedor: ${sellerName} | Paciente ID: ${appt.paciente_id}`,
            registered_by_admin: true,
            counts_for_individual: true,
            attributed_to_user_id: userId,
          });

        if (insertError) {
          console.error(`Insert error for appt ${apptId}:`, insertError);
          errors++;
        } else {
          console.log(`✅ Inserted: R$ ${apptValue.toFixed(2)} -> ${sellerName} (${profile.full_name}) on ${parsedDate}`);
          inserted++;
          totalAmount += apptValue;
        }
      } catch (apptError) {
        console.error('Error processing appointment:', apptError);
        errors++;
      }
    }

    const sellersNotFoundArray = [...sellersNotFound];
    
    const result = {
      success: true,
      message: 'Sync completed using attended appointments',
      endpoint_used: '/appoints/search (status_id=3)',
      stats: {
        total_appointments: allAppointments.length,
        attended_appointments: attendedAppointments.length,
        total_amount: totalAmount,
        inserted,
        skipped,
        errors,
        breakdown: {
          zero_value: zeroValueCount,
          no_seller: noSellerCount,
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
          total_accounts: attendedAppointments.length,
          paid_accounts: allAppointments.length,
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
