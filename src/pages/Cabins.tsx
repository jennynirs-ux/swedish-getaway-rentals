import { useState, useEffect } from "react";
import { Link } from "@/i18n/router";
import MainNavigation from "@/components/MainNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProperties } from "@/hooks/useProperties";
import PropertyCard from "@/components/PropertyCard";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { type Copy, useCopy, useLang } from "@/i18n";
import { translateListing, useListingTranslations } from "@/i18n/listingTexts";
import { listingTexts } from "../../supabase/functions/_shared/listing-text";

interface CabinsContent {
  title: string;
  description: string;
  cta_text: string;
}

const en = {
  metaTitle: "Find a cabin in Sweden",
  metaDescription:
    "Find a holiday cabin in Sweden and book it directly with the host. Secure card payment, with the full price incl. service fee shown before you pay.",
  // Shown until platform_settings.book_now_content loads (and in the
  // prerendered page); the admin Content editor uses the same defaults
  content: {
    title: "Find a cabin in Sweden",
    description: "Every cabin is listed by its own host. Pick a cabin, check the dates and pay securely by card – the full price, service fee included, is shown before you pay.",
    cta_text: "Select a cabin below to see availability.",
  } as CabinsContent,
  listHeading: "Cabins to rent in Sweden",
  noCabins: "No properties available for booking at the moment.",
  home: "Return to Homepage",
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    metaTitle: "Hitta en stuga i Sverige",
    metaDescription:
      "Hitta en stuga i Sverige och boka den direkt hos värden. Säker kortbetalning, och hela priset inklusive serviceavgift visas innan du betalar.",
    content: {
      title: "Hitta en stuga i Sverige",
      description: "Varje stuga läggs upp av sin egen värd. Välj en stuga, kolla datumen och betala säkert med kort – hela priset, serviceavgiften inräknad, visas innan du betalar.",
      cta_text: "Välj en stuga nedan för att se lediga datum.",
    },
    listHeading: "Stugor att hyra i Sverige",
    noCabins: "Det finns inga stugor att boka just nu.",
    home: "Till startsidan",
  },
  de: {
    metaTitle: "Ferienhaus in Schweden finden",
    metaDescription:
      "Finde ein Ferienhaus in Schweden und buche es direkt beim Gastgeber. Sichere Kartenzahlung, und du siehst den vollen Preis inkl. Servicegebühr, bevor du bezahlst.",
    content: {
      title: "Ferienhaus in Schweden finden",
      description: "Jedes Ferienhaus wird von seinem eigenen Gastgeber inseriert. Such dir ein Ferienhaus aus, prüf die Daten und bezahl sicher per Karte – den vollen Preis inklusive Servicegebühr siehst du, bevor du bezahlst.",
      cta_text: "Wähle unten ein Ferienhaus aus, um die Verfügbarkeit zu sehen.",
    },
    listHeading: "Ferienhäuser in Schweden mieten",
    noCabins: "Im Moment sind keine Ferienhäuser buchbar.",
    home: "Zur Startseite",
  },
};

const Cabins = () => {
  const t = useCopy(COPY);
  const lang = useLang();
  usePageMeta({
    title: t.metaTitle,
    description: t.metaDescription,
    path: "/cabins",
  });

  const { properties, loading } = useProperties();
  // What hosts wrote, in the page's language: one query for the list
  const translations = useListingTranslations(properties.map((p) => p.id));
  // The admin edits this text in English only, so the other languages keep the copy above
  const [savedContent, setSavedContent] = useState<CabinsContent | null>(null);
  const content = lang === "en" && savedContent ? savedContent : t.content;

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'book_now_content')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.setting_value) {
        setSavedContent(data.setting_value as unknown as CabinsContent);
      }
    } catch (error) {
      console.error('Error fetching book now content:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation showBackButton />
      
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">{content.title}</h1>
            <p className="text-lg text-muted-foreground mb-6">{content.description}</p>
            <p className="text-muted-foreground">{content.cta_text}</p>
          </div>

          {/* The cards' titles are H3s; this keeps the heading order H1 → H2 → H3 */}
          <h2 className="sr-only">{t.listHeading}</h2>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <div className="bg-muted h-64 rounded-t-lg"></div>
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      <div className="bg-muted h-6 rounded w-3/4"></div>
                      <div className="bg-muted h-4 rounded w-1/2"></div>
                      <div className="bg-muted h-16 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : properties.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {properties.map(property => (
                <PropertyCard
                  key={property.id}
                  property={translateListing({ ...property }, translations[property.id], listingTexts({ ...property }))}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground mb-4">{t.noCabins}</p>
                <Button asChild>
                  <Link to="/">{t.home}</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cabins;