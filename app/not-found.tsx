import Link from 'next/link';
import { MapPin, Home, ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-lg text-center">
        <h1 className="text-8xl font-bold text-primary/20 mb-2">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-3">Page not found</h2>
        <p className="text-muted-foreground mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let us help you find your perfect Nordic getaway.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Home className="w-4 h-4" />
            Browse Properties
          </Link>
          <Link
            href="/destinations"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors font-medium"
          >
            <MapPin className="w-4 h-4" />
            Explore Destinations
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors font-medium"
          >
            Contact Us
          </Link>
        </div>

        <div className="border-t pt-8">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Popular destinations</h3>
          <div className="flex flex-wrap gap-2 justify-center">
            {['Stockholm Archipelago', 'Swedish Lapland', 'West Coast', 'Dalarna', 'Gotland'].map((dest) => (
              <Link
                key={dest}
                href={`/destinations/${dest.toLowerCase().replace(/\s+/g, '-')}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-muted rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              >
                {dest}
                <ArrowRight className="w-3 h-3" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
