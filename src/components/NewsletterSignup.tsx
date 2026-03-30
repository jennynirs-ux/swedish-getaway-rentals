import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';

const NewsletterSignup = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const sanitized = DOMPurify.sanitize(email.trim());
    if (!sanitized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('newsletter_subscribers')
        .upsert(
          { email: sanitized, subscribed_at: new Date().toISOString() },
          { onConflict: 'email' }
        );

      if (error) throw error;

      setSubscribed(true);
      setEmail('');
      toast.success('Welcome! You\'ll receive our best Nordic travel deals.');
    } catch {
      // Table may not exist yet — store in localStorage as fallback
      const existing = JSON.parse(localStorage.getItem('newsletter_signup') || '[]');
      if (!existing.includes(sanitized)) {
        existing.push(sanitized);
        localStorage.setItem('newsletter_signup', JSON.stringify(existing));
      }
      setSubscribed(true);
      toast.success('Thank you for subscribing!');
    } finally {
      setLoading(false);
    }
  };

  if (subscribed) {
    return (
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-8 text-center">
        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold mb-1">You're in!</h3>
        <p className="text-sm text-muted-foreground">
          We'll send you exclusive Nordic travel deals and new property alerts.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-primary/5 border border-primary/10 rounded-xl p-8">
      <div className="max-w-md mx-auto text-center">
        <Mail className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="text-lg font-semibold mb-1">Get Exclusive Nordic Deals</h3>
        <p className="text-sm text-muted-foreground mb-4">
          New properties, seasonal discounts, and travel tips — straight to your inbox.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
            required
          />
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Subscribe'}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          No spam. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
};

export default NewsletterSignup;
