import { MapPin, Mail, Phone } from "lucide-react";
const VillaFooter = () => {
  return <footer className="bg-primary text-primary-foreground py-12">
      <div className="villa-container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-display font-bold mb-4">Villa Häcken</h3>
            <p className="text-primary-foreground/80 mb-4">Your luxury retreat in the heart of Swedish nature. Creating unforgettable memories since 2020.</p>
            <div className="flex items-center gap-2 text-primary-foreground/60">
              <MapPin className="h-4 w-4" />
              <span>Lerum, Sweden</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <div className="space-y-2">
              <a href="#gallery" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                Photo Gallery
              </a>
              <a href="#amenities" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                Amenities
              </a>
              <a href="#booking" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                Book Now
              </a>
              <a href="#contact" className="block text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                Contact
              </a>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="text-primary-foreground/80">villa@hacken.se</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span className="text-primary-foreground/80">+46 70 199 3032</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center">
          <p className="text-primary-foreground/60">
            © 2025 Nordic Getaways. Created with love for Nordic experiences.
          </p>
        </div>
      </div>
    </footer>;
};
export default VillaFooter;