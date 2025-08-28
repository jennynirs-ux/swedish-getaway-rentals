import LakehouseHero from "@/components/LakehouseHero";
import LakehouseGallery from "@/components/LakehouseGallery";
import LakehouseAmenities from "@/components/LakehouseAmenities";
import LakehouseBooking from "@/components/LakehouseBooking";
import VillaFooter from "@/components/VillaFooter";
import PropertyNavigation from "@/components/PropertyNavigation";

const LakehouseGetaway = () => {
  return (
    <div className="min-h-screen">
      <PropertyNavigation />
      <LakehouseHero />
      <LakehouseGallery />
      <LakehouseAmenities />
      <LakehouseBooking />
      <VillaFooter />
    </div>
  );
};

export default LakehouseGetaway;