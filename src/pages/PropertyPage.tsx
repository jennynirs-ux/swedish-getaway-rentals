import { useParams } from "react-router-dom";
import { useProperties } from "@/hooks/useProperties";
import PropertyHero from "@/components/PropertyHero";
import PropertyGallery from "@/components/PropertyGallery";
import PropertyAmenities from "@/components/PropertyAmenities";
import PropertyBooking from "@/components/PropertyBooking";
import VillaFooter from "@/components/VillaFooter";
import PropertyNavigation from "@/components/PropertyNavigation";

const PropertyPage = () => {
  const { id } = useParams();
  const { properties, loading } = useProperties();
  
  const property = properties.find(p => p.id === id);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!property) {
    return <div className="min-h-screen flex items-center justify-center">Property not found</div>;
  }

  return (
    <div className="min-h-screen">
      <PropertyNavigation />
      <PropertyHero property={property} />
      <PropertyGallery property={property} />
      <PropertyAmenities property={property} />
      <PropertyBooking property={property} />
      <VillaFooter />
    </div>
  );
};

export default PropertyPage;