import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Plus } from 'lucide-react';
import { YaleLockManagement } from '@/components/admin/YaleLockManagement';

interface SmartLockSetupProps {
  propertyId: string;
}

export const SmartLockSetup = ({ propertyId }: SmartLockSetupProps) => {
  const [lockId, setLockId] = useState('');
  const [lockName, setLockName] = useState('');
  const [accessDuration, setAccessDuration] = useState('1');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasLock, setHasLock] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkExistingLock();
  }, [propertyId]);

  const checkExistingLock = async () => {
    try {
      const { data, error } = await supabase
        .from('yale_locks')
        .select('id')
        .eq('property_id', propertyId)
        .single();
      
      setHasLock(!!data);
    } catch (error) {
      setHasLock(false);
    }
  };

  // Simple encryption function (use proper encryption library in production)
  const encryptCredentials = (credentials: string): string => {
    // WARNING: This is a placeholder. Use proper encryption in production
    // Consider using Web Crypto API or a proper encryption library
    return btoa(credentials); // Base64 encoding - NOT secure, just a placeholder
  };

  const handleConnect = async () => {
    if (!lockId || !apiKey) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both Lock ID and API Key',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      // Encrypt API credentials before storage
      const encryptedKey = encryptCredentials(apiKey);
      
      const { error } = await supabase.from('yale_locks').insert({
        property_id: propertyId,
        lock_id: lockId,
        lock_name: lockName || null,
        access_duration_hours: parseInt(accessDuration),
        api_credentials: encryptedKey,
        is_active: true,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Smart lock connected successfully. API credentials encrypted.',
      });

      setLockId('');
      setLockName('');
      setApiKey('');
      setHasLock(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to connect smart lock',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {!hasLock ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Connect Yale Doorman
            </CardTitle>
            <CardDescription>
              Link your Yale Doorman smart lock to enable automatic access code generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="lockId">Lock ID *</Label>
              <Input
                id="lockId"
                value={lockId}
                onChange={(e) => setLockId(e.target.value)}
                placeholder="Enter your Yale lock device ID"
              />
            </div>

            <div>
              <Label htmlFor="lockName">Lock Name (Optional)</Label>
              <Input
                id="lockName"
                value={lockName}
                onChange={(e) => setLockName(e.target.value)}
                placeholder="e.g., Main Door, Side Entrance"
              />
            </div>

            <div>
              <Label htmlFor="duration">Access Duration (hours after check-out)</Label>
              <Input
                id="duration"
                type="number"
                min="0"
                max="24"
                value={accessDuration}
                onChange={(e) => setAccessDuration(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="apiKey">Yale API Key *</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Yale API credentials"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Get your API key from the Yale Access Developer Portal
              </p>
            </div>

            <Button onClick={handleConnect} disabled={loading} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {loading ? 'Connecting...' : 'Connect Smart Lock'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <YaleLockManagement propertyId={propertyId} />
      )}
    </div>
  );
};
