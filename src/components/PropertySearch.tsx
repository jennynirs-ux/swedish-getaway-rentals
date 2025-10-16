import { useState, useCallback } from "react";
import { Search, MapPin, Users, Calendar, SlidersHorizontal, X, Loader2, ChevronDown } from "lucide-react";
import { geocodeAddress } from "@/lib/geocoding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, addDays, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

interface SearchFilters {
  location: string;
  checkIn: Date | undefined;
  checkOut: Date | undefined;
  guests: number;
  priceRange: [number, number];
  amenities: string[];
  propertyType: string;
  dateFlexibility: number;
  destinationCoords?: { latitude: number; longitude: number } | null;
}

interface PropertySearchProps {
  onFiltersChange: (filters: SearchFilters) => void;
  availableAmenities?: string[];
}

const PropertySearch = ({ onFiltersChange, availableAmenities = [] }: PropertySearchProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filters, setFilters] = useState<SearchFilters>({
    location: "",
    checkIn: undefined,
    checkOut: undefined,
    guests: 2,
    priceRange: [0, 10000],
    amenities: [],
    propertyType: "all",
    dateFlexibility: 0,
    destinationCoords: null,
  });

  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const handleSearch = useCallback(async () => {
    setIsGeocodingLocation(true);
    try {
      if (filters.location.trim()) {
        const result = await geocodeAddress(filters.location);
        if (result) {
          updateFilters({
            destinationCoords: {
              latitude: result.latitude,
              longitude: result.longitude
            }
          });
        } else {
          updateFilters({ destinationCoords: null });
        }
      } else {
        updateFilters({ destinationCoords: null });
      }
    } finally {
      setIsGeocodingLocation(false);
    }
  }, [filters.location]);

  const clearFilters = () => {
    const clearedFilters: SearchFilters = {
      location: "",
      checkIn: undefined,
      checkOut: undefined,
      guests: 2,
      priceRange: [0, 10000],
      amenities: [],
      propertyType: "all",
      dateFlexibility: 0,
      destinationCoords: null,
    };
    setFilters(clearedFilters);
    setDateRange(undefined);
    onFiltersChange(clearedFilters);
  };

  const toggleAmenity = (amenity: string) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter((a) => a !== amenity)
      : [...filters.amenities, amenity];
    updateFilters({ amenities: newAmenities });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    updateFilters({
      checkIn: range?.from,
      checkOut: range?.to,
    });
  };

  const activeFiltersCount = [
    filters.propertyType !== "all",
    filters.amenities.length > 0,
    filters.priceRange[0] > 0 || filters.priceRange[1] < 10000,
    filters.dateFlexibility > 0,
  ].filter(Boolean).length;

  return (
    <div className="w-full">
      {/* Compact Search Bar */}
      <Card className="p-3 shadow-md">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Location */}
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="City or destination"
              value={filters.location}
              onChange={(e) => updateFilters({ location: e.target.value })}
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
                numberOfMonths={2}
                className={cn("p-3 pointer-events-auto")}
              />
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
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
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
              className="px-4"
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
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Price Range */}
            <div>
              <label className="text-sm font-semibold mb-3 block">Price per night (SEK)</label>
              <Slider
                value={filters.priceRange}
                onValueChange={(value) => updateFilters({ priceRange: value as [number, number] })}
                max={10000}
                min={0}
                step={250}
                className="mb-3"
              />
              <div className="flex justify-between text-sm font-medium">
                <span className="text-primary">{filters.priceRange[0].toLocaleString()} kr</span>
                <span className="text-primary">{filters.priceRange[1] === 10000 ? '10,000+ kr' : `${filters.priceRange[1].toLocaleString()} kr`}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Property Type */}
              <div>
                <label className="text-sm font-semibold mb-3 block">Property Type</label>
                <Select
                  value={filters.propertyType}
                  onValueChange={(value) => updateFilters({ propertyType: value })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="All Properties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                    <SelectItem value="lakehouse">Lakehouse</SelectItem>
                    <SelectItem value="cabin">Cabin</SelectItem>
                    <SelectItem value="apartment">Apartment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Flexibility */}
              <div>
                <label className="text-sm font-semibold mb-3 block">Date Flexibility</label>
                <Select
                  value={filters.dateFlexibility.toString()}
                  onValueChange={(value) => updateFilters({ dateFlexibility: parseInt(value) })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Exact dates</SelectItem>
                    <SelectItem value="1">± 1 day</SelectItem>
                    <SelectItem value="2">± 2 days</SelectItem>
                    <SelectItem value="3">± 3 days</SelectItem>
                    <SelectItem value="7">± 1 week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

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
