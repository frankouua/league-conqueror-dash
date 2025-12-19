import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-figo-signature',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const figoWebhookSecret = Deno.env.get('FIGO_WEBHOOK_SECRET');

    // Optional: Validate webhook signature if Figo provides one
    const signature = req.headers.get('x-figo-signature');
    if (figoWebhookSecret && signature) {
      // Add signature validation logic here if Figo provides it
      console.log('Webhook signature received:', signature);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('Figo webhook received:', JSON.stringify(payload));

    // Expected payload structure from Figo (adjust based on actual API):
    // {
    //   "event": "sale_created",
    //   "data": {
    //     "id": "figo_sale_id",
    //     "amount": 15000.00,
    //     "date": "2025-01-15",
    //     "department": "Lipo HD",
    //     "seller_name": "Maria Silva",
    //     "notes": "Procedimento agendado"
    //   }
    // }

    const { event, data } = payload;

    if (event !== 'sale_created' && event !== 'sale') {
      console.log('Ignoring event type:', event);
      return new Response(
        JSON.stringify({ success: true, message: 'Event ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      amount,
      date,
      department,
      seller_name,
      notes,
      id: figo_id
    } = data;

    if (!amount || !seller_name) {
      console.error('Missing required fields: amount or seller_name');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount and seller_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the user by full_name in profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, team_id, full_name')
      .ilike('full_name', `%${seller_name.trim()}%`)
      .limit(1)
      .single();

    if (profileError || !profile) {
      console.error('User not found for seller_name:', seller_name, profileError);
      return new Response(
        JSON.stringify({ 
          error: 'User not found', 
          seller_name,
          message: 'No user found with this name. Please ensure the seller is registered in the system.'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found user:', profile.full_name, 'with team_id:', profile.team_id);

    // Check if this sale was already registered (avoid duplicates)
    if (figo_id) {
      const { data: existingRecord } = await supabase
        .from('revenue_records')
        .select('id')
        .eq('notes', `Figo ID: ${figo_id}`)
        .limit(1)
        .single();

      if (existingRecord) {
        console.log('Sale already registered with Figo ID:', figo_id);
        return new Response(
          JSON.stringify({ success: true, message: 'Sale already registered', id: existingRecord.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Map department name from Figo to our system
    const departmentMapping: Record<string, string> = {
      'lipo': 'Lipo HD',
      'lipo hd': 'Lipo HD',
      'lipoaspiração': 'Lipo HD',
      'silicone': 'Silicone',
      'mamoplastia': 'Silicone',
      'prótese': 'Silicone',
      'protese': 'Silicone',
      'face': 'Face',
      'facial': 'Face',
      'rinoplastia': 'Face',
      'abdominoplastia': 'Abdominoplastia',
      'abdômen': 'Abdominoplastia',
      'outros': 'Outros',
      'capilar': 'Capilar',
      'transplante': 'Capilar',
    };

    const normalizedDept = department?.toLowerCase().trim() || '';
    const mappedDepartment = departmentMapping[normalizedDept] || department || 'Outros';

    // Create the revenue record
    const recordNotes = figo_id 
      ? `Figo ID: ${figo_id}${notes ? ` | ${notes}` : ''}`
      : notes || 'Importado do Figo';

    const { data: newRecord, error: insertError } = await supabase
      .from('revenue_records')
      .insert({
        amount: parseFloat(amount),
        date: date || new Date().toISOString().split('T')[0],
        department: mappedDepartment,
        user_id: profile.user_id,
        team_id: profile.team_id,
        attributed_to_user_id: profile.user_id,
        counts_for_individual: true,
        registered_by_admin: false,
        notes: recordNotes
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting revenue record:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create revenue record', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Revenue record created successfully:', newRecord.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Sale registered successfully',
        record_id: newRecord.id,
        seller: profile.full_name,
        amount: newRecord.amount,
        department: newRecord.department
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
