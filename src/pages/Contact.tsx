import { useState, useEffect } from "react";
import { COMPANY } from "@/content/company";
import MainNavigation from "@/components/MainNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Phone, Mail } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { type Copy, useCopy, useLang } from "@/i18n";

const en = {
  metaTitle: "Contact us",
  metaDescription:
    "Questions about a booking, a cabin or listing your holiday home on Nordic Getaways? Email support@mojjo.se or use the form.",
  // The heading and intro on Swedish and German pages; the English page shows
  // platform_settings.contact_content, which is written in English
  title: "Contact Nordic Getaways",
  description: "Get in touch with us for bookings, questions, or to become a host.",
  getInTouch: "Get in Touch",
  email: "Email",
  phone: "Phone",
  company: "Company",
  orgNo: "org. no.",
  country: COMPANY.country as string,
  businessHours: "Business Hours",
  sendUsMessage: "Send us a Message",
  nameLabel: "Name *",
  emailLabel: "Email *",
  phoneLabel: "Phone",
  subjectLabel: "Subject",
  messageLabel: "Message *",
  sending: "Sending...",
  send: "Send Message",
  sentTitle: "Message sent!",
  sentDescription: "We'll get back to you as soon as possible.",
  errorTitle: "Error",
  errorDescription: "Failed to send message. Please try again.",
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    metaTitle: "Kontakta oss",
    metaDescription:
      "Frågor om en bokning, en stuga eller om att hyra ut ditt fritidshus på Nordic Getaways? Mejla support@mojjo.se eller använd formuläret.",
    title: "Kontakta Nordic Getaways",
    description: "Hör av dig till oss om bokningar, frågor eller om du vill bli värd.",
    getInTouch: "Kontaktuppgifter",
    email: "E-post",
    phone: "Telefon",
    company: "Företag",
    orgNo: "org.nr",
    country: "Sverige",
    businessHours: "Öppettider",
    sendUsMessage: "Skicka ett meddelande",
    nameLabel: "Namn *",
    emailLabel: "E-post *",
    phoneLabel: "Telefon",
    subjectLabel: "Ämne",
    messageLabel: "Meddelande *",
    sending: "Skickar…",
    send: "Skicka meddelande",
    sentTitle: "Meddelandet är skickat!",
    sentDescription: "Vi återkommer så snart vi kan.",
    errorTitle: "Något gick fel",
    errorDescription: "Meddelandet kunde inte skickas. Försök igen.",
  },
  de: {
    metaTitle: "Kontakt",
    metaDescription:
      "Fragen zu einer Buchung, einem Ferienhaus oder dazu, wie du dein Ferienhaus auf Nordic Getaways anbietest? Schreib an support@mojjo.se oder nutze das Formular.",
    title: "Kontakt zu Nordic Getaways",
    description: "Schreib uns zu Buchungen, bei Fragen oder wenn du Gastgeber werden möchtest.",
    getInTouch: "So erreichst du uns",
    email: "E-Mail",
    phone: "Telefon",
    company: "Unternehmen",
    orgNo: "Org.-Nr.",
    country: "Schweden",
    businessHours: "Geschäftszeiten",
    sendUsMessage: "Schreib uns eine Nachricht",
    nameLabel: "Name *",
    emailLabel: "E-Mail *",
    phoneLabel: "Telefon",
    subjectLabel: "Betreff",
    messageLabel: "Nachricht *",
    sending: "Wird gesendet…",
    send: "Nachricht senden",
    sentTitle: "Nachricht gesendet!",
    sentDescription: "Wir melden uns so schnell wie möglich bei dir.",
    errorTitle: "Fehler",
    errorDescription: "Die Nachricht konnte nicht gesendet werden. Bitte versuch es noch einmal.",
  },
};

interface ContactContent {
  title: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  hours: string;
}

const Contact = () => {
  const t = useCopy(COPY);
  const lang = useLang();
  usePageMeta({
    title: t.metaTitle,
    description: t.metaDescription,
    path: "/contact",
  });

  const [content, setContent] = useState<ContactContent>({
    // Shown until platform_settings.contact_content loads (and in the
    // prerendered page), so keep these real
    title: en.title,
    description: en.description,
    email: "support@mojjo.se",
    phone: "",
    address: "Sweden",
    hours: ""
  });
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'contact_content')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.setting_value) {
        setContent(data.setting_value as unknown as ContactContent);
      }
    } catch (error) {
      console.error('Error fetching contact content:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('guest_messages')
        .insert([{
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          subject: formData.subject,
          message: formData.message
        }]);

      if (error) throw error;

      // guest_messages is only the archive; this puts it in the support inbox
      const { error: emailError } = await supabase.functions.invoke('send-support-email', {
        body: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          subject: formData.subject || "Message from the contact page",
          message: formData.message,
        }
      });
      if (emailError) throw emailError;

      toast({
        title: t.sentTitle,
        description: t.sentDescription
      });

      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: ""
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: t.errorTitle,
        description: t.errorDescription,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation showBackButton />
      
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">{lang === "en" ? content.title : t.title}</h1>
            <p className="text-lg text-muted-foreground">{lang === "en" ? content.description : t.description}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>{t.getInTouch}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{t.email}</p>
                    <a className="text-muted-foreground hover:underline" href={`mailto:${content.email}`}>{content.email}</a>
                  </div>
                </div>
                
                {content.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{t.phone}</p>
                      <p className="text-muted-foreground">{content.phone}</p>
                    </div>
                  </div>
                )}
                
                {/* The company's registered details (not the contact_content address) */}
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">{t.company}</p>
                    <p className="text-muted-foreground">
                      {COMPANY.name}, {t.orgNo} {COMPANY.orgNumber}
                      <br />
                      {COMPANY.street}, {COMPANY.postcode} {COMPANY.city}, {t.country}
                    </p>
                  </div>
                </div>
                
                {content.hours && (
                  <div className="pt-4 border-t">
                    <p className="font-medium mb-2">{t.businessHours}</p>
                    <p className="text-muted-foreground">{content.hours}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Form */}
            <Card>
              <CardHeader>
                <CardTitle>{t.sendUsMessage}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">{t.nameLabel}</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">{t.emailLabel}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">{t.phoneLabel}</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="subject">{t.subjectLabel}</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => handleInputChange('subject', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="message">{t.messageLabel}</Label>
                    <Textarea
                      id="message"
                      rows={5}
                      value={formData.message}
                      onChange={(e) => handleInputChange('message', e.target.value)}
                      required
                    />
                  </div>
                  
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? t.sending : t.send}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;