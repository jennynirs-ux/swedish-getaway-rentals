import { useState } from "react";
import BookingForm from "./BookingForm";
import PropertyCalendarOptimized from "./PropertyCalendarOptimized";
import { Property } from "@/hooks/useProperties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PropertyBookingProps {
  property: Property;
}

const PropertyBooking = ({ property }: PropertyBookingProps) => {
  const [selectedCheckIn, setSelectedCheckIn] = useState<Date | null>(null);
  const [selectedCheckOut, setSelectedCheckOut] = useState<Date | null>(null);

  return (
    <section id="booking-section" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Book Your Stay</h2>
            <p className="text-xl text-muted-foreground">
              Ready to experience the magic of {property.title}? Check availability and pricing below.
            </p>
          </div>

          {/* Booking Content */}
          <div className="grid lg:grid-cols-2 gap-8">
          {/* Booking Form with Calendar */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {(property.price_per_night || 0).toLocaleString()} {property.currency}
                    </span>
                    <span className="text-sm text-muted-foreground">per night</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BookingForm 
                    propertyId={property.id}
                    propertyTitle={property.title}
                    pricePerNight={property.price_per_night}
                    currency={property.currency}
                    maxGuests={property.max_guests}
                    checkIn={selectedCheckIn}
                    checkOut={selectedCheckOut}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Calendar Section */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Availability</CardTitle>
                </CardHeader>
                <CardContent>
                  <PropertyCalendarOptimized
                    propertyId={property.id}
                    basePrice={property.price_per_night || 0}
                    currency={property.currency}
                    mode="guest"
                    onDateSelect={(dates) => {
                      setSelectedCheckIn(dates.checkIn);
                      setSelectedCheckOut(dates.checkOut);
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Pricing Information Below */}
          <div className="mt-8 space-y-6">{property.pricing_table && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {property.pricing_table.off_season && (
                      <div className="flex justify-between">
                        <span>Off Season</span>
                        <span className="font-semibold">
                          {(property.pricing_table.off_season.price).toLocaleString()} {property.pricing_table.off_season.currency}/night
                        </span>
                      </div>
                    )}
                    {property.pricing_table.peak_season && (
                      <div className="flex justify-between">
                        <span>Peak Season</span>
                        <span className="font-semibold">
                          {(property.pricing_table.peak_season.price).toLocaleString()} {property.pricing_table.peak_season.currency}/night
                        </span>
                      </div>
                    )}
                    {property.pricing_table.holiday_periods && (
                      <div className="flex justify-between">
                        <span>Holiday Periods</span>
                        <span className="font-semibold">
                          {(property.pricing_table.holiday_periods.price).toLocaleString()} {property.pricing_table.holiday_periods.currency}/night
                        </span>
                      </div>
                    )}
                    {property.pricing_table.cleaning_fee && (
                      <div className="flex justify-between">
                        <span>Cleaning Fee</span>
                        <span className="font-semibold">
                          {(property.pricing_table.cleaning_fee.price).toLocaleString()} {property.pricing_table.cleaning_fee.currency}
                        </span>
                      </div>
                    )}
                    {property.pricing_table.minimum_stay && (
                      <div className="flex justify-between">
                        <span>Minimum Stay</span>
                        <span className="font-semibold">{property.pricing_table.minimum_stay} nights</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Contact Information */}
              {property.get_in_touch_info && (
                <Card>
                  <CardHeader>
                    <CardTitle>Get In Touch</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {property.get_in_touch_info.contact_email && (
                      <div>
                        <span className="font-medium">Email:</span>
                        <p className="text-muted-foreground">{property.get_in_touch_info.contact_email}</p>
                      </div>
                    )}
                    {property.get_in_touch_info.contact_phone && (
                      <div>
                        <span className="font-medium">Phone:</span>
                        <p className="text-muted-foreground">{property.get_in_touch_info.contact_phone}</p>
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      <p className="text-sm text-brown-600 font-medium">
                        Fast Response: {property.contact_response_time || 'We typically respond to inquiries within 2 hours.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PropertyBooking;
