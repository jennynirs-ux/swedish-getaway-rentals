import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePropertyFilters } from '../usePropertyFilters';

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

const mockProperties: Property[] = [
  {
    id: '1',
    title: 'Mountain Villa',
    description: 'Beautiful mountain villa',
    location: 'Uppsala',
    price_per_night: 1500,
    currency: 'SEK',
    bedrooms: 4,
    bathrooms: 2,
    max_guests: 8,
    amenities: ['wifi', 'parking', 'fireplace'],
    hero_image_url: 'url1',
    gallery_images: [],
    active: true,
    host_id: 'host1',
    created_at: '2024-01-15T10:00:00Z',
    review_rating: 4.5,
    review_count: 10,
  },
  {
    id: '2',
    title: 'Lake House',
    description: 'Cozy lake house',
    location: 'Stockholm',
    price_per_night: 1200,
    currency: 'SEK',
    bedrooms: 3,
    bathrooms: 2,
    max_guests: 6,
    amenities: ['wifi', 'beach access', 'boat'],
    hero_image_url: 'url2',
    gallery_images: [],
    active: true,
    host_id: 'host2',
    created_at: '2024-02-10T10:00:00Z',
    review_rating: 4.8,
    review_count: 20,
  },
  {
    id: '3',
    title: 'Forest Cabin',
    description: 'Quiet cabin in the woods',
    location: 'Dalarna',
    price_per_night: 800,
    currency: 'SEK',
    bedrooms: 2,
    bathrooms: 1,
    max_guests: 4,
    amenities: ['fireplace', 'sauna'],
    hero_image_url: 'url3',
    gallery_images: [],
    active: true,
    host_id: 'host3',
    created_at: '2024-03-05T10:00:00Z',
    review_rating: 4.3,
    review_count: 8,
  },
  {
    id: '4',
    title: 'Luxury Apartment',
    description: 'Modern luxury apartment',
    location: 'Stockholm',
    price_per_night: 2000,
    currency: 'SEK',
    bedrooms: 2,
    bathrooms: 2,
    max_guests: 4,
    amenities: ['wifi', 'parking', 'gym'],
    hero_image_url: 'url4',
    gallery_images: [],
    active: false,
    host_id: 'host4',
    created_at: '2024-01-20T10:00:00Z',
    review_rating: null,
    review_count: null,
  },
];

describe('usePropertyFilters', () => {
  describe('initialization', () => {
    it('should initialize with all properties filtered', () => {
      const { result } = renderHook(() => usePropertyFilters(mockProperties));
      expect(result.current.filteredProperties.length).toBeGreaterThan(0);
    });

    it('should exclude inactive properties by default', () => {
      const { result } = renderHook(() => usePropertyFilters(mockProperties));
      const allInactive = result.current.filteredProperties.every(p => p.active);
      expect(allInactive).toBe(true);
    });

    it('should have empty favorites initially', () => {
      const { result } = renderHook(() => usePropertyFilters(mockProperties));
      expect(result.current.favorites).toEqual([]);
    });

    it('should initialize with recommended sort', () => {
      const { result } = renderHook(() => usePropertyFilters(mockProperties));
      expect(result.current.sortBy).toBe('recommended');
    });

    it('should collect all available amenities', () => {
      const { result } = renderHook(() => usePropertyFilters(mockProperties));
      expect(result.current.availableAmenities).toContain('wifi');
      expect(result.current.availableAmenities).toContain('parking');
      expect(result.current.availableAmenities).toContain('fireplace');
    });
  });

  describe('sorting', () => {
    describe('price ascending', () => {
      it('should sort properties by price ascending', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setSortBy('price_asc');
        });
        const prices = result.current.filteredProperties.map(p => p.price_per_night);
        for (let i = 0; i < prices.length - 1; i++) {
          expect(prices[i]).toBeLessThanOrEqual(prices[i + 1]);
        }
      });

      it('should have cheapest property first', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setSortBy('price_asc');
        });
        expect(result.current.filteredProperties[0].price_per_night).toBe(800);
      });
    });

    describe('price descending', () => {
      it('should sort properties by price descending', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setSortBy('price_desc');
        });
        const prices = result.current.filteredProperties.map(p => p.price_per_night);
        for (let i = 0; i < prices.length - 1; i++) {
          expect(prices[i]).toBeGreaterThanOrEqual(prices[i + 1]);
        }
      });

      it('should have most expensive property first', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setSortBy('price_desc');
        });
        expect(result.current.filteredProperties[0].price_per_night).toBe(1500);
      });
    });

    describe('rating sort', () => {
      it('should sort by review rating highest first', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setSortBy('rating');
        });
        const ratings = result.current.filteredProperties.map(p => p.review_rating ?? 0);
        for (let i = 0; i < ratings.length - 1; i++) {
          expect(ratings[i]).toBeGreaterThanOrEqual(ratings[i + 1]);
        }
      });

      it('should use review count as tiebreaker for same ratings', () => {
        const properties: Property[] = [
          { ...mockProperties[0], review_rating: 4.5, review_count: 10 },
          { ...mockProperties[1], review_rating: 4.5, review_count: 20 },
        ];
        const { result } = renderHook(() => usePropertyFilters(properties));
        act(() => {
          result.current.setSortBy('rating');
        });
        expect(result.current.filteredProperties[0].id).toBe('2'); // Higher review count
      });

      it('should sort properties with null ratings to the bottom', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setSortBy('rating');
        });
        const lastProperty = result.current.filteredProperties[result.current.filteredProperties.length - 1];
        expect(lastProperty.review_rating ?? 0).toBeLessThanOrEqual(4.3);
      });
    });

    describe('newest sort', () => {
      it('should sort by created_at descending (newest first)', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setSortBy('newest');
        });
        const dates = result.current.filteredProperties.map(p => new Date(p.created_at).getTime());
        for (let i = 0; i < dates.length - 1; i++) {
          expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
        }
      });

      it('should have most recent property first', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setSortBy('newest');
        });
        expect(result.current.filteredProperties[0].created_at).toBe('2024-03-05T10:00:00Z');
      });
    });

    describe('recommended sort', () => {
      it('should sort by recommended (amenities + price)', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setSortBy('recommended');
        });
        expect(result.current.filteredProperties.length).toBeGreaterThan(0);
      });

      it('should prioritize properties with more amenities', () => {
        const properties: Property[] = [
          { ...mockProperties[2], amenities: ['fireplace', 'sauna'] }, // 2 amenities, 800 price
          { ...mockProperties[0], amenities: ['wifi', 'parking', 'fireplace'] }, // 3 amenities, 1500 price
        ];
        const { result } = renderHook(() => usePropertyFilters(properties));
        act(() => {
          result.current.setSortBy('recommended');
        });
        expect(result.current.filteredProperties[0].id).toBe('1'); // More amenities
      });
    });
  });

  describe('filtering', () => {
    describe('location filter', () => {
      it('should filter by location in location field', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setFilters({
            ...result.current.filters,
            location: 'Stockholm',
          });
        });
        const filtered = result.current.filteredProperties;
        expect(filtered.every(p => p.location.toLowerCase().includes('stockholm'))).toBe(true);
      });

      it('should filter by location in title', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setFilters({
            ...result.current.filters,
            location: 'Lake',
          });
        });
        const filtered = result.current.filteredProperties;
        expect(filtered.some(p => p.title.toLowerCase().includes('lake'))).toBe(true);
      });

      it('should be case insensitive', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setFilters({
            ...result.current.filters,
            location: 'STOCKHOLM',
          });
        });
        expect(result.current.filteredProperties.length).toBeGreaterThan(0);
      });
    });

    describe('guest capacity filter', () => {
      it('should filter properties with sufficient capacity', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setFilters({
            ...result.current.filters,
            guests: 6,
          });
        });
        const filtered = result.current.filteredProperties;
        expect(filtered.every(p => p.max_guests >= 6)).toBe(true);
      });

      it('should exclude properties with insufficient capacity', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setFilters({
            ...result.current.filters,
            guests: 5,
          });
        });
        const filtered = result.current.filteredProperties;
        expect(filtered.some(p => p.max_guests < 5)).toBe(false);
      });
    });

    describe('price range filter', () => {
      it('should filter by price range', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setFilters({
            ...result.current.filters,
            priceRange: [1000, 1500],
          });
        });
        const filtered = result.current.filteredProperties;
        expect(filtered.every(p => p.price_per_night >= 1000 && p.price_per_night <= 1500)).toBe(true);
      });

      it('should include min price boundary', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setFilters({
            ...result.current.filters,
            priceRange: [1200, 2000],
          });
        });
        const filtered = result.current.filteredProperties;
        const hasPriceExactly1200 = filtered.some(p => p.price_per_night === 1200);
        expect(hasPriceExactly1200).toBe(true);
      });

      it('should include max price boundary', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setFilters({
            ...result.current.filters,
            priceRange: [800, 1200],
          });
        });
        const filtered = result.current.filteredProperties;
        const hasPriceExactly1200 = filtered.some(p => p.price_per_night === 1200);
        expect(hasPriceExactly1200).toBe(true);
      });
    });

    describe('amenities filter', () => {
      it('should filter by single amenity', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setFilters({
            ...result.current.filters,
            amenities: ['wifi'],
          });
        });
        const filtered = result.current.filteredProperties;
        expect(filtered.every(p =>
          p.amenities.some(a => a.toLowerCase().includes('wifi'))
        )).toBe(true);
      });

      it('should filter by multiple amenities (AND logic)', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setFilters({
            ...result.current.filters,
            amenities: ['wifi', 'parking'],
          });
        });
        const filtered = result.current.filteredProperties;
        expect(filtered.every(p => {
          const amenitiesLower = p.amenities.map(a => a.toLowerCase());
          return amenitiesLower.some(a => a.includes('wifi')) &&
                 amenitiesLower.some(a => a.includes('parking'));
        })).toBe(true);
      });

      it('should be case insensitive', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setFilters({
            ...result.current.filters,
            amenities: ['WIFI'],
          });
        });
        expect(result.current.filteredProperties.length).toBeGreaterThan(0);
      });
    });

    describe('property type filter', () => {
      it('should filter villa by title', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setFilters({
            ...result.current.filters,
            propertyType: 'villa',
          });
        });
        const filtered = result.current.filteredProperties;
        expect(filtered.every(p => p.title.toLowerCase().includes('villa'))).toBe(true);
      });

      it('should filter lakehouse by title', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setFilters({
            ...result.current.filters,
            propertyType: 'lakehouse',
          });
        });
        const filtered = result.current.filteredProperties;
        expect(filtered.every(p =>
          p.title.toLowerCase().includes('lakehouse') || p.title.toLowerCase().includes('lake')
        )).toBe(true);
      });

      it('should filter cabin by title', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setFilters({
            ...result.current.filters,
            propertyType: 'cabin',
          });
        });
        const filtered = result.current.filteredProperties;
        expect(filtered.some(p => p.title.toLowerCase().includes('cabin'))).toBe(true);
      });

      it('should be case insensitive', () => {
        const { result } = renderHook(() => usePropertyFilters(mockProperties));
        act(() => {
          result.current.setFilters({
            ...result.current.filters,
            propertyType: 'VILLA',
          });
        });
        expect(result.current.filteredProperties.length).toBeGreaterThan(0);
      });
    });
  });

  describe('favorites management', () => {
    it('should add property to favorites', () => {
      const { result } = renderHook(() => usePropertyFilters(mockProperties));
      act(() => {
        result.current.toggleFavorite('1');
      });
      expect(result.current.favorites).toContain('1');
    });

    it('should remove property from favorites', () => {
      const { result } = renderHook(() => usePropertyFilters(mockProperties));
      act(() => {
        result.current.toggleFavorite('1');
      });
      expect(result.current.favorites).toContain('1');
      act(() => {
        result.current.toggleFavorite('1');
      });
      expect(result.current.favorites).not.toContain('1');
    });

    it('should manage multiple favorites', () => {
      const { result } = renderHook(() => usePropertyFilters(mockProperties));
      act(() => {
        result.current.toggleFavorite('1');
        result.current.toggleFavorite('2');
        result.current.toggleFavorite('3');
      });
      expect(result.current.favorites).toEqual(['1', '2', '3']);
    });
  });

  describe('clear filters', () => {
    it('should reset all filters to defaults', () => {
      const { result } = renderHook(() => usePropertyFilters(mockProperties));
      act(() => {
        result.current.setFilters({
          location: 'Stockholm',
          checkIn: new Date(),
          checkOut: new Date(),
          guests: 5,
          priceRange: [1000, 1500],
          amenities: ['wifi'],
          propertyType: 'villa',
        });
      });
      act(() => {
        result.current.clearFilters();
      });
      expect(result.current.filters.location).toBe('');
      expect(result.current.filters.checkIn).toBeUndefined();
      expect(result.current.filters.checkOut).toBeUndefined();
      expect(result.current.filters.guests).toBe(2);
      expect(result.current.filters.priceRange).toEqual([0, 5000]);
      expect(result.current.filters.amenities).toEqual([]);
      expect(result.current.filters.propertyType).toBe('');
    });
  });

  describe('total results', () => {
    it('should return total filtered results count', () => {
      const { result } = renderHook(() => usePropertyFilters(mockProperties));
      const activeCount = mockProperties.filter(p => p.active).length;
      expect(result.current.totalResults).toBe(activeCount);
    });

    it('should update total results when filters change', () => {
      const { result } = renderHook(() => usePropertyFilters(mockProperties));
      const initialCount = result.current.totalResults;
      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          location: 'Stockholm',
        });
      });
      expect(result.current.totalResults).toBeLessThan(initialCount);
    });
  });

  describe('combined filtering and sorting', () => {
    it('should sort filtered results', () => {
      const { result } = renderHook(() => usePropertyFilters(mockProperties));
      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          location: 'Stockholm',
        });
        result.current.setSortBy('price_asc');
      });
      const filtered = result.current.filteredProperties;
      expect(filtered.every(p => p.location.toLowerCase().includes('stockholm'))).toBe(true);
      const prices = filtered.map(p => p.price_per_night);
      for (let i = 0; i < prices.length - 1; i++) {
        expect(prices[i]).toBeLessThanOrEqual(prices[i + 1]);
      }
    });
  });
});
