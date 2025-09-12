import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { useLocation } from "react-router-dom";

interface MainNavigationProps {
  showBackButton?: boolean;
  currentPage?: string;
}

const MainNavigation = ({ showBackButton = false, currentPage }: MainNavigationProps) => {
  const location = useLocation();
  
  // Hide shop/cart buttons on property pages
  const isPropertyPage = location.pathname.includes('/villa-') || 
                         location.pathname.includes('/lakehouse-') || 
                         location.pathname.includes('/property/');
  
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
          <Link to="/" className="text-white font-semibold text-lg md:text-xl hover:text-white/90 transition-colors">
            Nordic Getaways
          </Link>
        )}
        
        {!isPropertyPage && (
          <div className="flex items-center gap-2 md:gap-3">
            <Link to="/shop">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-white border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/50 backdrop-blur-sm transition-all"
              >
                <ShoppingBag className="w-4 h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Nordic Shop</span>
                <span className="sm:hidden">Shop</span>
              </Button>
            </Link>
            <Link to="/cart">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-white border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/50 backdrop-blur-sm transition-all"
              >
                <span className="hidden sm:inline">Cart</span>
                <span className="sm:hidden">Cart</span>
              </Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default MainNavigation;