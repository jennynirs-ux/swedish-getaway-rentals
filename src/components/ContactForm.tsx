import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import DOMPurify from "dompurify";

interface ContactFormProps {
  propertyId?: string;
  subject?: string;
}

const ContactForm: React.FC<ContactFormProps> = ({ propertyId, subject = 'Allmän förfrågan' }) => {
  // BUG-052: TODO - Use i18n system from src/lib/i18n/ instead of hardcoded Swedish strings
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Input validation schema
  const contactSchema = z.object({
    name: z.string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be less than 100 characters"),
    email: z.string()
      .email("Invalid email address")
      .max(255, "Email must be less than 255 characters"),
    phone: z.string()
      .optional()
      .refine((val) => !val || /^[\+]?[0-9\s\-\(\)]{7,15}$/.test(val), "Invalid phone number"),
    subject: z.string()
      .min(1, "Subject is required")
      .max(200, "Subject must be less than 200 characters"),
    message: z.string()
      .min(10, "Message must be at least 10 characters")
      .max(5000, "Message must be less than 5000 characters")
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: subject,
    message: ''
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const validateForm = () => {
    try {
      const sanitizedData = {
        name: DOMPurify.sanitize(formData.name.trim()),
        email: DOMPurify.sanitize(formData.email.trim()),
        phone: formData.phone ? DOMPurify.sanitize(formData.phone.trim()) : '',
        subject: DOMPurify.sanitize(formData.subject.trim()),
        message: DOMPurify.sanitize(formData.message.trim())
      };
      
      contactSchema.parse(sanitizedData);
      setValidationErrors({});
      return sanitizedData;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setValidationErrors(errors);
      }
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validatedData = validateForm();
    if (!validatedData) return;

    setLoading(true);

    try {
      // Save to database
      const { error: dbError } = await supabase
        .from('guest_messages')
        .insert([{
          name: validatedData.name,
          email: validatedData.email,
          phone: validatedData.phone,
          subject: validatedData.subject,
          message: validatedData.message,
          property_id: propertyId || null
        }]);

      if (dbError) throw dbError;

      // Send email to support
      const { error: emailError } = await supabase.functions.invoke('send-support-email', {
        body: {
          name: validatedData.name,
          email: validatedData.email,
          phone: validatedData.phone,
          subject: validatedData.subject,
          message: validatedData.message,
        },
      });

      if (emailError) {
        console.error('Email send error:', emailError);
        // Don't throw - message is saved in DB
      }

      // BUG-049: Longer toast duration and persistent success state
      toast({
        title: "Meddelande skickat!",
        description: "Vi kommer att svara dig så snart som möjligt.",
        duration: 8000, // 8 seconds instead of default 5
      });

      // Show persistent success banner
      setShowSuccessMessage(true);

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: subject,
        message: ''
      });
      setValidationErrors({});

      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccessMessage(false), 5000);
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
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
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
        {/* BUG-049: Persistent success state banner */}
        {showSuccessMessage && (
          <div className="mb-4 p-4 bg-green-100 border border-green-300 rounded-lg">
            <p className="text-green-800 font-semibold">Tack för ditt meddelande!</p>
            <p className="text-green-700 text-sm">Vi kontaktar dig så snart som möjligt.</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Namn</Label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              maxLength={100}
              required
              placeholder="Ditt fullständiga namn"
              className={validationErrors.name ? "border-destructive" : ""}
            />
            {validationErrors.name && (
              <p className="text-destructive text-sm">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email">E-postadress</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              maxLength={255}
              required
              placeholder="din@email.com"
              className={validationErrors.email ? "border-destructive" : ""}
            />
            {validationErrors.email && (
              <p className="text-destructive text-sm">{validationErrors.email}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">Telefonnummer (valfritt)</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              maxLength={15}
              placeholder="+46 XX XXX XX XX"
              className={validationErrors.phone ? "border-destructive" : ""}
            />
            {validationErrors.phone && (
              <p className="text-destructive text-sm">{validationErrors.phone}</p>
            )}
          </div>

          <div>
            <Label htmlFor="subject">Ämne</Label>
            <Input
              id="subject"
              name="subject"
              type="text"
              value={formData.subject}
              onChange={handleChange}
              maxLength={200}
              required
              placeholder="Vad gäller din förfrågan?"
              className={validationErrors.subject ? "border-destructive" : ""}
            />
            {validationErrors.subject && (
              <p className="text-destructive text-sm">{validationErrors.subject}</p>
            )}
          </div>

          <div>
            <Label htmlFor="message">Meddelande</Label>
            <Textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              maxLength={5000}
              required
              rows={4}
              placeholder="Beskriv din förfrågan eller frågor..."
              className={validationErrors.message ? "border-destructive" : ""}
            />
            {validationErrors.message && (
              <p className="text-destructive text-sm">{validationErrors.message}</p>
            )}
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