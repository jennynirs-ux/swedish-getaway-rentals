import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MessageCircle, Clock } from "lucide-react";

interface ContactInfo {
  type: string;
  contact_email?: string;
  contact_phone?: string;
}

interface PropertyContactProps {
  contactInfo: ContactInfo;
  responseTime: string;
}

const PropertyContact = ({ contactInfo, responseTime }: PropertyContactProps) => {
  // Strip spaces/dashes for tel: links, replace leading 0 with 46 for WhatsApp
  const cleanPhone = contactInfo.contact_phone?.replace(/[\s\-\(\)]/g, '') || '';
  const whatsAppNumber = cleanPhone.replace(/^\+/, '').replace(/^0/, '46');

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Get In Touch</h2>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {contactInfo.contact_email && (
                <div className="flex items-center gap-4">
                  <Mail className="w-6 h-6 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">Email</p>
                    <p className="text-muted-foreground">{contactInfo.contact_email}</p>
                  </div>
                  <a href={`mailto:${contactInfo.contact_email}`}>
                    <Button variant="outline" size="sm">
                      Send Email
                    </Button>
                  </a>
                </div>
              )}

              {contactInfo.contact_phone && (
                <div className="flex items-center gap-4">
                  <Phone className="w-6 h-6 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">Phone</p>
                    <p className="text-muted-foreground">{contactInfo.contact_phone}</p>
                  </div>
                  <a href={`tel:${cleanPhone}`}>
                    <Button variant="outline" size="sm">
                      Call Now
                    </Button>
                  </a>
                </div>
              )}

              {contactInfo.contact_phone && (
                <div className="flex items-center gap-4">
                  <MessageCircle className="w-6 h-6 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">WhatsApp</p>
                    <p className="text-muted-foreground">Quick messaging</p>
                  </div>
                  <a href={`https://wa.me/${whatsAppNumber}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      WhatsApp
                    </Button>
                  </a>
                </div>
              )}

              <div className="flex items-center gap-4 pt-4 border-t">
                <Clock className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-600">Fast Response</p>
                  <p className="text-muted-foreground">{responseTime}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default PropertyContact;
