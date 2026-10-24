import { Link, useBasePath, useNavigate } from "@/i18n/router";
import { Button } from "@/components/ui/button";
import { ShoppingBag, User, Menu, X, ShoppingCart, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type Copy, useCopy } from "@/i18n";
import LanguageMenu from "./LanguageMenu";

const en = {
  logoAlt: "Nordic Getaways logo",
  findCabin: "Find a cabin",
  becomeHost: "Become a host",
  shop: "Shop",
  cart: "Cart",
  hostDashboard: "Host Dashboard",
  profile: "Profile",
  signIn: "Sign In",
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    logoAlt: "Nordic Getaways logotyp",
    findCabin: "Hitta en stuga",
    becomeHost: "Bli värd",
    shop: "Butik",
    cart: "Varukorg",
    hostDashboard: "Värdpanelen",
    profile: "Profil",
    signIn: "Logga in",
  },
  de: {
    logoAlt: "Nordic Getaways Logo",
    findCabin: "Ferienhaus finden",
    becomeHost: "Gastgeber werden",
    shop: "Shop",
    cart: "Warenkorb",
    hostDashboard: "Gastgeberbereich",
    profile: "Profil",
    signIn: "Anmelden",
  },
};

interface MainNavigationProps {
  showBackButton?: boolean;
  currentPage?: string;
}

const MainNavigation = ({ showBackButton = false }: MainNavigationProps) => {
  const t = useCopy(COPY);
  const pathname = useBasePath();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const isPropertyPage =
    pathname.includes("/villa-") ||
    pathname.includes("/lakehouse-") ||
    pathname.includes("/property/");

  const isHomePage = pathname === "/";
  const isShopPage = pathname.startsWith("/shop");
  const isCartPage = pathname.startsWith("/cart");
  const isCabinsPage = pathname.startsWith("/cabins");

  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        checkHostStatus(user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkHostStatus(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkHostStatus = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('is_host, host_approved')
      .eq('user_id', userId)
      .single();
    
    setIsHost(data?.is_host && data?.host_approved);
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
    <nav className="absolute top-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo always links to Home */}
        <Link to="/" className="flex items-center">
          <img
            src="/apple-touch-icon.png"
            alt={t.logoAlt}
            className="h-8 w-auto filter invert brightness-0"
          />
        </Link>

        {/* Property pages keep the bar clear: only the language */}
        {isPropertyPage && (
          <LanguageMenu className="flex items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-3 py-2 text-white backdrop-blur-sm transition-all hover:border-white/50 hover:bg-white/20" />
        )}

        {/* Desktop Navigation */}
        {!isPropertyPage && (
          <div className="hidden md:flex items-center gap-3">
            <LanguageMenu className="flex h-10 items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-3 text-white backdrop-blur-sm transition-all hover:border-white/50 hover:bg-white/20" />
            {/* asChild: one link, not a button inside a link */}
            {!isCabinsPage && (
              <Button
                asChild
                variant="outline"
                className="text-white border-white/30 bg-white/10 
                           hover:bg-white/20 hover:border-white/50 
                           backdrop-blur-sm transition-all"
              >
                <Link to="/cabins">{t.findCabin}</Link>
              </Button>
            )}
            {!["/become-host", "/bli-vard"].includes(pathname) && (
              <Button
                asChild
                variant="outline"
                className="text-white border-white/30 bg-white/10 
                           hover:bg-white/20 hover:border-white/50 
                           backdrop-blur-sm transition-all"
              >
                <Link to="/become-host">{t.becomeHost}</Link>
              </Button>
            )}
            {!isShopPage && (
              <Link to="/shop" title={t.shop} aria-label={t.shop}>
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
              <Link to="/cart" title={t.cart} aria-label={t.cart}>
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
            <Button
              variant="outline"
              size="icon"
              title={user ? (isHost ? t.hostDashboard : t.profile) : t.signIn}
              aria-label={user ? (isHost ? t.hostDashboard : t.profile) : t.signIn}
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
          <div className="md:hidden flex items-center gap-3">
            <LanguageMenu className="flex items-center gap-1 text-white" />
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
        <div className="md:hidden bg-black/90 text-white mt-3 rounded-lg mx-4 p-4 space-y-4 flex flex-col">
          {!isCabinsPage && (
            <Link
              to="/cabins"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2"
            >
              <Search className="w-5 h-5" />
              <span>{t.findCabin}</span>
            </Link>
          )}
          {!["/become-host", "/bli-vard"].includes(pathname) && (
            <Link
              to="/become-host"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2"
            >
              <span>{t.becomeHost}</span>
            </Link>
          )}
          {!isShopPage && (
            <Link
              to="/shop"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>{t.shop}</span>
            </Link>
          )}
          {!isHomePage && !isCartPage && (
            <Link
              to="/cart"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>{t.cart}</span>
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
            <span>{user ? (isHost ? t.hostDashboard : t.profile) : t.signIn}</span>
          </button>
        </div>
      )}
    </nav>
  );
};

export default MainNavigation;
