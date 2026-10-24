import { useLocation } from "react-router-dom";
import { Link } from "@/i18n/router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { type Copy, useCopy } from "@/i18n";

const en = {
  title: "Page not found | Nordic Getaways",
  notFound: "Oops! Page not found",
  home: "Return to Home",
};
const COPY: Copy<typeof en> = {
  en,
  sv: { title: "Sidan hittades inte | Nordic Getaways", notFound: "Hoppsan! Sidan finns inte", home: "Till startsidan" },
  de: { title: "Seite nicht gefunden | Nordic Getaways", notFound: "Hoppla! Diese Seite gibt es nicht", home: "Zur Startseite" },
};

const NotFound = () => {
  const t = useCopy(COPY);
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
    document.title = t.title;
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    return () => {
      document.title = previousTitle;
      robots.remove();
    };
  }, [t.title]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-6">{t.notFound}</p>
        <Link to="/">
          <Button className="gap-2">
            <Home className="w-4 h-4" />
            {t.home}
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
