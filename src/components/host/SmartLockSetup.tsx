import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Plus, AlertTriangle, ExternalLink, Info } from 'lucide-react';
import { YaleLockManagement } from '@/components/admin/YaleLockManagement';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SmartLockSetupProps {
  propertyId: string;
}

export const SmartLockSetup = ({ propertyId }: SmartLockSetupProps) => {
  const [deviceId, setDeviceId] = useState('');
  const [lockName, setLockName] = useState('');
  const [accessDuration, setAccessDuration] = useState('1');
  const [seamApiKey, setSeamApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [hasLock, setHasLock] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkExistingLock();
  }, [propertyId]);

  const checkExistingLock = async () => {
    try {
      const { data } = await supabase
        .from('yale_locks')
        .select('id')
        .eq('property_id', propertyId)
        .single();

      setHasLock(!!data);
    } catch {
      setHasLock(false);
    }
  };

  /** Verify the Seam API key + device ID are valid before saving */
  const handleTestConnection = async () => {
    if (!seamApiKey || !deviceId) {
      toast({
        title: 'Missing fields',
        description: 'Enter both your Seam API Key and Device ID first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setTesting(true);
      const res = await fetch('https://connect.getseam.com/devices/get', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${seamApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_id: deviceId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || `HTTP ${res.status}`);
      }

      const json = await res.json();
      const device = json.device;

      toast({
        title: 'Connection successful',
        description: `Found: ${device?.properties?.name || device?.display_name || deviceId}`,
      });

      // Auto-fill lock name if empty
      if (!lockName && (device?.properties?.name || device?.display_name)) {
        setLockName(device.properties?.name || device.display_name);
      }
    } catch (err: any) {
      toast({
        title: 'Connection failed',
        description: err.message || 'Could not reach lock. Check your API key and Device ID.',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!deviceId || !seamApiKey) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both Seam Device ID and API Key.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from('yale_locks').insert({
        property_id: propertyId,
        lock_id: deviceId,
        lock_name: lockName || null,
        access_duration_hours: parseInt(accessDuration),
        api_credentials: btoa(seamApiKey), // Base64 — use Supabase Vault in production
        is_active: true,
      });

      if (error) throw error;

      toast({
        title: 'Smart lock connected',
        description: 'Access codes will be generated automatically 3 days before each check-in.',
      });

      setDeviceId('');
      setLockName('');
      setSeamApiKey('');
      setHasLock(true);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to connect smart lock.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Powered by Seam</AlertTitle>
        <AlertDescription>
          We use <a href="https://www.seam.co" target="_blank" rel="noopener noreferrer" className="underline font-medium">Seam</a> to
          connect to Yale, August, Schlage, and 100+ other smart lock brands.
          Time-bound PIN codes are pushed directly to your lock — no hub required for WiFi-enabled models.
        </AlertDescription>
      </Alert>

      {!hasLock ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Connect Smart Lock
            </CardTitle>
            <CardDescription>
              Link your smart lock via Seam to enable automatic access code generation for guests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="seamApiKey">Seam API Key *</Label>
              <Input
                id="seamApiKey"
                type="password"
                value={seamApiKey}
                onChange={(e) => setSeamApiKey(e.target.value)}
                placeholder="seam_apikey_..."
              />
              <p className="text-sm text-muted-foreground mt-1">
                Get your API key from{' '}
                <a
                  href="https://console.seam.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline inline-flex items-center gap-0.5"
                >
                  console.seam.co <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>

            <div>
              <Label htmlFor="deviceId">Seam Device ID *</Label>
              <Input
                id="deviceId"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="e.g., d9a1c3f0-..."
              />
              <p className="text-sm text-muted-foreground mt-1">
                Find this in the Seam Console under Devices after connecting your lock account.
              </p>
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
              <p className="text-sm text-muted-foreground mt-1">
                Extra time after check-out before the code is deactivated.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing || loading}
                className="flex-1"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button
                onClick={handleConnect}
                disabled={loading || testing}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                {loading ? 'Connecting...' : 'Connect Lock'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <YaleLockManagement propertyId={propertyId} />
      )}
    </div>
  );
};
