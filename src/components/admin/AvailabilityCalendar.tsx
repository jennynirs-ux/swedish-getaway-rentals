import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Settings, DollarSign, Clock, Ban } from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { sv } from 'date-fns/locale';

interface Property {
  id: string;
  title: string;
  price_per_night: number;
}

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
  const [isBlocking, setIsBlocking] = useState(false);
  const [seasonalPrice, setSeasonalPrice] = useState('');
  const [minimumNights, setMinimumNights] = useState('1');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      fetchAvailability();
    }
  }, [selectedProperty]);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, price_per_night')
        .eq('active', true);

      if (error) throw error;
      setProperties(data || []);
      
      if (data && data.length > 0) {
        const found = defaultPropertyId && data.find(p => p.id === defaultPropertyId);
        setSelectedProperty(found ? found.id : data[0].id);
      }
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

  const updateAvailability = async (dates: Date[], available: boolean, price?: number, nights?: number) => {
    setLoading(true);
    try {
      const updates = dates.map(date => ({
        property_id: selectedProperty,
        date: format(date, 'yyyy-MM-dd'),
        available,
        reason: available ? null : 'blocked',
        seasonal_price: price || null,
        minimum_nights: nights || 1
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('availability')
          .upsert(update, { onConflict: 'property_id,date' });

        if (error) throw error;
      }

      toast({
        title: "Framgång",
        description: `Tillgänglighet uppdaterad för ${dates.length} dagar`
      });

      fetchAvailability();
      setSelectedDates([]);
    } catch (error) {
      console.error('Error updating availability:', error);
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera tillgänglighet",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getDateAvailability = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return availability.find(a => a.date === dateStr);
  };

  const getDateModifiers = () => {
    const blocked: Date[] = [];
    const special: Date[] = [];
    const preparation: Date[] = [];
    
    availability.forEach(avail => {
      const date = new Date(avail.date + 'T00:00:00');
      if (!avail.available) {
        if (avail.reason === 'preparation') {
          preparation.push(date);
        } else {
          blocked.push(date);
        }
      } else if (avail.seasonal_price) {
        special.push(date);
      }
    });
    
    return { blocked, special, preparation };
  };

  const modifiers = getDateModifiers();

  const handleDateClick = (date: Date) => {
    const isSelected = selectedDates.some(d => isSameDay(d, date));
    if (isSelected) {
      setSelectedDates(prev => prev.filter(d => !isSameDay(d, date)));
    } else {
      setSelectedDates(prev => [...prev, date]);
    }
  };

  const selectedProperty_obj = properties.find(p => p.id === selectedProperty);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Tillgänglighet & Priser</h2>
        <p className="text-muted-foreground">Hantera tillgänglighet och säsongspriser för dina properties</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Kalender</CardTitle>
                  <CardDescription>
                    Klicka på datum för att välja dagar att uppdatera
                  </CardDescription>
                </div>
                <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Välj property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(property => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {selectedProperty && (
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates) => setSelectedDates(dates || [])}
                  className="rounded-md border"
                  modifiers={{
                    blocked: modifiers.blocked,
                    special: modifiers.special,
                    preparation: modifiers.preparation
                  }}
                  modifiersClassNames={{
                    blocked: "bg-destructive/20 text-destructive line-through",
                    special: "bg-blue-100 text-blue-900 font-semibold",
                    preparation: "bg-orange-100 text-orange-900 italic"
                  }}
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
              <CardTitle>Snabbåtgärder</CardTitle>
              <CardDescription>
                {selectedDates.length > 0 
                  ? `${selectedDates.length} dagar valda`
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
                Blockera valda dagar
              </Button>
              
              <Button 
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={selectedDates.length === 0 || loading}
                onClick={() => updateAvailability(selectedDates, true)}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Gör tillgängliga
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
                      Sätt säsongspriser och minimumnätter för valda dagar
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="seasonal-price">Säsongspris (SEK per natt)</Label>
                      <Input
                        id="seasonal-price"
                        type="number"
                        value={seasonalPrice}
                        onChange={(e) => setSeasonalPrice(e.target.value)}
                        placeholder={`Standardpris: ${selectedProperty_obj?.price_per_night || 0} SEK`}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="minimum-nights">Minimum antal nätter</Label>
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
                      Uppdatera priser & regler
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
                <span className="text-sm">Tillgänglig</span>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityCalendar;