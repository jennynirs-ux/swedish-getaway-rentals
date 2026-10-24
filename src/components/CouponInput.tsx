import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Percent, Tag, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { type Copy, useCopy, useLang, useLocale } from "@/i18n";

const en = {
  applied: (amount: string) => `Coupon applied! You saved ${amount} SEK`,
  removed: "Coupon removed",
  appliedCode: (code: string) => `Coupon Applied: ${code}`,
  label: "Coupon Code",
  placeholder: "Enter coupon code",
  applying: "Applying...",
  apply: "Apply",
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    applied: (amount) => `Rabattkoden är tillagd! Du sparar ${amount} SEK`,
    removed: "Rabattkoden är borttagen",
    appliedCode: (code) => `Rabattkod tillagd: ${code}`,
    label: "Rabattkod",
    placeholder: "Ange rabattkod",
    applying: "Lägger till…",
    apply: "Använd",
  },
  de: {
    applied: (amount) => `Gutscheincode eingelöst! Du sparst ${amount} SEK`,
    removed: "Gutscheincode entfernt",
    appliedCode: (code) => `Gutscheincode eingelöst: ${code}`,
    label: "Gutscheincode",
    placeholder: "Gutscheincode eingeben",
    applying: "Wird eingelöst…",
    apply: "Einlösen",
  },
};

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
  const t = useCopy(COPY);
  const lang = useLang();
  const pageLocale = useLocale();
  // English pages keep the Swedish number style they always had (as the shop does)
  const locale = lang === "en" ? "sv-SE" : pageLocale;
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(false);
  const formatAmount = (ore: number) =>
    (ore / 100).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.rpc('validate_coupon', {
        coupon_code: couponCode.toUpperCase(),
        user_id_param: user?.id || null,
        property_id_param: propertyId || null,
        booking_amount: totalAmount
      });

      if (error) throw error;

      const result = data[0];
      if (!result.valid) {
        toast.error(result.message);
        return;
      }

      onCouponApplied(result.coupon_id, result.discount_amount, couponCode.toUpperCase());
      toast.success(t.applied(formatAmount(result.discount_amount)));
      setCouponCode("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    onCouponRemoved();
    toast.success(t.removed);
  };

  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            {t.appliedCode(appliedCoupon.code)}
          </span>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            -{formatAmount(appliedCoupon.discountAmount)} SEK
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
      <label className="text-sm font-medium">{t.label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder={t.placeholder}
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
          {loading ? t.applying : t.apply}
        </Button>
      </div>
    </div>
  );
};

export default CouponInput;