// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, MessageSquare, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type TriggerType =
  | "booking_confirmed"
  | "days_before_checkin"
  | "day_of_checkin"
  | "day_after_checkout";

interface Template {
  id: string;
  host_id: string;
  name: string;
  trigger_type: TriggerType;
  trigger_days?: number | null;
  subject: string;
  body: string;
  enabled: boolean;
  created_at: string;
}

const TRIGGER_OPTIONS: { value: TriggerType; label: string; needsDays: boolean }[] = [
  { value: "booking_confirmed", label: "Direkt när bokningen är bekräftad", needsDays: false },
  { value: "days_before_checkin", label: "X dagar före incheckning", needsDays: true },
  { value: "day_of_checkin", label: "På incheckningsdagen (morgon)", needsDays: false },
  { value: "day_after_checkout", label: "Dagen efter utcheckning (be om omdöme)", needsDays: false },
];

const TRIGGER_LABEL_SHORT: Record<TriggerType, string> = {
  booking_confirmed: "Vid bokning",
  days_before_checkin: "Före incheckning",
  day_of_checkin: "Incheckningsdag",
  day_after_checkout: "Efter utcheckning",
};

// The template names are the host's own labels and are in Swedish; the
// subjects and bodies go to guests and stay in English.
const DEFAULT_TEMPLATES = [
  {
    name: "Bokningsbekräftelse",
    trigger_type: "booking_confirmed" as TriggerType,
    trigger_days: null,
    subject: "Thanks for booking {property_title}!",
    body: `Hej {guest_name}!

Thanks for booking {property_title}. I'm looking forward to hosting you from {check_in_date} to {check_out_date}.

If you have any questions in the meantime, feel free to reply here.

Best,
{host_name}`,
  },
  {
    name: "Info före ankomst",
    trigger_type: "days_before_checkin" as TriggerType,
    trigger_days: 3,
    subject: "Check-in info for {property_title}",
    body: `Hej {guest_name}!

Your stay at {property_title} is coming up in 3 days. Here's what you need to know:

- Check-in: {check_in_date} from [your check-in time]
- Check-out: {check_out_date} by [your check-out time]
- Full arrival instructions will follow closer to your stay.

Looking forward to welcoming you!

{host_name}`,
  },
  {
    name: "Välkommen på ankomstdagen",
    trigger_type: "day_of_checkin" as TriggerType,
    trigger_days: null,
    subject: "Welcome! Arrival info for today",
    body: `Hej {guest_name}!

Welcome to {property_title}. Everything is ready for your arrival today.

If you need anything during your stay, just send a message here.

Hope you have a wonderful time!
{host_name}`,
  },
  {
    name: "Be om omdöme",
    trigger_type: "day_after_checkout" as TriggerType,
    trigger_days: null,
    subject: "Hope you enjoyed {property_title}!",
    body: `Hej {guest_name}!

Thank you for staying at {property_title}. I hope you had a great time!

If you have a moment, it would mean a lot if you could leave a review. It helps other guests and helps me continue improving.

Thanks again,
{host_name}`,
  },
];

const PLACEHOLDERS = [
  "{guest_name}",
  "{property_title}",
  "{check_in_date}",
  "{check_out_date}",
  "{host_name}",
  "{booking_id}",
];

/**
 * Automated guest messaging templates.
 *
 * Hosts define reusable message templates with triggers (on booking,
 * X days before check-in, etc.). A future scheduled job can dispatch
 * these. For now this is the configuration UI — the sending itself
 * needs an edge function + cron (documented as a follow-up).
 *
 * Supports placeholder substitution for common fields.
 */
const HostMessageTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);

  const [form, setForm] = useState({
    name: "",
    trigger_type: "days_before_checkin" as TriggerType,
    trigger_days: 3,
    subject: "",
    body: "",
    enabled: true,
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userData.user.id)
        .single();
      if (!profile) return;

      const { data, error } = await supabase
        .from("host_message_templates")
        .select("*")
        .eq("host_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) {
        // Table likely doesn't exist yet — show migration hint
        setTableMissing(true);
        setTemplates([]);
      } else {
        setTemplates(data || []);
        setTableMissing(false);
      }
    } catch {
      setTableMissing(true);
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm({
      name: "",
      trigger_type: "days_before_checkin",
      trigger_days: 3,
      subject: "",
      body: "",
      enabled: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({
      name: t.name,
      trigger_type: t.trigger_type,
      trigger_days: t.trigger_days ?? 3,
      subject: t.subject,
      body: t.body,
      enabled: t.enabled,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.body.trim()) {
      toast.error("Fyll i namn och meddelande");
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userData.user?.id)
        .single();
      if (!profile) return;

      const payload = {
        host_id: profile.id,
        name: form.name.trim(),
        trigger_type: form.trigger_type,
        trigger_days: TRIGGER_OPTIONS.find((o) => o.value === form.trigger_type)?.needsDays
          ? form.trigger_days
          : null,
        subject: form.subject.trim(),
        body: form.body.trim(),
        enabled: form.enabled,
      };

      if (editing) {
        const { error } = await supabase
          .from("host_message_templates")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Mallen är uppdaterad");
      } else {
        const { error } = await supabase.from("host_message_templates").insert(payload);
        if (error) throw error;
        toast.success("Mallen är skapad");
      }

      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error((e as Error).message || "Det gick inte att spara mallen");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Vill du ta bort mallen?")) return;
    try {
      const { error } = await supabase.from("host_message_templates").delete().eq("id", id);
      if (error) throw error;
      toast.success("Mallen är borttagen");
      load();
    } catch {
      toast.error("Det gick inte att ta bort mallen");
    }
  };

  const seedDefaults = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userData.user?.id)
        .single();
      if (!profile) return;

      const rows = DEFAULT_TEMPLATES.map((t) => ({
        ...t,
        host_id: profile.id,
        enabled: true,
      }));

      const { error } = await supabase.from("host_message_templates").insert(rows);
      if (error) throw error;
      // "Info före ankomst" (Pre-arrival info) has blanks for the times, which differ per cabin
      toast.success("4 startmallar har lagts till. Fyll i dina tider för in- och utcheckning i \"Info före ankomst\".");
      load();
    } catch (e) {
      toast.error((e as Error).message || "Det gick inte att lägga till startmallarna");
    }
  };

  const needsDays =
    TRIGGER_OPTIONS.find((o) => o.value === form.trigger_type)?.needsDays ?? false;

  if (tableMissing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Meddelandemallar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted/50 p-4 text-sm space-y-2">
            <p className="font-medium">Databasen behöver uppdateras</p>
            <p className="text-muted-foreground">
              Tabellen <code>host_message_templates</code> finns inte än. Kör migreringen i
              Supabase SQL Editor för att slå på funktionen.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Meddelandemallar
            <Badge variant="secondary">{templates.length}</Badge>
          </CardTitle>
          <div className="flex gap-2">
            {templates.length === 0 && !loading && (
              <Button variant="outline" size="sm" onClick={seedDefaults}>
                Lägg till startmallar
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openNew}>
                  <Plus className="h-4 w-4 mr-1" /> Ny mall
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>{editing ? "Redigera mall" : "Ny mall"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Namn *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="t.ex. Info före ankomst"
                    />
                  </div>
                  <div>
                    <Label>Tidpunkt *</Label>
                    <Select
                      value={form.trigger_type}
                      onValueChange={(v) => setForm({ ...form, trigger_type: v as TriggerType })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TRIGGER_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {needsDays && (
                    <div>
                      <Label>Dagar före incheckning</Label>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={form.trigger_days}
                        onChange={(e) => setForm({ ...form, trigger_days: Number(e.target.value) || 1 })}
                      />
                    </div>
                  )}
                  <div>
                    <Label>Ämne</Label>
                    <Input
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="Check-in info for {property_title}"
                    />
                  </div>
                  <div>
                    <Label>Meddelande *</Label>
                    <Textarea
                      value={form.body}
                      onChange={(e) => setForm({ ...form, body: e.target.value })}
                      rows={8}
                      placeholder="Hej {guest_name}! ..."
                    />
                    <div className="mt-2 flex flex-wrap gap-1">
                      {PLACEHOLDERS.map((p) => (
                        <Badge
                          key={p}
                          variant="outline"
                          className="cursor-pointer text-xs"
                          onClick={() => setForm({ ...form, body: form.body + " " + p })}
                        >
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enabled" className="flex items-center gap-2 cursor-pointer">
                      <Switch
                        id="enabled"
                        checked={form.enabled}
                        onCheckedChange={(c) => setForm({ ...form, enabled: c })}
                      />
                      Aktiv
                    </Label>
                    <Button onClick={save}>
                      {editing ? "Spara" : "Skapa"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Laddar mallar...</p>
        ) : templates.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="font-medium">Inga mallar än</p>
            <p className="text-sm">Skapa mallar så sparar du tid på meddelanden du skickar ofta.</p>
          </div>
        ) : (
          templates.map((t) => (
            <div
              key={t.id}
              className="flex items-start justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{t.name}</p>
                  <Badge variant="outline" className="text-xs">
                    {TRIGGER_LABEL_SHORT[t.trigger_type]}
                    {t.trigger_days ? ` (${t.trigger_days} ${t.trigger_days === 1 ? "dag" : "dagar"})` : ""}
                  </Badge>
                  {!t.enabled && (
                    <Badge variant="secondary" className="text-xs">Inaktiv</Badge>
                  )}
                </div>
                {t.subject && (
                  <p className="text-sm text-muted-foreground truncate mt-0.5">{t.subject}</p>
                )}
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {t.body}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(t.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}

        <div className="flex items-start gap-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground mt-2">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <p>
            Mallarna sparas redan nu. Automatiskt utskick kräver en schemalagd funktion som kommer
            senare. Fram till dess kan du använda mallarna som färdiga textblock.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HostMessageTemplates;
