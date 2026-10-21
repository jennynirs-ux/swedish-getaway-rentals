import { useMemo, useRef, useState } from "react";
import { format, isSameMonth } from "date-fns";
import { Search } from "lucide-react";
import PropertySearch, { type SearchFilters } from "@/components/PropertySearch";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

interface SearchableProperty {
  amenities?: unknown;
  property_type?: string | null;
  max_guests?: number | null;
}

interface HeroSearchProps {
  properties: SearchableProperty[];
  /** The search applied on the page, so the phone pill and drawer show it */
  filters: Partial<SearchFilters> | null;
  onFiltersChange: (filters: SearchFilters) => void;
  /** Bumped by "Clear search" to start the search bar over */
  resetKey: number;
}

const datesLabel = (from?: Date, to?: Date) => {
  if (!from) return "Any dates";
  if (!to) return format(from, "d MMM");
  return isSameMonth(from, to)
    ? `${format(from, "d")}–${format(to, "d MMM")}`
    : `${format(from, "d MMM")} – ${format(to, "d MMM")}`;
};

const scrollToCabins = () => document.getElementById("cabins")?.scrollIntoView({ behavior: "smooth" });
// The results heading in Index.tsx (tabIndex -1), so keyboard and screen-reader users land on the results
const focusCabinsHeading = () => document.getElementById("cabins-heading")?.focus({ preventScroll: true });

/**
 * The search bar on desktop. On phones the full bar filled the whole first
 * screen, so there it is a pill that opens the same search in a drawer.
 */
const HeroSearch = ({ properties, filters, onFiltersChange, resetKey }: HeroSearchProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closingForResults = useRef(false);

  const showResults = () => {
    closingForResults.current = true;
    setDrawerOpen(false);
    // After the drawer's 0.5 s close: on iOS vaul puts the old scroll position back as it closes
    window.setTimeout(scrollToCabins, 500);
  };

  const availableAmenities = useMemo(() => {
    const all = new Set<string>();
    properties.forEach((p) => {
      if (Array.isArray(p.amenities)) {
        p.amenities.forEach((a) => {
          if (a) all.add(String(a).toLowerCase());
        });
      }
    });
    return Array.from(all).sort();
  }, [properties]);

  // Hosts type these, so "cabin" and "Cabin" count as one
  const availableTypes = useMemo(() => {
    const byKey = new Map<string, string>();
    properties.forEach((p) => {
      const type = p.property_type?.trim();
      if (type && !byKey.has(type.toLowerCase())) byKey.set(type.toLowerCase(), type);
    });
    return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b));
  }, [properties]);

  const maxGuests = useMemo(() => Math.max(8, ...properties.map((p) => p.max_guests ?? 0)), [properties]);

  const guests = filters?.guests ?? 2;
  const summary = `${datesLabel(filters?.checkIn, filters?.checkOut)} · ${guests} ${guests === 1 ? "guest" : "guests"}`;

  const searchProps = { onFiltersChange, availableAmenities, availableTypes, maxGuests, initialFilters: filters };

  return (
    <>
      <div className="hidden md:block">
        <PropertySearch key={resetKey} {...searchProps} />
      </div>

      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          className="w-full flex items-center gap-3 rounded-full bg-white px-5 py-3 text-left shadow-lg"
        >
          <Search className="h-5 w-5 shrink-0 text-foreground" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-foreground">{filters?.location || "Where in Sweden?"}</span>
            {/* Keeps the two lines apart in the button's accessible name */}
            <span className="sr-only">, </span>
            <span className="block truncate text-sm text-muted-foreground">{summary}</span>
          </span>
        </button>
        <a href="#cabins" className="mt-4 inline-block text-white/90 underline underline-offset-4">
          Browse the cabins <span aria-hidden="true">↓</span>
        </a>

        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} shouldScaleBackground={false}>
          <DrawerContent
            className="max-h-[90vh]"
            onCloseAutoFocus={(e) => {
              // Focus going back to the pill would scroll the page back up to it; it goes
              // to the results heading instead (preventScroll, so the scroll above still runs)
              if (closingForResults.current) {
                closingForResults.current = false;
                e.preventDefault();
                focusCabinsHeading();
              }
            }}
          >
            <DrawerHeader>
              <DrawerTitle>Find a cabin</DrawerTitle>
              <DrawerDescription className="sr-only">Search by place, dates and guests</DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-6">
              {/* Mounts on each open, so it starts from the search already applied */}
              <PropertySearch
                key={resetKey}
                {...searchProps}
                stacked
                onSearch={showResults}
              />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
};

export default HeroSearch;
