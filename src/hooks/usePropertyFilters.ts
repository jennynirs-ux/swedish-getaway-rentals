import { useState, useMemo } from 'react';

interface Property {
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
  active: boolean;
  host_id: string;
  created_at: string;
  review_rating: number | null;
  review_count: number | null;
}

interface SearchFilters {
  location: string;
  checkIn: Date | undefined;
  checkOut: Date | undefined;
  guests: number;
  priceRange: [number, number];
  amenities: string[];
  propertyType: string;
}

type SortOption = 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'recommended';

export const usePropertyFilters = (properties: Property[]) => {
  const [filters, setFilters] = useState<SearchFilters>({
    location: "",
    checkIn: undefined,
    checkOut: undefined,
    guests: 2,
    priceRange: [0, 5000],
    amenities: [],
    propertyType: ""
  });
  
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  
  const handleSortChange = (value: string) => {
    setSortBy(value as SortOption);
  };
  const [favorites, setFavorites] = useState<string[]>([]);

  // Get unique amenities from all properties
  const availableAmenities = useMemo(() => {
    const allAmenities = properties.flatMap(property => property.amenities || []);
    return [...new Set(allAmenities)].sort();
  }, [properties]);

  // Filter properties based on search criteria
  const filteredProperties = useMemo(() => {
    return properties.filter(property => {
      // Location filter
      if (filters.location && !property.location?.toLowerCase().includes(filters.location.toLowerCase()) &&
          !property.title.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }

      // Guest capacity filter
      if (property.max_guests < filters.guests) {
        return false;
      }

      // Price range filter
      if (property.price_per_night < filters.priceRange[0] || 
          property.price_per_night > filters.priceRange[1]) {
        return false;
      }

      // Property type filter
      if (filters.propertyType) {
        const title = property.title.toLowerCase();
        const type = filters.propertyType.toLowerCase();
        
        if (type === 'villa' && !title.includes('villa')) return false;
        if (type === 'lakehouse' && !title.includes('lakehouse') && !title.includes('lake')) return false;
        if (type === 'cabin' && !title.includes('cabin') && !title.includes('stuga')) return false;
        if (type === 'apartment' && !title.includes('apartment') && !title.includes('lägenhet')) return false;
      }

      // Amenities filter
      if (filters.amenities.length > 0) {
        const propertyAmenities = property.amenities?.map(a => a.toLowerCase()) || [];
        const hasAllAmenities = filters.amenities.every(amenity => 
          propertyAmenities.some(propAmenity => 
            propAmenity.includes(amenity.toLowerCase())
          )
        );
        if (!hasAllAmenities) return false;
      }

      // Only show active properties
      return property.active;
    });
  }, [properties, filters]);

  // Sort filtered properties
  const sortedAndFilteredProperties = useMemo(() => {
    const sorted = [...filteredProperties];
    
    switch (sortBy) {
      case 'price_asc':
        return sorted.sort((a, b) => a.price_per_night - b.price_per_night);
      case 'price_desc':
        return sorted.sort((a, b) => b.price_per_night - a.price_per_night);
      case 'rating':
        // Sort by review rating, with fallback to 0 for properties without ratings
        return sorted.sort((a, b) => {
          const ratingA = a.review_rating ?? 0;
          const ratingB = b.review_rating ?? 0;
          // If ratings are equal, use review count as tiebreaker
          if (ratingB === ratingA) {
            return (b.review_count ?? 0) - (a.review_count ?? 0);
          }
          return ratingB - ratingA;
        });
      case 'newest':
        // Sort by created_at in descending order (newest first)
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'recommended':
      default:
        // Prioritize properties with more amenities and higher price (quality indicator)
        return sorted.sort((a, b) => {
          const scoreA = (a.amenities?.length || 0) + (a.price_per_night / 1000);
          const scoreB = (b.amenities?.length || 0) + (b.price_per_night / 1000);
          return scoreB - scoreA;
        });
    }
  }, [filteredProperties, sortBy]);

  const toggleFavorite = (propertyId: string) => {
    setFavorites(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const clearFilters = () => {
    setFilters({
      location: "",
      checkIn: undefined,
      checkOut: undefined,
      guests: 2,
      priceRange: [0, 5000],
      amenities: [],
      propertyType: ""
    });
  };

  return {
    filters,
    setFilters,
    sortBy,
    setSortBy: handleSortChange,
    favorites,
    toggleFavorite,
    availableAmenities,
    filteredProperties: sortedAndFilteredProperties,
    clearFilters,
    totalResults: filteredProperties.length
  };
};