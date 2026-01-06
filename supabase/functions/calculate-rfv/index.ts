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

    console.log("Starting RFV calculation (revenue_records only - no duplicates)...");

    // Fetch all revenue records with pagination
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
      
      // Add purchase (only if amount > 0)
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
      const percentile = getPercentile(allRecencies, days);
      if (percentile <= 20) return 5;
      if (percentile <= 40) return 4;
      if (percentile <= 60) return 3;
      if (percentile <= 80) return 2;
      return 1;
    };

    const scoreFrequency = (freq: number): number => {
      const percentile = getPercentile(allFrequencies, freq);
      if (percentile >= 80) return 5;
      if (percentile >= 60) return 4;
      if (percentile >= 40) return 3;
      if (percentile >= 20) return 2;
      return 1;
    };

    const scoreValue = (value: number): number => {
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
      
      if (r >= 4 && f >= 4 && v >= 4) return "Campeões";
      if (r >= 3 && f >= 3 && v >= 3) return "Leais";
      if (r >= 4 && f <= 2 && v >= 3) return "Potenciais Leais";
      if (r >= 4 && f <= 2) return "Novos";
      if (r >= 3 && (f >= 2 || v >= 2)) return "Promissores";
      if (r <= 2 && f >= 3 && v >= 3) return "Precisam Atenção";
      if (r <= 2 && f >= 2 && v >= 2) return "Em Risco";
      if (r <= 2 && v >= 4) return "Não Podem Perder";
      if (avg <= 2) return "Hibernando";
      if (r <= 2 && avg <= 3) return "Quase Dormindo";
      
      return "Outros";
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
        const existing = rfvByCpf.get(customer.cpf);
        if (existing) {
          // Merge: should not happen with proper grouping, but just in case
          existing.total_value += rfvRecord.total_value;
          existing.total_purchases += rfvRecord.total_purchases;
          existing.average_ticket = existing.total_value / existing.total_purchases;
          if (rfvRecord.last_purchase_date > existing.last_purchase_date) {
            existing.last_purchase_date = rfvRecord.last_purchase_date;
            existing.days_since_last_purchase = rfvRecord.days_since_last_purchase;
          }
          existing.segment = getSegment(
            Math.max(existing.recency_score, r),
            Math.max(existing.frequency_score, f),
            Math.max(existing.value_score, v)
          );
        } else {
          rfvByCpf.set(customer.cpf, rfvRecord);
        }
      } else {
        // No CPF: dedupe by normalized name
        const normalizedName = customer.name.toLowerCase().trim();
        const existing = rfvByName.get(normalizedName);
        if (existing) {
          existing.total_value += rfvRecord.total_value;
          existing.total_purchases += rfvRecord.total_purchases;
          existing.average_ticket = existing.total_value / existing.total_purchases;
          if (rfvRecord.last_purchase_date > existing.last_purchase_date) {
            existing.last_purchase_date = rfvRecord.last_purchase_date;
            existing.days_since_last_purchase = rfvRecord.days_since_last_purchase;
          }
        } else {
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
