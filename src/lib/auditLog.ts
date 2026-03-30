// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

/**
 * IMP-007: Audit logging for admin actions
 * Logs administrative actions for compliance and debugging
 */

export interface AuditLogEntry {
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, any>;
  userId?: string;
  timestamp?: string;
}

/**
 * Log an admin action to the audit_logs table
 * If the table doesn't exist, logs to console as a fallback
 *
 * @param action - The action performed (e.g., 'approve', 'reject', 'status_change')
 * @param entityType - The type of entity (e.g., 'property', 'booking', 'review')
 * @param entityId - The ID of the entity
 * @param details - Additional details about the action
 */
export async function logAdminAction(
  action: string,
  entityType: string,
  entityId: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    const { data: user } = await supabase.auth.getUser();
    const userId = user?.user?.id;

    const logEntry: AuditLogEntry = {
      action,
      entityType,
      entityId,
      details: details || {},
      userId,
      timestamp: new Date().toISOString()
    };

    // Try to insert into audit_logs table
    const { error } = await supabase
      .from('audit_logs')
      .insert([
        {
          action,
          entity_type: entityType,
          entity_id: entityId,
          details: details || {},
          admin_id: userId,
          created_at: logEntry.timestamp
        }
      ]);

    if (error) {
      // Table might not exist yet - log to console as fallback
      console.log('[AuditLog]', logEntry);
    }
  } catch (error) {
    // Fallback: log to console if something goes wrong
    console.error('[AuditLog Error]', {
      action,
      entityType,
      entityId,
      details,
      error
    });
  }
}

/**
 * Log a property approval/rejection
 */
export async function logPropertyAction(
  propertyId: string,
  action: 'approve' | 'reject',
  reason?: string
): Promise<void> {
  await logAdminAction(action, 'property', propertyId, {
    reason,
    actionType: 'moderation'
  });
}

/**
 * Log a booking status change
 */
export async function logBookingStatusChange(
  bookingId: string,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  await logAdminAction('status_change', 'booking', bookingId, {
    oldStatus,
    newStatus
  });
}

/**
 * Log a review moderation action
 */
export async function logReviewModeration(
  reviewId: string,
  action: 'approve' | 'reject',
  reason?: string
): Promise<void> {
  await logAdminAction(action, 'review', reviewId, {
    reason,
    actionType: 'moderation'
  });
}
