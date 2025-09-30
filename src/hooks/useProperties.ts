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
  guidebook_sections?: { title: string; content: string; image_url?: string; icon?: string; id?: string; is_prefilled?: boolean; data?: any }[];
  amenities_descriptions?: Record<string, string>;
  amenities_data?: {
    icon: string;
    title: string;
    tagline: string;
    description: string;
    image_url?: string;
    features?: string[];
  }[];
  review_rating?: number;
  review_count?: number;
  tagline_line1?: string;
  tagline_line2?: string;
  availability_text?: string;
  introduction_text?: string;
  special_highlights?: { title: string; description: string; icon?: string }[];
  featured_amenities?: { icon: string; title: string; tagline: string; description: string; image_url?: string; features?: string[] }[];
  pricing_table?: {
    off_season: { price: number; currency: string };
    peak_season: { price: number; currency: string };
    holiday_periods: { price: number; currency: string };
    cleaning_fee: { price: number; currency: string };
    minimum_stay: number;
    weekly_discount: string;
  };
  contact_response_time?: string;
  footer_quick_links?: string[];
  property_type?: string;
  special_amenities?: string[];
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