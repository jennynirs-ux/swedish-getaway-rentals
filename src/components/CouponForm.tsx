import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CouponFormProps {
  propertyId?: string;
  onSubmitted?: () => void;
}

const CouponForm = ({ propertyId, onSubmitted }: CouponFormProps) => {
  // Set default valid_until to 1 year from now
  const getDefaultValidUntil = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().slice(0, 16); // Format for datetime-local input
  };

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    minimum_amount: '',
    maximum_discount_amount: '',
    valid_until: getDefaultValidUntil(),
    usage_limit: '',
    is_active: true,
    applicable_to: propertyId ? 'bookings' : 'both' as 'bookings' | 'products' | 'both'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.name || !formData.discount_value || !formData.valid_until) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to create a coupon");

      // Parse datetime-local value and convert to UTC timestamp
      // datetime-local gives us "YYYY-MM-DDTHH:mm" in local time
      const parts = formData.valid_until.split('T');
      const datePart = parts[0] || '';
      const timePart = parts[1] || '00:00';
      const dateParts = datePart.split('-');
      const timeParts = timePart.split(':');
      
      // Create date in local timezone
      const localDate = new Date(
        parseInt(dateParts[0] || '0'),
        parseInt(dateParts[1] || '1') - 1,
        parseInt(dateParts[2] || '1'),
        parseInt(timeParts[0] || '0'),
        parseInt(timeParts[1] || '0'),
        0
      );
      const validUntilUTC = localDate.toISOString();
      


      const { error } = await supabase
        .from('coupons')
        .insert({
          code: formData.code.toUpperCase(),
          name: formData.name,
          description: formData.description || null,
          discount_type: formData.discount_type,
          discount_value: parseFloat(formData.discount_value),
          minimum_amount: formData.minimum_amount ? parseInt(formData.minimum_amount) : null,
          maximum_discount_amount: formData.maximum_discount_amount ? parseInt(formData.maximum_discount_amount) : null,
          valid_until: validUntilUTC,
          usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
          property_id: propertyId || null,
          created_by: user.id,
          is_active: formData.is_active,
          applicable_to: formData.applicable_to
        });

      if (error) throw error;

      toast.success(propertyId ? "Property-specific coupon created successfully!" : "Global coupon created successfully!");
      setFormData({
        code: '',
        name: '',
        description: '',
        discount_type: 'percentage',
        discount_value: '',
        minimum_amount: '',
        maximum_discount_amount: '',
        valid_until: getDefaultValidUntil(),
        usage_limit: '',
        is_active: true,
        applicable_to: propertyId ? 'bookings' : 'both'
      });
      onSubmitted?.();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Create {propertyId ? 'Property-Specific' : 'Global'} Coupon
        </CardTitle>
        {propertyId && (
          <CardDescription>
            This coupon will only work for this property and will be visible to guests as long as it's marked as active.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Coupon Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="SUMMER2024"
                required
              />
            </div>

            <div>
              <Label htmlFor="name">Coupon Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Summer Discount"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="A special summer discount for our guests"
              rows={2}
            />
          </div>

          {!propertyId && (
            <div>
              <Label htmlFor="applicable_to">Applicable To *</Label>
              <Select
                value={formData.applicable_to}
                onValueChange={(value: 'bookings' | 'products' | 'both') => 
                  setFormData(prev => ({ ...prev, applicable_to: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bookings">Property Bookings Only</SelectItem>
                  <SelectItem value="products">Shop Products Only</SelectItem>
                  <SelectItem value="both">Both Bookings & Products</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="discount_type">Discount Type *</Label>
              <Select
                value={formData.discount_type}
                onValueChange={(value: 'percentage' | 'fixed') => 
                  setFormData(prev => ({ ...prev, discount_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="discount_value">
                Discount Value * {formData.discount_type === 'percentage' ? '(%)' : '(SEK)'}
              </Label>
              <Input
                id="discount_value"
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
                placeholder={formData.discount_type === 'percentage' ? '10' : '500'}
                min="0"
                step={formData.discount_type === 'percentage' ? '0.1' : '1'}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minimum_amount">Minimum Amount (SEK)</Label>
              <Input
                id="minimum_amount"
                type="number"
                value={formData.minimum_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, minimum_amount: e.target.value }))}
                placeholder="1000"
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="maximum_discount_amount">Maximum Discount (SEK)</Label>
              <Input
                id="maximum_discount_amount"
                type="number"
                value={formData.maximum_discount_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, maximum_discount_amount: e.target.value }))}
                placeholder="500"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valid_until">Valid Until *</Label>
              <Input
                id="valid_until"
                type="datetime-local"
                value={formData.valid_until}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="usage_limit">Usage Limit</Label>
              <Input
                id="usage_limit"
                type="number"
                value={formData.usage_limit}
                onChange={(e) => setFormData(prev => ({ ...prev, usage_limit: e.target.value }))}
                placeholder="100"
                min="1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div className="space-y-0.5">
              <Label htmlFor="is_active" className="text-base font-semibold cursor-pointer">
                Coupon Active Status
              </Label>
              <p className="text-sm text-muted-foreground">
                Control whether this coupon is available for use. Toggle off to pause without deleting.
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Coupon"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CouponForm;