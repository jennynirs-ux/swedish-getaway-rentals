import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Settings, DollarSign, Ban } from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { sv } from 'date-fns/locale';

interface Property {
  id: string;
  title: string;
  price_per_night: number;
}

// Dates held by a booking or synced from another channel ("Blocked by Airbnb")
const isLockedReason = (reason: string | null | undefined) =>
  reason === 'booked' || reason === 'ical_sync' || !!reason?.startsWith('Blocked by ');

interface AvailabilityDate {
  date: string;
  available: boolean;
  reason: string;
  seasonal_price: number | null;
  minimum_nights: number;
}

const AvailabilityCalendar = ({ defaultPropertyId }: { defaultPropertyId?: string } = {}) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [availability, setAvailability] = useState<AvailabilityDate[]>([]);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [seasonalPrice, setSeasonalPrice] = useState('');
  const [minimumNights, setMinimumNights] = useState('1');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProperties();
  }, [defaultPropertyId]);

  useEffect(() => {
    if (selectedProperty) {
      fetchAvailability();
    }
  }, [selectedProperty]);

  const fetchProperties = async () => {
    try {
      // The editors pass the property being edited, which may be an
      // unpublished draft, so don't limit that lookup to active properties
      const query = supabase.from('properties').select('id, title, price_per_night');
      const { data, error } = defaultPropertyId
        ? await query.eq('id', defaultPropertyId)
        : await query.eq('active', true);

      if (error) throw error;
      setProperties(data || []);
      setSelectedProperty(data?.[0]?.id ?? '');
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('property_id', selectedProperty)
        .gte('date', format(new Date(), 'yyyy-MM-dd'))
        .lte('date', format(addDays(new Date(), 365), 'yyyy-MM-dd'));

      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const updateAvailability = async (
    dates: Date[],
    available: boolean,
    seasonalPrice?: number,
    minimumNights?: number
  ) => {
     try {
       setLoading(true);

       const filteredDates = dates.filter((d) => !isLockedDate(d));
       const skipped = dates.length - filteredDates.length;

       for (const date of filteredDates) {
         const dateStr = format(date, 'yyyy-MM-dd');
         const { error } = await supabase
           .from('availability')
           .upsert({
             property_id: selectedProperty,
             date: dateStr,
             available,
             seasonal_price: seasonalPrice || null,
             minimum_nights: minimumNights || 1,
             reason: available ? null : 'host_blocked'
           }, { onConflict: 'property_id,date' });
         if (error) throw error;
       }

       toast({
         title: 'Klart',
         description: `${filteredDates.length} datum uppdaterade${skipped > 0 ? ` (${skipped} bokade eller synkade datum hoppades över)` : ''}`,
       });

       fetchAvailability();
       setSelectedDates([]);
     } catch (error) {
      console.error('Error updating availability:', error);
      toast({
        title: 'Något gick fel',
        description: 'Det gick inte att uppdatera kalendern',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getDateAvailability = (date: Date) => {
    return availability.find(a => isSameDay(new Date(a.date), date));
  };

  const isCurrentOrPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isLockedDate = (date: Date) => isLockedReason(getDateAvailability(date)?.reason);

  const modifiers = {
    blocked: availability
      .filter(a => !a.available && a.reason !== 'preparation' && !isLockedReason(a.reason))
      .map(a => new Date(a.date)),
    special: availability
      .filter(a => a.seasonal_price !== null)
      .map(a => new Date(a.date)),
    preparation: availability
      .filter(a => a.reason === 'preparation')
      .map(a => new Date(a.date)),
    synced: availability
      .filter(a => isLockedReason(a.reason))
      .map(a => new Date(a.date))
  };

  const selectedProperty_obj = properties.find((p) => p.id === selectedProperty);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Kalender</CardTitle>
                  <CardDescription>
                    Klicka på datum för att välja dagar att ändra. Bokade datum och datum som synkats från andra kalendrar går inte att ändra.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedProperty && (
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates) => setSelectedDates(dates || [])}
                  className="rounded-md border"
                  weekStartsOn={1}
                  locale={sv}
                  modifiers={{
                    blocked: modifiers.blocked,
                    special: modifiers.special,
                    preparation: modifiers.preparation,
                    synced: modifiers.synced
                  }}
                  modifiersClassNames={{
                    blocked: "bg-destructive/20 text-destructive line-through",
                    special: "bg-blue-100 text-blue-900 font-semibold",
                    preparation: "bg-orange-100 text-orange-900 italic",
                    synced: "bg-orange-100 text-orange-900 cursor-not-allowed"
                  }}
                  disabled={(date) => isCurrentOrPastDate(date) || isLockedDate(date)}
                  components={{
                    DayContent: ({ date }) => {
                      const avail = getDateAvailability(date);
                      return (
                        <div className="flex flex-col items-center leading-none">
                          <span>{date.getDate()}</span>
                          {avail?.seasonal_price && (
                            <span className="text-[10px] mt-0.5">
                              {avail.seasonal_price}
                            </span>
                          )}
                        </div>
                      );
                    }
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Snabbval</CardTitle>
              <CardDescription>
                {selectedDates.length > 0 
                  ? (selectedDates.length === 1 ? '1 dag vald' : `${selectedDates.length} dagar valda`)
                  : 'Välj dagar i kalendern'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={selectedDates.length === 0 || loading}
                onClick={() => updateAvailability(selectedDates, false)}
              >
                <Ban className="h-4 w-4 mr-2" />
                Blockera datum
              </Button>
              
               <Button 
                 className="w-full bg-green-600 hover:bg-green-700"
                 disabled={selectedDates.length === 0 || loading || selectedDates.some(d => isLockedDate(d))}
                 onClick={() => updateAvailability(selectedDates, true)}
               >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Markera som lediga
              </Button>

              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    disabled={selectedDates.length === 0}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Avancerade inställningar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Avancerade inställningar</DialogTitle>
                    <DialogDescription>
                      Ange säsongspris och minsta antal nätter för valda datum
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="seasonal-price">Säsongspris (per natt)</Label>
                      <Input
                        id="seasonal-price"
                        type="number"
                        value={seasonalPrice}
                        onChange={(e) => setSeasonalPrice(e.target.value)}
                        placeholder={`Standard: ${(selectedProperty_obj?.price_per_night || 0).toLocaleString('sv-SE')}`}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="minimum-nights">Minsta antal nätter</Label>
                      <Input
                        id="minimum-nights"
                        type="number"
                        min="1"
                        value={minimumNights}
                        onChange={(e) => setMinimumNights(e.target.value)}
                      />
                    </div>
                    
                    <Button 
                      className="w-full"
                      disabled={loading}
                      onClick={() => updateAvailability(
                        selectedDates, 
                        true, 
                        seasonalPrice ? parseInt(seasonalPrice) : undefined,
                        parseInt(minimumNights)
                      )}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Uppdatera pris och regler
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Förklaring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 rounded"></div>
                <span className="text-sm">Ledig</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 rounded"></div>
                <span className="text-sm">Säsongspris</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 rounded"></div>
                <span className="text-sm">Blockerad</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary rounded"></div>
                <span className="text-sm">Vald</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-100 rounded"></div>
                <span className="text-sm">Bokad eller synkad (går inte att ändra)</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </CardContent>
    </Card>
  );
};

export default AvailabilityCalendar;
