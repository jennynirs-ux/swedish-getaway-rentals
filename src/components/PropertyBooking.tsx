import { Property } from "@/hooks/useProperties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BookingForm from "./BookingForm";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { MessageCircle } from "lucide-react";
import { useState, lazy, Suspense } from "react";
import { type Copy, useCopy } from "@/i18n";

const en = {
  title: "Book Your Stay",
  intro: (property: string) =>
    `Ready to experience the magic of ${property}? Choose your dates and complete your booking below.`,
  /** Times as "15:00"; either may be missing */
  times: (checkIn: string | null, checkOut: string | null) =>
    `${checkIn ? `Check-in from ${checkIn}` : ""}${checkIn && checkOut ? " · " : ""}${checkOut ? `check-out by ${checkOut}` : ""}`,
  getInTouch: "Get In Touch",
  email: "Email:",
  phone: "Phone:",
  fastResponse: "Fast Response:",
  defaultResponseTime: "We typically respond to inquiries within 2 hours.",
  messageHost: "Message Host",
  contactHost: "Contact Host",
  chatAfterBooking: "Chat is available after booking confirmation",
  chatDetails: "You'll receive chat access details in your booking confirmation",
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    title: "Boka din vistelse",
    intro: (property) => `Redo för ${property}? Välj datum och slutför din bokning nedan.`,
    times: (checkIn, checkOut) =>
      `${checkIn ? `Incheckning från ${checkIn}` : ""}${checkIn && checkOut ? " · " : ""}${checkOut ? `${checkIn ? "utcheckning" : "Utcheckning"} senast ${checkOut}` : ""}`,
    getInTouch: "Hör av dig",
    email: "E-post:",
    phone: "Telefon:",
    fastResponse: "Snabbt svar:",
    defaultResponseTime: "Vi svarar oftast inom 2 timmar.",
    messageHost: "Skriv till värden",
    contactHost: "Kontakta värden",
    chatAfterBooking: "Chatten öppnas när bokningen är bekräftad",
    chatDetails: "Du får uppgifterna till chatten i din bokningsbekräftelse",
  },
  de: {
    title: "Buche deinen Aufenthalt",
    intro: (property) => `Lust auf ${property}? Wähle deine Reisedaten und schließ unten deine Buchung ab.`,
    times: (checkIn, checkOut) =>
      `${checkIn ? `Check-in ab ${checkIn}` : ""}${checkIn && checkOut ? " · " : ""}${checkOut ? `Check-out bis ${checkOut}` : ""}`,
    getInTouch: "Kontakt",
    email: "E-Mail:",
    phone: "Telefon:",
    fastResponse: "Schnelle Antwort:",
    defaultResponseTime: "Wir antworten in der Regel innerhalb von 2 Stunden.",
    messageHost: "Nachricht an den Gastgeber",
    contactHost: "Gastgeber kontaktieren",
    chatAfterBooking: "Der Chat ist nach der Buchungsbestätigung verfügbar",
    chatDetails: "Die Zugangsdaten zum Chat bekommst du mit deiner Buchungsbestätigung",
  },
};

// Lazy load chat component to improve initial page load
const BookingChat = lazy(() => import("./BookingChat").then(module => ({ default: module.BookingChat })));

interface PropertyBookingProps {
  property: Property;
  onOpenGuidebook?: (sectionId?: string) => void;
}

const PropertyBooking = ({ property, onOpenGuidebook }: PropertyBookingProps) => {
  const t = useCopy(COPY);
  const [showChat, setShowChat] = useState(false);
  
  return (
    <section id="booking-section" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t.title}</h2>
            <p className="text-xl text-muted-foreground">
              {t.intro(property.title)}
            </p>
            {/* The terms point guests here for the times */}
            {(property.check_in_time || property.check_out_time) && (
              <p className="text-sm text-muted-foreground mt-3">
                {t.times(property.check_in_time?.slice(0, 5) || null, property.check_out_time?.slice(0, 5) || null)}
              </p>
            )}
          </div>

          {/* Booking Form (includes calendar and cancellation policy inside) */}
            <BookingForm
              propertyId={property.id}
              propertyTitle={property.title}
              pricePerNight={property.price_per_night}
              currency={property.currency}
              maxGuests={property.max_guests}
              onOpenGuidebook={onOpenGuidebook ? () => onOpenGuidebook("rules") : undefined}
            />

          {/* Contact Information */}
          {property.get_in_touch_info && (
            <div className="mt-8 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t.getInTouch}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {property.get_in_touch_info.contact_email && (
                    <div>
                      <span className="font-medium">{t.email}</span>
                      <p className="text-muted-foreground">
                        {property.get_in_touch_info.contact_email}
                      </p>
                    </div>
                  )}
                  {property.get_in_touch_info.contact_phone && (
                    <div>
                      <span className="font-medium">{t.phone}</span>
                      <p className="text-muted-foreground">
                        {property.get_in_touch_info.contact_phone}
                      </p>
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <p className="text-sm text-brown-600 font-medium">
                      {t.fastResponse}{" "}
                      {property.contact_response_time ||
                        t.defaultResponseTime}
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <Dialog open={showChat} onOpenChange={setShowChat}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          {t.messageHost}
                        </Button>
                      </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh]">
                        <DialogHeader>
                          <DialogTitle>{t.contactHost}</DialogTitle>
                        </DialogHeader>
                        <Suspense fallback={
                          <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          </div>
                        }>
                          <div className="text-center py-8 text-muted-foreground">
                            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>{t.chatAfterBooking}</p>
                            <p className="text-sm">{t.chatDetails}</p>
                          </div>
                        </Suspense>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PropertyBooking;
