import VillaHero from "@/components/VillaHero";
import VillaGallery from "@/components/VillaGallery";
import VillaAmenities from "@/components/VillaAmenities";
import VillaBooking from "@/components/VillaBooking";
import VillaFooter from "@/components/VillaFooter";
import PropertyNavigation from "@/components/PropertyNavigation";
import { useProperties } from "@/hooks/useProperties";

const VillaHacken = () => {
  const { properties, loading } = useProperties();
  
  // Find the Villa Häcken property or use the first one
  const villaProperty = properties.find(p => p.title.includes("Villa Häcken")) || properties[0];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen">
      <PropertyNavigation />
      <VillaHero property={villaProperty} />
      <VillaGallery />
      <VillaAmenities />
      <VillaBooking />
      <VillaFooter />
    </div>
  );
};

export default VillaHacken;