import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

export default function SiteFooter() {
  return (
    <footer className="bg-[#1a2e2d] text-white/80">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="text-xl font-bold text-white mb-3 block">
              Nordic Getaways
            </Link>
            <p className="text-sm text-white/60 leading-relaxed">
              Curated vacation rentals across Sweden, Norway, Finland, and Denmark.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">Explore</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/destinations" className="hover:text-white transition-colors">Destinations</Link></li>
              <li><Link to="/shop" className="hover:text-white transition-colors">Shop</Link></li>
              <li><Link to="/gallery" className="hover:text-white transition-colors">Gallery</Link></li>
              <li><Link to="/blog" className="hover:text-white transition-colors">Blog & Guides</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/first-time-in-sweden" className="hover:text-white transition-colors">First Time in Sweden</Link></li>
              <li><Link to="/pricing-guide" className="hover:text-white transition-colors">Pricing Guide</Link></li>
              <li><Link to="/amenities" className="hover:text-white transition-colors">Amenities</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Hosts */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">For Hosts</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/become-host" className="hover:text-white transition-colors">Become a Host</Link></li>
              <li><Link to="/host-application" className="hover:text-white transition-colors">Host Application</Link></li>
            </ul>
            <div className="mt-6">
              <h4 className="font-semibold text-white mb-2 text-sm uppercase tracking-wide">Top Destinations</h4>
              <ul className="space-y-1.5 text-sm">
                <li>
                  <Link to="/destinations/stockholm-archipelago" className="hover:text-white transition-colors flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Stockholm Archipelago
                  </Link>
                </li>
                <li>
                  <Link to="/destinations/lofoten" className="hover:text-white transition-colors flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Lofoten Islands
                  </Link>
                </li>
                <li>
                  <Link to="/destinations/swedish-lapland" className="hover:text-white transition-colors flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Swedish Lapland
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 text-center text-sm text-white/50">
          <p>&copy; {new Date().getFullYear()} Nordic Getaways. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
