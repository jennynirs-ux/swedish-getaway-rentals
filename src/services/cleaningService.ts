// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';

export type CleaningStatus = 'pending' | 'notified' | 'in_progress' | 'completed';

export interface CleaningTask {
  id: string;
  booking_id: string | null;
  property_id: string;
  scheduled_date: string;
  status: CleaningStatus;
  cleaner_name: string | null;
  cleaner_email: string | null;
  completion_token: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CleaningFilters {
  status?: CleaningStatus;
  propertyId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Fetch cleaning tasks with optional filters
 */
export async function getCleaningTasks(filters?: CleaningFilters): Promise<CleaningTask[]> {
  let query = supabase
    .from('cleaning_tasks')
    .select('*')
    .order('scheduled_date', { ascending: true });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.propertyId) {
    query = query.eq('property_id', filters.propertyId);
  }
  if (filters?.dateFrom) {
    query = query.gte('scheduled_date', filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte('scheduled_date', filters.dateTo);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch cleaning tasks: ${error.message}`);
  return data || [];
}

/**
 * Update a cleaning task (status, cleaner info, notes)
 */
export async function updateCleaningTask(
  id: string,
  updates: Partial<Pick<CleaningTask, 'status' | 'cleaner_name' | 'cleaner_email' | 'notes'>>
): Promise<CleaningTask> {
  const updateData: Record<string, unknown> = { ...updates };

  if (updates.status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('cleaning_tasks')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update cleaning task: ${error.message}`);
  return data;
}

/**
 * Notify cleaner via edge function (sends email with completion link)
 */
export async function notifyCleaner(taskId: string): Promise<{ success: boolean }> {
  const { data, error } = await supabase.functions.invoke('notify-cleaner', {
    body: { cleaningTaskId: taskId },
  });

  if (error) throw new Error(`Failed to notify cleaner: ${error.message}`);
  return data;
}

/**
 * Get upcoming cleaning tasks (next 7 days)
 */
export async function getUpcomingCleaningTasks(): Promise<CleaningTask[]> {
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  return getCleaningTasks({
    dateFrom: today,
    dateTo: nextWeek,
  });
}

/**
 * Get today's cleaning tasks
 */
export async function getTodaysCleaningTasks(): Promise<CleaningTask[]> {
  const today = new Date().toISOString().split('T')[0];

  return getCleaningTasks({
    dateFrom: today,
    dateTo: today,
  });
}
