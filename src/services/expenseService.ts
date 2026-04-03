// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';

export type ExpenseCategory = 'cleaning' | 'maintenance' | 'supplies' | 'utilities' | 'insurance' | 'other';

export interface ExpenseRecord {
  id: string;
  property_id: string;
  category: ExpenseCategory;
  description: string | null;
  amount: number;
  currency: string;
  expense_date: string;
  receipt_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseData {
  property_id: string;
  category: ExpenseCategory;
  description?: string;
  amount: number;
  currency?: string;
  expense_date: string;
  receipt_url?: string;
}

interface ExpenseFilters {
  propertyId?: string;
  category?: ExpenseCategory;
  dateFrom?: string;
  dateTo?: string;
  year?: number;
}

/**
 * Fetch expenses with optional filters
 */
export async function getExpenses(filters?: ExpenseFilters): Promise<ExpenseRecord[]> {
  let query = supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false });

  if (filters?.propertyId) {
    query = query.eq('property_id', filters.propertyId);
  }
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  if (filters?.dateFrom) {
    query = query.gte('expense_date', filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte('expense_date', filters.dateTo);
  }
  if (filters?.year) {
    query = query
      .gte('expense_date', `${filters.year}-01-01`)
      .lte('expense_date', `${filters.year}-12-31`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch expenses: ${error.message}`);
  return data || [];
}

/**
 * Create a new expense
 */
export async function createExpense(expense: CreateExpenseData): Promise<ExpenseRecord> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      ...expense,
      currency: expense.currency || 'SEK',
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create expense: ${error.message}`);
  return data;
}

/**
 * Update an existing expense
 */
export async function updateExpense(
  id: string,
  updates: Partial<CreateExpenseData>
): Promise<ExpenseRecord> {
  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update expense: ${error.message}`);
  return data;
}

/**
 * Delete an expense
 */
export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete expense: ${error.message}`);
}

/**
 * Get expense summary by category for a property
 */
export async function getExpenseSummary(
  propertyId: string,
  year?: number
): Promise<Record<ExpenseCategory, number>> {
  const expenses = await getExpenses({
    propertyId,
    year: year || new Date().getFullYear(),
  });

  const summary: Record<string, number> = {
    cleaning: 0,
    maintenance: 0,
    supplies: 0,
    utilities: 0,
    insurance: 0,
    other: 0,
  };

  for (const expense of expenses) {
    summary[expense.category] = (summary[expense.category] || 0) + expense.amount;
  }

  return summary as Record<ExpenseCategory, number>;
}
