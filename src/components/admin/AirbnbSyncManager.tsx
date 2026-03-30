// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  ExternalLink, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Download, 
  Upload, 
  Settings,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { format, addDays } from 'date-fns';

interface ICalFeed {
  id: string;
  property_id: string;
  name: string;
  url: string;
  active: boolean;
  last_sync: string | null;
  sync_status: string;
  error_message?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface AirbnbSyncManagerProps {
  propertyId: string;
  propertyTitle: string;
}

export const AirbnbSyncManager = ({ propertyId, propertyTitle }: AirbnbSyncManagerProps) => {
  const [icalFeeds, setIcalFeeds] = useState<ICalFeed[]>([]);
  const [exportUrl, setExportUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [newFeed, setNewFeed] = useState({ name: '', url: '' });
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState(15); // minutes
  const { toast } = useToast();

  useEffect(() => {
    loadIcalFeeds();
    generateExportUrl();
    // BUG-044: Load persisted sync settings from database
    loadSyncSettings();
  }, [propertyId]);

  const loadSyncSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('platform_settings')
        .eq('id', propertyId)
        .single();

      if (error) throw error;

      const settings = data?.platform_settings;
      if (settings?.autoSync !== undefined) {
        setAutoSync(settings.autoSync);
      }
      if (settings?.syncInterval !== undefined) {
        setSyncInterval(settings.syncInterval);
      }
    } catch (error) {
      console.error('Error loading sync settings:', error);
    }
  };

  const saveSyncSettings = async () => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          platform_settings: {
            autoSync,
            syncInterval
          }
        })
        .eq('id', propertyId);

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Sync settings have been saved successfully"
      });
    } catch (error) {
      console.error('Error saving sync settings:', error);
      toast({
        title: "Error",
        description: "Failed to save sync settings",
        variant: "destructive"
      });
    }
  };

  const loadIcalFeeds = async () => {
    try {
      const { data, error } = await supabase
        .from('ical_feeds')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIcalFeeds(data || []);
    } catch (error) {
      console.error('Error loading iCal feeds:', error);
    }
  };

  const generateExportUrl = async () => {
    try {
      // Get the property's export secret
      let { data: property, error } = await supabase
        .from('properties')
        .select('ical_export_secret')
        .eq('id', propertyId)
        .single();

      if (error) throw error;

      // If no secret exists, generate one automatically for security
      if (!property.ical_export_secret) {
        // Generate a random UUID as the export secret
        const newSecret = crypto.randomUUID();

        // Save the secret to the property
        const { error: updateError } = await supabase
          .from('properties')
          .update({ ical_export_secret: newSecret })
          .eq('id', propertyId);

        if (updateError) throw updateError;

        property.ical_export_secret = newSecret;
      }

      // Generate the export URL for this property's calendar
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const url = `${baseUrl}/functions/v1/export-ical/${propertyId}?secret=${property.ical_export_secret}`;
      setExportUrl(url);
    } catch (error) {
      console.error('Error generating export URL:', error);
      // Show a warning to the user
      toast({
        title: "Varning",
        description: "Kunde inte generera export-URL. Försök igen senare.",
        variant: "destructive"
      });
      setExportUrl('');
    }
  };

  const addIcalFeed = async () => {
    if (!newFeed.name.trim() || !newFeed.url.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both a name and URL for the iCal feed",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('ical_feeds')
        .insert({
          property_id: propertyId,
          name: newFeed.name.trim(),
          url: newFeed.url.trim(),
          active: true,
          sync_status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      setIcalFeeds(prev => [...prev, data]);

      toast({
        title: "iCal feed added",
        description: "The feed will be synced automatically"
      });

      setNewFeed({ name: '', url: '' });
      setShowAddFeed(false);

      // Trigger initial sync
      syncFeed(data.id);
    } catch (error) {
      console.error('Error adding iCal feed:', error);
      toast({
        title: "Error",
        description: "Failed to add iCal feed",
        variant: "destructive"
      });
    }
  };

  const removeFeed = async (feedId: string) => {
    try {
      const { error } = await supabase
        .from('ical_feeds')
        .delete()
        .eq('id', feedId);

      if (error) throw error;

      setIcalFeeds(prev => prev.filter(f => f.id !== feedId));

      toast({
        title: "Feed removed",
        description: "iCal feed has been removed"
      });
    } catch (error) {
      console.error('Error removing feed:', error);
    }
  };

  const toggleFeed = async (feedId: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('ical_feeds')
        .update({ active })
        .eq('id', feedId);

      if (error) throw error;

      setIcalFeeds(prev => prev.map(f => 
        f.id === feedId ? { ...f, active } : f
      ));

      toast({
        title: active ? "Feed enabled" : "Feed disabled",
        description: `iCal feed has been ${active ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      console.error('Error toggling feed:', error);
    }
  };

  const syncFeed = async (feedId: string) => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-ical', {
        body: { feedId }
      });

      if (error) throw error;

      await loadIcalFeeds(); // Refresh the feeds

      toast({
        title: "Sync completed",
        description: `Calendar synchronized successfully. ${data.eventsProcessed} events processed, ${data.datesUpdated} dates updated.`
      });
    } catch (error) {
      console.error('Error syncing feed:', error);
      toast({
        title: "Sync failed",
        description: "Failed to synchronize calendar",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const syncAllFeeds = async () => {
    setSyncing(true);
    try {
      for (const feed of icalFeeds.filter(f => f.active)) {
        await syncFeed(feed.id);
      }
    } finally {
      setSyncing(false);
    }
  };

  const copyExportUrl = () => {
    navigator.clipboard.writeText(exportUrl).then(() => {
      toast({
        title: "URL copied",
        description: "Export URL copied to clipboard"
      });
    });
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Airbnb & Calendar Sync</h3>
        <p className="text-sm text-muted-foreground">
          Synchronize your calendar with Airbnb and other platforms
        </p>
      </div>

      {/* Export Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Your property's iCal URL</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Use this URL to import your calendar into Airbnb, VRBO, or other platforms
            </p>
            <div className="flex gap-2">
              <Input 
                value={exportUrl} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button onClick={copyExportUrl} size="sm">
                Copy
              </Button>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">How to use:</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Copy the URL above</li>
              <li>2. Go to your Airbnb calendar settings</li>
              <li>3. Choose "Import calendar" and paste the URL</li>
              <li>4. Your Nordic Getaways bookings will appear on Airbnb</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Import Calendars */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Calendars
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={syncAllFeeds}
                disabled={syncing || icalFeeds.length === 0}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Sync All
              </Button>
              <Dialog open={showAddFeed} onOpenChange={setShowAddFeed}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Feed
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add iCal Feed</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Feed Name</Label>
                      <Input
                        value={newFeed.name}
                        onChange={(e) => setNewFeed({ ...newFeed, name: e.target.value })}
                        placeholder="e.g., Airbnb Calendar"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>iCal URL</Label>
                      <Textarea
                        value={newFeed.url}
                        onChange={(e) => setNewFeed({ ...newFeed, url: e.target.value })}
                        placeholder="https://..."
                        rows={3}
                      />
                      <p className="text-sm text-muted-foreground">
                        Get this URL from your Airbnb calendar export settings
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAddFeed(false)}>
                        Cancel
                      </Button>
                      <Button onClick={addIcalFeed}>
                        Add Feed
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {icalFeeds.length > 0 ? (
            <div className="space-y-4">
              {icalFeeds.map((feed) => (
                <div key={feed.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getSyncStatusIcon(feed.sync_status)}
                    <div>
                      <div className="font-medium">{feed.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {feed.last_sync 
                          ? `Last synced: ${format(new Date(feed.last_sync), 'MMM dd, HH:mm')}`
                          : 'Never synced'
                        }
                      </div>
                      {feed.error_message && (
                        <div className="text-sm text-red-600">{feed.error_message}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={feed.active}
                      onCheckedChange={(checked) => toggleFeed(feed.id, checked)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => syncFeed(feed.id)}
                      disabled={syncing || !feed.active}
                    >
                      <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFeed(feed.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h4 className="font-medium mb-2">No calendar feeds added</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Import calendars from Airbnb, VRBO, and other platforms to avoid double bookings
              </p>
              <Button onClick={() => setShowAddFeed(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Feed
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Sync Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Automatic sync</Label>
              <p className="text-sm text-muted-foreground">
                Automatically sync calendars at regular intervals
              </p>
            </div>
            <Switch checked={autoSync} onCheckedChange={(checked) => {
              setAutoSync(checked);
              // BUG-044: Save settings immediately when changed
              saveSyncSettings();
            }} />
          </div>

          {autoSync && (
            <div>
              <Label>Sync interval (minutes)</Label>
              <Input
                type="number"
                value={syncInterval}
                onChange={(e) => {
                  const newInterval = parseInt(e.target.value) || 15;
                  setSyncInterval(newInterval);
                }}
                onBlur={() => saveSyncSettings()}
                min="5"
                max="60"
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                How often to check for calendar updates (5-60 minutes)
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};