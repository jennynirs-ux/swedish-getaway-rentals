import VillaHero from "@/components/VillaHero";
import VillaGallery from "@/components/VillaGallery";
import VillaAmenities from "@/components/VillaAmenities";
import VillaBooking from "@/components/VillaBooking";
import VillaFooter from "@/components/VillaFooter";

const Index = () => {
  return (
    <div className="min-h-screen">
      <VillaHero />
      <VillaGallery />
      <VillaAmenities />
      <VillaBooking />
      <VillaFooter />
    </div>
  );
};

export default Index;
