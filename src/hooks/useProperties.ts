import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

export interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  price_per_night: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  amenities: string[];
  hero_image_url: string;
  gallery_images: string[];
  gallery_metadata?: { title: string; description: string; alt: string }[];
  video_urls?: string[];
  video_metadata?: { title: string; description: string }[];
  active: boolean;
  host_id: string;
  what_makes_special?: string;
  get_in_touch_info?: any;
  guidebook_sections?: { title: string; content: string; image_url?: string }[];
}

export const useProperties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const mappedData = (data || []).map((item: any) => ({
        ...item,
        gallery_metadata: Array.isArray(item.gallery_metadata) ? item.gallery_metadata : []
      }));
      setProperties(mappedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  return { properties, loading, error, refetch: fetchProperties };
};