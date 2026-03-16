import { useMemo, useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Truck, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import MainNavigation from '@/components/MainNavigation';
import CouponInput from '@/components/CouponInput';

const CartPage = () => {
  const { items, total, updateQuantity, removeItem, clear, addItem } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingSettings, setShippingSettings] = useState<any>(null);
  const [productVariants, setProductVariants] = useState<Map<string, any[]>>(new Map());
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discountAmount: number } | undefined>();

  const formatPrice = (price: number, currency: string) => new Intl.NumberFormat('sv-SE', { style: 'currency', currency }).format(price / 100);

  const currency = items[0]?.currency || 'SEK';

  // Check for mixed currencies
  const hasMixedCurrencies = items.length > 0 && items.some(item => item.currency !== currency);

  useEffect(() => {
    document.title = 'Cart | Nordic Getaways';
    fetchShippingSettings();
    fetchProductVariants();
  }, []);

  useEffect(() => {
    calculateShipping();
  }, [shippingSettings, items, total]);

  const fetchShippingSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'shipping_settings')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.setting_value) {
        setShippingSettings(data.setting_value);
      }
    } catch (error) {
      console.error('Error fetching shipping settings:', error);
    }
  };

  const fetchProductVariants = async () => {
    if (items.length === 0) return;

    try {
      const productIds = [...new Set(items.map(i => i.productId))];
      const { data, error } = await supabase
        .from('shop_products')
        .select('id, printful_data')
        .in('id', productIds);

      if (error) throw error;

      // Find products that no longer exist in the database
      const existingProductIds = new Set(data?.map(p => p.id) || []);
      const invalidItems = items.filter(item => !existingProductIds.has(item.productId));
      
      // Remove invalid items from cart
      if (invalidItems.length > 0) {
        invalidItems.forEach(item => {
          removeItem(item.productId, item.variantId || null);
        });
        toast({
          title: 'Cart updated',
          description: `${invalidItems.length} unavailable item(s) removed from your cart`,
          variant: 'destructive',
        });
      }

      const variantsMap = new Map();
      data?.forEach(product => {
        const printfulData = product.printful_data as any;
        if (printfulData?.variants) {
          variantsMap.set(product.id, printfulData.variants);
        }
      });

      setProductVariants(variantsMap);
    } catch (error) {
      console.error('Error fetching product variants:', error);
    }
  };

  const calculateShipping = () => {
    if (!shippingSettings || items.length === 0) {
      setShippingCost(0);
      return;
    }

    // Check for free shipping threshold
    if (shippingSettings.free_shipping_threshold && total >= shippingSettings.free_shipping_threshold) {
      setShippingCost(0);
      return;
    }

    // Use currency-specific shipping rates
    const itemCurrency = items[0]?.currency || 'SEK';
    const regionMap: Record<string, string> = {
      'SEK': 'Sweden',
      'NOK': 'Norway',
      'DKK': 'Denmark',
      'EUR': 'EU',
      'USD': 'USA',
      'GBP': 'UK'
    };

    const region = regionMap[itemCurrency] || 'Sweden';
    const rateForCurrency = shippingSettings.fallback_rates?.find((rate: any) => rate.region === region);

    if (rateForCurrency) {
      setShippingCost(rateForCurrency.rate);
    } else {
      // Default fallback in the item's currency
      const defaultRates: Record<string, number> = {
        'SEK': 4900, 'NOK': 4700, 'DKK': 650, 'EUR': 60, 'USD': 65, 'GBP': 55
      };
      setShippingCost(defaultRates[itemCurrency] || 4900);
    }
  };

  const discountAmount = appliedCoupon?.discountAmount || 0;
  const totalWithShipping = Math.max(0, total + shippingCost - discountAmount);

  const hasIncompleteVariants = useMemo(() => {
    return items.some(item => {
      const variants = productVariants.get(item.productId);
      return variants && variants.length > 1 && !item.variantId;
    });
  }, [items, productVariants]);

  const handleVariantChange = (productId: string, oldVariantId: string | null, newVariantId: string) => {
    const item = items.find(i => i.productId === productId && (i.variantId || null) === (oldVariantId || null));
    if (!item) return;

    const variants = productVariants.get(productId);
    const selectedVariant = variants?.find((v: any) => v.id.toString() === newVariantId);

    if (!selectedVariant) return;

    // Remove old item
    removeItem(productId, oldVariantId);

    // Add with new variant
    addItem({
      ...item,
      variantId: selectedVariant.id.toString(),
      variantName: selectedVariant.name,
      price: Math.round(parseFloat(selectedVariant.retail_price) * 100),
    });
  };

  const handleCouponApplied = (couponId: string, discountAmt: number, code: string) => {
    setAppliedCoupon({ id: couponId, code, discountAmount: discountAmt });
  };

  const handleCouponRemoved = () => {
    setAppliedCoupon(undefined);
  };

  const handleAddItem = (item: any) => {
    // Check for currency mismatch before adding
    if (items.length > 0 && item.currency && item.currency !== currency) {
      toast({
        title: 'Currency mismatch',
        description: `Your cart uses ${currency}, but this item is in ${item.currency}. Please remove existing items or shop in a single currency.`,
        variant: 'destructive'
      });
      return;
    }
    addItem(item);
  };

  const checkout = async () => {
    if (items.length === 0 || hasIncompleteVariants) return;
    setCheckingOut(true);
    try {
      // Get current session token for CSRF protection
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        toast({ title: 'Error', description: 'Please sign in to checkout', variant: 'destructive' });
        setCheckingOut(false);
        return;
      }

      // Fetch the authenticated user's email
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user?.email) {
        toast({ title: 'Error', description: 'Unable to retrieve your email. Please try again.', variant: 'destructive' });
        setCheckingOut(false);
        return;
      }

      const customerEmail = userData.user.email;

      // Generate a nonce for additional CSRF protection
      const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
      const timestamp = new Date().getTime().toString();

      const payload = {
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity, variantId: i.variantId })),
        customerEmail: customerEmail,
        shippingCost: shippingCost,
        couponId: appliedCoupon?.id,
        couponCode: appliedCoupon?.code,
        discountAmount: appliedCoupon?.discountAmount,
        // CSRF protection - removed sessionToken from payload; Authorization header is sent automatically via supabase.functions.invoke
        nonce: nonce,
        timestamp: timestamp
      };
      const { data, error } = await supabase.functions.invoke('create-cart-payment', { body: payload });
      if (error) throw error;
      if (data.url) {
        // Validate checkout URL for security before opening
        if (typeof data.url === 'string' && data.url.startsWith('https://checkout.stripe.com')) {
          window.open(data.url, '_blank');
        } else {
          throw new Error('Invalid checkout URL');
        }
      }
    } catch (error) {
      console.error('Error creating cart payment:', error);
      toast({ title: 'Error', description: 'Failed to start checkout', variant: 'destructive' });
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation showBackButton />
      <div className="container mx-auto px-4 py-24">
        <h1 className="text-3xl font-bold mb-6">Shopping Cart</h1>

        {items.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">Your cart is empty.</CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((i) => {
                      const variants = productVariants.get(i.productId);
                      const hasVariants = variants && variants.length > 1;
                      const needsVariantSelection = hasVariants && !i.variantId;

                      return (
                        <TableRow key={`${i.productId}-${i.variantId || 'base'}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {i.image && <img src={i.image} alt={i.title} className="w-12 h-12 rounded object-cover" />}
                              <div>
                                <div className="font-medium">{i.title}</div>
                                {hasVariants && (
                                  <div className="mt-2">
                                    <Select
                                      value={i.variantId || ''}
                                      onValueChange={(value) => handleVariantChange(i.productId, i.variantId || null, value)}
                                    >
                                      <SelectTrigger className={`w-[180px] ${needsVariantSelection ? 'border-destructive' : ''}`}>
                                        <SelectValue placeholder="Select variant" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {variants.map((variant: any) => (
                                          <SelectItem key={variant.id} value={variant.id.toString()}>
                                            {variant.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {needsVariantSelection && (
                                      <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
                                        <AlertCircle className="h-3 w-3" />
                                        <span>Required</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{formatPrice(i.price, i.currency)}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              max={99}
                              className="w-20"
                              value={i.quantity}
                              onChange={(e) => {
                                const newQty = Math.max(1, Math.min(99, parseInt(e.target.value || '1', 10)));
                                if (newQty > 99) {
                                  toast({
                                    title: "Quantity limited",
                                    description: "Maximum quantity is 99 items",
                                    variant: "destructive"
                                  });
                                }
                                updateQuantity(i.productId, i.variantId || null, newQty);
                              }}
                            />
                          </TableCell>
                          <TableCell>{formatPrice(i.price * i.quantity, i.currency)}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="icon" onClick={() => removeItem(i.productId, i.variantId || null)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold">{formatPrice(total, currency)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    <span>Shipping</span>
                  </div>
                  <span className="font-semibold">
                    {shippingCost === 0 ? 'Free' : formatPrice(shippingCost, currency)}
                  </span>
                </div>

                {shippingSettings?.free_shipping_threshold && total < shippingSettings.free_shipping_threshold && (
                  <div className="text-sm text-muted-foreground">
                    Add {formatPrice(shippingSettings.free_shipping_threshold - total, currency)} more for free shipping
                  </div>
                )}

                {appliedCoupon && (
                  <div className="flex items-center justify-between text-green-600">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span className="font-semibold">-{formatPrice(appliedCoupon.discountAmount, currency)}</span>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatPrice(totalWithShipping, currency)}</span>
                  </div>
                </div>

                <CouponInput
                  totalAmount={total}
                  onCouponApplied={handleCouponApplied}
                  onCouponRemoved={handleCouponRemoved}
                  appliedCoupon={appliedCoupon}
                />
                
                {hasMixedCurrencies && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Cart contains items in different currencies. Please remove items to match currencies before checkout.</span>
                  </div>
                )}

                {hasIncompleteVariants && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Please select all required variants before checkout</span>
                  </div>
                )}

                <Button className="w-full" disabled={checkingOut || hasIncompleteVariants || hasMixedCurrencies} onClick={checkout}>
                  {checkingOut ? 'Processing...' : 'Checkout'}
                </Button>
                <Button variant="outline" className="w-full" onClick={clear}>Clear Cart</Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
