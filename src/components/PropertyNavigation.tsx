import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const PropertyNavigation = () => {
  return (
    <nav className="absolute top-0 left-0 right-0 z-50 p-6">
      <div className="container mx-auto">
        <Link to="/">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-white/20 border border-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Properties
          </Button>
        </Link>
      </div>
    </nav>
  );
};

export default PropertyNavigation;