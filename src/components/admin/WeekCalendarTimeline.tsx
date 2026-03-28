import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, addDays, isWithinInterval, startOfDay } from "date-fns";

interface BookingBlock {
  id: string;
  property_id: string;
  guest_name: string;
  check_in_date: string;
  check_out_date: string;
  source: string;
  status: string;
}

interface PropertyRow {
  id: string;
  title: string;
}

interface WeekCalendarTimelineProps {
  properties: PropertyRow[];
  bookings: BookingBlock[];
  startDate?: Date;
}

const sourceColors: Record<string, { bg: string; text: string; border: string }> = {
  airbnb: { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-300" },
  booking_com: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
  direct: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
  blocked: { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-300" },
};

const WeekCalendarTimeline = ({
  properties,
  bookings,
  startDate = new Date(),
}: WeekCalendarTimelineProps) => {
  const days = useMemo(() => {
    const start = startOfDay(startDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [startDate]);

  const getBookingsForPropertyDay = (propertyId: string, day: Date) => {
    return bookings.filter((b) => {
      if (b.property_id !== propertyId) return false;
      if (b.status === "cancelled") return false;
      const checkIn = startOfDay(new Date(b.check_in_date));
      const checkOut = startOfDay(new Date(b.check_out_date));
      return isWithinInterval(startOfDay(day), { start: checkIn, end: addDays(checkOut, -1) });
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">7-Day Occupancy</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header row - days */}
          <div className="grid gap-px" style={{ gridTemplateColumns: `140px repeat(7, 1fr)` }}>
            <div className="p-2 text-xs font-medium text-muted-foreground">Property</div>
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={`p-2 text-center text-xs font-medium ${
                  format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                    ? "bg-primary/10 text-primary rounded"
                    : "text-muted-foreground"
                }`}
              >
                <div>{format(day, "EEE")}</div>
                <div className="font-bold">{format(day, "d")}</div>
              </div>
            ))}
          </div>

          {/* Property rows */}
          {properties.map((property) => (
            <div
              key={property.id}
              className="grid gap-px border-t"
              style={{ gridTemplateColumns: `140px repeat(7, 1fr)` }}
            >
              <div className="p-2 text-xs font-medium truncate">{property.title}</div>
              {days.map((day) => {
                const dayBookings = getBookingsForPropertyDay(property.id, day);
                const booking = dayBookings[0];
                const colors = booking
                  ? sourceColors[booking.source] || sourceColors.direct
                  : null;

                return (
                  <div
                    key={day.toISOString()}
                    className={`p-1 min-h-[36px] ${
                      booking
                        ? `${colors!.bg} ${colors!.border} border ${colors!.text}`
                        : "bg-muted/30"
                    } rounded-sm`}
                  >
                    {booking && (
                      <div className="text-[10px] truncate font-medium">
                        {booking.guest_name || booking.source}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="flex gap-4 mt-3 pt-3 border-t">
            {Object.entries(sourceColors).map(([source, colors]) => (
              <div key={source} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-sm ${colors.bg} ${colors.border} border`} />
                <span className="text-[10px] text-muted-foreground capitalize">
                  {source === "booking_com" ? "Booking.com" : source}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-muted/30" />
              <span className="text-[10px] text-muted-foreground">Available</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeekCalendarTimeline;
