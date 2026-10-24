import { useMemo, useRef, useState } from "react";
import { format, isSameMonth, type Locale } from "date-fns";
import { Search } from "lucide-react";
import PropertySearch, { type SearchFilters } from "@/components/PropertySearch";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { type Copy, useCopy, useLang } from "@/i18n";
import { amenityLabel } from "@/content/amenities";
import { useDateFnsLocale } from "@/i18n/dates";
import { type ListingTranslation, translatedName } from "@/i18n/listingTexts";

const en = {
  anyDates: "Any dates",
  /** date-fns patterns: a day alone, and a day with its month */
  day: "d",
  dayMonth: "d MMM",
  guests: (n: number) => `${n} ${n === 1 ? "guest" : "guests"}`,
  where: "Where in Sweden?",
  browse: "Browse the cabins",
  findCabin: "Find a cabin",
  searchBy: "Search by place, dates and guests",
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    anyDates: "När som helst",
    day: "d",
    dayMonth: "d MMM",
    guests: (n) => `${n} ${n === 1 ? "gäst" : "gäster"}`,
    where: "Var i Sverige?",
    browse: "Se stugorna",
    findCabin: "Hitta en stuga",
    searchBy: "Sök på plats, datum och antal gäster",
  },
  de: {
    anyDates: "Jederzeit",
    day: "d.",
    dayMonth: "d. MMM",
    guests: (n) => `${n} ${n === 1 ? "Gast" : "Gäste"}`,
    where: "Wo in Schweden?",
    browse: "Ferienhäuser ansehen",
    findCabin: "Ferienhaus finden",
    searchBy: "Nach Ort, Reisedaten und Gästen suchen",
  },
};

interface SearchableProperty {
  id?: string;
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
  /** The listings' translations (useListingTranslations), for the amenity names */
  translations?: Record<string, ListingTranslation>;
}

const datesLabel = (t: typeof en, locale: Locale, from?: Date, to?: Date) => {
  const f = (date: Date, pattern: string) => format(date, pattern, { locale });
  if (!from) return t.anyDates;
  if (!to) return f(from, t.dayMonth);
  return isSameMonth(from, to)
    ? `${f(from, t.day)}–${f(to, t.dayMonth)}`
    : `${f(from, t.dayMonth)} – ${f(to, t.dayMonth)}`;
};

const scrollToCabins = () => document.getElementById("cabins")?.scrollIntoView({ behavior: "smooth" });
// The results heading in Index.tsx (tabIndex -1), so keyboard and screen-reader users land on the results
const focusCabinsHeading = () => document.getElementById("cabins-heading")?.focus({ preventScroll: true });

/**
 * The search bar on desktop. On phones the full bar filled the whole first
 * screen, so there it is a pill that opens the same search in a drawer.
 */
const HeroSearch = ({ properties, filters, onFiltersChange, resetKey, translations }: HeroSearchProps) => {
  const t = useCopy(COPY);
  const lang = useLang();
  const dateLocale = useDateFnsLocale();
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

  // The filter keeps the hosts' own (lower-case) names; the buttons show them translated
  const amenityLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    if (lang === "en" && !translations) return labels;
    properties.forEach(({ id, amenities }) => {
      if (!id || !Array.isArray(amenities)) return;
      amenities.forEach((a) => {
        if (typeof a !== "string" || !a) return;
        const key = a.toLowerCase();
        const label = amenityLabel(a, lang) ?? translatedName(translations?.[id], `amenity:${a}`, a);
        if (!(key in labels) && label !== a) labels[key] = label;
      });
    });
    return labels;
  }, [properties, translations, lang]);

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
  const summary = `${datesLabel(t, dateLocale, filters?.checkIn, filters?.checkOut)} · ${t.guests(guests)}`;

  const searchProps = { onFiltersChange, availableAmenities, availableTypes, maxGuests, initialFilters: filters, amenityLabels };

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
            <span className="block truncate font-semibold text-foreground">{filters?.location || t.where}</span>
            {/* Keeps the two lines apart in the button's accessible name */}
            <span className="sr-only">, </span>
            <span className="block truncate text-sm text-muted-foreground">{summary}</span>
          </span>
        </button>
        <a href="#cabins" className="mt-4 inline-block text-white/90 underline underline-offset-4">
          {t.browse} <span aria-hidden="true">↓</span>
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
              <DrawerTitle>{t.findCabin}</DrawerTitle>
              <DrawerDescription className="sr-only">{t.searchBy}</DrawerDescription>
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
