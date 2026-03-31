import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { bookingId, propertyId, checkInDate, checkOutDate } = await req.json();

    console.log('Generating Yale code for booking:', bookingId);

    // Decrypt credentials helper (matches SmartLockSetup encryption)
    const decryptCredentials = (encrypted: string): string => {
      // WARNING: This matches the placeholder encryption in SmartLockSetup
      // Use proper decryption in production (e.g., AES-256-GCM)
      try {
        return atob(encrypted);
      } catch (e) {
        console.error('Failed to decrypt credentials:', e);
        return '';
      }
    };

    // Get the Yale lock for this property
    const { data: lock, error: lockError } = await supabaseClient
      .from('yale_locks')
      .select('*')
      .eq('property_id', propertyId)
      .eq('is_active', true)
      .single();

    if (lockError || !lock) {
      console.error('No active Yale lock found for property:', propertyId);
      return new Response(
        JSON.stringify({ error: 'No smart lock configured for this property' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Decrypt API credentials for use
    const apiCredentials = lock.api_credentials ? decryptCredentials(lock.api_credentials) : null;

    // Get property check-out time to calculate expiry
    const { data: property } = await supabaseClient
      .from('properties')
      .select('check_out_time')
      .eq('id', propertyId)
      .single();

    // Calculate valid_from and valid_to
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    
    // Add check-out time to the date
    if (property?.check_out_time) {
      const [hours, minutes] = property.check_out_time.split(':');
      checkOut.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }
    
    // Add access duration buffer
    checkOut.setHours(checkOut.getHours() + (lock.access_duration_hours || 1));

    // Generate a random 6-digit access code
    const accessCode = Math.floor(100000 + Math.random() * 900000).toString();

    // In production, you would call the actual Yale API here
    // For now, we'll simulate it
    // const yaleResponse = await fetch('https://api.yalehome.com/v1/access-codes', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${lock.api_credentials}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     lockId: lock.lock_id,
    //     code: accessCode,
    //     validFrom: checkIn.toISOString(),
    //     validTo: checkOut.toISOString(),
    //   }),
    // });

    // Log the access code in our database
    const { data: logData, error: logError } = await supabaseClient
      .from('lock_access_log')
      .insert({
        booking_id: bookingId,
        yale_lock_id: lock.id,
        access_code: accessCode,
        valid_from: checkIn.toISOString(),
        valid_to: checkOut.toISOString(),
        status: 'active',
      })
      .select()
      .single();

    if (logError) {
      console.error('Error logging access code:', logError);
      throw logError;
    }

    // Update the booking with the access code
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        access_code: accessCode,
        access_code_expires_at: checkOut.toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error updating booking with access code:', updateError);
    }

    // Update lock sync status
    await supabaseClient
      .from('yale_locks')
      .update({
        last_sync: new Date().toISOString(),
        sync_status: 'synced',
      })
      .eq('id', lock.id);

    console.log('Access code generated successfully for booking:', bookingId);

    return new Response(
      JSON.stringify({
        success: true,
        accessCode,
        validFrom: checkIn.toISOString(),
        validTo: checkOut.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error('Error in generate-yale-code:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return safe error message to client
    const isUserError = error instanceof Error && error.message?.includes('No smart lock');
    const clientMessage = isUserError 
      ? error.message 
      : 'Unable to generate access code. Please contact support.';
    
    return new Response(
      JSON.stringify({ error: clientMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
