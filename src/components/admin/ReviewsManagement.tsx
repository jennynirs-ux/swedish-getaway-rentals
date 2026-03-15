// IMP-005: TODO - Add bulk moderation actions (approve/reject multiple reviews)
// IMP-006: TODO - Add review sentiment analysis and flagging thresholds
// IMP-008: TODO - Add export functionality for review reports
// IMP-010: TODO - Add moderation audit trail

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Star, Eye, Flag, Trash2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Review {
  id: string;
  booking_id: string;
  reviewer: {
    full_name?: string;
    display_name?: string;
    email?: string;
  };
  reviewee: {
    full_name?: string;
    display_name?: string;
    email?: string;
  };
  review_type: string;
  rating: number;
  comment?: string;
  moderation_status: string;
  is_published: boolean;
  created_at: string;
}

const ReviewsManagement = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    setCurrentPage(0);
    fetchReviews(0);
  }, [filter]);

  const fetchReviews = async (page: number) => {
    try {
      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(full_name, display_name, email),
          reviewee:profiles!reviews_reviewee_id_fkey(full_name, display_name, email)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filter !== "all") {
        query = query.eq('moderation_status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setReviews((data as Review[]) || []);
      setCurrentPage(page);
      // Disable load more if we got fewer items than requested (meaning no more data)
      setHasMore((data?.length ?? 0) >= ITEMS_PER_PAGE);
    } catch (error: any) {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleModerationAction = async (reviewId: string, status: string) => {
    try {
      // Validate status is one of the allowed values
      const allowedStatuses = ['approved', 'rejected', 'pending'];
      if (!allowedStatuses.includes(status)) {
        toast.error('Invalid moderation status');
        return;
      }

      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;

      // Check if user ID is defined - session may have expired
      if (!userId) {
        toast.error('Session expired, please log in again');
        return;
      }

      const { error } = await supabase
        .from('reviews')
        .update({
          moderation_status: status,
          moderated_at: new Date().toISOString(),
          moderated_by: userId
        })
        .eq('id', reviewId);

      if (error) throw error;

      toast.success(`Review ${status} successfully`);
      fetchReviews(currentPage);
    } catch (error: any) {
      toast.error('Failed to update review');
    }
  };

  const handleDelete = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      toast.success('Review deleted successfully');
      setDeleteConfirm(null);
      fetchReviews(currentPage);
    } catch (error: any) {
      toast.error('Failed to delete review');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
      flagged: "outline"
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8">Loading reviews...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Reviews Management</CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reviews</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reviewer</TableHead>
                <TableHead>Reviewee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {review.reviewer.display_name || review.reviewer.full_name || 'Anonymous'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {review.reviewer.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {review.reviewee.display_name || review.reviewee.full_name || 'Anonymous'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {review.reviewee.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {review.review_type.replace('_', ' to ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {review.rating}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(review.moderation_status)}</TableCell>
                  <TableCell>
                    {new Date(review.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {review.moderation_status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleModerationAction(review.id, 'approved')}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleModerationAction(review.id, 'rejected')}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleModerationAction(review.id, 'flagged')}
                      >
                        <Flag className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteConfirm(review.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {reviews.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No reviews found
            </div>
          )}

          {/* BUG-021: Pagination controls */}
          {reviews.length > 0 && (
            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => fetchReviews(currentPage - 1)}
                disabled={currentPage === 0}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage + 1}
              </span>
              <Button
                variant="outline"
                onClick={() => fetchReviews(currentPage + 1)}
                disabled={!hasMore}
              >
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm) {
                  handleDelete(deleteConfirm);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReviewsManagement;