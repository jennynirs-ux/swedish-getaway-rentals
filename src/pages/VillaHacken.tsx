import VillaHero from "@/components/VillaHero";
import VillaGallery from "@/components/VillaGallery";
import VillaAmenities from "@/components/VillaAmenities";
import VillaBooking from "@/components/VillaBooking";
import VillaFooter from "@/components/VillaFooter";
import PropertyNavigation from "@/components/PropertyNavigation";

const VillaHacken = () => {
  return (
    <div className="min-h-screen">
      <PropertyNavigation />
      <VillaHero />
      <VillaGallery />
      <VillaAmenities />
      <VillaBooking />
      <VillaFooter />
    </div>
  );
};

export default VillaHacken;