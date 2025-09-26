import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  property?: {
    title: string;
  };
}

const CouponsManagement = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select(`
          *,
          property:properties(title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons((data as any) || []);
    } catch (error: any) {
      toast.error('Failed to load coupons');
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
    if (!confirm('Are you sure you want to delete this coupon?')) return;

    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', couponId);

      if (error) throw error;

      toast.success('Coupon deleted successfully');
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

      <Tabs defaultValue="global" className="space-y-4">
        <TabsList>
          <TabsTrigger value="global">Global Coupons ({globalCoupons.length})</TabsTrigger>
          <TabsTrigger value="property">Property Coupons ({propertyCoupons.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="global">
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
                  {globalCoupons.map((coupon) => (
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
                            onClick={() => handleDelete(coupon.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {globalCoupons.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No global coupons found
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
                          {coupon.property?.title || 'Unknown Property'}
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
                            onClick={() => handleDelete(coupon.id)}
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
    </div>
  );
};

export default CouponsManagement;