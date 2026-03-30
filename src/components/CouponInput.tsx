import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Percent, Tag, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CouponInputProps {
  propertyId?: string;
  totalAmount: number;
  onCouponApplied: (couponId: string, discountAmount: number, code: string) => void;
  onCouponRemoved: () => void;
  appliedCoupon?: {
    id: string;
    code: string;
    discountAmount: number;
  };
}

const CouponInput = ({ 
  propertyId, 
  totalAmount, 
  onCouponApplied, 
  onCouponRemoved, 
  appliedCoupon 
}: CouponInputProps) => {
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // BUG-008: Client-side coupon validation is optimistic and must match server validation
      // The validate_coupon RPC checks:
      // - is_active: coupon must be enabled
      // - valid_from & valid_until: coupon must be within valid date range
      // - usage_limit vs used_count: coupon must not exceed usage limits
      // - applicable_to: coupon must apply to bookings
      // - property_id: coupon must be valid for the specific property
      // - minimum_amount: booking amount must meet minimum threshold
      // Server-side validation in create-booking-payment-connect performs the same checks
      const { data, error } = await supabase.rpc('validate_coupon', {
        coupon_code: couponCode.toUpperCase(),
        user_id_param: user?.id ?? undefined,
        property_id_param: propertyId ?? undefined,
        booking_amount: totalAmount
      });

      if (error) throw error;

      const result = (data as any[])?.[0];
      if (!result?.valid) {
        toast.error(result?.message || 'Invalid coupon');
        return;
      }

      onCouponApplied(result.coupon_id, result.discount_amount, couponCode.toUpperCase());
      toast.success(`Coupon applied! You saved ${(result.discount_amount / 100).toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK`);
      setCouponCode("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    onCouponRemoved();
    toast.success("Coupon removed");
  };

  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            Coupon Applied: {appliedCoupon.code}
          </span>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            -{(appliedCoupon.discountAmount / 100).toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRemoveCoupon}
          className="text-green-600 hover:text-green-800"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Coupon Code</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder="Enter coupon code"
            className="pl-10"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApplyCoupon();
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleApplyCoupon}
          disabled={loading || !couponCode.trim()}
        >
          {loading ? "Applying..." : "Apply"}
        </Button>
      </div>
    </div>
  );
};

export default CouponInput;