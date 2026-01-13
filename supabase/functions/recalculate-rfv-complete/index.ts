import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Segment thresholds
const SEGMENT_THRESHOLDS = {
  champions: { recency: 4, frequency: 4, value: 4 },
  loyal: { recency: 3, frequency: 3, value: 3 },
  potential: { recency: 4, frequency: 2, value: 2 },
  promising: { recency: 4, frequency: 1, value: 1 },
  new: { recency: 5, frequency: 1, value: 1 },
  at_risk: { recency: 2, frequency: 3, value: 3 },
  need_attention: { recency: 3, frequency: 2, value: 2 },
  hibernating: { recency: 2, frequency: 2, value: 2 },
  lost: { recency: 1, frequency: 1, value: 1 },
};

function calculateSegment(r: number, f: number, v: number): string {
  if (r >= 4 && f >= 4 && v >= 4) return 'champions';
  if (r >= 3 && f >= 3 && v >= 3) return 'loyal';
  if (r >= 4 && f >= 2 && v >= 2) return 'potential';
  if (r >= 4 && f >= 1) return 'promising';
  if (r >= 4) return 'Novos';
  if (r <= 2 && f >= 3 && v >= 3) return 'at_risk';
  if (r <= 2 && f >= 2 && v >= 4) return 'Não Podem Perder';
  if (r <= 2 && f >= 2) return 'hibernating';
  if (r <= 2 && f <= 2 && v <= 2) return 'lost';
  if (r >= 3 && f >= 2) return 'Precisam Atenção';
  return 'Promissores';
}

function normalizeScore(value: number, max: number): number {
  return Math.min(5, Math.max(1, Math.ceil((value / max) * 5)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting complete RFV recalculation...");

    // Fetch all revenue records (sales)
    const allRevenue: any[] = [];
    let offset = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from('revenue_records')
        .select('patient_name, patient_email, patient_phone, patient_cpf, patient_prontuario, date, amount')
        .range(offset, offset + pageSize - 1);
      
      if (error) throw error;
      if (!data || data.length === 0) break;
      allRevenue.push(...data);
      if (data.length < pageSize) break;
      offset += pageSize;
    }

    console.log(`Fetched ${allRevenue.length} revenue records`);

    // Fetch all executed records
    const allExecuted: any[] = [];
    offset = 0;
    
    while (true) {
      const { data, error } = await supabase
        .from('executed_records')
        .select('patient_name, patient_email, patient_phone, patient_cpf, patient_prontuario, date, amount')
        .range(offset, offset + pageSize - 1);
      
      if (error) throw error;
      if (!data || data.length === 0) break;
      allExecuted.push(...data);
      if (data.length < pageSize) break;
      offset += pageSize;
    }

    console.log(`Fetched ${allExecuted.length} executed records`);

    // Define customer data type
    interface CustomerData {
      name: string;
      email: string | undefined;
      phone: string | undefined;
      cpf: string | undefined;
      prontuario: string | undefined;
      revenueDates: Date[];
      executedDates: Date[];
      totalRevenue: number;
      totalExecuted: number;
      revenueCount: number;
      executedCount: number;
    }

    // Create customer map combining both sources
    const customerMap = new Map<string, CustomerData>();

    // Helper to normalize customer name for matching
    const normalizeKey = (name: string): string => {
      if (!name) return '';
      return name.toLowerCase().trim().replace(/\s+/g, ' ');
    };

    // Helper to create empty customer data
    const createEmptyCustomer = (name: string): CustomerData => ({
      name,
      email: undefined,
      phone: undefined,
      cpf: undefined,
      prontuario: undefined,
      revenueDates: [],
      executedDates: [],
      totalRevenue: 0,
      totalExecuted: 0,
      revenueCount: 0,
      executedCount: 0,
    });

    // Process revenue records
    for (const record of allRevenue) {
      if (!record.patient_name || record.patient_name.match(/^\d+$/)) continue; // Skip if name is just numbers (CPF)
      
      const key = normalizeKey(record.patient_name);
      if (!key) continue;
      
      const existing = customerMap.get(key) || createEmptyCustomer(record.patient_name);
      
      existing.revenueDates.push(new Date(record.date));
      existing.totalRevenue += Number(record.amount) || 0;
      existing.revenueCount += 1;
      if (record.patient_email) existing.email = record.patient_email;
      if (record.patient_phone) existing.phone = record.patient_phone;
      if (record.patient_cpf) existing.cpf = record.patient_cpf;
      if (record.patient_prontuario) existing.prontuario = record.patient_prontuario;
      
      customerMap.set(key, existing);
    }

    // Process executed records
    for (const record of allExecuted) {
      if (!record.patient_name || record.patient_name.match(/^\d+$/)) continue;
      
      const key = normalizeKey(record.patient_name);
      if (!key) continue;
      
      const existing = customerMap.get(key) || createEmptyCustomer(record.patient_name);
      
      existing.executedDates.push(new Date(record.date));
      existing.totalExecuted += Number(record.amount) || 0;
      existing.executedCount += 1;
      if (record.patient_email && !existing.email) existing.email = record.patient_email;
      if (record.patient_phone && !existing.phone) existing.phone = record.patient_phone;
      if (record.patient_cpf && !existing.cpf) existing.cpf = record.patient_cpf;
      if (record.patient_prontuario && !existing.prontuario) existing.prontuario = record.patient_prontuario;
      
      customerMap.set(key, existing);
    }

    console.log(`Created customer map with ${customerMap.size} unique customers`);

    // Calculate statistics for normalization
    const allValues = Array.from(customerMap.values());
    const maxTotalValue = Math.max(...allValues.map(c => c.totalRevenue + c.totalExecuted), 1);
    const maxFrequency = Math.max(...allValues.map(c => c.revenueCount + c.executedCount), 1);
    
    const now = new Date();
    let updated = 0;
    let created = 0;
    let errors = 0;

    // Process in batches
    const customers = Array.from(customerMap.entries());
    const batchSize = 100;

    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize);
      const upsertData = [];

      for (const [key, data] of batch) {
        // Combine all dates to find last activity
        const allDates = [...data.revenueDates, ...data.executedDates];
        if (allDates.length === 0) continue;
        
        const lastDate = new Date(Math.max(...allDates.map(d => d.getTime())));
        const firstDate = new Date(Math.min(...allDates.map(d => d.getTime())));
        const daysSinceLastPurchase = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Total value = revenue + executed (avoid double counting by taking max)
        const totalValue = Math.max(data.totalRevenue, data.totalExecuted);
        const totalPurchases = data.revenueCount + data.executedCount;
        
        // Calculate RFV scores (1-5 scale)
        // Recency: More recent = higher score
        const recencyScore = daysSinceLastPurchase <= 30 ? 5 :
                            daysSinceLastPurchase <= 90 ? 4 :
                            daysSinceLastPurchase <= 180 ? 3 :
                            daysSinceLastPurchase <= 365 ? 2 : 1;
        
        // Frequency: More purchases = higher score
        const frequencyScore = totalPurchases >= 10 ? 5 :
                              totalPurchases >= 5 ? 4 :
                              totalPurchases >= 3 ? 3 :
                              totalPurchases >= 2 ? 2 : 1;
        
        // Value: Higher value = higher score
        const valueScore = totalValue >= 100000 ? 5 :
                          totalValue >= 50000 ? 4 :
                          totalValue >= 20000 ? 3 :
                          totalValue >= 5000 ? 2 : 1;
        
        const segment = calculateSegment(recencyScore, frequencyScore, valueScore);
        const averageTicket = totalPurchases > 0 ? totalValue / totalPurchases : 0;

        upsertData.push({
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          whatsapp: data.phone || null,
          cpf: data.cpf || null,
          prontuario: data.prontuario || null,
          first_purchase_date: firstDate.toISOString().split('T')[0],
          last_purchase_date: lastDate.toISOString().split('T')[0],
          total_purchases: totalPurchases,
          total_value: totalValue,
          average_ticket: averageTicket,
          recency_score: recencyScore,
          frequency_score: frequencyScore,
          value_score: valueScore,
          segment,
          days_since_last_purchase: daysSinceLastPurchase,
          updated_at: new Date().toISOString(),
        });
      }

      if (upsertData.length > 0) {
        const { error } = await supabase
          .from('rfv_customers')
          .upsert(upsertData, { 
            onConflict: 'name',
            ignoreDuplicates: false 
          });

        if (error) {
          console.error('Batch upsert error:', error);
          errors += upsertData.length;
        } else {
          updated += upsertData.length;
        }
      }
    }

    console.log(`RFV recalculation complete: ${updated} updated, ${errors} errors`);

    // Now sync to CRM leads
    const { data: rfvCustomers, error: rfvError } = await supabase
      .from('rfv_customers')
      .select('id, name, segment, total_value')
      .order('total_value', { ascending: false });

    if (rfvError) {
      console.error('Error fetching RFV for CRM sync:', rfvError);
    } else {
      console.log(`Syncing ${rfvCustomers?.length || 0} RFV customers to CRM...`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'RFV recalculation complete!',
        stats: {
          revenueRecords: allRevenue.length,
          executedRecords: allExecuted.length,
          uniqueCustomers: customerMap.size,
          updated,
          errors
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
