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
  { value: "booking_confirmed", label: "Right after booking is confirmed", needsDays: false },
  { value: "days_before_checkin", label: "X days before check-in", needsDays: true },
  { value: "day_of_checkin", label: "On check-in day (morning)", needsDays: false },
  { value: "day_after_checkout", label: "Day after check-out (review request)", needsDays: false },
];

const TRIGGER_LABEL_SHORT: Record<TriggerType, string> = {
  booking_confirmed: "On booking",
  days_before_checkin: "Before check-in",
  day_of_checkin: "Check-in day",
  day_after_checkout: "After check-out",
};

const DEFAULT_TEMPLATES = [
  {
    name: "Booking confirmation",
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
    name: "Pre-arrival info",
    trigger_type: "days_before_checkin" as TriggerType,
    trigger_days: 3,
    subject: "Check-in info for {property_title}",
    body: `Hej {guest_name}!

Your stay at {property_title} is coming up in 3 days. Here's what you need to know:

- Check-in: {check_in_date} from 15:00
- Check-out: {check_out_date} by 11:00
- Full arrival instructions will follow closer to your stay.

Looking forward to welcoming you!

{host_name}`,
  },
  {
    name: "Welcome on arrival day",
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
    name: "Review request",
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
      toast.error("Name and body are required");
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
        toast.success("Template updated");
      } else {
        const { error } = await supabase.from("host_message_templates").insert(payload);
        if (error) throw error;
        toast.success("Template created");
      }

      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error((e as Error).message || "Failed to save template");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      const { error } = await supabase.from("host_message_templates").delete().eq("id", id);
      if (error) throw error;
      toast.success("Template deleted");
      load();
    } catch {
      toast.error("Failed to delete");
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
      toast.success("4 starter templates added");
      load();
    } catch (e) {
      toast.error((e as Error).message || "Failed to seed templates");
    }
  };

  const needsDays =
    TRIGGER_OPTIONS.find((o) => o.value === form.trigger_type)?.needsDays ?? false;

  if (tableMissing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Message Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted/50 p-4 text-sm space-y-2">
            <p className="font-medium">Database migration needed</p>
            <p className="text-muted-foreground">
              The <code>host_message_templates</code> table hasn't been created yet. Run the
              migration in Supabase SQL Editor to enable this feature.
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
            Message Templates
            <Badge variant="secondary">{templates.length}</Badge>
          </CardTitle>
          <div className="flex gap-2">
            {templates.length === 0 && !loading && (
              <Button variant="outline" size="sm" onClick={seedDefaults}>
                Load starter templates
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openNew}>
                  <Plus className="h-4 w-4 mr-1" /> New template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit template" : "New template"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Name *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g., Pre-arrival info"
                    />
                  </div>
                  <div>
                    <Label>Trigger *</Label>
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
                      <Label>Days before check-in</Label>
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
                    <Label>Subject</Label>
                    <Input
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="Check-in info for {property_title}"
                    />
                  </div>
                  <div>
                    <Label>Message body *</Label>
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
                      Enabled
                    </Label>
                    <Button onClick={save}>
                      {editing ? "Update" : "Create"}
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
          <p className="text-sm text-muted-foreground">Loading templates...</p>
        ) : templates.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="font-medium">No templates yet</p>
            <p className="text-sm">Create templates to save time on recurring messages.</p>
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
                    {t.trigger_days ? ` (${t.trigger_days}d)` : ""}
                  </Badge>
                  {!t.enabled && (
                    <Badge variant="secondary" className="text-xs">Disabled</Badge>
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
            Templates are stored now. Automatic sending requires a scheduled edge function
            (deployable later) — for now templates can be used as quick-insert snippets.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HostMessageTemplates;
