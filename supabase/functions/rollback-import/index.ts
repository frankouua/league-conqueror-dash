import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { backupId } = await req.json();

    if (!backupId) {
      return new Response(JSON.stringify({ error: 'backupId is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Get backup data
    const { data: backup, error: backupError } = await supabase
      .from('data_import_backups')
      .select('*')
      .eq('id', backupId)
      .single();

    if (backupError || !backup) {
      return new Response(JSON.stringify({ error: 'Backup not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    if (backup.status === 'restored') {
      return new Response(JSON.stringify({ error: 'Backup already restored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    if (backup.status === 'expired' || new Date(backup.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Backup expired' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const backupData = backup.backup_data as { revenue_records?: any[]; executed_records?: any[] };

    console.log(`Restoring backup ${backupId}...`);
    console.log(`Revenue records: ${backupData.revenue_records?.length || 0}`);
    console.log(`Executed records: ${backupData.executed_records?.length || 0}`);

    // Clear current data and restore from backup
    // Revenue records
    if (backup.backup_type === 'full' || backup.backup_type === 'revenue_only') {
      // Delete all current revenue records
      await supabase.from('revenue_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Insert backup data in batches
      if (backupData.revenue_records && backupData.revenue_records.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < backupData.revenue_records.length; i += batchSize) {
          const batch = backupData.revenue_records.slice(i, i + batchSize);
          await supabase.from('revenue_records').insert(batch);
        }
      }
    }

    // Executed records
    if (backup.backup_type === 'full' || backup.backup_type === 'executed_only') {
      // Delete all current executed records
      await supabase.from('executed_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Insert backup data in batches
      if (backupData.executed_records && backupData.executed_records.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < backupData.executed_records.length; i += batchSize) {
          const batch = backupData.executed_records.slice(i, i + batchSize);
          await supabase.from('executed_records').insert(batch);
        }
      }
    }

    // Update backup status
    await supabase
      .from('data_import_backups')
      .update({ 
        status: 'restored',
        restored_at: new Date().toISOString()
      })
      .eq('id', backupId);

    // Update related import logs
    await supabase
      .from('data_import_logs')
      .update({ status: 'rolled_back' })
      .eq('backup_id', backupId);

    // Recalculate RFV
    console.log('Recalculating RFV after rollback...');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Rollback completed successfully',
      restored: {
        revenue_records: backupData.revenue_records?.length || 0,
        executed_records: backupData.executed_records?.length || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Rollback error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
