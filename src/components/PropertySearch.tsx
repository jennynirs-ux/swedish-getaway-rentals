import { useRef, useState } from "react";
import { Search, MapPin, Users, Calendar, SlidersHorizontal, X, Loader2 } from "lucide-react";
import { geocodeAddress, isCountryWideQuery, regionCodeFromName } from "@/lib/geocoding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

export interface SearchFilters {
  /** The place last searched for (applied on Search, not while typing) */
  location: string;
  checkIn: Date | undefined;
  checkOut: Date | undefined;
  guests: number;
  priceRange: [number, number];
  amenities: string[];
  propertyType: string;
  dateFlexibility: number;
  destinationCoords?: { latitude: number; longitude: number } | null;
  /** Set when the place searched for is a whole county (län), e.g. "Västra Götaland" */
  destinationCounty?: string | null;
}

/** Top of the price slider; at this value there is no upper limit */
export const PRICE_FILTER_MAX = 10000;

const DEFAULT_FILTERS: SearchFilters = {
  location: "",
  checkIn: undefined,
  checkOut: undefined,
  guests: 2,
  priceRange: [0, PRICE_FILTER_MAX],
  amenities: [],
  propertyType: "all",
  dateFlexibility: 0,
  destinationCoords: null,
  destinationCounty: null,
};

interface PropertySearchProps {
  onFiltersChange: (filters: SearchFilters) => void;
  availableAmenities?: string[];
  /** property_type values of the listed cabins */
  availableTypes?: string[];
  /** Largest party any listed cabin takes */
  maxGuests?: number;
  /** Where to start, e.g. the search already applied when the phone drawer opens again */
  initialFilters?: Partial<SearchFilters> | null;
  /** Called once Search has applied the location */
  onSearch?: () => void;
  /** One control per row, for the phone drawer */
  stacked?: boolean;
}

const PropertySearch = ({
  onFiltersChange,
  availableAmenities = [],
  availableTypes = [],
  maxGuests = 8,
  initialFilters,
  onSearch,
  stacked = false,
}: PropertySearchProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(() => ({
    ...DEFAULT_FILTERS,
    ...Object.fromEntries(Object.entries(initialFilters ?? {}).filter(([, v]) => v !== undefined)),
  }));
  const [locationInput, setLocationInput] = useState(filters.location);
  const dateRange: DateRange | undefined = filters.checkIn ? { from: filters.checkIn, to: filters.checkOut } : undefined;

  // Changes build on the ref, not on the `filters` this render saw: Search
  // emits after the geocoding await, and dates or guests picked meanwhile
  // must not be dropped
  const filtersRef = useRef(filters);

  const updateFilters = (changes: Partial<SearchFilters>) => {
    const updated = { ...filtersRef.current, ...changes };
    filtersRef.current = updated;
    setFilters(updated);
    onFiltersChange(updated);
  };

  const handleSearch = async () => {
    const appliedLocation = locationInput.trim();
    // "Sweden" or "anywhere" means no place filter, so there is nothing to look up
    const lookUp = !!appliedLocation && !isCountryWideQuery(appliedLocation);
    setIsGeocodingLocation(true);
    try {
      const result = lookUp ? await geocodeAddress(appliedLocation) : null;
      // Sweden by another name ("Schweden") is no place filter either
      if (result?.isCountry) {
        updateFilters({ location: "", destinationCoords: null, destinationCounty: null });
        return;
      }
      // A county search ("Västra Götaland") takes every cabin in it; a town search
      // does not take its whole county. If the lookup fails, or finds a historic
      // province rather than the county ("Norrbotten"), the typed name may still be a county
      const county = !lookUp
        ? null
        : result?.isRegion
          ? result.countyCode
          : !result || !result.isSettlement
            ? regionCodeFromName(appliedLocation)
            : null;
      updateFilters({
        location: appliedLocation,
        destinationCoords: result && !county ? { latitude: result.latitude, longitude: result.longitude } : null,
        destinationCounty: county ?? null,
      });
    } finally {
      setIsGeocodingLocation(false);
    }
    onSearch?.();
  };

  const clearFilters = () => {
    setLocationInput("");
    updateFilters(DEFAULT_FILTERS);
  };

  const toggleAmenity = (amenity: string) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter((a) => a !== amenity)
      : [...filters.amenities, amenity];
    updateFilters({ amenities: newAmenities });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    updateFilters({
      checkIn: range?.from,
      checkOut: range?.to,
    });
  };

  const activeFiltersCount = [
    filters.propertyType !== "all",
    filters.amenities.length > 0,
    filters.priceRange[0] > 0 || filters.priceRange[1] < PRICE_FILTER_MAX,
    filters.dateFlexibility > 0,
  ].filter(Boolean).length;

  return (
    <div className="w-full">
      {/* Compact Search Bar */}
      <Card className="p-3 shadow-md">
        <div className={cn("flex flex-col gap-2", !stacked && "sm:flex-row")}>
          {/* Location */}
          <div className="flex-[2] relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Where in Sweden?"
              aria-label="Where in Sweden?"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9 text-sm"
            />
            {isGeocodingLocation && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            )}
          </div>

          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "flex-[2] justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd MMM")} - {format(dateRange.to, "dd MMM")}
                    </>
                  ) : (
                    format(dateRange.from, "dd MMM")
                  )
                ) : (
                  <span>Check-in / Check-out</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={dateRange}
                onSelect={handleDateRangeChange}
                disabled={(date) => date < new Date()}
                numberOfMonths={stacked ? 1 : 2}
                className={cn("p-3 pointer-events-auto")}
              />
              <div className="border-t p-3 space-y-2">
                <div className="text-xs font-medium">Date flexibility</div>
                <div className="flex flex-wrap gap-2">
                  {[0,1,2,3,7].map((d) => (
                    <Button
                      key={d}
                      variant={filters.dateFlexibility === d ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateFilters({ dateFlexibility: d })}
                    >
                      {d === 0 ? 'Exact' : d === 7 ? '± 1w' : `± ${d}d`}
                    </Button>
                  ))}
                </div>
                {filters.dateFlexibility > 0 && (
                  <div className="text-xs text-muted-foreground">
                    We’ll also consider availability within ±{filters.dateFlexibility} days.
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Guests */}
          <Select
            value={filters.guests.toString()}
            onValueChange={(value) => updateFilters({ guests: parseInt(value) })}
          >
            <SelectTrigger className="flex-1">
              <Users className="mr-1 h-4 w-4" />
              <SelectValue placeholder="Guests" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: maxGuests }, (_, i) => i + 1).map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num} {num === 1 ? "guest" : "guests"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search & Filters */}
          <div className="flex gap-1">
            <Button
              size="sm"
              className={cn("px-4", stacked && "flex-1")}
              onClick={handleSearch}
              disabled={isGeocodingLocation}
            >
              {isGeocodingLocation ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-1" />
              )}
              Search
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
              aria-label={activeFiltersCount > 0 ? `More filters (${activeFiltersCount} on)` : "More filters"}
              aria-expanded={showFilters}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 text-[10px]">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Advanced Filters */}
      {showFilters && (
        <Card className="mt-3 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Advanced Filters</h3>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)} aria-label="Close filters">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Price Range */}
            <div>
              <label className="text-sm font-semibold mb-3 block">Price per night incl. service fee (SEK)</label>
              <Slider
                value={filters.priceRange}
                onValueChange={(value) => updateFilters({ priceRange: value as [number, number] })}
                max={PRICE_FILTER_MAX}
                min={0}
                step={250}
                className="mb-3"
              />
              <div className="flex justify-between text-sm font-medium">
                <span className="text-primary">{filters.priceRange[0].toLocaleString()} kr</span>
                <span className="text-primary">{filters.priceRange[1] === PRICE_FILTER_MAX ? `${PRICE_FILTER_MAX.toLocaleString()}+ kr` : `${filters.priceRange[1].toLocaleString()} kr`}</span>
              </div>
            </div>

            {/* Property type: only the types the listed cabins have */}
            {availableTypes.length > 0 && (
              <div className={cn("grid grid-cols-1 gap-6", !stacked && "md:grid-cols-2")}>
                <div>
                  <label className="text-sm font-semibold mb-3 block">Property type</label>
                  <Select
                    value={filters.propertyType}
                    onValueChange={(value) => updateFilters({ propertyType: value })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {availableTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Amenities */}
            {availableAmenities.length > 0 && (
              <div>
                <label className="text-sm font-semibold mb-3 block">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {availableAmenities.slice(0, 12).map((amenity) => (
                    <Button
                      key={amenity}
                      variant={filters.amenities.includes(amenity) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleAmenity(amenity)}
                      className="capitalize"
                    >
                      {amenity}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default PropertySearch;
