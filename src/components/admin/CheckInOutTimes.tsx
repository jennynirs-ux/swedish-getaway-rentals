import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Clock } from 'lucide-react';

interface CheckInOutTimesProps {
  propertyId: string;
  onUpdate?: () => void;
}

export const CheckInOutTimes = ({ propertyId, onUpdate }: CheckInOutTimesProps) => {
  const [checkInTime, setCheckInTime] = useState('15:00');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTimes();
  }, [propertyId]);

  const fetchTimes = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('check_in_time, check_out_time')
        .eq('id', propertyId)
        .single();

      if (error) throw error;

      if (data) {
        setCheckInTime(data.check_in_time?.substring(0, 5) || '15:00');
        setCheckOutTime(data.check_out_time?.substring(0, 5) || '11:00');
      }
    } catch (error) {
      console.error('Error fetching times:', error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('properties')
        .update({
          check_in_time: checkInTime + ':00',
          check_out_time: checkOutTime + ':00',
        })
        .eq('id', propertyId);

      if (error) throw error;

      toast({
        title: 'Klart',
        description: 'Tiderna för in- och utcheckning är sparade',
      });

      onUpdate?.();
    } catch (error) {
      console.error('Error updating times:', error);
      toast({
        title: 'Något gick fel',
        description: 'Det gick inte att spara tiderna',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Tider för incheckning och utcheckning
        </CardTitle>
        <CardDescription>
          Ange vilka tider som gäller för incheckning och utcheckning i det här boendet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="checkIn">Incheckningstid</Label>
            <Input
              id="checkIn"
              type="time"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="checkOut">Utcheckningstid</Label>
            <Input
              id="checkOut"
              type="time"
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Gästerna ser tiderna när de bokar och i bekräftelsemejlet.
            Koder till smarta lås slutar gälla automatiskt{' '}
            <span className="font-medium">efter utcheckningstiden plus den marginal du har ställt in</span>.
          </p>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? 'Sparar...' : 'Spara tider'}
        </Button>
      </CardContent>
    </Card>
  );
};
