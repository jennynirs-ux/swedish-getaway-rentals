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
              variant="outline" 
              size="sm" 
              className="text-white border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/50 backdrop-blur-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        ) : (
          <Link to="/" className="text-white font-semibold text-xl hover:text-white/90 transition-colors">
            Nordic Getaways
          </Link>
        )}
        
        <div className="flex items-center gap-3">
          <Link to="/shop">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-white border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/50 backdrop-blur-sm"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Nordic Shop
            </Button>
          </Link>
          <Link to="/cart">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-white border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/50 backdrop-blur-sm"
            >
              Cart
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default MainNavigation;