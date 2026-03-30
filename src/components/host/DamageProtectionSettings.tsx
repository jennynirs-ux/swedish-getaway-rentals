// @ts-nocheck
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Shield, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DamageProtectionSettingsProps {
  propertyId: string;
  initialEnabled: boolean;
  initialAmount: number;
  initialType: string;
  onSave?: () => void;
}

export const DamageProtectionSettings = ({
  propertyId,
  initialEnabled,
  initialAmount,
  initialType,
  onSave,
}: DamageProtectionSettingsProps) => {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [amount, setAmount] = useState(initialAmount);
  const [protectionType, setProtectionType] = useState(initialType || 'deposit');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('properties')
        .update({
          damage_protection_enabled: enabled,
          damage_deposit_amount: enabled ? amount : 0,
          damage_protection_type: enabled ? protectionType : 'none',
        })
        .eq('id', propertyId);

      if (error) throw error;

      toast({ title: 'Saved', description: 'Damage protection settings updated.' });
      onSave?.();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Damage Protection
        </CardTitle>
        <CardDescription>
          Protect your property with a security deposit or damage insurance. Deposits are held via Stripe and released 48 hours after checkout if no claim is filed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="damage-toggle">Enable damage protection</Label>
          <Switch
            id="damage-toggle"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {enabled && (
          <>
            <div className="space-y-2">
              <Label>Protection type</Label>
              <div className="flex gap-2">
                <Button
                  variant={protectionType === 'deposit' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setProtectionType('deposit')}
                >
                  Security Deposit
                </Button>
                <Button
                  variant={protectionType === 'insurance' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setProtectionType('insurance')}
                >
                  Damage Insurance
                </Button>
              </div>
            </div>

            {protectionType === 'deposit' && (
              <div className="space-y-2">
                <Label htmlFor="deposit-amount">Deposit amount (SEK)</Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  min={500}
                  max={50000}
                  step={500}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: 2,000–5,000 SEK. Held as a Stripe authorization (not charged unless a claim is filed).
                </p>
              </div>
            )}

            {protectionType === 'insurance' && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Damage insurance is provided by our partner Safely. A flat fee of 149 SEK per booking is charged to the guest. Covers up to 50,000 SEK in damages.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Protection Settings'}
        </Button>
      </CardContent>
    </Card>
  );
};
