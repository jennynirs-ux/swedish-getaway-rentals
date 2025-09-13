import { MapPin } from "lucide-react";
import { Property } from "@/hooks/useProperties";

interface PropertyFooterProps {
  property: Property;
}

const PropertyFooter = ({ property }: PropertyFooterProps) => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Property Info */}
            <div>
              <h3 className="text-2xl font-bold mb-4">{property.title}</h3>
              <p className="text-primary-foreground/80 mb-4">
                {property.tagline_line1 || 'Experience luxury in the heart of Swedish nature.'}
              </p>
              <div className="flex items-center gap-2 text-primary-foreground/80">
                <MapPin className="w-4 h-4" />
                <span>{property.location}</span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                {(property.footer_quick_links || ['Photo Gallery', 'Amenities', 'Book Now', 'Contact']).map((link, index) => {
                  const linkMap: Record<string, string> = {
                    'Photo Gallery': '/gallery',
                    'Amenities': '/amenities',
                    'Book Now': '/book-now',
                    'Contact': '/contact'
                  };
                  return (
                    <li key={index}>
                      <a 
                        href={linkMap[link] || '#'} 
                        className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                      >
                        {link}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <div className="space-y-2 text-primary-foreground/80">
                {property.get_in_touch_info?.contact_email && (
                  <p>Email: {property.get_in_touch_info.contact_email}</p>
                )}
                {property.get_in_touch_info?.contact_phone && (
                  <p>Phone: {property.get_in_touch_info.contact_phone}</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-primary-foreground/20 mt-12 pt-8 text-center">
            <p className="text-primary-foreground/80">
              © 2025 Nordic Getaways. Created with love for Nordic experiences.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PropertyFooter;