import { supabase } from '@/integrations/supabase/client';

export interface DamageClaim {
  id: string;
  booking_id: string;
  property_id: string;
  host_id: string;
  claim_amount: number;
  description: string;
  evidence_urls: string[];
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'disputed';
  resolution_notes?: string;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DepositHold {
  id: string;
  booking_id: string;
  stripe_payment_intent_id?: string;
  amount: number;
  status: 'held' | 'released' | 'captured' | 'failed';
  captured_amount: number;
  released_at?: string;
  captured_at?: string;
  created_at: string;
}

/**
 * Submit a damage claim for a booking
 */
export async function submitDamageClaim(
  bookingId: string,
  propertyId: string,
  hostId: string,
  claimAmount: number,
  description: string,
  evidenceUrls: string[] = []
): Promise<DamageClaim> {
  if (claimAmount <= 0) throw new Error('Claim amount must be positive');
  if (!description.trim()) throw new Error('Description is required');

  const { data, error } = await supabase
    .from('damage_claims')
    .insert({
      booking_id: bookingId,
      property_id: propertyId,
      host_id: hostId,
      claim_amount: claimAmount,
      description: description.trim(),
      evidence_urls: evidenceUrls,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to submit claim: ${error.message}`);
  return data;
}

/**
 * Get all damage claims for a host
 */
export async function getHostDamageClaims(hostId: string): Promise<DamageClaim[]> {
  const { data, error } = await supabase
    .from('damage_claims')
    .select('*')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch claims: ${error.message}`);
  return data || [];
}

/**
 * Get damage claims for a specific booking
 */
export async function getBookingDamageClaims(bookingId: string): Promise<DamageClaim[]> {
  const { data, error } = await supabase
    .from('damage_claims')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch claims: ${error.message}`);
  return data || [];
}

/**
 * Resolve a damage claim (admin only)
 */
export async function resolveDamageClaim(
  claimId: string,
  status: 'approved' | 'rejected',
  resolutionNotes: string,
  resolvedBy: string
): Promise<DamageClaim> {
  const { data, error } = await supabase
    .from('damage_claims')
    .update({
      status,
      resolution_notes: resolutionNotes,
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', claimId)
    .select()
    .single();

  if (error) throw new Error(`Failed to resolve claim: ${error.message}`);
  return data;
}

/**
 * Get deposit hold status for a booking
 */
export async function getDepositHold(bookingId: string): Promise<DepositHold | null> {
  const { data, error } = await supabase
    .from('deposit_holds')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch deposit: ${error.message}`);
  return data;
}

/**
 * Create a deposit hold record (called after Stripe PaymentIntent is created)
 */
export async function createDepositHold(
  bookingId: string,
  amount: number,
  stripePaymentIntentId: string
): Promise<DepositHold> {
  const { data, error } = await supabase
    .from('deposit_holds')
    .insert({
      booking_id: bookingId,
      amount,
      stripe_payment_intent_id: stripePaymentIntentId,
      status: 'held',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create deposit hold: ${error.message}`);
  return data;
}
