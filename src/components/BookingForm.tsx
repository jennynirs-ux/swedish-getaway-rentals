import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays } from "lucide-react";
import { useBooking } from "@/hooks/useBooking";

interface BookingFormProps {
  propertyId: string;
  propertyTitle: string;
  pricePerNight: number;
  currency: string;
  maxGuests: number;
}

const BookingForm: React.FC<BookingFormProps> = ({
  propertyId,
  propertyTitle,
  pricePerNight,
  currency,
  maxGuests
}) => {
  const { createBooking, loading } = useBooking();
  const [formData, setFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    check_in_date: '',
    check_out_date: '',
    number_of_guests: 2,
    special_requests: ''
  });

  const calculateTotalAmount = () => {
    if (!formData.check_in_date || !formData.check_out_date) return 0;
    
    const checkIn = new Date(formData.check_in_date);
    const checkOut = new Date(formData.check_out_date);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    return nights > 0 ? nights * pricePerNight : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const totalAmount = calculateTotalAmount();
    if (totalAmount <= 0) {
      return;
    }

    await createBooking({
      property_id: propertyId,
      total_amount: totalAmount,
      ...formData
    });

    // Reset form
    setFormData({
      guest_name: '',
      guest_email: '',
      guest_phone: '',
      check_in_date: '',
      check_out_date: '',
      number_of_guests: 2,
      special_requests: ''
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'number_of_guests' ? parseInt(value) || 0 : value
    }));
  };

  const totalAmount = calculateTotalAmount();
  const nights = formData.check_in_date && formData.check_out_date ? 
    Math.ceil((new Date(formData.check_out_date).getTime() - new Date(formData.check_in_date).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <Card className="shadow-soft-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Boka {propertyTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="check_in_date">Incheckning</Label>
              <Input 
                id="check_in_date"
                name="check_in_date"
                type="date" 
                value={formData.check_in_date}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="check_out_date">Utcheckning</Label>
              <Input 
                id="check_out_date"
                name="check_out_date"
                type="date" 
                value={formData.check_out_date}
                onChange={handleChange}
                min={formData.check_in_date || new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="number_of_guests">Antal gäster (max {maxGuests})</Label>
            <Input 
              id="number_of_guests"
              name="number_of_guests"
              type="number" 
              min="1" 
              max={maxGuests} 
              value={formData.number_of_guests}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest_name">Ditt namn</Label>
            <Input 
              id="guest_name"
              name="guest_name"
              placeholder="För- och efternamn" 
              value={formData.guest_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest_email">E-postadress</Label>
            <Input 
              id="guest_email"
              name="guest_email"
              type="email" 
              placeholder="din@email.com" 
              value={formData.guest_email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest_phone">Telefonnummer (valfritt)</Label>
            <Input 
              id="guest_phone"
              name="guest_phone"
              type="tel" 
              placeholder="+46 XX XXX XX XX" 
              value={formData.guest_phone}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="special_requests">Specialönskemål</Label>
            <Textarea 
              id="special_requests"
              name="special_requests"
              placeholder="Eventuella specialönskemål eller frågor..." 
              value={formData.special_requests}
              onChange={handleChange}
              rows={3}
            />
          </div>

          {totalAmount > 0 && (
            <div className="p-4 bg-accent rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span>Antal nätter:</span>
                <span className="font-medium">{nights}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span>Pris per natt:</span>
                <span className="font-medium">{pricePerNight.toLocaleString()} {currency}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                <span>Totalt:</span>
                <span>{totalAmount.toLocaleString()} {currency}</span>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || totalAmount <= 0}
          >
            {loading ? 'Skickar...' : 'Skicka bokningsförfrågan'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default BookingForm;