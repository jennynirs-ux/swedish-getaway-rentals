import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingBag } from "lucide-react";

interface MainNavigationProps {
  showBackButton?: boolean;
  currentPage?: string;
}

const MainNavigation = ({ showBackButton = false, currentPage }: MainNavigationProps) => {
  return (
    <nav className="absolute top-0 left-0 right-0 z-50 p-6">
      <div className="container mx-auto flex justify-between items-center">
        {showBackButton ? (
          <Link to="/">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-white/20 border border-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        ) : (
          <div></div>
        )}
        
        {currentPage !== 'shop' && (
          <Link to="/shop">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-white/20 border border-white/20"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Nordic Shop
            </Button>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default MainNavigation;