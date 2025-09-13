import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { debounce } from 'lodash';

// Debounced save function to prevent excessive database calls
const debouncedSave = debounce(async (propertyId: string, updates: any) => {
  try {
    const { error } = await supabase
      .from('properties')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', propertyId);

    if (error) throw error;

    // Trigger real-time update
    const channel = supabase.channel('property-editor-updates');
    channel.send({
      type: 'broadcast',
      event: 'property_updated',
      payload: { propertyId, updates }
    });

    toast({
      title: "Success",
      description: "Property updated - changes will appear instantly on property page",
    });
  } catch (error: any) {
    console.error('Error saving property:', error);
    toast({
      title: "Error",
      description: error.message || "Failed to save property changes",
      variant: "destructive",
    });
  }
}, 1000); // 1 second debounce

export const useOptimizedPropertyEditor = (propertyId: string) => {
  // Optimized update function
  const handleUpdate = useCallback((field: string, value: any) => {
    const updates = { [field]: value };
    debouncedSave(propertyId, updates);
  }, [propertyId]);

  // Batch update function for multiple fields
  const handleBatchUpdate = useCallback((updates: Record<string, any>) => {
    debouncedSave(propertyId, updates);
  }, [propertyId]);

  return {
    handleUpdate,
    handleBatchUpdate
  };
};