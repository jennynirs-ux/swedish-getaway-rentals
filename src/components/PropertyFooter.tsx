import { MapPin } from "lucide-react";
import CompanyLine from "@/components/CompanyLine";
import { Property } from "@/hooks/useProperties";
import { type Copy, localizedPath, useCopy, useLang } from "@/i18n";

const en = {
  quickLinks: "Quick Links",
  contact: "Contact",
  email: (address: string) => `Email: ${address}`,
  phone: (number: string) => `Phone: ${number}`,
  // The links' names in footer_quick_links, as guests see them
  links: {} as Record<string, string>,
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    quickLinks: "Snabblänkar",
    contact: "Kontakt",
    email: (address) => `E-post: ${address}`,
    phone: (number) => `Telefon: ${number}`,
    links: {
      "First time in Sweden?": "Första gången i Sverige?",
      "First time in Sweden": "Första gången i Sverige",
      Contact: "Kontakt",
      "Photo Gallery": "Bildgalleri",
      Amenities: "Bekvämligheter",
      "Book Now": "Boka nu",
    },
  },
  de: {
    quickLinks: "Schnellzugriff",
    contact: "Kontakt",
    email: (address) => `E-Mail: ${address}`,
    phone: (number) => `Telefon: ${number}`,
    links: {
      "First time in Sweden?": "Zum ersten Mal in Schweden?",
      "First time in Sweden": "Zum ersten Mal in Schweden",
      Contact: "Kontakt",
      "Photo Gallery": "Fotogalerie",
      Amenities: "Ausstattung",
      "Book Now": "Jetzt buchen",
    },
  },
};

interface PropertyFooterProps {
  property: Property;
}

const PropertyFooter = ({ property }: PropertyFooterProps) => {
  const t = useCopy(COPY);
  const lang = useLang();
  // The host's own tagline only (the column has no default); blank shows nothing
  const tagline = property.tagline_line1?.trim();
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Property Info */}
            <div>
              <h3 className="text-2xl font-bold mb-4">{property.title}</h3>
              {tagline && <p className="text-primary-foreground/80 mb-4">{tagline}</p>}
              <div className="flex items-center gap-2 text-primary-foreground/80">
                <MapPin className="w-4 h-4" />
                <span>{property.location}</span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4">{t.quickLinks}</h4>
              <ul className="space-y-2">
                {/* The names are keys as well as labels: linkMap finds where each goes */}
                {(property.footer_quick_links || ['The Nordic Collection', 'First time in Sweden?', 'Contact']).map((link, index) => {
                  const linkMap: Record<string, string> = {
                    'The Nordic Collection': '/shop',
                    'First time in Sweden?': '/first-time-in-sweden',
                    'Contact': '/contact',
                    // Sections on this page
                    'Photo Gallery': '#gallery-section',
                    'Amenities': '#amenities',
                    'Book Now': '#booking-section',
                  };
                  return (
                    <li key={index}>
                      <a 
                        href={localizedPath(linkMap[link] || '#', lang)} 
                        className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                      >
                        {t.links[link] ?? link}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-lg font-semibold mb-4">{t.contact}</h4>
              <div className="space-y-2 text-primary-foreground/80">
                {property.get_in_touch_info?.contact_email && (
                  <p>{t.email(property.get_in_touch_info.contact_email)}</p>
                )}
                {property.get_in_touch_info?.contact_phone && (
                  <p>{t.phone(property.get_in_touch_info.contact_phone)}</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-primary-foreground/20 mt-12 pt-8 text-center">
            <CompanyLine className="text-primary-foreground/80" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PropertyFooter;
