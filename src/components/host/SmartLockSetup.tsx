import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Plus, AlertTriangle } from 'lucide-react';
import { YaleLockManagement } from '@/components/admin/YaleLockManagement';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
      
      // Store API key directly - it will be encrypted by the database
      // WARNING: This is a temporary measure. In production, credentials should be
      // encrypted before storage using proper encryption methods or Supabase Vault
      const { error } = await supabase.from('yale_locks').insert({
        property_id: propertyId,
        lock_id: lockId,
        lock_name: lockName || null,
        access_duration_hours: parseInt(accessDuration),
        api_credentials: btoa(apiKey), // Base64 encoded; column restricted from client SELECT via column-level REVOKE
        is_active: true,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Smart lock connected successfully.',
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
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Security Notice</AlertTitle>
        <AlertDescription>
          Yale lock API credentials are currently stored with basic encoding. 
          For production use, implement proper encryption or use Supabase Vault for credential storage.
        </AlertDescription>
      </Alert>

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
