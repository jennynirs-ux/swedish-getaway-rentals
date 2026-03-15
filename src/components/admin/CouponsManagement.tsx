// IMP-005: TODO - Add bulk actions for coupons (enable/disable multiple)
// IMP-006: TODO - Add coupon usage analytics and detailed reports
// IMP-008: TODO - Add export functionality for coupon data

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Edit, Trash2, Plus, Calendar, Percent } from "lucide-react";
import CouponForm from "@/components/CouponForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Coupon {
  id: string;
  code: string;
  name: string;
  description?: string;
  discount_type: string;
  discount_value: number;
  currency: string;
  minimum_amount?: number;
  maximum_discount_amount?: number;
  valid_from: string;
  valid_until: string;
  usage_limit?: number;
  used_count: number;
  property_id?: string;
  is_active: boolean;
  created_at: string;
  applicable_to: 'bookings' | 'products' | 'both';
  property?: {
    title: string;
  };
}

const CouponsManagement = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select(`
          id,
          code,
          name,
          description,
          discount_type,
          discount_value,
          currency,
          minimum_amount,
          maximum_discount_amount,
          valid_from,
          valid_until,
          usage_limit,
          used_count,
          property_id,
          is_active,
          created_at,
          applicable_to
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Coupon fetch error:', error);
        throw error;
      }
      

      setCoupons((data as Coupon[]) || []);
    } catch (error: any) {
      console.error('Failed to load coupons:', error);
      toast.error(`Failed to load coupons: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (couponId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: !isActive })
        .eq('id', couponId);

      if (error) throw error;

      toast.success(`Coupon ${!isActive ? 'activated' : 'deactivated'} successfully`);
      fetchCoupons();
    } catch (error: any) {
      toast.error('Failed to update coupon');
    }
  };

  const handleDelete = async (couponId: string) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', couponId);

      if (error) throw error;

      toast.success('Coupon deleted successfully');
      setDeleteConfirm(null);
      fetchCoupons();
    } catch (error: any) {
      toast.error('Failed to delete coupon');
    }
  };

  const getDiscountDisplay = (coupon: Coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}%`;
    }
    return `${coupon.discount_value} ${coupon.currency}`;
  };

  const isExpired = (validUntil: string) => new Date(validUntil) < new Date();

  const globalCoupons = coupons.filter(c => !c.property_id);
  const propertyCoupons = coupons.filter(c => c.property_id);
  const bookingCoupons = coupons.filter(c => !c.property_id && (c.applicable_to === 'bookings' || c.applicable_to === 'both'));
  const productCoupons = coupons.filter(c => !c.property_id && (c.applicable_to === 'products' || c.applicable_to === 'both'));

  if (loading) {
    return <div className="text-center py-8">Loading coupons...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Coupons Management</CardTitle>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              {showForm ? 'Hide Form' : 'Create Coupon'}
            </Button>
          </div>
        </CardHeader>
        
        {showForm && (
          <CardContent>
            <CouponForm onSubmitted={() => {
              setShowForm(false);
              fetchCoupons();
            }} />
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bookings">Booking Coupons ({bookingCoupons.length})</TabsTrigger>
          <TabsTrigger value="products">Product Coupons ({productCoupons.length})</TabsTrigger>
          <TabsTrigger value="property">Property Coupons ({propertyCoupons.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookingCoupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-mono font-bold">
                        {coupon.code}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{coupon.name}</div>
                          {coupon.description && (
                            <div className="text-sm text-muted-foreground">
                              {coupon.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          {getDiscountDisplay(coupon)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className={isExpired(coupon.valid_until) ? 'text-red-600' : ''}>
                            {new Date(coupon.valid_until).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {coupon.used_count}
                        {coupon.usage_limit && ` / ${coupon.usage_limit}`}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge 
                            variant={coupon.is_active ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => handleToggleStatus(coupon.id, coupon.is_active)}
                          >
                            {coupon.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {isExpired(coupon.valid_until) && (
                            <Badge variant="destructive">Expired</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteConfirm(coupon.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {bookingCoupons.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No booking coupons found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productCoupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-mono font-bold">
                        {coupon.code}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{coupon.name}</div>
                          {coupon.description && (
                            <div className="text-sm text-muted-foreground">
                              {coupon.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          {getDiscountDisplay(coupon)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className={isExpired(coupon.valid_until) ? 'text-red-600' : ''}>
                            {new Date(coupon.valid_until).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {coupon.used_count}
                        {coupon.usage_limit && ` / ${coupon.usage_limit}`}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge 
                            variant={coupon.is_active ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => handleToggleStatus(coupon.id, coupon.is_active)}
                          >
                            {coupon.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {isExpired(coupon.valid_until) && (
                            <Badge variant="destructive">Expired</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteConfirm(coupon.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {productCoupons.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No product coupons found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="property">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propertyCoupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-mono font-bold">
                        {coupon.code}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{coupon.name}</div>
                          {coupon.description && (
                            <div className="text-sm text-muted-foreground">
                              {coupon.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          Property ID: {coupon.property_id}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          {getDiscountDisplay(coupon)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className={isExpired(coupon.valid_until) ? 'text-red-600' : ''}>
                            {new Date(coupon.valid_until).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {coupon.used_count}
                        {coupon.usage_limit && ` / ${coupon.usage_limit}`}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge 
                            variant={coupon.is_active ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => handleToggleStatus(coupon.id, coupon.is_active)}
                          >
                            {coupon.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {isExpired(coupon.valid_until) && (
                            <Badge variant="destructive">Expired</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteConfirm(coupon.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {propertyCoupons.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No property coupons found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coupon</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this coupon? This action cannot be undone.
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

export default CouponsManagement;