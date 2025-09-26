import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

  useEffect(() => {
    fetchReviews();
  }, [filter]);

  const fetchReviews = async () => {
    try {
      let query = supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(full_name, display_name, email),
          reviewee:profiles!reviews_reviewee_id_fkey(full_name, display_name, email)
        `)
        .order('created_at', { ascending: false });

      if (filter !== "all") {
        query = query.eq('moderation_status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setReviews((data as any) || []);
    } catch (error: any) {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleModerationAction = async (reviewId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ 
          moderation_status: status,
          moderated_at: new Date().toISOString(),
          moderated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', reviewId);

      if (error) throw error;

      toast.success(`Review ${status} successfully`);
      fetchReviews();
    } catch (error: any) {
      toast.error('Failed to update review');
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      toast.success('Review deleted successfully');
      fetchReviews();
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
                        onClick={() => handleDelete(review.id)}
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
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewsManagement;