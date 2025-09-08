import LakehouseHero from "@/components/LakehouseHero";
import LakehouseGallery from "@/components/LakehouseGallery";
import LakehouseAmenities from "@/components/LakehouseAmenities";
import LakehouseBooking from "@/components/LakehouseBooking";
import VillaFooter from "@/components/VillaFooter";
import PropertyNavigation from "@/components/PropertyNavigation";
import { useProperties } from "@/hooks/useProperties";

const LakehouseGetaway = () => {
  const { properties, loading } = useProperties();
  
  // Find the Lakehouse property or use a suitable property
  const lakehouseProperty = properties.find(p => 
    p.title.toLowerCase().includes("lakehouse") || 
    p.amenities.some(a => a.toLowerCase().includes("lake"))
  ) || properties[1]; // Fallback to second property if no lakehouse found

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen">
      <PropertyNavigation />
      <LakehouseHero property={lakehouseProperty} />
      <LakehouseGallery property={lakehouseProperty} />
      <LakehouseAmenities />
      <LakehouseBooking />
      <VillaFooter />
    </div>
  );
};

export default LakehouseGetaway;