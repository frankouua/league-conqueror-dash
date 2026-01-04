import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FEEGOW_API_TOKEN = Deno.env.get('FEEGOW_API_TOKEN');
    
    if (!FEEGOW_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Feegow API token não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { patientName, patientId } = await req.json();

    if (!patientName && !patientId) {
      return new Response(
        JSON.stringify({ error: 'Nome ou ID do paciente é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the API URL based on whether we're searching by name or getting by ID
    let apiUrl = 'https://api.feegow.com/v1/api/patient/search';
    const params = new URLSearchParams();
    
    if (patientId) {
      params.append('paciente_id', patientId);
    } else if (patientName) {
      params.append('nome', patientName);
    }

    const response = await fetch(`${apiUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': FEEGOW_API_TOKEN,
      },
    });

    const data = await response.json();

    if (!data.success) {
      // Try the list endpoint as fallback with search
      const listResponse = await fetch('https://api.feegow.com/v1/api/patient/list', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': FEEGOW_API_TOKEN,
        },
      });

      const listData = await listResponse.json();

      if (listData.success && listData.content) {
        // Search for matching patient by name
        const searchTerm = patientName?.toLowerCase() || '';
        const matchingPatients = listData.content.filter((patient: any) => 
          patient.nome?.toLowerCase().includes(searchTerm)
        );

        if (matchingPatients.length > 0) {
          return new Response(
            JSON.stringify({
              success: true,
              patients: matchingPatients.map((p: any) => ({
                id: p.paciente_id,
                name: p.nome,
                email: p.email || null,
                phone: p.telefone || p.celular || null,
                cellphone: p.celular || null,
                cpf: p.cpf || null,
                birthdate: p.data_nascimento || null,
              })),
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: false, message: 'Paciente não encontrado no Feegow' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map the response to a consistent format
    const patients = Array.isArray(data.content) ? data.content : [data.content];
    
    return new Response(
      JSON.stringify({
        success: true,
        patients: patients.map((p: any) => ({
          id: p.paciente_id,
          name: p.nome,
          email: p.email || null,
          phone: p.telefone || p.celular || null,
          cellphone: p.celular || null,
          cpf: p.cpf || null,
          birthdate: p.data_nascimento || null,
        })),
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
