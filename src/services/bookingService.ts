import { supabase } from '@/integrations/supabase/client';

export interface CreateBookingData {
  property_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  check_in_date: string;
  check_out_date: string;
  number_of_guests: number;
  special_requests?: string;
  total_amount: number;
  currency?: string;
  coupon_id?: string;
  property_title?: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface BookingRecord {
  id: string;
  property_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  check_in_date: string;
  check_out_date: string;
  number_of_guests: number;
  special_requests?: string;
  total_amount: number;
  currency: string;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export interface AccessCodeResponse {
  code?: string;
  expires_at?: string;
  [key: string]: unknown;
}

export interface BookingMessage {
  id: string;
  booking_id: string;
  message: string;
  sender_type: string;
  sender_id?: string;
  message_type: string;
  created_at: string;
  [key: string]: unknown;
}

/**
 * Check if booking dates conflict with existing bookings
 * Uses the check_booking_conflict RPC function
 * @param propertyId - Property ID
 * @param checkIn - Check-in date (YYYY-MM-DD format)
 * @param checkOut - Check-out date (YYYY-MM-DD format)
 * @returns Promise containing boolean - true if dates are available, false if conflict
 * @throws Error if RPC call fails
 */
export async function checkBookingAvailability(
  propertyId: string,
  checkIn: string,
  checkOut: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_booking_conflict', {
      property_id_param: propertyId,
      check_in_param: checkIn,
      check_out_param: checkOut
    });

    if (error) throw error;

    // Validate response type
    if (typeof data !== 'boolean') {
      throw new Error(`Invalid RPC response type: expected boolean, got ${typeof data}`);
    }

    return !data; // Returns true if no conflict (available)
  } catch (error) {
    throw new Error(
      `Failed to check availability: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Create a new booking via the Stripe payment function
 * This invokes a server function that handles payment processing and booking creation
 * @param bookingData - Booking information
 * @returns Promise containing booking URL or booking ID
 * @throws Error if booking creation fails
 */
export async function createBooking(bookingData: CreateBookingData): Promise<{ url?: string; bookingId?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('create-booking-payment-connect', {
      body: {
        propertyId: bookingData.property_id,
        checkInDate: bookingData.check_in_date,
        checkOutDate: bookingData.check_out_date,
        numberOfGuests: bookingData.number_of_guests,
        guestName: bookingData.guest_name,
        guestEmail: bookingData.guest_email,
        guestPhone: bookingData.guest_phone,
        specialRequests: bookingData.special_requests,
        totalAmount: bookingData.total_amount,
        currency: bookingData.currency || 'USD',
        couponId: bookingData.coupon_id
      }
    });

    if (error) throw error;
    return data || {};
  } catch (error) {
    throw new Error(
      `Failed to create booking: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate Yale smart lock access code for a booking
 * @param bookingId - Booking ID
 * @param propertyId - Property ID
 * @param checkInDate - Check-in date (YYYY-MM-DD format)
 * @param checkOutDate - Check-out date (YYYY-MM-DD format)
 * @returns Promise containing access code details
 * @throws Error if generation fails
 */
export async function generateAccessCode(
  bookingId: string,
  propertyId: string,
  checkInDate: string,
  checkOutDate: string
): Promise<AccessCodeResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-yale-code', {
      body: {
        bookingId,
        propertyId,
        checkInDate,
        checkOutDate
      }
    });

    if (error) throw error;
    return data || {};
  } catch (error) {
    throw new Error(
      `Failed to generate access code: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Fetch a single booking by ID
 * @param id - Booking ID
 * @returns Promise containing booking data
 * @throws Error if booking not found or query fails
 */
export async function getBookingById(id: string): Promise<BookingRecord> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Booking not found');

    return data;
  } catch (error) {
    throw new Error(
      `Failed to fetch booking: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Fetch all bookings for a specific property
 * @param propertyId - Property ID
 * @returns Promise containing array of bookings
 * @throws Error if query fails
 */
export async function getBookingsByProperty(propertyId: string): Promise<BookingRecord[]> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('property_id', propertyId)
      .order('check_in_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw new Error(
      `Failed to fetch property bookings: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Fetch all bookings for a specific user
 * @param userId - User ID
 * @returns Promise containing array of bookings
 * @throws Error if query fails
 */
export async function getBookingsByUser(userId: string): Promise<BookingRecord[]> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('check_in_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw new Error(
      `Failed to fetch user bookings: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Update booking status
 * @param id - Booking ID
 * @param status - New booking status
 * @returns Promise containing updated booking data
 * @throws Error if update fails
 */
export async function updateBookingStatus(id: string, status: BookingStatus): Promise<BookingRecord> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update booking');

    return data;
  } catch (error) {
    throw new Error(
      `Failed to update booking status: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Fetch booking messages for a specific booking
 * @param bookingId - Booking ID
 * @returns Promise containing array of messages
 * @throws Error if query fails
 */
export async function getBookingMessages(bookingId: string): Promise<BookingMessage[]> {
  try {
    const { data, error } = await supabase
      .from('booking_messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw new Error(
      `Failed to fetch booking messages: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Send a message for a booking
 * @param bookingId - Booking ID
 * @param message - Message text
 * @param senderType - Type of sender ('guest' or 'host')
 * @param senderId - ID of the sender (user ID)
 * @param messageType - Type of message (optional)
 * @returns Promise containing created message data
 * @throws Error if message creation fails
 */
export async function sendBookingMessage(
  bookingId: string,
  message: string,
  senderType: string,
  senderId?: string,
  messageType?: string
): Promise<BookingMessage> {
  try {
    const { data, error } = await supabase
      .from('booking_messages')
      .insert({
        booking_id: bookingId,
        message,
        sender_type: senderType,
        sender_id: senderId,
        message_type: messageType || 'text'
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to send message');

    return data;
  } catch (error) {
    throw new Error(
      `Failed to send booking message: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
