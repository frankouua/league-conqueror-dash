import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FEEGOW_BASE_URL = "https://api.feegow.com/v1/api"

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const FEEGOW_API_TOKEN = Deno.env.get("FEEGOW_API_TOKEN")

  const results: Record<string, any> = {
    status: "running",
    api_token_configured: !!FEEGOW_API_TOKEN,
    base_url: FEEGOW_BASE_URL,
    tests: {}
  }

  if (!FEEGOW_API_TOKEN) {
    return new Response(
      JSON.stringify({
        status: "error",
        message: "FEEGOW_API_TOKEN não configurado nos secrets",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }

  const headers = {
    "x-access-token": FEEGOW_API_TOKEN,
    "Content-Type": "application/json",
  }

  try {
    // Teste 1: Listar Pacientes (primeiros 5)
    console.log("Testing patients endpoint...")
    const patientsResponse = await fetch(
      `${FEEGOW_BASE_URL}/patient/list?start=0&offset=5`,
      { method: "GET", headers }
    )

    const patientsData = await patientsResponse.json()
    // Show full patient structure for debugging
    const firstPatient = Array.isArray(patientsData?.content) && patientsData.content.length > 0 
      ? patientsData.content[0] 
      : null
    
    results.tests.patients = {
      endpoint: "/patient/list",
      status: patientsData.success ? "success" : "error",
      http_status: patientsResponse.status,
      count: Array.isArray(patientsData?.content) ? patientsData.content.length : 0,
      sample_full_structure: firstPatient, // Shows all available fields
      available_fields: firstPatient ? Object.keys(firstPatient) : [],
    }

    // Teste 2: Listar Profissionais
    console.log("Testing professionals endpoint...")
    const professionalsResponse = await fetch(
      `${FEEGOW_BASE_URL}/professional/list`,
      { method: "GET", headers }
    )

    const professionalsData = await professionalsResponse.json()
    results.tests.professionals = {
      endpoint: "/professional/list",
      status: professionalsData.success ? "success" : "error",
      http_status: professionalsResponse.status,
      count: Array.isArray(professionalsData?.content) ? professionalsData.content.length : 0,
      sample: Array.isArray(professionalsData?.content) 
        ? professionalsData.content.slice(0, 1).map((p: any) => ({ id: p.profissional_id, nome: p.nome }))
        : professionalsData,
    }

    // Teste 3: Listar Especialidades
    console.log("Testing specialties endpoint...")
    const specialtiesResponse = await fetch(
      `${FEEGOW_BASE_URL}/specialties/list`,
      { method: "GET", headers }
    )

    const specialtiesData = await specialtiesResponse.json()
    results.tests.specialties = {
      endpoint: "/specialties/list",
      status: specialtiesData.success ? "success" : "error",
      http_status: specialtiesResponse.status,
      count: Array.isArray(specialtiesData?.content) ? specialtiesData.content.length : 0,
      sample: Array.isArray(specialtiesData?.content) 
        ? specialtiesData.content.slice(0, 2)
        : specialtiesData,
    }

    // Teste 4: Listar Unidades
    console.log("Testing units endpoint...")
    const unitsResponse = await fetch(
      `${FEEGOW_BASE_URL}/company/list-units`,
      { method: "GET", headers }
    )

    const unitsData = await unitsResponse.json()
    results.tests.units = {
      endpoint: "/company/list-units",
      status: unitsData.success ? "success" : "error",
      http_status: unitsResponse.status,
      count: Array.isArray(unitsData?.content) ? unitsData.content.length : 0,
      sample: unitsData?.content || unitsData,
    }

    // Teste 5: Listar Agendamentos (hoje)
    console.log("Testing appointments endpoint...")
    const today = new Date().toISOString().split('T')[0]
    const appointmentsResponse = await fetch(
      `${FEEGOW_BASE_URL}/appoints/search?DataInicial=${today}&DataFinal=${today}`,
      { method: "GET", headers }
    )

    const appointmentsData = await appointmentsResponse.json()
    results.tests.appointments = {
      endpoint: "/appoints/search",
      status: appointmentsData.success ? "success" : "error",
      http_status: appointmentsResponse.status,
      count: Array.isArray(appointmentsData?.content) ? appointmentsData.content.length : 0,
      message: appointmentsData.success 
        ? `${Array.isArray(appointmentsData?.content) ? appointmentsData.content.length : 0} agendamentos hoje`
        : appointmentsData.message || "Sem agendamentos",
    }

    // Determinar status geral
    const allTests = Object.values(results.tests) as any[]
    const successCount = allTests.filter(t => t.status === "success").length
    results.status = successCount === allTests.length ? "all_success" : 
                     successCount > 0 ? "partial_success" : "all_failed"
    results.summary = `${successCount}/${allTests.length} endpoints funcionando`
    results.timestamp = new Date().toISOString()

    return new Response(
      JSON.stringify(results, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("Error testing Feegow API:", error)
    return new Response(
      JSON.stringify({
        status: "error",
        message: errorMessage,
        tests: results.tests,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
