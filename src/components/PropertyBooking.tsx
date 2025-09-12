import BookingForm from "./BookingForm";
import { Property } from "@/hooks/useProperties";

interface PropertyBookingProps {
  property: Property;
}

const PropertyBooking = ({ property }: PropertyBookingProps) => {
  return (
    <div className="w-full">
      <BookingForm 
        propertyId={property.id}
        propertyTitle={property.title}
        pricePerNight={property.price_per_night}
        currency={property.currency}
        maxGuests={property.max_guests}
      />
    </div>
  );
};

export default PropertyBooking;