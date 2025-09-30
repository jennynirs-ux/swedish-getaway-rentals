import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export interface ShopFilters {
  sortBy: "price-low" | "price-high" | "name" | "newest";
  productType?: string;
  color?: string;
  tags?: string[];
}

interface ShopFiltersProps {
  filters: ShopFilters;
  onFiltersChange: (filters: ShopFilters) => void;
  availableProductTypes: string[];
  availableColors: string[];
  availableTags: string[];
}

const ShopFilters = ({
  filters,
  onFiltersChange,
  availableProductTypes,
  availableColors,
  availableTags,
}: ShopFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: keyof ShopFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const addTag = (tag: string) => {
    const currentTags = filters.tags || [];
    if (!currentTags.includes(tag)) {
      updateFilter("tags", [...currentTags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    const currentTags = filters.tags || [];
    updateFilter("tags", currentTags.filter(t => t !== tag));
  };

  const clearFilters = () => {
    onFiltersChange({
      sortBy: "newest",
      productType: undefined,
      color: undefined,
      tags: [],
    });
  };

  const hasActiveFilters = filters.productType || filters.color || (filters.tags && filters.tags.length > 0);

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Sort */}
      <div>
        <label className="text-sm font-medium mb-2 block">Sort by</label>
        <Select value={filters.sortBy} onValueChange={(value: any) => updateFilter("sortBy", value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="name">Name A-Z</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Product Type */}
      {availableProductTypes.length > 0 && (
        <div>
          <label className="text-sm font-medium mb-2 block">Product Type</label>
          <Select value={filters.productType || ""} onValueChange={(value) => updateFilter("productType", value || undefined)}>
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All types</SelectItem>
              {availableProductTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Color */}
      {availableColors.length > 0 && (
        <div>
          <label className="text-sm font-medium mb-2 block">Color</label>
          <Select value={filters.color || ""} onValueChange={(value) => updateFilter("color", value || undefined)}>
            <SelectTrigger>
              <SelectValue placeholder="All colors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All colors</SelectItem>
              {availableColors.map(color => (
                <SelectItem key={color} value={color}>{color}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Tags */}
      {availableTags.length > 0 && (
        <div>
          <label className="text-sm font-medium mb-2 block">Tags</label>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <Button
                  key={tag}
                  variant={filters.tags?.includes(tag) ? "default" : "outline"}
                  size="sm"
                  onClick={() => filters.tags?.includes(tag) ? removeTag(tag) : addTag(tag)}
                  className="text-xs"
                >
                  {tag}
                </Button>
              ))}
            </div>
            {filters.tags && filters.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {filters.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1"
                      onClick={() => removeTag(tag)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="outline" onClick={clearFilters} className="w-full">
          Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Filters */}
      <div className="hidden lg:block">
        <FilterContent />
      </div>

      {/* Mobile Filter Sheet */}
      <div className="lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {(filters.tags?.length || 0) + (filters.productType ? 1 : 0) + (filters.color ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filter Products</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default ShopFilters;