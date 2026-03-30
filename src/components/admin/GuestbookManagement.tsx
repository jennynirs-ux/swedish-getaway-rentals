// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Eye, Trash2, Star } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface GuestbookEntry {
  id: string;
  property_id: string;
  guest_name: string | null;
  guest_email: string;
  message: string;
  rating: number | null;
  image_url: string | null;
  stay_date: string | null;
  status: string;
  created_at: string;
  properties: {
    title: string;
  };
}

const GuestbookManagement = () => {
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  useEffect(() => {
    fetchEntries();
  }, [filter]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("guestbook_entries")
        .select(`
          *,
          properties (
            title
          )
        `)
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching guestbook entries:", error);
      toast.error("Failed to load guestbook entries");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("guestbook_entries")
        .update({ 
          status,
          moderated_by: user?.id,
          moderated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Entry ${status === "approved" ? "approved" : "rejected"} successfully`);
      fetchEntries();
    } catch (error) {
      console.error("Error updating entry:", error);
      toast.error("Failed to update entry");
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from("guestbook_entries")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Entry deleted successfully");
      fetchEntries();
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast.error("Failed to delete entry");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Guestbook Management</h2>
        <p className="text-muted-foreground">
          Review and moderate guest entries
        </p>
      </div>

      <div className="flex gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            onClick={() => setFilter(status)}
            size="sm"
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading entries...</div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No {filter !== "all" && filter} entries found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {entry.guest_name || "Anonymous Guest"}
                    </CardTitle>
                    <CardDescription>
                      {entry.properties?.title} • {new Date(entry.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {getStatusBadge(entry.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {entry.rating && (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: entry.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                )}

                <p className="text-foreground/90 italic border-l-2 border-primary/20 pl-4">
                  "{entry.message}"
                </p>

                {entry.image_url && (
                  <div className="max-w-md">
                    <img
                      src={entry.image_url}
                      alt="Guest memory"
                      loading="lazy"
                      decoding="async"
                      className="rounded-lg w-full h-auto object-cover"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {entry.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => updateStatus(entry.id, "approved")}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateStatus(entry.id, "rejected")}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  )}

                  {entry.status === "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(entry.id, "rejected")}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Unpublish
                    </Button>
                  )}

                  {entry.status === "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(entry.id, "approved")}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Guestbook Entry</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to permanently delete this entry? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteEntry(entry.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default GuestbookManagement;
