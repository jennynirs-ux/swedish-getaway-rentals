import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, MapPin, ArrowRight } from "lucide-react";

const POPULAR_DESTINATIONS = [
  'Stockholm Archipelago',
  'Swedish Lapland',
  'West Coast',
  'Dalarna',
  'Gotland',
];

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.error("404 Error: Route not found:", location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="max-w-lg text-center">
        <h1 className="text-8xl font-bold text-primary/20 mb-2">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-3">Page not found</h2>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
          Let us help you find your perfect Nordic getaway.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          <Link to="/">
            <Button className="gap-2 w-full sm:w-auto">
              <Home className="w-4 h-4" />
              Browse Properties
            </Button>
          </Link>
          <Link to="/destinations">
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <MapPin className="w-4 h-4" />
              Explore Destinations
            </Button>
          </Link>
          <Link to="/contact">
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              Contact Us
            </Button>
          </Link>
        </div>

        <div className="border-t pt-8">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Popular destinations
          </h3>
          <div className="flex flex-wrap gap-2 justify-center">
            {POPULAR_DESTINATIONS.map((dest) => (
              <Link
                key={dest}
                to={`/destinations/${dest.toLowerCase().replace(/\s+/g, '-')}`}
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
};

export default NotFound;
