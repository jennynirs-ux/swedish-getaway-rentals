import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingBag, User, Menu, X, ShoppingCart, Home } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { getCurrentUser, onAuthStateChange, isApprovedHost } from "@/services/authService";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface MainNavigationProps {
  showBackButton?: boolean;
  currentPage?: string;
}

const MainNavigation = ({ showBackButton = false }: MainNavigationProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const previousUserIdRef = useRef<string | null>(null);

  const isPropertyPage =
    location.pathname.includes("/villa-") ||
    location.pathname.includes("/lakehouse-") ||
    location.pathname.includes("/property/");

  const isHomePage = location.pathname === "/";
  const isShopPage = location.pathname.startsWith("/shop");
  const isCartPage = location.pathname.startsWith("/cart");

  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const initUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser ? { id: currentUser.id, email: currentUser.email } : null);
      // BUG-038: Only check host status if userId actually changed
      if (currentUser && currentUser.id !== previousUserIdRef.current) {
        previousUserIdRef.current = currentUser.id;
        checkHostStatus(currentUser.id);
      }
    };

    initUser();

    const unsubscribe = onAuthStateChange((authUser) => {
      setUser(authUser ? { id: authUser.id, email: authUser.email } : null);
      // BUG-038: Only check host status if userId actually changed
      if (authUser && authUser.id !== previousUserIdRef.current) {
        previousUserIdRef.current = authUser.id;
        checkHostStatus(authUser.id);
      } else if (!authUser) {
        previousUserIdRef.current = null;
      }
    });

    return () => unsubscribe();
  }, []);

  const checkHostStatus = async (userId: string) => {
    try {
      const hostApproved = await isApprovedHost(userId);
      setIsHost(hostApproved);
    } catch (error) {
      console.error('Error checking host status:', error);
      setIsHost(false);
    }
  };

  const handleProfileClick = () => {
    if (!user) {
      navigate('/auth');
    } else if (isHost) {
      navigate('/host-dashboard');
    } else {
      navigate('/profile');
    }
  };

  return (
    <>
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded">
      Skip to main content
    </a>
    <nav className="absolute top-0 left-0 right-0 z-50 p-4 md:p-6" aria-label="Main navigation">
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
            {!user && (
              <Link to="/become-host" title="Become a Host">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-white border-white/30 bg-white/10
                             hover:bg-white/20 hover:border-white/50
                             backdrop-blur-sm transition-all gap-1.5"
                >
                  <Home className="w-4 h-4" />
                  <span className="text-sm">Become a Host</span>
                </Button>
              </Link>
            )}
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
            {!isHomePage && !isCartPage && (
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
            <div className="text-white">
              <LanguageSwitcher />
            </div>
            <Button
              variant="outline"
              size="icon"
              title={user ? (isHost ? "Host Dashboard" : "Profile") : "Sign In"}
              onClick={handleProfileClick}
              className="text-white border-white/30 bg-white/10
                         hover:bg-white/20 hover:border-white/50
                         backdrop-blur-sm transition-all"
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Mobile Hamburger */}
        {!isPropertyPage && (
          <div className="md:hidden">
            <button onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"}>
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
        <div className="md:hidden bg-black/90 text-white mt-3 rounded-lg mx-4 p-4 space-y-4 flex flex-col">
          {!user && (
            <Link
              to="/become-host"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2"
            >
              <Home className="w-5 h-5" />
              <span>Become a Host</span>
            </Link>
          )}
          {!isShopPage && (
            <Link
              to="/shop"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>Shop</span>
            </Link>
          )}
          {!isHomePage && !isCartPage && (
            <Link
              to="/cart"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Cart</span>
            </Link>
          )}
          <button
            onClick={() => {
              setMenuOpen(false);
              handleProfileClick();
            }}
            className="flex items-center gap-2"
          >
            <User className="w-5 h-5" />
            <span>{user ? (isHost ? "Host Dashboard" : "Profile") : "Sign In"}</span>
          </button>
        </div>
      )}
    </nav>
    </>
  );
};

export default MainNavigation;
