import { useMemo, useState, useEffect, type ReactNode } from 'react';
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
import { SHIP_COUNTRIES, regionFor, shippingCost as shippingFor } from '../../supabase/functions/_shared/shop-shipping';
import { type Copy, LOCALES, localizedPath, useCopy, useLang } from '@/i18n';

const en = {
  cartUpdated: 'Cart updated',
  unavailableRemoved: (n: number) => `${n} unavailable item(s) removed from your cart`,
  error: 'Error',
  checkoutFailed: 'Failed to start checkout',
  heading: 'Shopping Cart',
  empty: 'Your cart is empty.',
  items: 'Items',
  product: 'Product',
  price: 'Price',
  qty: 'Qty',
  total: 'Total',
  selectVariant: 'Select variant',
  required: 'Required',
  summary: 'Summary',
  subtotal: 'Subtotal',
  shipTo: 'Ship to',
  shipToLabel: 'Ship to country',
  shipping: 'Shipping',
  free: 'Free',
  addForFreeShipping: (amount: string) => `Add ${amount} more for free shipping`,
  discount: (code: string) => `Discount (${code})`,
  selectAllVariants: 'Please select all required variants before checkout',
  processing: 'Processing...',
  checkout: 'Checkout',
  terms: 'terms',
  privacy: 'privacy policy',
  consent: (terms: ReactNode, privacy: ReactNode) => <>By checking out you accept our {terms} and {privacy}.</>,
  clearCart: 'Clear Cart',
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    cartUpdated: 'Varukorgen har uppdaterats',
    unavailableRemoved: (n) => `${n} ${n === 1 ? 'vara' : 'varor'} som inte längre finns har tagits bort ur din varukorg`,
    error: 'Något gick fel',
    checkoutFailed: 'Det gick inte att gå vidare till kassan',
    heading: 'Varukorg',
    empty: 'Din varukorg är tom.',
    items: 'Varor',
    product: 'Produkt',
    price: 'Pris',
    qty: 'Antal',
    total: 'Totalt',
    selectVariant: 'Välj variant',
    required: 'Måste väljas',
    summary: 'Sammanfattning',
    subtotal: 'Delsumma',
    shipTo: 'Leverera till',
    shipToLabel: 'Land att leverera till',
    shipping: 'Frakt',
    free: 'Gratis',
    addForFreeShipping: (amount) => `Handla för ${amount} till så får du fri frakt`,
    discount: (code) => `Rabatt (${code})`,
    selectAllVariants: 'Välj alla varianter som behövs innan du går till kassan',
    processing: 'Bearbetar…',
    checkout: 'Till kassan',
    terms: 'villkor',
    privacy: 'integritetspolicy',
    consent: (terms, privacy) => <>Genom att gå till kassan godkänner du våra {terms} och vår {privacy}.</>,
    clearCart: 'Töm varukorgen',
  },
  de: {
    cartUpdated: 'Warenkorb aktualisiert',
    unavailableRemoved: (n) =>
      n === 1
        ? '1 nicht mehr verfügbarer Artikel wurde aus deinem Warenkorb entfernt'
        : `${n} nicht mehr verfügbare Artikel wurden aus deinem Warenkorb entfernt`,
    error: 'Fehler',
    checkoutFailed: 'Der Bezahlvorgang konnte nicht gestartet werden',
    heading: 'Warenkorb',
    empty: 'Dein Warenkorb ist leer.',
    items: 'Artikel',
    product: 'Produkt',
    price: 'Preis',
    qty: 'Menge',
    total: 'Gesamt',
    selectVariant: 'Variante wählen',
    required: 'Erforderlich',
    summary: 'Übersicht',
    subtotal: 'Zwischensumme',
    shipTo: 'Lieferung nach',
    shipToLabel: 'Lieferland',
    shipping: 'Versand',
    free: 'Kostenlos',
    addForFreeShipping: (amount) => `Noch ${amount} bis zum kostenlosen Versand`,
    discount: (code) => `Rabatt (${code})`,
    selectAllVariants: 'Bitte wähle alle erforderlichen Varianten, bevor du zur Kasse gehst',
    processing: 'Wird verarbeitet…',
    checkout: 'Zur Kasse',
    terms: 'AGB',
    privacy: 'Datenschutzerklärung',
    consent: (terms, privacy) => <>Wenn du zur Kasse gehst, akzeptierst du unsere {terms} und unsere {privacy}.</>,
    clearCart: 'Warenkorb leeren',
  },
};

const CartPage = () => {
  const t = useCopy(COPY);
  const lang = useLang();
  const { items, total, updateQuantity, removeItem, clear, addItem } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingSettings, setShippingSettings] = useState<any>(null);
  // Checkout only accepts an address in this country, so the shipping shown is what's charged
  const [shippingCountry, setShippingCountry] = useState('SE');
  const [productVariants, setProductVariants] = useState<Map<string, any[]>>(new Map());
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discountAmount: number } | undefined>();

  // English keeps the Swedish price style it has always had ("249,00 kr")
  const formatPrice = (price: number, currency: string) =>
    new Intl.NumberFormat(lang === 'en' ? 'sv-SE' : LOCALES[lang], { style: 'currency', currency }).format(price / 100);

  // Country names in the page's language; the codes are what checkout gets
  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([LOCALES[lang]], { type: 'region' });
    } catch {
      return null;
    }
  }, [lang]);

  const currency = items[0]?.currency || 'SEK';

  useEffect(() => {
    fetchShippingSettings();
    fetchProductVariants();
  }, []);

  useEffect(() => {
    calculateShipping();
  }, [shippingSettings, items, total, shippingCountry]);

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
          title: t.cartUpdated,
          description: t.unavailableRemoved(invalidItems.length),
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

    // Same rule as the payment function (supabase/functions/_shared/shop-shipping.ts)
    setShippingCost(shippingFor(shippingSettings, shippingCountry, total));
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

  const checkout = async () => {
    if (items.length === 0 || hasIncompleteVariants) return;
    setCheckingOut(true);
    try {
      const payload = {
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity, variantId: i.variantId })),
        customerEmail: '',
        shippingCountry,
        couponId: appliedCoupon?.id,
        couponCode: appliedCoupon?.code,
        discountAmount: appliedCoupon?.discountAmount,
        // Stripe's page in the shopper's language, and back to this one
        lang
      };
      const { data, error } = await supabase.functions.invoke('create-cart-payment', { body: payload });
      if (error) throw error;
      if (data.url) {
        // Same tab: a new window gets blocked, and Stripe returns to /order-success in the page's language
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating cart payment:', error);
      toast({ title: t.error, description: t.checkoutFailed, variant: 'destructive' });
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation showBackButton />
      <div className="container mx-auto px-4 py-24">
        <h1 className="text-3xl font-bold mb-6">{t.heading}</h1>

        {items.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">{t.empty}</CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t.items}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.product}</TableHead>
                      <TableHead>{t.price}</TableHead>
                      <TableHead>{t.qty}</TableHead>
                      <TableHead>{t.total}</TableHead>
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
                                        <SelectValue placeholder={t.selectVariant} />
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
                                        <span>{t.required}</span>
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
                              className="w-20"
                              value={i.quantity}
                              onChange={(e) => updateQuantity(i.productId, i.variantId || null, Math.max(1, parseInt(e.target.value || '1', 10)))}
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
                <CardTitle>{t.summary}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>{t.subtotal}</span>
                  <span className="font-semibold">{formatPrice(total, currency)}</span>
                </div>
                
                <div className="flex items-center justify-between gap-2">
                  <span>{t.shipTo}</span>
                  <Select value={shippingCountry} onValueChange={setShippingCountry}>
                    <SelectTrigger className="w-44" aria-label={t.shipToLabel}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SHIP_COUNTRIES).map(([code, name]) => (
                        <SelectItem key={code} value={code}>{regionNames?.of(code) ?? name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    <span>{t.shipping}</span>
                  </div>
                  <span className="font-semibold">
                    {shippingCost === 0 ? t.free : formatPrice(shippingCost, currency)}
                  </span>
                </div>

                {regionFor(shippingCountry) === 'Sweden' && shippingSettings?.free_shipping_threshold && total < shippingSettings.free_shipping_threshold && (
                  <div className="text-sm text-muted-foreground">
                    {t.addForFreeShipping(formatPrice(shippingSettings.free_shipping_threshold - total, currency))}
                  </div>
                )}

                {appliedCoupon && (
                  <div className="flex items-center justify-between text-green-600">
                    <span>{t.discount(appliedCoupon.code)}</span>
                    <span className="font-semibold">-{formatPrice(appliedCoupon.discountAmount, currency)}</span>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>{t.total}</span>
                    <span>{formatPrice(totalWithShipping, currency)}</span>
                  </div>
                </div>

                <CouponInput
                  totalAmount={total}
                  onCouponApplied={handleCouponApplied}
                  onCouponRemoved={handleCouponRemoved}
                  appliedCoupon={appliedCoupon}
                />
                
                {hasIncompleteVariants && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{t.selectAllVariants}</span>
                  </div>
                )}

                <Button className="w-full" disabled={checkingOut || hasIncompleteVariants} onClick={checkout}>
                  {checkingOut ? t.processing : t.checkout}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {t.consent(
                    <a href={localizedPath('/terms', lang)} target="_blank" rel="noopener" className="underline hover:text-foreground">{t.terms}</a>,
                    <a href={localizedPath('/privacy', lang)} target="_blank" rel="noopener" className="underline hover:text-foreground">{t.privacy}</a>,
                  )}
                </p>
                <Button variant="outline" className="w-full" onClick={clear}>{t.clearCart}</Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
