'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function CleaningCompleteClient() {
  const params = useParams();
  const token = params.token as string;
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [propertyTitle, setPropertyTitle] = useState('');
  const [error, setError] = useState('');

  const handleComplete = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('complete-cleaning', {
        body: { token, notes: notes.trim() || undefined },
      });

      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);

      setCompleted(true);
      setPropertyTitle(data?.propertyTitle || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
            <h2 className="text-2xl font-bold text-green-600">All Done!</h2>
            {propertyTitle && (
              <p className="text-muted-foreground">
                Cleaning for <strong>{propertyTitle}</strong> has been marked as complete.
              </p>
            )}
            <p className="text-sm text-muted-foreground">Thank you for your work!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Sparkles className="w-10 h-10 text-purple-600 mx-auto mb-2" />
          <CardTitle>Cleaning Complete?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Tap the button below to confirm the cleaning is finished.
          </p>

          <Textarea
            placeholder="Optional notes (e.g., items that need repair, supplies running low...)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          <Button
            onClick={handleComplete}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark as Complete
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
