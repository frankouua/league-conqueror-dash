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

interface RFVScore {
  recency_score: number;
  frequency_score: number;
  value_score: number;
  segment: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting RFV calculation...");

    // Fetch all revenue records (vendas/competência)
    const { data: revenueRecords, error: revenueError } = await supabase
      .from("revenue_records")
      .select("*")
      .order("date", { ascending: false });

    if (revenueError) throw revenueError;

    console.log(`Loaded ${revenueRecords?.length || 0} revenue records`);

    // Fetch patient data for enrichment
    const { data: patientData, error: patientError } = await supabase
      .from("patient_data")
      .select("*");

    if (patientError) console.warn("Could not load patient data:", patientError);

    // Create patient lookup maps
    const patientByCpf = new Map<string, any>();
    const patientByProntuario = new Map<string, any>();
    
    patientData?.forEach((p: any) => {
      if (p.cpf) patientByCpf.set(p.cpf, p);
      if (p.prontuario) patientByProntuario.set(p.prontuario, p);
    });

    // Group purchases by customer (using CPF or prontuario or name)
    const customerMap = new Map<string, CustomerData>();

    for (const record of revenueRecords || []) {
      // Determine customer key (prefer CPF > prontuario > name)
      const cpf = record.patient_cpf?.replace(/\D/g, "") || null;
      const prontuario = record.patient_prontuario || null;
      const name = record.patient_name || record.notes?.match(/Cliente: ([^|]+)/)?.[1]?.trim() || "Desconhecido";
      
      let customerKey = cpf || prontuario || name.toLowerCase().trim();
      
      if (!customerKey || customerKey === "desconhecido") continue;

      if (!customerMap.has(customerKey)) {
        // Try to enrich with patient data
        let enrichedData: any = null;
        if (cpf) enrichedData = patientByCpf.get(cpf);
        if (!enrichedData && prontuario) enrichedData = patientByProntuario.get(prontuario);

        customerMap.set(customerKey, {
          cpf,
          prontuario,
          name: enrichedData?.name || name,
          email: enrichedData?.email || record.patient_email || null,
          phone: enrichedData?.phone || record.patient_phone || null,
          purchases: [],
        });
      }

      const customer = customerMap.get(customerKey)!;
      customer.purchases.push({
        date: record.date,
        amount: record.amount || 0,
      });

      // Update with better data if available
      if (!customer.email && record.patient_email) customer.email = record.patient_email;
      if (!customer.phone && record.patient_phone) customer.phone = record.patient_phone;
      if (!customer.cpf && cpf) customer.cpf = cpf;
      if (!customer.prontuario && prontuario) customer.prontuario = prontuario;
    }

    console.log(`Found ${customerMap.size} unique customers`);

    // Calculate RFV metrics
    const today = new Date();
    const customers: any[] = [];

    // First pass: calculate raw values for percentile scoring
    const allRecencies: number[] = [];
    const allFrequencies: number[] = [];
    const allValues: number[] = [];

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

      allRecencies.push(daysSinceLastPurchase);
      allFrequencies.push(frequency);
      allValues.push(totalValue);

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

    // Calculate percentiles for scoring
    const getPercentile = (arr: number[], value: number): number => {
      const sorted = [...arr].sort((a, b) => a - b);
      const index = sorted.findIndex(v => v >= value);
      return (index / sorted.length) * 100;
    };

    // Score customers (1-5 scale)
    const scoreRecency = (days: number): number => {
      // Lower days = better (more recent) = higher score
      const percentile = getPercentile(allRecencies, days);
      if (percentile <= 20) return 5; // Most recent 20%
      if (percentile <= 40) return 4;
      if (percentile <= 60) return 3;
      if (percentile <= 80) return 2;
      return 1; // Oldest purchases
    };

    const scoreFrequency = (freq: number): number => {
      // Higher frequency = better = higher score
      const percentile = getPercentile(allFrequencies, freq);
      if (percentile >= 80) return 5;
      if (percentile >= 60) return 4;
      if (percentile >= 40) return 3;
      if (percentile >= 20) return 2;
      return 1;
    };

    const scoreValue = (value: number): number => {
      // Higher value = better = higher score
      const percentile = getPercentile(allValues, value);
      if (percentile >= 80) return 5;
      if (percentile >= 60) return 4;
      if (percentile >= 40) return 3;
      if (percentile >= 20) return 2;
      return 1;
    };

    // Determine segment based on RFV scores
    const getSegment = (r: number, f: number, v: number): string => {
      const avg = (r + f + v) / 3;
      
      // Champions: High in all dimensions
      if (r >= 4 && f >= 4 && v >= 4) return "Campeões";
      
      // Loyal: Good frequency and value, recent
      if (r >= 3 && f >= 3 && v >= 3) return "Leais";
      
      // Potential Loyalists: Recent, low frequency but good value
      if (r >= 4 && f <= 2 && v >= 3) return "Potenciais Leais";
      
      // New Customers: Very recent, low frequency
      if (r >= 4 && f <= 2) return "Novos";
      
      // Promising: Recent with moderate engagement
      if (r >= 3 && (f >= 2 || v >= 2)) return "Promissores";
      
      // Need Attention: Were good but haven't purchased recently
      if (r <= 2 && f >= 3 && v >= 3) return "Precisam Atenção";
      
      // At Risk: Haven't purchased in a while, were good customers
      if (r <= 2 && f >= 2 && v >= 2) return "Em Risco";
      
      // Can't Lose: High value but haven't purchased in long time
      if (r <= 2 && v >= 4) return "Não Podem Perder";
      
      // Hibernating: Low engagement across all dimensions
      if (avg <= 2) return "Hibernando";
      
      // About to Sleep: Declining engagement
      if (r <= 2 && avg <= 3) return "Quase Dormindo";
      
      return "Outros";
    };

    // Process and prepare for insert
    const rfvRecords = customers.map((customer) => {
      const r = scoreRecency(customer.daysSinceLastPurchase);
      const f = scoreFrequency(customer.frequency);
      const v = scoreValue(customer.totalValue);
      const segment = getSegment(r, f, v);

      return {
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
    });

    console.log(`Prepared ${rfvRecords.length} RFV records`);

    // Clear existing RFV data and insert new
    const { error: deleteError } = await supabase
      .from("rfv_customers")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (deleteError) console.warn("Error clearing RFV:", deleteError);

    // Batch insert
    const BATCH_SIZE = 100;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < rfvRecords.length; i += BATCH_SIZE) {
      const batch = rfvRecords.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase
        .from("rfv_customers")
        .insert(batch);
      
      if (insertError) {
        console.error("Batch insert error:", insertError);
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

    // Count missing data
    const missingEmail = rfvRecords.filter(r => !r.email).length;
    const missingPhone = rfvRecords.filter(r => !r.phone).length;
    const missingCpf = rfvRecords.filter(r => !r.cpf).length;

    console.log("RFV calculation complete!");

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
