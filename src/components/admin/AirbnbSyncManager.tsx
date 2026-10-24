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
import { sv } from 'date-fns/locale';

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
  }, [propertyId]);

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
      const { data: property, error } = await supabase
        .from('property_private_details')
        .select('ical_export_secret')
        .eq('property_id', propertyId)
        .single();

      if (error) throw error;

      // Generate the export URL for this property's calendar
      const baseUrl = 'https://bbuutvozqfzbsnllsiai.supabase.co';
      const url = `${baseUrl}/functions/v1/export-ical/${propertyId}?secret=${property.ical_export_secret}`;
      setExportUrl(url);
    } catch (error) {
      console.error('Error generating export URL:', error);
      const baseUrl = 'https://bbuutvozqfzbsnllsiai.supabase.co';
      const url = `${baseUrl}/functions/v1/export-ical/${propertyId}`;
      setExportUrl(url);
    }
  };

  const addIcalFeed = async () => {
    if (!newFeed.name.trim() || !newFeed.url.trim()) {
      toast({
        title: "Uppgifter saknas",
        description: "Fyll i både namn och kalenderlänk",
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
        title: "Kalenderlänken är tillagd",
        description: "Kalendern synkas automatiskt"
      });

      setNewFeed({ name: '', url: '' });
      setShowAddFeed(false);

      // Trigger initial sync
      syncFeed(data.id);
    } catch (error) {
      console.error('Error adding iCal feed:', error);
      toast({
        title: "Något gick fel",
        description: "Det gick inte att lägga till kalenderlänken",
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
        title: "Borttagen",
        description: "Kalenderlänken är borttagen"
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
        title: active ? "Synk på" : "Synk av",
        description: `Kalenderlänken är ${active ? 'påslagen' : 'avstängd'}`
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
        title: "Synken är klar",
        description: `Kalendern är synkad. ${data.datesUpdated} datum blockerade, ${data.datesReleased ?? 0} lediga igen efter avbokningar.`
      });
    } catch (error) {
      console.error('Error syncing feed:', error);
      await loadIcalFeeds(); // Shows the feed's error message
      toast({
        title: "Synken misslyckades",
        description: "Det gick inte att synka kalendern",
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
        title: "Kopierad",
        description: "Kalenderlänken är kopierad"
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
        <h3 className="text-lg font-semibold">Airbnb och kalendersynk</h3>
        <p className="text-sm text-muted-foreground">
          Synka din kalender med Airbnb och andra bokningssajter
        </p>
      </div>

      {/* Export Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportera kalender
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Kalenderlänk för ditt boende (iCal)</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Använd länken för att importera din kalender till Airbnb, VRBO eller andra bokningssajter
            </p>
            <div className="flex gap-2">
              <Input 
                value={exportUrl} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button onClick={copyExportUrl} size="sm">
                Kopiera
              </Button>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Så här gör du:</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Kopiera länken ovan</li>
              <li>2. Gå till kalenderinställningarna på Airbnb</li>
              <li>3. Välj ”Importera kalender” och klistra in länken</li>
              <li>4. Dina bokningar på Nordic Getaways syns nu på Airbnb</li>
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
              Importera kalendrar
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={syncAllFeeds}
                disabled={syncing || icalFeeds.length === 0}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Synka alla
              </Button>
              <Dialog open={showAddFeed} onOpenChange={setShowAddFeed}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Lägg till kalenderlänk
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Lägg till kalenderlänk</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Namn</Label>
                      <Input
                        value={newFeed.name}
                        onChange={(e) => setNewFeed({ ...newFeed, name: e.target.value })}
                        placeholder="t.ex. Airbnb"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Kalenderlänk (iCal)</Label>
                      <Textarea
                        value={newFeed.url}
                        onChange={(e) => setNewFeed({ ...newFeed, url: e.target.value })}
                        placeholder="https://..."
                        rows={3}
                      />
                      <p className="text-sm text-muted-foreground">
                        Du hittar länken under export av kalender i kalenderinställningarna på Airbnb
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAddFeed(false)}>
                        Avbryt
                      </Button>
                      <Button onClick={addIcalFeed}>
                        Lägg till
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
                          ? `Senast synkad: ${format(new Date(feed.last_sync), 'd MMMM HH:mm', { locale: sv })}`
                          : 'Inte synkad än'
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
              <h4 className="font-medium mb-2">Inga kalendrar tillagda</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Importera kalendrar från Airbnb, VRBO och andra bokningssajter så slipper du dubbelbokningar
              </p>
              <Button onClick={() => setShowAddFeed(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Lägg till din första kalender
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
            Synkinställningar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Automatisk synk</Label>
              <p className="text-sm text-muted-foreground">
                Synka kalendrarna automatiskt med jämna mellanrum
              </p>
            </div>
            <Switch checked={autoSync} onCheckedChange={setAutoSync} />
          </div>
          
          {autoSync && (
            <div>
              <Label>Synkintervall (minuter)</Label>
              <Input
                type="number"
                value={syncInterval}
                onChange={(e) => setSyncInterval(parseInt(e.target.value) || 15)}
                min="5"
                max="60"
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Hur ofta kalendrarna ska kollas efter ändringar (5–60 minuter)
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};