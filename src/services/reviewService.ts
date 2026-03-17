import { supabase } from '@/integrations/supabase/client';

export interface ReviewRecord {
  id: string;
  property_id: string;
  guest_name: string;
  guest_email: string;
  rating: number;
  title: string;
  comment: string;
  status: string;
  created_at: string;
  updated_at: string;
  booking_id?: string;
  host_response?: string | null;
  host_response_at?: string | null;
  host_response_by?: string | null;
}

export interface SubmitReviewData {
  property_id: string;
  guest_name: string;
  guest_email: string;
  rating: number;
  title: string;
  comment: string;
  booking_id?: string;
}

/**
 * Fetch approved reviews for a specific property
 * @param propertyId - Property ID
 * @returns Promise containing array of approved reviews
 * @throws Error if query fails
 */
export async function getPropertyReviews(propertyId: string): Promise<ReviewRecord[]> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('property_id', propertyId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw new Error(
      `Failed to fetch reviews: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get review statistics for a property (count and average rating)
 * @param propertyId - Property ID
 * @returns Promise containing review count and average rating
 * @throws Error if query fails
 */
export async function getReviewStats(propertyId: string): Promise<{ count: number; averageRating: number }> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('property_id', propertyId)
      .eq('status', 'approved');

    if (error) throw error;

    const reviews = data || [];
    if (reviews.length === 0) {
      return { count: 0, averageRating: 0 };
    }

    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    return {
      count: reviews.length,
      averageRating: Math.round(averageRating * 10) / 10
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch review stats: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Submit a new review for a property
 * Reviews are created with 'pending' status and require moderation
 * @param data - Review data
 * @returns Promise containing created review record
 * @throws Error if review submission fails
 */
export async function submitReview(data: SubmitReviewData): Promise<ReviewRecord> {
  try {
    // Validate rating is between 1 and 5
    if (data.rating < 1 || data.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Validate required fields
    if (!data.property_id || !data.guest_name || !data.guest_email || !data.title || !data.comment) {
      throw new Error('Missing required review fields');
    }

    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        property_id: data.property_id,
        guest_name: data.guest_name,
        guest_email: data.guest_email,
        rating: data.rating,
        title: data.title,
        comment: data.comment,
        booking_id: data.booking_id,
        status: 'pending' // Reviews require approval
      })
      .select()
      .single();

    if (error) throw error;
    if (!review) throw new Error('Failed to create review');

    return review;
  } catch (error) {
    throw new Error(
      `Failed to submit review: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Moderate a review (admin only)
 * Approves or rejects a pending review
 * @param id - Review ID
 * @param status - 'approved' or 'rejected'
 * @returns Promise containing updated review
 * @throws Error if moderation fails
 */
export async function moderateReview(
  id: string,
  status: 'approved' | 'rejected'
): Promise<ReviewRecord> {
  try {
    if (status !== 'approved' && status !== 'rejected') {
      throw new Error('Status must be either "approved" or "rejected"');
    }

    const { data, error } = await supabase
      .from('reviews')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to moderate review');

    return data;
  } catch (error) {
    throw new Error(
      `Failed to moderate review: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get all pending reviews for moderation
 * @returns Promise containing array of pending reviews
 * @throws Error if query fails
 */
export async function getPendingReviews(): Promise<ReviewRecord[]> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw new Error(
      `Failed to fetch pending reviews: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete a review (admin only)
 * @param id - Review ID
 * @returns Promise that resolves when deletion is complete
 * @throws Error if deletion fails
 */
export async function deleteReview(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    throw new Error(
      `Failed to delete review: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Submit a host response to a review
 * @param reviewId - Review ID
 * @param response - Host response text
 * @param hostId - Host user ID
 * @returns Promise containing updated review
 * @throws Error if response submission fails
 */
export async function submitHostResponse(
  reviewId: string,
  response: string,
  hostId: string
): Promise<ReviewRecord> {
  try {
    if (!response.trim()) {
      throw new Error('Response cannot be empty');
    }

    const { data, error } = await supabase
      .from('reviews')
      .update({
        host_response: response.trim(),
        host_response_at: new Date().toISOString(),
        host_response_by: hostId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to submit host response');

    return data;
  } catch (error) {
    throw new Error(
      `Failed to submit host response: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get reviews by a specific guest
 * @param guestEmail - Guest email address
 * @returns Promise containing array of reviews by guest
 * @throws Error if query fails
 */
export async function getGuestReviews(guestEmail: string): Promise<ReviewRecord[]> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('guest_email', guestEmail)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw new Error(
      `Failed to fetch guest reviews: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
