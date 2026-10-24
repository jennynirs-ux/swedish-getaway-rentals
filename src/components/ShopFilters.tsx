import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { type Copy, useCopy } from "@/i18n";

// Product types, colours and tags are shown as they are stored (the filter values)
const en = {
  sortBy: "Sort by",
  newest: "Newest",
  nameAZ: "Name A-Z",
  priceLow: "Price: Low to High",
  priceHigh: "Price: High to Low",
  productType: "Product Type",
  allTypes: "All types",
  color: "Color",
  allColors: "All colors",
  tags: "Tags",
  clearAll: "Clear all filters",
  filters: "Filters",
  filterProducts: "Filter Products",
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    sortBy: "Sortera efter",
    newest: "Nyast",
    nameAZ: "Namn A–Ö",
    priceLow: "Pris: lägst först",
    priceHigh: "Pris: högst först",
    productType: "Produkttyp",
    allTypes: "Alla typer",
    color: "Färg",
    allColors: "Alla färger",
    tags: "Taggar",
    clearAll: "Rensa alla filter",
    filters: "Filter",
    filterProducts: "Filtrera produkter",
  },
  de: {
    sortBy: "Sortieren nach",
    newest: "Neueste",
    nameAZ: "Name A–Z",
    priceLow: "Preis: aufsteigend",
    priceHigh: "Preis: absteigend",
    productType: "Produktart",
    allTypes: "Alle Arten",
    color: "Farbe",
    allColors: "Alle Farben",
    tags: "Tags",
    clearAll: "Alle Filter zurücksetzen",
    filters: "Filter",
    filterProducts: "Produkte filtern",
  },
};

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
  const t = useCopy(COPY);
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
        <label className="text-sm font-medium mb-2 block">{t.sortBy}</label>
        <Select value={filters.sortBy} onValueChange={(value: any) => updateFilter("sortBy", value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t.newest}</SelectItem>
            <SelectItem value="name">{t.nameAZ}</SelectItem>
            <SelectItem value="price-low">{t.priceLow}</SelectItem>
            <SelectItem value="price-high">{t.priceHigh}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Product Type */}
      {availableProductTypes.length > 0 && (
        <div>
          <label className="text-sm font-medium mb-2 block">{t.productType}</label>
          <Select value={filters.productType || ""} onValueChange={(value) => updateFilter("productType", value || undefined)}>
            <SelectTrigger>
              <SelectValue placeholder={t.allTypes} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t.allTypes}</SelectItem>
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
          <label className="text-sm font-medium mb-2 block">{t.color}</label>
          <Select value={filters.color || ""} onValueChange={(value) => updateFilter("color", value || undefined)}>
            <SelectTrigger>
              <SelectValue placeholder={t.allColors} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t.allColors}</SelectItem>
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
          <label className="text-sm font-medium mb-2 block">{t.tags}</label>
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
          {t.clearAll}
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
              {t.filters}
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {(filters.tags?.length || 0) + (filters.productType ? 1 : 0) + (filters.color ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>{t.filterProducts}</SheetTitle>
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