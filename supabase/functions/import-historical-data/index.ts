import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRow {
  date: string;
  client_name: string;
  procedure_name?: string;
  department?: string;
  value_sold?: number;
  value_received?: number;
  seller_name?: string;
  professional_name?: string;
  phone?: string;
  email?: string;
  origin?: string;
  referred_by?: string;
  status?: string;
  notes?: string;
}

interface ProfileMapping {
  id: string;
  full_name: string;
  team_id: string;
}

interface ImportRequest {
  action: 'validate' | 'import' | 'backup' | 'status';
  fileType: 'vendas' | 'executado' | 'both';
  data?: ImportRow[];
  executadoData?: ImportRow[];
  clearOldData?: boolean;
  periodStart?: string;
  periodEnd?: string;
  backupId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body: ImportRequest = await req.json();
    const { action, fileType, data, executadoData, clearOldData, periodStart, periodEnd } = body;

    console.log(`Action: ${action}, FileType: ${fileType}, Records: ${data?.length || 0}`);

    // ACTION: BACKUP
    if (action === 'backup') {
      const backup = await createBackup(supabase, fileType, userId);
      return new Response(JSON.stringify(backup), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ACTION: VALIDATE
    if (action === 'validate') {
      const validation = await validateData(data || [], fileType, periodStart, periodEnd);
      
      if (fileType === 'both' && executadoData) {
        const executadoValidation = await validateData(executadoData, 'executado', periodStart, periodEnd);
        return new Response(JSON.stringify({
          vendas: validation,
          executado: executadoValidation
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify(validation), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ACTION: IMPORT
    if (action === 'import') {
      const startTime = Date.now();
      
      // 1. Create backup first
      console.log('Creating backup before import...');
      const backup = await createBackup(supabase, fileType, userId);
      
      if (!backup.success) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to create backup',
          details: backup.error
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }

      // 2. Validate data
      console.log('Validating data...');
      const validation = await validateData(data || [], fileType === 'both' ? 'vendas' : fileType, periodStart, periodEnd);
      
      if (validation.errors.length > 0 && validation.errors.length > (data?.length || 0) * 0.1) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Too many validation errors (>10%)',
          validation
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        });
      }

      // 3. Clear old data if requested
      if (clearOldData && periodStart && periodEnd) {
        console.log(`Clearing old data from ${periodStart} to ${periodEnd}...`);
        
        if (fileType === 'vendas' || fileType === 'both') {
          await supabase
            .from('revenue_records')
            .delete()
            .gte('date', periodStart)
            .lte('date', periodEnd);
        }
        
        if (fileType === 'executado' || fileType === 'both') {
          await supabase
            .from('executed_records')
            .delete()
            .gte('date', periodStart)
            .lte('date', periodEnd);
        }
      }

      // 4. Import data
      let importResult: any = { vendas: null, executado: null };
      
      if ((fileType === 'vendas' || fileType === 'both') && data && data.length > 0) {
        console.log(`Importing ${data.length} vendas records...`);
        importResult.vendas = await importVendasData(supabase, data, validation.validRows, backup.backupId, userId);
      }
      
      if ((fileType === 'executado' || fileType === 'both') && executadoData && executadoData.length > 0) {
        console.log(`Importing ${executadoData.length} executado records...`);
        const execValidation = await validateData(executadoData, 'executado', periodStart, periodEnd);
        importResult.executado = await importExecutadoData(supabase, executadoData, execValidation.validRows, backup.backupId, userId);
      }

      // 5. Recalculate RFV
      console.log('Recalculating RFV...');
      const rfvResult = await recalculateRFV(supabase);

      // 6. Log import
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);
      
      const totalImported = (importResult.vendas?.imported || 0) + (importResult.executado?.imported || 0);
      const totalDuplicates = (importResult.vendas?.duplicates || 0) + (importResult.executado?.duplicates || 0);
      const totalErrors = (importResult.vendas?.errors?.length || 0) + (importResult.executado?.errors?.length || 0);
      
      await supabase.from('data_import_logs').insert({
        backup_id: backup.backupId,
        file_type: fileType,
        period_start: periodStart,
        period_end: periodEnd,
        total_rows: (data?.length || 0) + (executadoData?.length || 0),
        imported_rows: totalImported,
        duplicate_rows: totalDuplicates,
        error_rows: totalErrors,
        errors: [...(importResult.vendas?.errors || []), ...(importResult.executado?.errors || [])],
        duplicates_removed: [...(importResult.vendas?.duplicatesRemoved || []), ...(importResult.executado?.duplicatesRemoved || [])],
        status: 'completed',
        duration_seconds: durationSeconds,
        rfv_recalculated: rfvResult.success,
        created_by: userId,
        completed_at: new Date().toISOString()
      });

      return new Response(JSON.stringify({
        success: true,
        backupId: backup.backupId,
        vendas: importResult.vendas,
        executado: importResult.executado,
        rfv: rfvResult,
        duration_seconds: durationSeconds
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

async function createBackup(supabase: any, backupType: string, userId: string | null) {
  try {
    // Fetch current data
    const { data: revenueRecords, error: revError } = await supabase
      .from('revenue_records')
      .select('*')
      .order('date', { ascending: false });

    const { data: executedRecords, error: execError } = await supabase
      .from('executed_records')
      .select('*')
      .order('date', { ascending: false });

    if (revError || execError) {
      throw new Error(`Failed to fetch data: ${revError?.message || execError?.message}`);
    }

    // Create backup record
    const { data: backup, error: backupError } = await supabase
      .from('data_import_backups')
      .insert({
        backup_name: `Backup ${new Date().toLocaleString('pt-BR')}`,
        backup_type: backupType,
        revenue_records_count: revenueRecords?.length || 0,
        executed_records_count: executedRecords?.length || 0,
        backup_data: {
          revenue_records: revenueRecords || [],
          executed_records: executedRecords || []
        },
        tables_backed_up: ['revenue_records', 'executed_records'],
        status: 'completed',
        created_by: userId
      })
      .select()
      .single();

    if (backupError) {
      throw new Error(`Failed to create backup: ${backupError.message}`);
    }

    return {
      success: true,
      backupId: backup.id,
      revenueCount: revenueRecords?.length || 0,
      executedCount: executedRecords?.length || 0
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

async function validateData(rows: ImportRow[], fileType: string, periodStart?: string, periodEnd?: string) {
  const errors: { row: number; field: string; message: string }[] = [];
  const warnings: { row: number; message: string }[] = [];
  const duplicates: { row: number; key: string }[] = [];
  const validRows: number[] = [];
  const seen = new Map<string, number>();

  const minDate = periodStart ? new Date(periodStart) : new Date('2023-01-01');
  const maxDate = periodEnd ? new Date(periodEnd) : new Date('2025-12-31');

  rows.forEach((row, index) => {
    const rowNum = index + 1;
    let isValid = true;

    // Required fields
    if (!row.date) {
      errors.push({ row: rowNum, field: 'date', message: 'Data é obrigatória' });
      isValid = false;
    } else {
      const date = parseDate(row.date);
      if (!date) {
        errors.push({ row: rowNum, field: 'date', message: 'Data inválida' });
        isValid = false;
      } else if (date < minDate || date > maxDate) {
        warnings.push({ row: rowNum, message: `Data fora do período (${row.date})` });
      }
    }

    if (!row.client_name || row.client_name.trim() === '') {
      errors.push({ row: rowNum, field: 'client_name', message: 'Nome do cliente é obrigatório' });
      isValid = false;
    }

    // Value validation
    const value = fileType === 'executado' ? (row.value_received || row.value_sold) : row.value_sold;
    if (value !== undefined && value !== null && (isNaN(Number(value)) || Number(value) < 0)) {
      errors.push({ row: rowNum, field: 'value', message: 'Valor inválido' });
      isValid = false;
    }

    // Duplicate check
    const key = `${row.date}|${row.client_name?.toLowerCase()}|${row.procedure_name?.toLowerCase()}|${value}`;
    if (seen.has(key)) {
      duplicates.push({ row: rowNum, key });
    } else {
      seen.set(key, rowNum);
    }

    if (isValid) {
      validRows.push(index);
    }
  });

  return {
    totalRows: rows.length,
    validRows,
    errors,
    warnings,
    duplicates,
    summary: {
      valid: validRows.length,
      invalid: rows.length - validRows.length,
      duplicates: duplicates.length
    }
  };
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try different formats
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return new Date(dateStr);
  }
  
  // Excel serial date
  if (!isNaN(Number(dateStr))) {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + Number(dateStr) * 24 * 60 * 60 * 1000);
  }
  
  return null;
}

function formatDate(dateStr: string): string {
  const date = parseDate(dateStr);
  if (!date) return dateStr;
  return date.toISOString().split('T')[0];
}

async function importVendasData(supabase: any, rows: ImportRow[], validIndices: number[], batchId: string, userId: string | null) {
  const imported: any[] = [];
  const errors: { row: number; message: string }[] = [];
  const duplicatesRemoved: string[] = [];
  let duplicateCount = 0;

  // Get existing records for duplicate check
  const { data: existingRecords } = await supabase
    .from('revenue_records')
    .select('date, patient_name, procedure_name, amount');

  const existingKeys = new Set(
    (existingRecords || []).map((r: any) => 
      `${r.date}|${r.patient_name?.toLowerCase()}|${r.procedure_name?.toLowerCase()}|${r.amount}`
    )
  );

  // Get user mappings
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, team_id');
  const userMap = new Map<string, ProfileMapping>(
    (profiles || []).map((p: ProfileMapping) => [p.full_name?.toLowerCase() || '', p])
  );

  // Default team
  const { data: defaultTeam } = await supabase.from('teams').select('id').limit(1).single();
  const defaultTeamId = defaultTeam?.id;

  for (const index of validIndices) {
    const row = rows[index];
    try {
      const dateStr = formatDate(row.date);
      const key = `${dateStr}|${row.client_name?.toLowerCase()}|${row.procedure_name?.toLowerCase()}|${row.value_sold}`;
      
      // Skip duplicates
      if (existingKeys.has(key)) {
        duplicateCount++;
        duplicatesRemoved.push(`Linha ${index + 1}: ${row.client_name} - ${row.procedure_name}`);
        continue;
      }

      // Get user and team
      const seller = userMap.get(row.seller_name?.toLowerCase() || '');
      const sellerId = seller?.id || userId;
      const teamId = seller?.team_id || defaultTeamId;

      const record = {
        date: dateStr,
        patient_name: row.client_name,
        procedure_name: row.procedure_name || 'Não especificado',
        department: row.department,
        amount: Number(row.value_sold) || 0,
        user_id: sellerId,
        team_id: teamId,
        notes: row.notes,
        upload_id: batchId,
        registered_by_admin: true
      };

      const { error } = await supabase.from('revenue_records').insert(record);
      
      if (error) {
        errors.push({ row: index + 1, message: error.message });
      } else {
        imported.push(record);
        existingKeys.add(key);
      }
    } catch (err: any) {
      errors.push({ row: index + 1, message: err.message });
    }
  }

  return {
    imported: imported.length,
    duplicates: duplicateCount,
    duplicatesRemoved,
    errors
  };
}

async function importExecutadoData(supabase: any, rows: ImportRow[], validIndices: number[], batchId: string, userId: string | null) {
  const imported: any[] = [];
  const errors: { row: number; message: string }[] = [];
  const duplicatesRemoved: string[] = [];
  let duplicateCount = 0;

  // Get existing records for duplicate check
  const { data: existingRecords } = await supabase
    .from('executed_records')
    .select('date, patient_name, procedure_name, amount');

  const existingKeys = new Set(
    (existingRecords || []).map((r: any) => 
      `${r.date}|${r.patient_name?.toLowerCase()}|${r.procedure_name?.toLowerCase()}|${r.amount}`
    )
  );

  // Get user mappings
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, team_id');
  const userMap = new Map<string, ProfileMapping>(
    (profiles || []).map((p: ProfileMapping) => [p.full_name?.toLowerCase() || '', p])
  );

  // Default team
  const { data: defaultTeam } = await supabase.from('teams').select('id').limit(1).single();
  const defaultTeamId = defaultTeam?.id;

  for (const index of validIndices) {
    const row = rows[index];
    try {
      const dateStr = formatDate(row.date);
      const value = row.value_received || row.value_sold || 0;
      const key = `${dateStr}|${row.client_name?.toLowerCase()}|${row.procedure_name?.toLowerCase()}|${value}`;
      
      // Skip duplicates
      if (existingKeys.has(key)) {
        duplicateCount++;
        duplicatesRemoved.push(`Linha ${index + 1}: ${row.client_name} - ${row.procedure_name}`);
        continue;
      }

      // Get user and team
      const professional = userMap.get(row.professional_name?.toLowerCase() || '');
      const professionalId = professional?.id || userId;
      const teamId = professional?.team_id || defaultTeamId;

      const record = {
        date: dateStr,
        patient_name: row.client_name,
        patient_phone: row.phone,
        patient_email: row.email,
        procedure_name: row.procedure_name || 'Não especificado',
        department: row.department,
        amount: Number(value),
        origin: row.origin,
        referral_name: row.referred_by,
        executor_name: row.professional_name,
        user_id: professionalId,
        team_id: teamId,
        notes: row.notes,
        upload_id: batchId,
        registered_by_admin: true
      };

      const { error } = await supabase.from('executed_records').insert(record);
      
      if (error) {
        errors.push({ row: index + 1, message: error.message });
      } else {
        imported.push(record);
        existingKeys.add(key);
      }
    } catch (err: any) {
      errors.push({ row: index + 1, message: err.message });
    }
  }

  return {
    imported: imported.length,
    duplicates: duplicateCount,
    duplicatesRemoved,
    errors
  };
}

async function recalculateRFV(supabase: any) {
  try {
    // Get all executed records
    const { data: executedRecords, error: execError } = await supabase
      .from('executed_records')
      .select('patient_name, patient_email, patient_phone, date, amount')
      .order('date', { ascending: false });

    if (execError) throw execError;

    // Group by customer
    const customerMap = new Map<string, { dates: Date[]; total: number; count: number; email?: string; phone?: string }>();

    (executedRecords || []).forEach((record: any) => {
      const name = record.patient_name?.toLowerCase() || 'unknown';
      const existing = customerMap.get(name) || { dates: [], total: 0, count: 0 };
      existing.dates.push(new Date(record.date));
      existing.total += Number(record.amount) || 0;
      existing.count += 1;
      if (record.patient_email) existing.email = record.patient_email;
      if (record.patient_phone) existing.phone = record.patient_phone;
      customerMap.set(name, existing);
    });

    const now = new Date();
    let updated = 0;

    for (const [name, data] of customerMap.entries()) {
      const lastDate = new Date(Math.max(...data.dates.map(d => d.getTime())));
      const recencyDays = Math.round((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate RFV score (0-100)
      const recencyScore = Math.max(0, 100 - (recencyDays / 3.65));
      const frequencyScore = Math.min(data.count * 10, 100);
      const valueScore = Math.min(data.total / 100, 100);
      const rfvScore = Math.round((recencyScore + frequencyScore + valueScore) / 3);

      // Determine segment
      let segment = 'Ocasional';
      if (data.total > 10000 && data.count > 5) segment = 'VIP';
      else if (data.count > 3) segment = 'Frequente';
      else if (recencyDays < 30) segment = 'Recente';

      // Upsert to rfv_customers
      const { error } = await supabase
        .from('rfv_customers')
        .upsert({
          customer_name: name,
          email: data.email,
          phone: data.phone,
          recency_days: recencyDays,
          frequency: data.count,
          monetary_value: data.total,
          rfv_score: rfvScore,
          segment,
          last_purchase_date: lastDate.toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        }, { onConflict: 'customer_name' });

      if (!error) updated++;
    }

    return { success: true, updated, total: customerMap.size };
  } catch (error: any) {
    console.error('RFV Error:', error);
    return { success: false, error: error.message };
  }
}
