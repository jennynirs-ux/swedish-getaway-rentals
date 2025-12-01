import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Percent, Calendar, Users, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";
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

interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  minimum_amount: number | null;
  maximum_discount_amount: number | null;
  valid_until: string;
  usage_limit: number | null;
  used_count: number | null;
  is_active: boolean;
  created_at: string;
}

interface PropertyCouponsListProps {
  propertyId: string;
  onUpdate?: () => void;
}

export const PropertyCouponsList = ({ propertyId, onUpdate }: PropertyCouponsListProps) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoupons();
  }, [propertyId]);

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const toggleCouponStatus = async (couponId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: !currentStatus })
        .eq('id', couponId);

      if (error) throw error;

      toast.success(`Coupon ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchCoupons();
      onUpdate?.();
    } catch (error) {
      console.error('Error updating coupon:', error);
      toast.error('Failed to update coupon status');
    }
  };

  const deleteCoupon = async (couponId: string) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', couponId);

      if (error) throw error;

      toast.success('Coupon deleted successfully');
      fetchCoupons();
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error('Failed to delete coupon');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isExpired = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading coupons...</div>;
  }

  if (coupons.length === 0) {
    return (
      <div className="text-center p-6 border border-dashed rounded-lg">
        <Tag className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Coupons Yet</h3>
        <p className="text-sm text-muted-foreground">
          Create your first coupon below to offer discounts to your guests.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Active Property Coupons</h3>
      <div className="space-y-4">
        {coupons.map((coupon) => {
          const expired = isExpired(coupon.valid_until);
          const isVisible = coupon.is_active && !expired;

          return (
            <Card key={coupon.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-lg">{coupon.name}</h4>
                        <Badge variant="outline" className="font-mono">
                          {coupon.code}
                        </Badge>
                      </div>
                      {coupon.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {coupon.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={isVisible ? "default" : "secondary"}>
                        {isVisible ? "Visible to Guests" : expired ? "Expired" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  {/* Discount Details */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Percent className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {coupon.discount_type === 'percentage' 
                          ? `${coupon.discount_value}% off`
                          : `${coupon.discount_value} SEK off`
                        }
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className={expired ? "text-destructive" : ""}>
                        Valid until {formatDate(coupon.valid_until)}
                      </span>
                    </div>

                    {coupon.usage_limit && (
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {coupon.used_count || 0} / {coupon.usage_limit} uses
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Additional Info */}
                  {(coupon.minimum_amount || coupon.maximum_discount_amount) && (
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                      {coupon.minimum_amount && (
                        <span>Min. booking: {coupon.minimum_amount} SEK</span>
                      )}
                      {coupon.maximum_discount_amount && (
                        <span>Max. discount: {coupon.maximum_discount_amount} SEK</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Active</span>
                    <Switch
                      checked={coupon.is_active}
                      onCheckedChange={() => toggleCouponStatus(coupon.id, coupon.is_active)}
                      disabled={expired}
                    />
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Coupon</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the coupon "{coupon.code}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteCoupon(coupon.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};