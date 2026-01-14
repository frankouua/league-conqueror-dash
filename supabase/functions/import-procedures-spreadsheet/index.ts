import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map spreadsheet category groups to simpler category names
function normalizeCategory(group: string): string {
  const categoryMap: Record<string, string> = {
    '01 - CIRURGIA PLÁSTICA': 'cirurgia',
    '02 - CONSULTA CIRURGIA PLÁSTICA': 'consulta',
    '03 - PÓS OPERATÓRIO': 'pos-operatorio',
    '04 - SOROTERAPIA / PROTOCOLOS NUTRICIONAIS': 'soroterapia',
    '08 - HARMONIZAÇÃO FACIAL E CORPORAL': 'harmonizacao',
    '09 - SPA E ESTÉTICA': 'spa',
  };
  
  const normalized = group?.trim();
  return categoryMap[normalized] || 'outros';
}

// Normalize procedure type to subcategory
function normalizeSubcategory(type: string): string {
  const typeMap: Record<string, string> = {
    'Consulta': 'consulta',
    'Cirurgia': 'cirurgia',
    'Procedimento': 'procedimento',
    'Retorno': 'retorno',
    'Exame': 'exame',
    'Outras terapias': 'terapia',
  };
  
  const normalized = type?.trim();
  return typeMap[normalized] || 'procedimento';
}

// Extract code from procedure name (e.g., "Ind 101" from "Ind 101 - Abdominoplastia HD")
function extractCode(name: string): string | null {
  const match = name?.match(/^([A-Za-z]+\s*\d+[\.\d]*)/);
  return match ? match[1].trim() : null;
}

// Parse price value
function parsePrice(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  const numValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.,]/g, '').replace(',', '.'));
  return isNaN(numValue) ? null : numValue;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: proceduresData, clearExisting = false } = await req.json();
    
    console.log('Received procedures data:', proceduresData?.length || 0, 'rows');
    
    if (!proceduresData || !Array.isArray(proceduresData)) {
      return new Response(
        JSON.stringify({ error: 'Invalid data format. Expected array of procedures.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Optionally clear existing procedures
    if (clearExisting) {
      console.log('Clearing existing procedures...');
      const { error: deleteError } = await supabase
        .from('procedures')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (deleteError) {
        console.error('Error clearing procedures:', deleteError);
      }
    }

    // Process and insert procedures
    const proceduresToInsert: any[] = [];
    const skippedRows: string[] = [];
    
    for (const row of proceduresData) {
      const name = row['Procedimento']?.trim();
      const group = row['Grupo de procedimento']?.trim();
      const type = row['Tipo de procedimento']?.trim();
      const price = parsePrice(row['Valor']);
      const duration = parseInt(row['Tempo do Procedimento']) || null;
      
      // Skip rows without name or with invalid data
      if (!name || name === '' || name === 'Procedimento') {
        skippedRows.push(`Empty or header row`);
        continue;
      }
      
      // Skip summary rows
      if (name.includes('total') || name.includes('Total')) {
        skippedRows.push(`Summary row: ${name}`);
        continue;
      }
      
      const code = extractCode(name);
      const category = normalizeCategory(group);
      const subcategory = normalizeSubcategory(type);
      
      proceduresToInsert.push({
        code: code,
        name: name,
        category: category,
        subcategory: subcategory,
        price: price || 0,
        duration_minutes: duration,
        is_featured: price && price >= 5000, // Auto-feature expensive procedures
        is_active: true,
        imported_from: 'spreadsheet',
      });
    }
    
    console.log('Procedures to insert:', proceduresToInsert.length);
    console.log('Skipped rows:', skippedRows.length);
    
    if (proceduresToInsert.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No valid procedures found in data',
          skippedRows 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert in batches of 100
    const batchSize = 100;
    let insertedCount = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < proceduresToInsert.length; i += batchSize) {
      const batch = proceduresToInsert.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('procedures')
        .upsert(batch, { 
          onConflict: 'name',
          ignoreDuplicates: false 
        })
        .select();
      
      if (error) {
        console.error('Batch insert error:', error);
        errors.push(`Batch ${Math.floor(i/batchSize) + 1}: ${error.message}`);
      } else {
        insertedCount += data?.length || 0;
      }
    }
    
    // Get category summary
    const { data: categorySummary } = await supabase
      .from('procedures')
      .select('category')
      .eq('is_active', true);
    
    const categoryCount: Record<string, number> = {};
    categorySummary?.forEach(p => {
      categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully imported ${insertedCount} procedures`,
        stats: {
          total: proceduresToInsert.length,
          inserted: insertedCount,
          skipped: skippedRows.length,
          categories: categoryCount
        },
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error importing procedures:', error);
    return new Response(
      JSON.stringify({ error: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
