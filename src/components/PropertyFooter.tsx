import { MapPin } from "lucide-react";

interface PropertyFooterProps {
  title: string;
  taglineLine1: string;
  location: string;
  quickLinks: string[];
  contactInfo?: {
    contact_email?: string;
    contact_phone?: string;
  };
}

const PropertyFooter = ({ 
  title, 
  taglineLine1, 
  location, 
  quickLinks, 
  contactInfo 
}: PropertyFooterProps) => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Property Info */}
          <div>
            <h3 className="text-2xl font-bold mb-4">{title}</h3>
            <p className="text-primary-foreground/80 mb-4">{taglineLine1}</p>
            <div className="flex items-center gap-2 text-primary-foreground/80">
              <MapPin className="w-4 h-4" />
              <span>{location}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <div className="space-y-2 text-primary-foreground/80">
              {contactInfo?.contact_email && (
                <p>Email: {contactInfo.contact_email}</p>
              )}
              {contactInfo?.contact_phone && (
                <p>Phone: {contactInfo.contact_phone}</p>
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
    </footer>
  );
};

export default PropertyFooter;