import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import GuestbookForm from "@/components/GuestbookForm";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const PropertyGuestbookPage = () => {
  const { toast } = useToast();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);
  const [propertyData, setPropertyData] = useState<any>(null);

  useEffect(() => {
    validateToken();
  }, [token, id]);

  const validateToken = async () => {
    if (!token || !id) {
      toast({ title: 'Error', description: 'Invalid guestbook link', variant: 'destructive' });
      navigate(`/property/${id}`);
      return;
    }

    try {
      // Validate token
      const { data: tokenData, error: tokenError } = await supabase
        .from("guestbook_tokens")
        .select(`
          *,
          bookings (
            id,
            property_id,
            guest_name,
            guest_email,
            check_in_date,
            check_out_date
          )
        `)
        .eq("token", token)
        .single();

      if (tokenError || !tokenData) {
        toast({ title: 'Error', description: 'Invalid or expired guestbook invitation', variant: 'destructive' });
        navigate(`/property/${id}`);
        return;
      }

      // Check if token is expired
      if (new Date(tokenData.expires_at) < new Date()) {
        toast({ title: 'Error', description: 'This guestbook invitation has expired', variant: 'destructive' });
        navigate(`/property/${id}`);
        return;
      }

      // Check if token was already used
      if (tokenData.used_at) {
        toast({ title: 'Error', description: 'This guestbook invitation has already been used', variant: 'destructive' });
        navigate(`/property/${id}`);
        return;
      }

      const booking = tokenData.bookings as any;
      
      // Validate property ID matches
      if (booking.property_id !== id) {
        toast({ title: 'Error', description: 'Invalid property for this guestbook invitation', variant: 'destructive' });
        navigate(`/property/${id}`);
        return;
      }

      // Fetch property details
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .select("id, title")
        .eq("id", id)
        .single();

      if (propertyError || !property) {
        toast({ title: 'Error', description: 'Property not found', variant: 'destructive' });
        navigate("/");
        return;
      }

      setBookingData(booking);
      setPropertyData(property);
      setValidToken(true);
    } catch (error) {
      console.error("Error validating token:", error);
      toast({ title: 'Error', description: 'Failed to validate guestbook invitation', variant: 'destructive' });
      navigate(`/property/${id}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/10">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Validating your invitation...</p>
        </div>
      </div>
    );
  }

  if (!validToken || !bookingData || !propertyData) {
    return null;
  }

  return (
    <GuestbookForm
      propertyId={id!}
      propertyTitle={propertyData.title}
      token={token!}
      bookingId={bookingData.id}
      guestEmail={bookingData.guest_email}
      checkInDate={bookingData.check_in_date}
    />
  );
};

export default PropertyGuestbookPage;
