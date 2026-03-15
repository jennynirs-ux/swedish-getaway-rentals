'use client';

import React, { useState, useMemo, useCallback } from 'react';
import PropertyCard from '@/components/PropertyCard';
import { MapSearchPanel } from './MapSearchPanel';
import { SearchFiltersBar } from './SearchFiltersBar';
import { PropertyListSkeleton } from '@/components/skeletons';
import { Map, List } from 'lucide-react';

interface MapSearchViewProps {
  properties: any[];
  isLoading: boolean;
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

export interface SearchFilters {
  location?: string;
  checkIn?: Date;
  checkOut?: Date;
  guests?: number;
  priceMin?: number;
  priceMax?: number;
  amenities?: string[];
  propertyType?: string;
}

export function MapSearchView({ properties, isLoading, filters, onFiltersChange }: MapSearchViewProps) {
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<any>(null);

  // Filter properties visible in current map bounds
  const visibleProperties = useMemo(() => {
    if (!mapBounds) return properties;
    return properties.filter(p => {
      if (!p.latitude || !p.longitude) return true;
      return (
        p.latitude >= mapBounds.south &&
        p.latitude <= mapBounds.north &&
        p.longitude >= mapBounds.west &&
        p.longitude <= mapBounds.east
      );
    });
  }, [properties, mapBounds]);

  const handleMapMove = useCallback((bounds: any) => {
    setMapBounds(bounds);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Search Filters Bar */}
      <SearchFiltersBar filters={filters} onFiltersChange={onFiltersChange} resultCount={visibleProperties.length} />

      {/* Mobile toggle */}
      <div className="md:hidden flex border-b">
        <button onClick={() => setMobileView('list')} className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium ${mobileView === 'list' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
          <List className="h-4 w-4" /> List
        </button>
        <button onClick={() => setMobileView('map')} className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium ${mobileView === 'map' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
          <Map className="h-4 w-4" /> Map
        </button>
      </div>

      {/* Split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Property List */}
        <div className={`w-full md:w-[60%] overflow-y-auto p-4 ${mobileView === 'map' ? 'hidden md:block' : ''}`}>
          {isLoading ? (
            <PropertyListSkeleton />
          ) : visibleProperties.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <p className="text-xl font-semibold mb-2">No properties found</p>
              <p className="text-muted-foreground">Try adjusting your filters or moving the map.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">{visibleProperties.length} properties</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {visibleProperties.map(property => (
                  <div key={property.id} id={`property-${property.id}`} onMouseEnter={() => setHoveredPropertyId(property.id)} onMouseLeave={() => setHoveredPropertyId(null)}>
                    <PropertyCard property={property} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Map Panel */}
        <div className={`w-full md:w-[40%] md:border-l ${mobileView === 'list' ? 'hidden md:block' : ''}`}>
          <MapSearchPanel
            properties={properties}
            hoveredPropertyId={hoveredPropertyId}
            onMapMove={handleMapMove}
            onPropertySelect={(id) => {
              const el = document.getElementById(`property-${id}`);
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </div>
      </div>
    </div>
  );
}
