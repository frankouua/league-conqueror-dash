import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CustomerData {
  cpf: string | null;
  prontuario: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  purchases: { date: string; amount: number }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting RFV calculation (6 segments - simplified methodology)...");

    // Fetch all revenue records with pagination (ONLY revenue_records, not executed)
    const revenueRecords: any[] = [];
    const PAGE_SIZE = 1000;

    for (let from = 0; ; from += PAGE_SIZE) {
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("revenue_records")
        .select("*")
        .order("date", { ascending: false })
        .range(from, to);

      if (error) throw error;
      if (!data || data.length === 0) break;

      revenueRecords.push(...data);
      if (data.length < PAGE_SIZE) break;
    }

    console.log(`Loaded ${revenueRecords.length} revenue records`);

    // Fetch patient data for enrichment (phone, email, etc.)
    const patientData: any[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("patient_data")
        .select("*")
        .range(from, from + PAGE_SIZE - 1);
      if (error) {
        console.warn("Could not load patient data:", error);
        break;
      }
      if (!data || data.length === 0) break;
      patientData.push(...data);
      if (data.length < PAGE_SIZE) break;
    }

    // Create patient lookup maps by CPF and prontuario
    const patientByCpf = new Map<string, any>();
    const patientByProntuario = new Map<string, any>();
    
    patientData.forEach((p: any) => {
      const cleanCpf = p.cpf?.replace(/\D/g, "") || null;
      if (cleanCpf) patientByCpf.set(cleanCpf, p);
      if (p.prontuario) patientByProntuario.set(String(p.prontuario).trim(), p);
    });

    // Group purchases by customer using CPF as primary key (most reliable)
    // If no CPF, fall back to prontuario, then to normalized name
    const customerMap = new Map<string, CustomerData>();

    for (const record of revenueRecords) {
      const cpf = record.patient_cpf?.replace(/\D/g, "") || null;
      const prontuario = record.patient_prontuario ? String(record.patient_prontuario).trim() : null;
      const rawName = record.patient_name?.trim() || null;
      
      // Skip records without identifying information
      if (!cpf && !prontuario && !rawName) continue;
      
      // Create a unique key: prefer CPF, then prontuario, then normalized name
      let customerKey: string;
      if (cpf && cpf.length >= 11) {
        customerKey = `cpf:${cpf}`;
      } else if (prontuario) {
        customerKey = `pront:${prontuario}`;
      } else if (rawName) {
        customerKey = `name:${rawName.toLowerCase()}`;
      } else {
        continue;
      }

      if (!customerMap.has(customerKey)) {
        // Try to enrich with patient data
        let enrichedData: any = null;
        if (cpf) enrichedData = patientByCpf.get(cpf);
        if (!enrichedData && prontuario) enrichedData = patientByProntuario.get(prontuario);

        // Always use actual name (not CPF) for display
        const displayName = rawName || enrichedData?.name || "Desconhecido";

        customerMap.set(customerKey, {
          cpf: cpf || enrichedData?.cpf?.replace(/\D/g, "") || null,
          prontuario: prontuario || enrichedData?.prontuario || null,
          name: displayName,
          email: enrichedData?.email || record.patient_email || null,
          phone: enrichedData?.phone || record.patient_phone || null,
          purchases: [],
        });
      }

      const customer = customerMap.get(customerKey)!;
      
      // Update with better data if available
      if (rawName && (!customer.name || customer.name === "Desconhecido" || /^\d+$/.test(customer.name))) {
        customer.name = rawName;
      }
      if (!customer.cpf && cpf) customer.cpf = cpf;
      if (!customer.prontuario && prontuario) customer.prontuario = prontuario;
      if (!customer.email && record.patient_email) customer.email = record.patient_email;
      if (!customer.phone && record.patient_phone) customer.phone = record.patient_phone;
      
      // Add purchase - only positive values for RFV (sales value)
      const amount = parseFloat(record.amount) || 0;
      if (amount > 0) {
        customer.purchases.push({
          date: record.date,
          amount,
        });
      }
    }

    console.log(`Found ${customerMap.size} unique customers`);

    // Calculate RFV metrics
    const today = new Date();
    const customers: any[] = [];

    customerMap.forEach((customer) => {
      if (customer.purchases.length === 0) return;

      const sortedPurchases = customer.purchases.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      const lastPurchaseDate = new Date(sortedPurchases[0].date);
      const firstPurchaseDate = new Date(sortedPurchases[sortedPurchases.length - 1].date);
      const daysSinceLastPurchase = Math.floor((today.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalValue = customer.purchases.reduce((sum, p) => sum + p.amount, 0);
      const frequency = customer.purchases.length;

      customers.push({
        ...customer,
        lastPurchaseDate: sortedPurchases[0].date,
        firstPurchaseDate: sortedPurchases[sortedPurchases.length - 1].date,
        daysSinceLastPurchase,
        totalValue,
        frequency,
        averageTicket: totalValue / frequency,
      });
    });

    // ===========================================
    // SCORING SYSTEM (1-5 scale) based on PDF methodology
    // ===========================================
    
    // Recency Score (R) - Based on days since last purchase
    // Score 5: 0-30 days (Muito recente)
    // Score 4: 31-60 days (Recente)
    // Score 3: 61-120 days (Médio)
    // Score 2: 121-180 days (Antigo)
    // Score 1: >180 days (Muito antigo)
    const scoreRecency = (days: number): number => {
      if (days <= 30) return 5;
      if (days <= 60) return 4;
      if (days <= 120) return 3;
      if (days <= 180) return 2;
      return 1;
    };

    // Frequency Score (F) - Based on number of purchases
    // Score 5: 15+ compras (Muito frequente)
    // Score 4: 10-14 compras (Frequente)
    // Score 3: 6-9 compras (Médio)
    // Score 2: 3-5 compras (Baixo)
    // Score 1: 1-2 compras (Muito baixo)
    const scoreFrequency = (freq: number): number => {
      if (freq >= 15) return 5;
      if (freq >= 10) return 4;
      if (freq >= 6) return 3;
      if (freq >= 3) return 2;
      return 1;
    };

    // Value Score (V) - Based on total value spent
    // Score 5: R$ 50.000+ (Muito alto)
    // Score 4: R$ 20.000 - R$ 49.999 (Alto)
    // Score 3: R$ 10.000 - R$ 19.999 (Médio)
    // Score 2: R$ 5.000 - R$ 9.999 (Baixo)
    // Score 1: < R$ 5.000 (Muito baixo)
    const scoreValue = (value: number): number => {
      if (value >= 50000) return 5;
      if (value >= 20000) return 4;
      if (value >= 10000) return 3;
      if (value >= 5000) return 2;
      return 1;
    };

    // ===========================================
    // SEGMENTATION (6 simplified segments from PDF)
    // ===========================================
    // 1. CAMPEÕES 🏆: R≥4 AND F≥4 AND V≥4
    // 2. FIÉIS 💎: F≥4 AND V≤3 AND R≥3
    // 3. POTENCIAIS ⭐: R≥4 AND V≥4 AND F≤3
    // 4. EM RISCO ⚠️: R≤2 AND F≥3 AND V≥3
    // 5. NOVATOS 🌱: R≥4 AND F≤2 AND V≤2
    // 6. INATIVOS 😴: todos os outros casos
    
    const getSegment = (r: number, f: number, v: number): string => {
      // CAMPEÕES 🏆 - Alto em tudo: clientes de alto valor que compram frequentemente e recentemente
      if (r >= 4 && f >= 4 && v >= 4) return "Campeões";
      
      // FIÉIS 💎 - Clientes leais com boa frequência, mas valor médio
      if (f >= 4 && v <= 3 && r >= 3) return "Fiéis";
      
      // POTENCIAIS ⭐ - Comprou recentemente com alto valor, mas baixa frequência
      if (r >= 4 && v >= 4 && f <= 3) return "Potenciais";
      
      // EM RISCO ⚠️ - Clientes valiosos que estão se afastando (não compra há tempo mas era bom cliente)
      if (r <= 2 && f >= 3 && v >= 3) return "Em Risco";
      
      // NOVATOS 🌱 - Clientes recentes que precisam ser desenvolvidos
      if (r >= 4 && f <= 2 && v <= 2) return "Novatos";
      
      // INATIVOS 😴 - Clientes que não compram há muito tempo (todos os outros casos)
      return "Inativos";
    };

    // Build final RFV records (dedupe by CPF first, then by name)
    const rfvByCpf = new Map<string, any>();
    const rfvByName = new Map<string, any>();
    
    for (const customer of customers) {
      const r = scoreRecency(customer.daysSinceLastPurchase);
      const f = scoreFrequency(customer.frequency);
      const v = scoreValue(customer.totalValue);
      const segment = getSegment(r, f, v);
      
      const rfvRecord = {
        name: customer.name,
        cpf: customer.cpf,
        prontuario: customer.prontuario,
        email: customer.email,
        phone: customer.phone,
        whatsapp: customer.phone,
        first_purchase_date: customer.firstPurchaseDate,
        last_purchase_date: customer.lastPurchaseDate,
        days_since_last_purchase: customer.daysSinceLastPurchase,
        total_purchases: customer.frequency,
        total_value: customer.totalValue,
        average_ticket: customer.averageTicket,
        recency_score: r,
        frequency_score: f,
        value_score: v,
        segment,
      };

      // Use CPF as primary deduplication key if available
      if (customer.cpf) {
        if (!rfvByCpf.has(customer.cpf)) {
          rfvByCpf.set(customer.cpf, rfvRecord);
        }
      } else {
        // No CPF: dedupe by normalized name
        const normalizedName = customer.name.toLowerCase().trim();
        if (!rfvByName.has(normalizedName)) {
          rfvByName.set(normalizedName, rfvRecord);
        }
      }
    }
    
    // Combine both maps
    const rfvRecords = [...rfvByCpf.values(), ...rfvByName.values()];

    console.log(`Prepared ${rfvRecords.length} unique RFV records`);

    // Clear existing RFV data and insert new
    const { error: deleteError } = await supabase
      .from("rfv_customers")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) console.warn("Error clearing RFV:", deleteError);

    // Batch insert using upsert on name
    const BATCH_SIZE = 100;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < rfvRecords.length; i += BATCH_SIZE) {
      const batch = rfvRecords.slice(i, i + BATCH_SIZE);

      const { error: upsertError } = await supabase
        .from("rfv_customers")
        .upsert(batch, { onConflict: "name" });

      if (upsertError) {
        console.error("Batch upsert error:", upsertError);
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
    }

    // Calculate segment summary
    const segmentSummary: Record<string, { count: number; totalValue: number }> = {};
    rfvRecords.forEach((r) => {
      if (!segmentSummary[r.segment]) {
        segmentSummary[r.segment] = { count: 0, totalValue: 0 };
      }
      segmentSummary[r.segment].count++;
      segmentSummary[r.segment].totalValue += r.total_value;
    });

    const missingEmail = rfvRecords.filter(r => !r.email).length;
    const missingPhone = rfvRecords.filter(r => !r.phone).length;
    const missingCpf = rfvRecords.filter(r => !r.cpf).length;

    console.log("RFV calculation complete with 6 simplified segments!");
    console.log("Segments:", segmentSummary);

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          totalCustomers: rfvRecords.length,
          inserted,
          errors,
          missingEmail,
          missingPhone,
          missingCpf,
          segments: segmentSummary,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("RFV calculation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
