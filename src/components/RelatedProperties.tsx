import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PropertyCard from './PropertyCard';
import { CACHE_STALE_TIME } from '@/lib/constants';

interface RelatedPropertiesProps {
  currentPropertyId: string;
  location?: string;
  maxGuests?: number;
}

export default function RelatedProperties({ currentPropertyId, location, maxGuests }: RelatedPropertiesProps) {
  const { data: properties = [] } = useQuery({
    queryKey: ['related-properties', currentPropertyId],
    queryFn: async () => {
      let query = supabase
        .from('properties')
        .select('id, title, hero_image_url, location, price_per_night, currency, review_count, max_guests, amenities, bedrooms, bathrooms, featured_amenities, special_amenities, amenities_data, description')
        .eq('active', true)
        .neq('id', currentPropertyId)
        .limit(4);

      // Prefer same location
      if (location) {
        query = query.ilike('location', `%${location.split(',')[0]}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // If we didn't find enough in the same location, fetch more
      if ((data?.length || 0) < 3 && location) {
        const { data: moreData } = await supabase
          .from('properties')
          .select('id, title, hero_image_url, location, price_per_night, currency, review_count, max_guests, amenities, bedrooms, bathrooms, featured_amenities, special_amenities, amenities_data, description')
          .eq('active', true)
          .neq('id', currentPropertyId)
          .limit(4);

        // Merge, deduplicate, and limit to 4
        const combined = [...(data || []), ...(moreData || [])];
        const seen = new Set<string>();
        return combined.filter((p) => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        }).slice(0, 4);
      }

      return data || [];
    },
    staleTime: CACHE_STALE_TIME,
  });

  if (properties.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-16">
      <h2 className="text-2xl font-bold text-foreground mb-8">Similar Properties You Might Like</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {properties.map((p) => (
          <PropertyCard
            key={p.id}
            property={{
              ...p,
              hero_image_url: p.hero_image_url || '/placeholder.jpg',
              description: p.description || '',
              currency: p.currency || 'SEK',
              amenities: Array.isArray(p.amenities) ? p.amenities : [],
              featured_amenities: Array.isArray(p.featured_amenities) ? p.featured_amenities : [],
              special_amenities: Array.isArray(p.special_amenities) ? p.special_amenities : [],
              amenities_data: Array.isArray(p.amenities_data) ? p.amenities_data : [],
            }}
          />
        ))}
      </div>
    </section>
  );
}
