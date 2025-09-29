import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingBag, User, Menu, X, ShoppingCart } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MainNavigationProps {
  showBackButton?: boolean;
  currentPage?: string;
}

const MainNavigation = ({ showBackButton = false }: MainNavigationProps) => {
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const isPropertyPage =
    location.pathname.includes("/villa-") ||
    location.pathname.includes("/lakehouse-") ||
    location.pathname.includes("/property/");

  const isHomePage = location.pathname === "/";
  const isShopPage = location.pathname.startsWith("/shop");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

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
        {/* Logo always links to Home */}
        <Link to="/" className="flex items-center">
          <img
            src="/favicon.png"
            alt="Nordic Getaways logo"
            className="h-8 w-auto filter invert brightness-0"
          />
        </Link>

        {/* Desktop Navigation */}
        {!isPropertyPage && (
          <div className="hidden md:flex items-center gap-3">
            {!isShopPage && (
              <Link to="/shop" title="Shop">
                <Button
                  variant="outline"
                  size="icon"
                  className="text-white border-white/30 bg-white/10 
                             hover:bg-white/20 hover:border-white/50 
                             backdrop-blur-sm transition-all"
                >
                  <ShoppingBag className="w-5 h-5" />
                </Button>
              </Link>
            )}
            {!isHomePage && (
              <Link to="/cart" title="Cart">
                <Button
                  variant="outline"
                  size="icon"
                  className="text-white border-white/30 bg-white/10 
                             hover:bg-white/20 hover:border-white/50 
                             backdrop-blur-sm transition-all"
                >
                  <ShoppingCart className="w-5 h-5" />
                </Button>
              </Link>
            )}
            {user ? (
              <Link to="/profile" title="Profile">
                <Button
                  variant="outline"
                  size="icon"
                  className="text-white border-white/30 bg-white/10 
                             hover:bg-white/20 hover:border-white/50 
                             backdrop-blur-sm transition-all"
                >
                  <User className="w-5 h-5" />
                </Button>
              </Link>
            ) : (
              <Link to="/auth" title="Sign In">
                <Button
                  variant="outline"
                  size="icon"
                  className="text-white border-white/30 bg-white/10 
                             hover:bg-white/20 hover:border-white/50 
                             backdrop-blur-sm transition-all"
                >
                  <User className="w-5 h-5" />
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Mobile Hamburger */}
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

      {/* Mobile Dropdown */}
      {menuOpen && !isPropertyPage && (
        <div className="md:hidden bg-black/90 text-white mt-3 rounded-lg mx-4 p-4 space-y-3 flex flex-col">
          {!isShopPage && (
            <Link to="/shop" onClick={() => setMenuOpen(false)} className="block">
              Shop
            </Link>
          )}
          {!isHomePage && (
            <Link to="/cart" onClick={() => setMenuOpen(false)} className="block">
              Cart
            </Link>
          )}
          {user ? (
            <Link to="/profile" onClick={() => setMenuOpen(false)} className="block">
              Profile
            </Link>
          ) : (
            <Link to="/auth" onClick={() => setMenuOpen(false)} className="block">
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default MainNavigation;
