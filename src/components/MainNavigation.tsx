import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingBag, User, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/favicon.png"; // 👈 lägg favicon.png i /src/assets

interface MainNavigationProps {
  showBackButton?: boolean;
  currentPage?: string;
}

const MainNavigation = ({ showBackButton = false }: MainNavigationProps) => {
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Kolla om vi är på en property-sida
  const isPropertyPage =
    location.pathname.includes("/villa-") ||
    location.pathname.includes("/lakehouse-") ||
    location.pathname.includes("/property/");

  useEffect(() => {
    // Hämta användare
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Lyssna på auth-status
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav className="absolute top-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="container mx-auto flex justify-between items-center">
        {showBackButton ? (
          <Link to="/">
            <Button
              variant="outline"
              size="sm"
              className="text-white border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/50 backdrop-blur-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
        ) : (
          <Link to="/" className="flex items-center">
            <img
              src={logo}
              alt="Nordic Getaways logo"
              className="h-8 w-auto filter invert brightness-0"
            />
          </Link>
        )}

        {/* Desktop links */}
        {!isPropertyPage && (
          <div className="hidden md:flex items-center gap-3">
            <Link to="/shop">
              <Button
                variant="outline"
                size="sm"
                className="text-white border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/50 backdrop-blur-sm transition-all"
              >
                <ShoppingBag className="w-4 h-4 mr-1 md:mr-2" />
                <span>Shop</span>
              </Button>
            </Link>
            <Link to="/cart">
              <Button
                variant="outline"
                size="sm"
                className="text-white border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/50 backdrop-blur-sm transition-all"
              >
                Cart
              </Button>
            </Link>
            {user ? (
              <Link to="/profile">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-white border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/50 backdrop-blur-sm transition-all"
                >
                  <User className="w-4 h-4 mr-1 md:mr-2" />
                  Profile
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-white border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/50 backdrop-blur-sm transition-all"
                >
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Mobile menu button */}
        {!isPropertyPage && (
          <div className="md:hidden">
            <button onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? (
                <X className="w-6 h-6 text-white" />
              ) : (
                <Menu className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Mobile dropdown */}
      {menuOpen && !isPropertyPage && (
        <div className="md:hidden bg-black/90 text-white mt-4 rounded-lg mx-4 p-4 space-y-3">
          <Link to="/shop" onClick={() => setMenuOpen(false)}>
            Shop
          </Link>
          <Link to="/cart" onClick={() => setMenuOpen(false)}>
            Cart
          </Link>
          {user ? (
            <Link to="/profile" onClick={() => setMenuOpen(false)}>
              Profile
            </Link>
          ) : (
            <Link to="/auth" onClick={() => setMenuOpen(false)}>
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default MainNavigation;
