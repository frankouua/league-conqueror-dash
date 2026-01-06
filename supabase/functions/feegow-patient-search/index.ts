import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PatientResult {
  id: string | number;
  name: string;
  email: string | null;
  phone: string | null;
  cellphone: string | null;
  cpf: string | null;
  birthdate: string | null;
  prontuario?: string | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    const { patientName, patientId, cpf } = await req.json();
    console.log('Search request:', { patientName, patientId, cpf });

    if (!patientName && !patientId && !cpf) {
      return new Response(
        JSON.stringify({ error: 'Nome, ID ou CPF do paciente é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-access-token': FEEGOW_API_TOKEN,
    };

    // Strategy 1: Search by patient ID using /patient/info
    if (patientId) {
      console.log('Searching by patient ID:', patientId);
      const response = await fetch(`https://api.feegow.com/v1/api/patient/info?paciente_id=${patientId}`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();
      console.log('Patient info response:', JSON.stringify(data).substring(0, 500));

      if (data.success && data.content) {
        const p = data.content;
        return new Response(
          JSON.stringify({
            success: true,
            patients: [{
              id: p.paciente_id,
              name: p.nome,
              email: p.email || null,
              phone: p.telefone || p.celular || null,
              cellphone: p.celular || null,
              cpf: p.cpf || null,
              birthdate: p.data_nascimento || null,
              prontuario: p.prontuario || p.paciente_id?.toString() || null,
            }],
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Strategy 2: Search using /patient/list with pagination and filter locally
    console.log('Fetching patient list from Feegow...');
    
    // Fetch patients with pagination
    let allPatients: any[] = [];
    let start = 0;
    const offset = 100;
    let hasMore = true;
    let attempts = 0;
    const maxAttempts = 10; // Max 1000 patients to avoid timeout

    while (hasMore && attempts < maxAttempts) {
      const listUrl = `https://api.feegow.com/v1/api/patient/list?start=${start}&offset=${offset}`;
      console.log(`Fetching page ${attempts + 1}: ${listUrl}`);
      
      const listResponse = await fetch(listUrl, {
        method: 'GET',
        headers,
      });

      const listData = await listResponse.json();
      
      if (!listData.success) {
        console.error('Error fetching patient list:', listData);
        break;
      }

      const patients = listData.content || [];
      console.log(`Page ${attempts + 1}: Retrieved ${patients.length} patients`);
      
      if (patients.length === 0) {
        hasMore = false;
      } else {
        allPatients = [...allPatients, ...patients];
        start += offset;
        attempts++;

        // If we found enough matching patients, stop early
        if (patientName || cpf) {
          const searchTerm = patientName?.toLowerCase().trim() || '';
          const searchCpf = cpf?.replace(/\D/g, '') || '';
          
          const matchingPatients = allPatients.filter((patient: any) => {
            const nameMatch = searchTerm && patient.nome?.toLowerCase().includes(searchTerm);
            const cpfMatch = searchCpf && patient.cpf?.replace(/\D/g, '').includes(searchCpf);
            return nameMatch || cpfMatch;
          });

          // If we found 10+ matches, we can stop
          if (matchingPatients.length >= 10) {
            console.log('Found enough matches, stopping pagination');
            break;
          }
        }

        // Small delay to avoid rate limiting
        if (attempts < maxAttempts && patients.length === offset) {
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          hasMore = false;
        }
      }
    }

    console.log(`Total patients fetched: ${allPatients.length}`);

    // Filter patients based on search criteria
    let matchingPatients: PatientResult[] = [];

    if (patientName) {
      const searchTerm = patientName.toLowerCase().trim();
      matchingPatients = allPatients
        .filter((patient: any) => patient.nome?.toLowerCase().includes(searchTerm))
        .slice(0, 20) // Limit results
        .map((p: any) => ({
          id: p.paciente_id,
          name: p.nome,
          email: p.email || null,
          phone: p.telefone || p.celular || null,
          cellphone: p.celular || null,
          cpf: p.cpf || null,
          birthdate: p.data_nascimento || null,
          prontuario: p.prontuario || p.paciente_id?.toString() || null,
        }));
    } else if (cpf) {
      const searchCpf = cpf.replace(/\D/g, '');
      matchingPatients = allPatients
        .filter((patient: any) => patient.cpf?.replace(/\D/g, '').includes(searchCpf))
        .slice(0, 10)
        .map((p: any) => ({
          id: p.paciente_id,
          name: p.nome,
          email: p.email || null,
          phone: p.telefone || p.celular || null,
          cellphone: p.celular || null,
          cpf: p.cpf || null,
          birthdate: p.data_nascimento || null,
          prontuario: p.prontuario || p.paciente_id?.toString() || null,
        }));
    }

    console.log(`Found ${matchingPatients.length} matching patients`);

    if (matchingPatients.length > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          patients: matchingPatients,
          totalFetched: allPatients.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Paciente não encontrado no Feegow',
        totalSearched: allPatients.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error searching patient:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erro ao buscar paciente', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
