import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, CheckCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getCleaningTasks,
  updateCleaningTask,
  notifyCleaner,
  type CleaningTask,
  type CleaningStatus,
} from "@/services/cleaningService";

const statusConfig: Record<CleaningStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  notified: { label: "Notified", color: "bg-blue-100 text-blue-800" },
  in_progress: { label: "In Progress", color: "bg-orange-100 text-orange-800" },
  completed: { label: "Completed", color: "bg-green-100 text-green-800" },
};

interface Property {
  id: string;
  title: string;
}

const CleaningManagement = () => {
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [assignDialog, setAssignDialog] = useState<CleaningTask | null>(null);
  const [cleanerForm, setCleanerForm] = useState({ name: "", email: "" });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [taskData, { data: propertyData }] = await Promise.all([
        getCleaningTasks({
          status: filterStatus !== "all" ? (filterStatus as CleaningStatus) : undefined,
          propertyId: filterProperty !== "all" ? filterProperty : undefined,
        }),
        supabase.from("properties").select("id, title").eq("active", true).order("title"),
      ]);
      setTasks(taskData);
      setProperties(propertyData || []);
    } catch {
      toast.error("Failed to load cleaning tasks");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterProperty]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNotify = async (task: CleaningTask) => {
    if (!task.cleaner_email) {
      setAssignDialog(task);
      return;
    }
    try {
      await notifyCleaner(task.id);
      toast.success(`Notification sent to ${task.cleaner_email}`);
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to notify cleaner");
    }
  };

  const handleAssignAndNotify = async () => {
    if (!assignDialog || !cleanerForm.email) {
      toast.error("Please enter a cleaner email");
      return;
    }
    try {
      await updateCleaningTask(assignDialog.id, {
        cleaner_name: cleanerForm.name || undefined,
        cleaner_email: cleanerForm.email,
      });
      await notifyCleaner(assignDialog.id);
      toast.success(`Cleaner assigned and notified: ${cleanerForm.email}`);
      setAssignDialog(null);
      setCleanerForm({ name: "", email: "" });
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign cleaner");
    }
  };

  const handleMarkComplete = async (taskId: string) => {
    try {
      await updateCleaningTask(taskId, { status: "completed" });
      toast.success("Task marked as complete");
      loadData();
    } catch {
      toast.error("Failed to update task");
    }
  };

  const getPropertyTitle = (id: string) => properties.find((p) => p.id === id)?.title || "—";
  const pendingCount = tasks.filter((t) => t.status === "pending" || t.status === "notified").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Cleaning Tasks
          </h3>
          <p className="text-sm text-muted-foreground">{pendingCount} pending, {tasks.length} total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(statusConfig).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterProperty} onValueChange={setFilterProperty}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All properties" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All properties</SelectItem>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Cleaner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-36">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No cleaning tasks. Tasks are auto-created when bookings are confirmed.
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => {
                  const config = statusConfig[task.status];
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="text-sm">{task.scheduled_date}</TableCell>
                      <TableCell className="text-sm font-medium">{getPropertyTitle(task.property_id)}</TableCell>
                      <TableCell className="text-sm">
                        {task.cleaner_name || task.cleaner_email || (
                          <span className="text-muted-foreground italic">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={config.color}>{config.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {task.status !== "completed" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleNotify(task)}
                                title={task.cleaner_email ? "Notify cleaner" : "Assign cleaner"}
                              >
                                <Bell className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkComplete(task.id)}
                                title="Mark complete"
                              >
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Cleaner Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={(open) => !open && setAssignDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Cleaner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Property: <strong>{assignDialog ? getPropertyTitle(assignDialog.property_id) : ""}</strong>
              <br />Date: <strong>{assignDialog?.scheduled_date}</strong>
            </p>
            <div>
              <Label>Cleaner Name</Label>
              <Input
                value={cleanerForm.name}
                onChange={(e) => setCleanerForm({ ...cleanerForm, name: e.target.value })}
                placeholder="Anna Johansson"
              />
            </div>
            <div>
              <Label>Cleaner Email *</Label>
              <Input
                type="email"
                value={cleanerForm.email}
                onChange={(e) => setCleanerForm({ ...cleanerForm, email: e.target.value })}
                placeholder="cleaner@email.com"
                required
              />
            </div>
            <Button onClick={handleAssignAndNotify} className="w-full">
              Assign & Notify
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CleaningManagement;
