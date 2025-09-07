import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ContactFormProps {
  propertyId?: string;
  subject?: string;
}

const ContactForm: React.FC<ContactFormProps> = ({ propertyId, subject = 'Allmän förfrågan' }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: subject,
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('guest_messages')
        .insert([{
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          subject: formData.subject,
          message: formData.message,
          property_id: propertyId || null
        }]);

      if (error) throw error;

      toast({
        title: "Meddelande skickat!",
        description: "Vi kommer att svara dig så snart som möjligt.",
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: subject,
        message: ''
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Fel",
        description: "Kunde inte skicka meddelandet. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Kontakta Oss
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Namn</Label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Ditt fullständiga namn"
            />
          </div>

          <div>
            <Label htmlFor="email">E-postadress</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="din@email.com"
            />
          </div>

          <div>
            <Label htmlFor="phone">Telefonnummer (valfritt)</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+46 XX XXX XX XX"
            />
          </div>

          <div>
            <Label htmlFor="subject">Ämne</Label>
            <Input
              id="subject"
              name="subject"
              type="text"
              value={formData.subject}
              onChange={handleChange}
              required
              placeholder="Vad gäller din förfrågan?"
            />
          </div>

          <div>
            <Label htmlFor="message">Meddelande</Label>
            <Textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Beskriv din förfrågan eller frågor..."
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Skickar...' : 'Skicka Meddelande'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ContactForm;