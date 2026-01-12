import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportRequest {
  fileUrl: string;
  fileType: "persona" | "vendas" | "executado";
  sheetName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl, fileType, sheetName }: ImportRequest = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Starting import: ${fileType} from ${fileUrl}`);

    // Fetch the file
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
    
    const sheet = sheetName ? workbook.Sheets[sheetName] : workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
    
    console.log(`Loaded ${data.length} rows from sheet`);

    let stats = { total: 0, new: 0, updated: 0, skipped: 0, errors: 0 };

    if (fileType === "persona") {
      stats = await importPersonaData(supabase, data);
    } else if (fileType === "vendas" || fileType === "executado") {
      stats = await importTransactionData(supabase, data, fileType);
    }

    console.log(`Import complete:`, stats);

    return new Response(
      JSON.stringify({ success: true, stats }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper functions
function normalizeCpf(cpf: any): string {
  if (!cpf) return "";
  return String(cpf).replace(/\D/g, "").padStart(11, "0");
}

function parseAmount(value: any): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const str = String(value).replace(/[R$\s.]/g, "").replace(",", ".");
  return parseFloat(str) || 0;
}

function parseDate(value: any): string | null {
  if (!value) return null;
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
  }
  if (typeof value === "string") {
    if (value.includes("T")) return value.split("T")[0];
    const parts = value.split(/[-\/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) return value;
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }
  return null;
}

function findColumn(row: Record<string, any>, possibleNames: string[], excludePatterns?: string[]): any {
  const keys = Object.keys(row);
  for (const name of possibleNames) {
    const found = keys.find(k => {
      const keyLower = k.toLowerCase();
      const isMatch = keyLower.includes(name.toLowerCase());
      
      // Check exclusions
      if (excludePatterns && isMatch) {
        for (const pattern of excludePatterns) {
          if (keyLower.includes(pattern.toLowerCase())) {
            return false; // Exclude this match
          }
        }
      }
      
      return isMatch;
    });
    if (found) return row[found];
  }
  return null;
}

// CRITICAL: Find "Valor" column but EXCLUDE "Valor Pago" variants
function findValorColumn(row: Record<string, any>): any {
  const keys = Object.keys(row);
  
  // First: try exact match for "Valor"
  const exactMatch = keys.find(k => k.toLowerCase().trim() === 'valor');
  if (exactMatch) return row[exactMatch];
  
  // Second: try "Valor Total", "Valor Vendido", "Valor Contrato" - but NOT "Valor Pago"
  const priorityNames = ["Valor Total", "Valor Vendido", "Valor Contrato"];
  for (const name of priorityNames) {
    const found = keys.find(k => k.toLowerCase().includes(name.toLowerCase()));
    if (found) return row[found];
  }
  
  // Third: try any column with "Valor" but EXCLUDE "Pago", "Recebido"
  const valorMatch = keys.find(k => {
    const keyLower = k.toLowerCase();
    return keyLower.includes('valor') && !keyLower.includes('pago') && !keyLower.includes('recebido');
  });
  if (valorMatch) return row[valorMatch];
  
  return null;
}

function parseChildren(value: string): { has: boolean; count: number } {
  if (!value) return { has: false, count: 0 };
  const lower = String(value).toLowerCase();
  if (lower.includes("não") || lower === "no" || lower === "0") return { has: false, count: 0 };
  const match = String(value).match(/(\d+)/);
  return { has: true, count: match ? parseInt(match[1]) : 1 };
}

async function importPersonaData(supabase: any, data: any[]) {
  const stats = { total: 0, new: 0, updated: 0, skipped: 0, errors: 0 };

  for (const row of data) {
    stats.total++;
    
    try {
      const prontuario = findColumn(row, ["Prontuário", "Prontuario"]);
      const cpf = normalizeCpf(findColumn(row, ["CPF do Paciente", "CPF"]));
      const name = findColumn(row, ["Paciente", "Nome"]);
      
      if (!name && !prontuario && !cpf) {
        stats.skipped++;
        continue;
      }

      const childrenData = parseChildren(findColumn(row, ["filhos", "Você tem filhos"]));
      const totalValue = parseAmount(findColumn(row, ["Soma de Valor", "Valor Total"]));

      const patientData: any = {
        prontuario: prontuario ? String(prontuario).trim() : null,
        cpf: cpf || null,
        name: String(name || "").trim(),
        email: findColumn(row, ["E-mail", "Email"]) || null,
        phone: findColumn(row, ["Telefone"]) || null,
        birth_date: parseDate(findColumn(row, ["Data de Nascimento", "Nascimento"])),
        age: parseInt(findColumn(row, ["Idade"])) || null,
        gender: findColumn(row, ["Gênero", "Genero", "Sexo"]) || null,
        nationality: findColumn(row, ["Nacionalidade"]) || null,
        marital_status: findColumn(row, ["estado civil"]) || null,
        profession: findColumn(row, ["Profissão", "Profissao"]) || null,
        has_children: childrenData.has,
        children_count: childrenData.count,
        country: findColumn(row, ["país", "pais"]) || null,
        state: findColumn(row, ["Estado"]) || null,
        city: findColumn(row, ["Cidade"]) || null,
        neighborhood: findColumn(row, ["Bairro"]) || null,
        address: findColumn(row, ["Endereço", "Endereco"]) || null,
        cep: findColumn(row, ["CEP"]) || null,
        height_cm: parseFloat(findColumn(row, ["Altura"])) || null,
        weight_kg: parseFloat(findColumn(row, ["Peso"])) || null,
        origin: findColumn(row, ["Onde nos conheceu", "Origem"]) || null,
        referral_name: findColumn(row, ["Nome da pessoa que indicou", "Indicação"]) || null,
        influencer_name: findColumn(row, ["influencer"]) || null,
        instagram_handle: findColumn(row, ["Instagram"]) || null,
        main_objective: findColumn(row, ["objetivo principal"]) || null,
        why_not_done_yet: findColumn(row, ["não realizou"]) || null,
        total_value_sold: totalValue,
        data_source: "persona_spreadsheet",
      };

      // Check for existing
      let existingId: string | null = null;
      
      if (prontuario) {
        const { data: existing } = await supabase
          .from("patient_data")
          .select("id")
          .eq("prontuario", String(prontuario).trim())
          .maybeSingle();
        if (existing) existingId = existing.id;
      }
      
      if (!existingId && cpf) {
        const { data: existing } = await supabase
          .from("patient_data")
          .select("id")
          .eq("cpf", cpf)
          .maybeSingle();
        if (existing) existingId = existing.id;
      }

      if (existingId) {
        const { error } = await supabase
          .from("patient_data")
          .update(patientData)
          .eq("id", existingId);
        if (error) throw error;
        stats.updated++;
      } else {
        const { error } = await supabase
          .from("patient_data")
          .insert(patientData);
        if (error) throw error;
        stats.new++;
      }

      // Also update RFV customers
      if (cpf || prontuario) {
        await updateRFVCustomer(supabase, patientData, cpf, prontuario);
      }

    } catch (err) {
      console.error("Error importing persona row:", err);
      stats.errors++;
    }
  }

  return stats;
}

async function updateRFVCustomer(supabase: any, patient: any, cpf: string, prontuario: string) {
  try {
    // Check if customer exists in RFV
    let existingRfv = null;
    
    if (cpf) {
      const { data } = await supabase
        .from("rfv_customers")
        .select("id")
        .eq("cpf", cpf)
        .maybeSingle();
      existingRfv = data;
    }
    
    if (!existingRfv && prontuario) {
      const { data } = await supabase
        .from("rfv_customers")
        .select("id")
        .eq("prontuario", String(prontuario).trim())
        .maybeSingle();
      existingRfv = data;
    }

    if (existingRfv) {
      // Update existing RFV customer with new data
      await supabase
        .from("rfv_customers")
        .update({
          email: patient.email,
          phone: patient.phone,
          whatsapp: patient.phone,
        })
        .eq("id", existingRfv.id);
    }
  } catch (err) {
    console.error("Error updating RFV customer:", err);
  }
}

async function importTransactionData(supabase: any, data: any[], fileType: string) {
  const stats = { total: 0, new: 0, updated: 0, skipped: 0, errors: 0 };
  const tableName = fileType === "vendas" ? "revenue_records" : "executed_records";

  console.log(`[AUDIT] Starting import: ${data.length} total rows from spreadsheet`);

  // Get user mappings
  const { data: mappings } = await supabase.from("feegow_user_mapping").select("feegow_name, user_id");
  const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, team_id").not("team_id", "is", null);
  
  // Get default team for unmapped sellers
  const { data: defaultTeam } = await supabase.from("teams").select("id").limit(1).single();
  const defaultTeamId = defaultTeam?.id;
  
  // Get admin user for unmapped sellers
  const { data: adminUser } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .limit(1)
    .single();
  const adminUserId = adminUser?.user_id;

  const mappingByName = new Map<string, string>();
  mappings?.forEach((m: any) => mappingByName.set(m.feegow_name.toLowerCase().trim(), m.user_id));

  const profileByName = new Map<string, { user_id: string; team_id: string }>();
  profiles?.forEach((p: any) => {
    const firstName = p.full_name.split(" ")[0].toLowerCase().trim();
    profileByName.set(firstName, { user_id: p.user_id, team_id: p.team_id });
    profileByName.set(p.full_name.toLowerCase().trim(), { user_id: p.user_id, team_id: p.team_id });
  });

  const BATCH_SIZE = 100;
  const recordsToInsert: any[] = [];
  const unmappedSellers = new Set<string>();

  for (const row of data) {
    stats.total++;

    try {
      const sellerName = String(findColumn(row, ["Vendedor", "Responsável", "Consultor", "Usuario"]) || "").trim();
      const dateValue = findColumn(row, ["Data", "Data de Venda", "Data Pagamento", "Data Competência", "Data da Venda"]);
      const date = parseDate(dateValue);
      
      // CRITICAL: Use findValorColumn which prioritizes "Valor" over "Valor Pago"
      // User requirement: Use "Valor" (total contracted value), NOT "Valor Pago"
      const valorNormal = findValorColumn(row);
      const valorPago = findColumn(row, ["Valor Pago", "Pago", "Recebido"]);
      
      // Priority: "Valor" first (contracted value), "Valor Pago" as fallback only if "Valor" doesn't exist
      let amount = 0;
      if (valorNormal !== null && valorNormal !== "" && valorNormal !== "-") {
        amount = parseAmount(valorNormal);
        console.log(`[ROW ${stats.total}] Using "Valor": ${valorNormal} -> ${amount}`);
      } else if (valorPago !== null && valorPago !== "" && valorPago !== "-") {
        // Fallback to "Valor Pago" only if "Valor" column doesn't exist
        amount = parseAmount(valorPago);
        console.log(`[ROW ${stats.total}] Fallback to "Valor Pago": ${valorPago} -> ${amount}`);
      }
      
      // Accept zero values - only skip if completely empty/invalid
      if (amount === 0 && !valorNormal && !valorPago) {
        console.log(`[SKIP] Row ${stats.total}: No value found`);
        stats.skipped++;
        continue;
      }

      // Only skip if no date - we process ALL rows with valid dates
      if (!date) {
        console.log(`[SKIP] Row ${stats.total}: No valid date found`);
        stats.skipped++;
        continue;
      }

      // Find user - but don't skip if not found, use admin fallback
      let matchedUserId = mappingByName.get(sellerName.toLowerCase());
      let matchedTeamId: string | null = null;

      if (!matchedUserId) {
        const firstName = sellerName.split(" ")[0].toLowerCase().trim();
        const profile = profileByName.get(sellerName.toLowerCase()) || profileByName.get(firstName);
        if (profile) {
          matchedUserId = profile.user_id;
          matchedTeamId = profile.team_id;
        }
      }

      // CRITICAL: Use fallback for unmapped sellers instead of skipping
      if (!matchedUserId) {
        if (sellerName) {
          unmappedSellers.add(sellerName);
        }
        matchedUserId = adminUserId;
        matchedTeamId = defaultTeamId;
      }

      if (!matchedTeamId) {
        const profile = profiles?.find((p: any) => p.user_id === matchedUserId);
        matchedTeamId = profile?.team_id || defaultTeamId;
      }

      // CRITICAL: Use default team if still no team
      if (!matchedTeamId) {
        matchedTeamId = defaultTeamId;
      }

      // Final fallback - if still no valid IDs, use defaults
      if (!matchedUserId || !matchedTeamId) {
        console.log(`[WARN] Row ${stats.total}: Using absolute fallback for seller "${sellerName}"`);
        matchedUserId = adminUserId || profiles?.[0]?.user_id;
        matchedTeamId = defaultTeamId || profiles?.[0]?.team_id;
      }

      const prontuario = findColumn(row, ["Prontuário", "Prontuario", "Cod Paciente", "ID Conta"]);
      const cpf = normalizeCpf(findColumn(row, ["CPF", "CPF do Paciente"]));

      const record = {
        date,
        amount, // Accepts 0 and negative values
        department: findColumn(row, ["Departamento", "Grupo de Procedimentos", "Categoria"]) || null,
        procedure_name: findColumn(row, ["Procedimento", "Procedimentos", "Nome Procedimento"]) || null,
        patient_prontuario: prontuario ? String(prontuario).trim() : null,
        patient_cpf: cpf || null,
        patient_name: findColumn(row, ["Paciente", "Nome do Paciente", "Cliente", "Nome Conta"]) || null,
        patient_email: findColumn(row, ["E-mail", "Email"]) || null,
        patient_phone: findColumn(row, ["Telefone", "Celular"]) || null,
        origin: findColumn(row, ["Origem", "Como nos conheceu", "Canal"]) || null,
        referral_name: findColumn(row, ["Indicação", "Indicado por"]) || null,
        user_id: matchedUserId,
        team_id: matchedTeamId,
        attributed_to_user_id: matchedUserId,
        counts_for_individual: true,
        registered_by_admin: true,
      };

      recordsToInsert.push(record);
      stats.new++;

    } catch (err) {
      console.error(`[ERROR] Row ${stats.total}:`, err);
      stats.errors++;
    }
  }

  console.log(`[AUDIT] Processed ${stats.total} rows: ${stats.new} to insert, ${stats.skipped} skipped, ${stats.errors} errors`);
  
  if (unmappedSellers.size > 0) {
    console.log(`[WARN] Unmapped sellers (assigned to admin): ${Array.from(unmappedSellers).join(", ")}`);
  }

  // Calculate total for audit
  const totalAmount = recordsToInsert.reduce((sum, r) => sum + (r.amount || 0), 0);
  console.log(`[AUDIT] Total amount to insert: R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

  // Batch insert
  for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
    const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(tableName).insert(batch);
    if (error) {
      console.error(`[ERROR] Batch insert error at ${i}:`, error);
      stats.errors += batch.length;
      stats.new -= batch.length;
    }
  }

  console.log(`[AUDIT] Import complete: ${stats.new} inserted successfully`);

  return stats;
}
