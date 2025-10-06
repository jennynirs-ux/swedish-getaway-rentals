import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Edit2, Calendar, Settings } from "lucide-react";
import AvailabilityCalendar from "./AvailabilityCalendar";
import PropertyDetailEditor from "./PropertyDetailEditor";

interface Property {
  id: string;
  title: string;
  location: string | null;
  price_per_night: number;
  currency: string;
  active: boolean;
  max_guests: number;
}

const PropertiesManagement = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Property | null>(null);
  const [showCalendarFor, setShowCalendarFor] = useState<Property | null>(null);
  const [editingDetailPropertyId, setEditingDetailPropertyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    location: "",
    price_per_night: "",
    currency: "SEK",
    active: true,
    max_guests: "4",
  });

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, location, price_per_night, currency, active, max_guests')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
      toast({ title: 'Error', description: 'Failed to load properties', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (p: Property) => {
    setEditing(p);
    setForm({
      title: p.title,
      location: p.location || "",
      price_per_night: p.price_per_night.toString(),
      currency: p.currency,
      active: p.active,
      max_guests: p.max_guests.toString(),
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          title: form.title.trim(),
          location: form.location.trim() || null,
          price_per_night: parseInt(form.price_per_night || '0', 10),
          currency: form.currency,
          active: form.active,
          max_guests: parseInt(form.max_guests || '1', 10),
        })
        .eq('id', editing.id);
      if (error) throw error;
      toast({ title: 'Saved', description: 'Property updated' });
      setEditing(null);
      await loadProperties();
    } catch (error) {
      console.error('Error updating property:', error);
      toast({ title: 'Error', description: 'Failed to update property', variant: 'destructive' });
    }
  };

  const toggleActive = async (p: Property, value: boolean) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ active: value })
        .eq('id', p.id);
      if (error) throw error;
      await loadProperties();
      toast({ title: 'Updated', description: 'Property visibility changed' });
    } catch (error) {
      console.error('Error toggling active:', error);
      toast({ title: 'Error', description: 'Failed to change visibility', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Properties</h2>
          <p className="text-muted-foreground">Manage your rental properties</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Price / night</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.location || '-'}</TableCell>
                  <TableCell>{p.price_per_night.toLocaleString()} {p.currency}</TableCell>
                  <TableCell>{p.max_guests}</TableCell>
                  <TableCell>
                    <Badge variant={p.active ? 'default' : 'secondary'}>
                      {p.active ? 'Active' : 'Hidden'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(p)}>
                        <Edit2 className="h-4 w-4 mr-2" /> Quick Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingDetailPropertyId(p.id)}>
                        <Settings className="h-4 w-4 mr-2" /> Full Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowCalendarFor(p)}>
                        <Calendar className="h-4 w-4 mr-2" /> Availability
                      </Button>
                      <div className="flex items-center gap-2 ml-2">
                        <Switch checked={p.active} onCheckedChange={(v) => toggleActive(p, v)} />
                        <span className="text-sm text-muted-foreground">Visible</span>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editing && (
        <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Edit Property</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Price per night (SEK)</Label>
                <Input type="number" value={form.price_per_night} onChange={(e) => setForm({ ...form, price_per_night: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Max guests</Label>
                <Input type="number" value={form.max_guests} onChange={(e) => setForm({ ...form, max_guests: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={saveEdit}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Availability Dialog */}
      {showCalendarFor && (
        <Dialog open={!!showCalendarFor} onOpenChange={(open) => !open && setShowCalendarFor(null)}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Availability — {showCalendarFor.title}</DialogTitle>
            </DialogHeader>
            <AvailabilityCalendar defaultPropertyId={showCalendarFor.id} />
          </DialogContent>
        </Dialog>
      )}

      {/* Full Property Detail Editor */}
      {editingDetailPropertyId && (
        <PropertyDetailEditor
          propertyId={editingDetailPropertyId}
          open={!!editingDetailPropertyId}
          onClose={() => setEditingDetailPropertyId(null)}
          onSave={() => {
            setEditingDetailPropertyId(null);
            loadProperties();
          }}
        />
      )}
    </div>
  );
};

export default PropertiesManagement;
