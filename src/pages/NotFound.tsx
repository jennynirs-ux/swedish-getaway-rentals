import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.error("404 Error: Route not found:", location.pathname);
    }
  }, [location.pathname]);

  // The host serves the app for every path with status 200, so tell search
  // engines this one isn't a real page
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Page not found | Nordic Getaways";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    return () => {
      document.title = previousTitle;
      robots.remove();
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-6">Oops! Page not found</p>
        <Link to="/">
          <Button className="gap-2">
            <Home className="w-4 h-4" />
            Return to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
