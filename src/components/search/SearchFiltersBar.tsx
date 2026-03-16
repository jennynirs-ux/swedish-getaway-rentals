'use client';

import React, { useState, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { SearchIcon, CalendarIcon, Users, SlidersHorizontal, X } from 'lucide-react';
import { format } from 'date-fns';
import type { SearchFilters } from './MapSearchView';

interface SearchFiltersBarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  resultCount: number;
}

/**
 * OPTIMIZED: Memoized component to prevent unnecessary re-renders
 * Used in search and filter heavy views
 */
export const SearchFiltersBar = memo(function SearchFiltersBar({ filters, onFiltersChange, resultCount }: SearchFiltersBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeFilterCount = [
    filters.location,
    filters.checkIn,
    filters.guests && filters.guests > 1,
    filters.priceMin || filters.priceMax,
    filters.amenities?.length,
    filters.propertyType,
  ].filter(Boolean).length;

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
      <div className="flex items-center gap-2 p-3 overflow-x-auto">
        {/* Location */}
        <div className="relative min-w-[200px]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Where to?"
            value={filters.location || ''}
            onChange={(e) => updateFilter('location', e.target.value || undefined)}
            className="pl-9 h-10"
          />
        </div>

        {/* Check-in date */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10 min-w-[140px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.checkIn ? format(filters.checkIn, 'MMM d') : 'Check in'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={filters.checkIn} onSelect={(date) => updateFilter('checkIn', date)} initialFocus disabled={(date) => date < new Date()} />
          </PopoverContent>
        </Popover>

        {/* Check-out date */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10 min-w-[140px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.checkOut ? format(filters.checkOut, 'MMM d') : 'Check out'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={filters.checkOut} onSelect={(date) => updateFilter('checkOut', date)} initialFocus disabled={(date) => date < (filters.checkIn || new Date())} />
          </PopoverContent>
        </Popover>

        {/* Guests */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10 min-w-[100px]">
              <Users className="mr-2 h-4 w-4" />
              {filters.guests || 1} {(filters.guests || 1) === 1 ? 'guest' : 'guests'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="start">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Guests</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => updateFilter('guests', Math.max(1, (filters.guests || 1) - 1))}>-</Button>
                <span className="w-6 text-center">{filters.guests || 1}</span>
                <Button variant="outline" size="sm" onClick={() => updateFilter('guests', (filters.guests || 1) + 1)}>+</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Price range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10">
              {filters.priceMin || filters.priceMax
                ? `${filters.priceMin || 0} - ${filters.priceMax || '∞'} kr`
                : 'Price'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Price range (SEK/night)</h4>
              <Slider
                min={0} max={10000} step={100}
                value={[filters.priceMin || 0, filters.priceMax || 10000]}
                onValueChange={([min, max]) => {
                  onFiltersChange({ ...filters, priceMin: min > 0 ? min : undefined, priceMax: max < 10000 ? max : undefined });
                }}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{filters.priceMin || 0} kr</span>
                <span>{filters.priceMax || '10,000+'} kr</span>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* More filters */}
        <Button variant="outline" className="h-10 gap-2" onClick={() => setShowAdvanced(!showAdvanced)}>
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">{activeFilterCount}</Badge>}
        </Button>

        {/* Clear */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10 text-muted-foreground">
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}

        {/* Result count */}
        <span className="text-sm text-muted-foreground ml-auto whitespace-nowrap">{resultCount} properties</span>
      </div>
    </div>
  );
});
