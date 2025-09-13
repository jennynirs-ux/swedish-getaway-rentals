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
  sync_status: 'success' | 'error' | 'pending';
  error_message?: string;
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
  }, [propertyId]);

  const loadIcalFeeds = async () => {
    try {
      // This would fetch from a theoretical ical_feeds table
      // For now, we'll simulate with localStorage
      const stored = localStorage.getItem(`ical_feeds_${propertyId}`);
      if (stored) {
        setIcalFeeds(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading iCal feeds:', error);
    }
  };

  const generateExportUrl = () => {
    // Generate the export URL for this property's calendar
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/api/ical/export/${propertyId}`;
    setExportUrl(url);
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
      const feed: ICalFeed = {
        id: Date.now().toString(),
        property_id: propertyId,
        name: newFeed.name.trim(),
        url: newFeed.url.trim(),
        active: true,
        last_sync: null,
        sync_status: 'pending'
      };

      const updatedFeeds = [...icalFeeds, feed];
      setIcalFeeds(updatedFeeds);
      localStorage.setItem(`ical_feeds_${propertyId}`, JSON.stringify(updatedFeeds));

      toast({
        title: "iCal feed added",
        description: "The feed will be synced automatically"
      });

      setNewFeed({ name: '', url: '' });
      setShowAddFeed(false);

      // Trigger initial sync
      syncFeed(feed.id);
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
      const updatedFeeds = icalFeeds.filter(f => f.id !== feedId);
      setIcalFeeds(updatedFeeds);
      localStorage.setItem(`ical_feeds_${propertyId}`, JSON.stringify(updatedFeeds));

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
      const updatedFeeds = icalFeeds.map(f => 
        f.id === feedId ? { ...f, active } : f
      );
      setIcalFeeds(updatedFeeds);
      localStorage.setItem(`ical_feeds_${propertyId}`, JSON.stringify(updatedFeeds));

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
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 2000));

      const updatedFeeds = icalFeeds.map(f => 
        f.id === feedId 
          ? { 
              ...f, 
              last_sync: new Date().toISOString(),
              sync_status: 'success' as const,
              error_message: undefined
            }
          : f
      );
      setIcalFeeds(updatedFeeds);
      localStorage.setItem(`ical_feeds_${propertyId}`, JSON.stringify(updatedFeeds));

      toast({
        title: "Sync completed",
        description: "Calendar has been synchronized successfully"
      });
    } catch (error) {
      console.error('Error syncing feed:', error);
      const updatedFeeds = icalFeeds.map(f => 
        f.id === feedId 
          ? { 
              ...f, 
              sync_status: 'error' as const,
              error_message: 'Failed to sync calendar'
            }
          : f
      );
      setIcalFeeds(updatedFeeds);
      localStorage.setItem(`ical_feeds_${propertyId}`, JSON.stringify(updatedFeeds));

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

  const getSyncStatusIcon = (status: ICalFeed['sync_status']) => {
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
            <Switch checked={autoSync} onCheckedChange={setAutoSync} />
          </div>
          
          {autoSync && (
            <div>
              <Label>Sync interval (minutes)</Label>
              <Input
                type="number"
                value={syncInterval}
                onChange={(e) => setSyncInterval(parseInt(e.target.value) || 15)}
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