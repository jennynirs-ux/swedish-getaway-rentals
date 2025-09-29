import { useState } from "react";
import { Search, MapPin, Users, Calendar, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

interface SearchFilters {
  location: string;
  checkIn: Date | undefined;
  checkOut: Date | undefined;
  guests: number;
  priceRange: [number, number];
  amenities: string[];
  propertyType: string;
}

interface PropertySearchProps {
  onFiltersChange: (filters: SearchFilters) => void;
  availableAmenities?: string[];
}

const PropertySearch = ({ onFiltersChange, availableAmenities = [] }: PropertySearchProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    location: "",
    checkIn: undefined,
    checkOut: undefined,
    guests: 2,
    priceRange: [0, 5000],
    amenities: [],
    propertyType: "all",
  });

  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const clearFilters = () => {
    const clearedFilters: SearchFilters = {
      location: "",
      checkIn: undefined,
      checkOut: undefined,
      guests: 2,
      priceRange: [0, 5000],
      amenities: [],
      propertyType: "all",
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const toggleAmenity = (amenity: string) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter((a) => a !== amenity)
      : [...filters.amenities, amenity];
    updateFilters({ amenities: newAmenities });
  };

  const activeFiltersCount = [
    filters.propertyType !== "all",
    filters.amenities.length > 0,
    filters.priceRange[0] > 0 || filters.priceRange[1] < 5000,
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
              placeholder="Where?"
              value={filters.location}
              onChange={(e) => updateFilters({ location: e.target.value })}
              className="pl-9 text-sm"
            />
          </div>

          {/* Check-in */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 justify-start text-left">
                <Calendar className="mr-1 h-4 w-4" />
                {filters.checkIn ? format(filters.checkIn, "dd MMM") : "Check-in"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={filters.checkIn}
                onSelect={(date) => updateFilters({ checkIn: date })}
                disabled={(date) => date < new Date()}
              />
            </PopoverContent>
          </Popover>

          {/* Check-out */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 justify-start text-left">
                <Calendar className="mr-1 h-4 w-4" />
                {filters.checkOut ? format(filters.checkOut, "dd MMM") : "Check-out"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={filters.checkOut}
                onSelect={(date) => updateFilters({ checkOut: date })}
                disabled={(date) => date < new Date() || (filters.checkIn && date <= filters.checkIn)}
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
              onClick={() => onFiltersChange(filters)} // 👈 trigger search
            >
              <Search className="h-4 w-4 mr-1" />
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
        <Card className="mt-3 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Filters</h3>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Price Range */}
            <div>
              <label className="text-xs font-medium mb-2 block">Price / night</label>
              <Slider
                value={filters.priceRange}
                onValueChange={(value) => updateFilters({ priceRange: value as [number, number] })}
                max={5000}
                min={0}
                step={100}
                className="mb-1"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{filters.priceRange[0]} kr</span>
                <span>{filters.priceRange[1]} kr</span>
              </div>
            </div>

            {/* Property Type */}
            <div>
              <label className="text-xs font-medium mb-2 block">Type</label>
              <Select
                value={filters.propertyType}
                onValueChange={(value) => updateFilters({ propertyType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="villa">Villa</SelectItem>
                  <SelectItem value="lakehouse">Lakehouse</SelectItem>
                  <SelectItem value="cabin">Cabin</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amenities */}
            <div className="md:col-span-2">
              <label className="text-xs font-medium mb-2 block">Amenities</label>
              <div className="flex flex-wrap gap-2">
                {availableAmenities.map((amenity) => (
                  <Button
                    key={amenity}
                    variant={filters.amenities.includes(amenity) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleAmenity(amenity)}
                  >
                    {amenity}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PropertySearch;
