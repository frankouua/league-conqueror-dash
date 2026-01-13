import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Appointment {
  id: number;
  date: string;
  time: string;
  status: string;
  status_id: number;
  procedure_name: string | null;
  professional_name: string | null;
  location: string | null;
  notes: string | null;
}

interface FinancialRecord {
  id: number;
  date: string;
  description: string;
  value: number;
  status: string;
  payment_method: string | null;
  due_date: string | null;
  paid_date: string | null;
}

interface Proposal {
  id: number;
  date: string;
  description: string;
  total_value: number;
  status: string;
  valid_until: string | null;
  items: ProposalItem[];
}

interface ProposalItem {
  procedure_name: string;
  quantity: number;
  unit_value: number;
  total_value: number;
}

interface PatientDetails {
  appointments: {
    past: Appointment[];
    upcoming: Appointment[];
    today: Appointment[];
  };
  financial: {
    records: FinancialRecord[];
    total_paid: number;
    total_pending: number;
    total_overdue: number;
  };
  proposals: Proposal[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FEEGOW_API_TOKEN = Deno.env.get('FEEGOW_API_TOKEN');
    
    if (!FEEGOW_API_TOKEN) {
      console.error('FEEGOW_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Feegow API token não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { patientId, prontuario, cpf } = await req.json();
    console.log('Request for patient details:', { patientId, prontuario, cpf });

    if (!patientId && !prontuario && !cpf) {
      return new Response(
        JSON.stringify({ error: 'ID do paciente, prontuário ou CPF é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-access-token': FEEGOW_API_TOKEN,
    };

    // First, find the patient ID if not provided
    let feegowPatientId = patientId;
    
    if (!feegowPatientId && (prontuario || cpf)) {
      console.log('Searching for patient by prontuario/cpf...');
      
      // Fetch patients to find by prontuario or CPF
      let found = false;
      let start = 0;
      const offset = 200;
      let attempts = 0;
      const maxAttempts = 20;

      while (!found && attempts < maxAttempts) {
        const listUrl = `https://api.feegow.com/v1/api/patient/list?start=${start}&offset=${offset}`;
        const listResponse = await fetch(listUrl, { method: 'GET', headers });
        const listData = await listResponse.json();
        
        if (!listData.success || !listData.content || listData.content.length === 0) {
          break;
        }

        for (const patient of listData.content) {
          const patientProntuario = (patient.local_id || patient.id || patient.paciente_id)?.toString();
          const patientCpf = patient.cpf?.replace(/\D/g, '');
          
          if (prontuario && patientProntuario === prontuario.toString()) {
            feegowPatientId = patient.paciente_id || patient.id;
            found = true;
            console.log(`Found patient by prontuario: ${feegowPatientId}`);
            break;
          }
          
          if (cpf && patientCpf === cpf.replace(/\D/g, '')) {
            feegowPatientId = patient.paciente_id || patient.id;
            found = true;
            console.log(`Found patient by CPF: ${feegowPatientId}`);
            break;
          }
        }

        if (!found) {
          start += offset;
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      if (!feegowPatientId) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Paciente não encontrado no Feegow',
            searched: { prontuario, cpf }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Fetching details for patient ID: ${feegowPatientId}`);

    const result: PatientDetails = {
      appointments: { past: [], upcoming: [], today: [] },
      financial: { records: [], total_paid: 0, total_pending: 0, total_overdue: 0 },
      proposals: [],
    };

    const today = new Date();
    const todayStr = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;
    
    // Date ranges for appointments
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const sixMonthsAhead = new Date();
    sixMonthsAhead.setMonth(sixMonthsAhead.getMonth() + 6);

    const formatFeegowDate = (d: Date) => 
      `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;

    // 1. Fetch Appointments (past and future)
    try {
      console.log('Fetching appointments...');
      
      // Fetch past appointments
      const pastUrl = `https://api.feegow.com/v1/api/appoints/search?paciente_id=${feegowPatientId}&data_start=${formatFeegowDate(twoYearsAgo)}&data_end=${todayStr}`;
      console.log(`Past appointments URL: ${pastUrl}`);
      
      const pastResponse = await fetch(pastUrl, { method: 'GET', headers });
      const pastData = await pastResponse.json();
      
      if (pastData.success && pastData.content) {
        const appointments = Array.isArray(pastData.content) ? pastData.content : [];
        console.log(`Found ${appointments.length} past appointments`);
        
        const statusMap: Record<number, string> = {
          1: 'Agendado',
          2: 'Confirmado',
          3: 'Chegou',
          4: 'Em Atendimento',
          5: 'Atendido',
          6: 'Não Compareceu',
          7: 'Cancelado',
          8: 'Remarcado',
        };

        for (const apt of appointments) {
          const appointment: Appointment = {
            id: apt.agendamento_id || apt.id,
            date: apt.data,
            time: apt.horario || apt.hora_inicio,
            status: statusMap[apt.status_id] || `Status ${apt.status_id}`,
            status_id: apt.status_id,
            procedure_name: apt.procedimento_nome || apt.procedimento,
            professional_name: apt.profissional_nome || apt.profissional,
            location: apt.local || apt.unidade,
            notes: apt.observacao || apt.obs,
          };

          // Parse date to check if today
          const [day, month, year] = apt.data.split('-').map(Number);
          const aptDate = new Date(year, month - 1, day);
          const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

          if (aptDate.getTime() === todayDate.getTime()) {
            result.appointments.today.push(appointment);
          } else {
            result.appointments.past.push(appointment);
          }
        }
      }

      // Fetch future appointments
      const futureUrl = `https://api.feegow.com/v1/api/appoints/search?paciente_id=${feegowPatientId}&data_start=${todayStr}&data_end=${formatFeegowDate(sixMonthsAhead)}`;
      console.log(`Future appointments URL: ${futureUrl}`);
      
      const futureResponse = await fetch(futureUrl, { method: 'GET', headers });
      const futureData = await futureResponse.json();
      
      if (futureData.success && futureData.content) {
        const appointments = Array.isArray(futureData.content) ? futureData.content : [];
        console.log(`Found ${appointments.length} future appointments`);
        
        const statusMap: Record<number, string> = {
          1: 'Agendado',
          2: 'Confirmado',
          3: 'Chegou',
          4: 'Em Atendimento',
          5: 'Atendido',
          6: 'Não Compareceu',
          7: 'Cancelado',
          8: 'Remarcado',
        };

        for (const apt of appointments) {
          // Skip if already in today
          const [day, month, year] = apt.data.split('-').map(Number);
          const aptDate = new Date(year, month - 1, day);
          const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

          if (aptDate.getTime() === todayDate.getTime()) continue;

          const appointment: Appointment = {
            id: apt.agendamento_id || apt.id,
            date: apt.data,
            time: apt.horario || apt.hora_inicio,
            status: statusMap[apt.status_id] || `Status ${apt.status_id}`,
            status_id: apt.status_id,
            procedure_name: apt.procedimento_nome || apt.procedimento,
            professional_name: apt.profissional_nome || apt.profissional,
            location: apt.local || apt.unidade,
            notes: apt.observacao || apt.obs,
          };

          result.appointments.upcoming.push(appointment);
        }
      }

      // Sort appointments
      result.appointments.past.sort((a, b) => {
        const [dayA, monthA, yearA] = a.date.split('-').map(Number);
        const [dayB, monthB, yearB] = b.date.split('-').map(Number);
        return new Date(yearB, monthB - 1, dayB).getTime() - new Date(yearA, monthA - 1, dayA).getTime();
      });

      result.appointments.upcoming.sort((a, b) => {
        const [dayA, monthA, yearA] = a.date.split('-').map(Number);
        const [dayB, monthB, yearB] = b.date.split('-').map(Number);
        return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime();
      });

    } catch (aptError) {
      console.error('Error fetching appointments:', aptError);
    }

    // 2. Fetch Financial Records
    try {
      console.log('Fetching financial records...');
      
      // Try to get financial data from patient accounts/bills
      const financialUrl = `https://api.feegow.com/v1/api/financial/patient-debts?paciente_id=${feegowPatientId}`;
      console.log(`Financial URL: ${financialUrl}`);
      
      const financialResponse = await fetch(financialUrl, { method: 'GET', headers });
      const financialData = await financialResponse.json();
      
      console.log('Financial response:', JSON.stringify(financialData).substring(0, 500));
      
      if (financialData.success && financialData.content) {
        const debts = Array.isArray(financialData.content) ? financialData.content : 
                      financialData.content.debts || [];
        
        for (const debt of debts) {
          const record: FinancialRecord = {
            id: debt.id || debt.lancamento_id,
            date: debt.data_lancamento || debt.data,
            description: debt.descricao || debt.procedimento || 'Lançamento',
            value: parseFloat(debt.valor) || 0,
            status: debt.status || (debt.pago ? 'Pago' : 'Pendente'),
            payment_method: debt.forma_pagamento,
            due_date: debt.data_vencimento,
            paid_date: debt.data_pagamento,
          };

          result.financial.records.push(record);

          if (debt.pago || debt.status === 'Pago') {
            result.financial.total_paid += record.value;
          } else if (debt.vencido || debt.status === 'Vencido') {
            result.financial.total_overdue += record.value;
          } else {
            result.financial.total_pending += record.value;
          }
        }
      }

      // Also try to fetch from billing/accounts endpoint
      const billsUrl = `https://api.feegow.com/v1/api/financial/bills?paciente_id=${feegowPatientId}`;
      console.log(`Bills URL: ${billsUrl}`);
      
      const billsResponse = await fetch(billsUrl, { method: 'GET', headers });
      const billsData = await billsResponse.json();
      
      console.log('Bills response:', JSON.stringify(billsData).substring(0, 500));
      
      if (billsData.success && billsData.content) {
        const bills = Array.isArray(billsData.content) ? billsData.content : [];
        
        for (const bill of bills) {
          // Check if already added
          const exists = result.financial.records.some(r => r.id === (bill.id || bill.conta_id));
          if (exists) continue;

          const record: FinancialRecord = {
            id: bill.id || bill.conta_id,
            date: bill.data_lancamento || bill.data_criacao || bill.data,
            description: bill.descricao || bill.titulo || 'Conta',
            value: parseFloat(bill.valor) || 0,
            status: bill.status || (bill.pago ? 'Pago' : 'Pendente'),
            payment_method: bill.forma_pagamento,
            due_date: bill.data_vencimento,
            paid_date: bill.data_pagamento,
          };

          result.financial.records.push(record);

          if (bill.pago || bill.status === 'Pago') {
            result.financial.total_paid += record.value;
          } else if (bill.vencido || bill.status === 'Vencido') {
            result.financial.total_overdue += record.value;
          } else {
            result.financial.total_pending += record.value;
          }
        }
      }

    } catch (finError) {
      console.error('Error fetching financial records:', finError);
    }

    // 3. Fetch Proposals/Quotes
    try {
      console.log('Fetching proposals...');
      
      const proposalsUrl = `https://api.feegow.com/v1/api/budgets/patient?paciente_id=${feegowPatientId}`;
      console.log(`Proposals URL: ${proposalsUrl}`);
      
      const proposalsResponse = await fetch(proposalsUrl, { method: 'GET', headers });
      const proposalsData = await proposalsResponse.json();
      
      console.log('Proposals response:', JSON.stringify(proposalsData).substring(0, 500));
      
      if (proposalsData.success && proposalsData.content) {
        const budgets = Array.isArray(proposalsData.content) ? proposalsData.content : [];
        
        for (const budget of budgets) {
          const items: ProposalItem[] = [];
          
          if (budget.itens && Array.isArray(budget.itens)) {
            for (const item of budget.itens) {
              items.push({
                procedure_name: item.procedimento_nome || item.descricao || 'Procedimento',
                quantity: parseInt(item.quantidade) || 1,
                unit_value: parseFloat(item.valor_unitario) || 0,
                total_value: parseFloat(item.valor_total) || 0,
              });
            }
          }

          const proposal: Proposal = {
            id: budget.id || budget.orcamento_id,
            date: budget.data_criacao || budget.data,
            description: budget.descricao || budget.titulo || 'Orçamento',
            total_value: parseFloat(budget.valor_total) || 0,
            status: budget.status || 'Pendente',
            valid_until: budget.data_validade || budget.valido_ate,
            items,
          };

          result.proposals.push(proposal);
        }
      }

      // Also try alternative endpoint
      const quotesUrl = `https://api.feegow.com/v1/api/quotes/patient?paciente_id=${feegowPatientId}`;
      console.log(`Quotes URL: ${quotesUrl}`);
      
      const quotesResponse = await fetch(quotesUrl, { method: 'GET', headers });
      const quotesData = await quotesResponse.json();
      
      console.log('Quotes response:', JSON.stringify(quotesData).substring(0, 500));
      
      if (quotesData.success && quotesData.content) {
        const quotes = Array.isArray(quotesData.content) ? quotesData.content : [];
        
        for (const quote of quotes) {
          // Check if already added
          const exists = result.proposals.some(p => p.id === (quote.id || quote.proposta_id));
          if (exists) continue;

          const items: ProposalItem[] = [];
          
          if (quote.itens && Array.isArray(quote.itens)) {
            for (const item of quote.itens) {
              items.push({
                procedure_name: item.procedimento_nome || item.descricao || 'Procedimento',
                quantity: parseInt(item.quantidade) || 1,
                unit_value: parseFloat(item.valor_unitario) || 0,
                total_value: parseFloat(item.valor_total) || 0,
              });
            }
          }

          const proposal: Proposal = {
            id: quote.id || quote.proposta_id,
            date: quote.data_criacao || quote.data,
            description: quote.descricao || quote.titulo || 'Proposta',
            total_value: parseFloat(quote.valor_total) || 0,
            status: quote.status || 'Pendente',
            valid_until: quote.data_validade,
            items,
          };

          result.proposals.push(proposal);
        }
      }

    } catch (propError) {
      console.error('Error fetching proposals:', propError);
    }

    console.log('Result summary:', {
      pastAppointments: result.appointments.past.length,
      todayAppointments: result.appointments.today.length,
      upcomingAppointments: result.appointments.upcoming.length,
      financialRecords: result.financial.records.length,
      proposals: result.proposals.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        patientId: feegowPatientId,
        data: result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching patient details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erro ao buscar detalhes do paciente', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
