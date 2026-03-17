import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, ExternalLink, Loader2 } from 'lucide-react';

interface VerifyIdentityButtonProps {
  isVerified?: boolean;
  /** Compact mode for inline use (e.g., booking form) */
  compact?: boolean;
  onVerified?: () => void;
}

export const VerifyIdentityButton = ({
  isVerified = false,
  compact = false,
  onVerified,
}: VerifyIdentityButtonProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleVerify = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke(
        'create-identity-verification',
        {
          body: {
            returnUrl: `${window.location.origin}/profile?verified=true`,
          },
        }
      );

      if (error) throw error;

      if (data?.alreadyVerified) {
        toast({
          title: 'Already verified',
          description: 'Your identity has been confirmed.',
        });
        onVerified?.();
        return;
      }

      if (data?.url) {
        // Redirect to Stripe Identity hosted verification page
        window.location.href = data.url;
      } else {
        throw new Error('No verification URL returned');
      }
    } catch (err) {
      console.error('Verification error:', err);
      toast({
        title: 'Verification failed',
        description: 'Could not start identity verification. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (isVerified) {
    if (compact) {
      return (
        <Badge variant="secondary" className="gap-1 text-green-700 bg-green-50">
          <ShieldCheck className="h-3 w-3" />
          ID Verified
        </Badge>
      );
    }
    return (
      <div className="flex items-center gap-2 text-green-700">
        <ShieldCheck className="h-5 w-5" />
        <span className="text-sm font-medium">Identity Verified</span>
      </div>
    );
  }

  if (compact) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleVerify}
        disabled={loading}
        className="gap-1.5"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ShieldCheck className="h-3.5 w-3.5" />
        )}
        Verify ID
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Verify your identity to build trust with hosts. Quick and secure via Stripe.
      </p>
      <Button onClick={handleVerify} disabled={loading} className="gap-2">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="h-4 w-4" />
        )}
        {loading ? 'Starting verification...' : 'Verify My Identity'}
        <ExternalLink className="h-3 w-3" />
      </Button>
    </div>
  );
};
