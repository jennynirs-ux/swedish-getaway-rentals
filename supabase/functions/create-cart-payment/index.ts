import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { pickVariant } from "../_shared/shop-variants.ts";
import { SHIP_COUNTRIES, shippingCost as shippingFor } from "../_shared/shop-shipping.ts";

const siteUrl = Deno.env.get("SITE_URL") || "https://nordic-getaways.com";

const splitMetadata = (key: string, value: string) =>
  Object.fromEntries(Array.from({ length: Math.ceil(value.length / 490) }, (_, i) => [`${key}_${i}`, value.slice(i * 490, (i + 1) * 490)]));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type CartItem = { productId: string; quantity: number; variantId?: string };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, customerEmail, couponId, couponCode, discountAmount, shippingCountry: requestedCountry } = await req.json();
    // The customer picks the country in the cart; checkout is locked to it so
    // the shipping charged matches the address
    const shippingCountry = typeof requestedCountry === 'string' && SHIP_COUNTRIES[requestedCountry] ? requestedCountry : 'SE';
    if (!Array.isArray(items) || items.length === 0) throw new Error('No items provided');

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Load products and build line items
    const lineItems: any[] = [];
    let currency = 'sek';
    let subtotal = 0;
    // The cart as the order processor needs it: every line with its Printful variant
    const resolvedItems: { productId: string; quantity: number; variantId: string }[] = [];

    for (const it of items as CartItem[]) {
      const { data: product, error } = await supabase
        .from('shop_products')
        .select('*')
        .eq('id', it.productId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching product:', error);
        throw new Error(`Error fetching product: ${error.message}`);
      }
      
      if (!product) {
        console.error('Product not found:', it.productId);
        throw new Error(`Product not found: ${it.productId}`);
      }

      currency = product.currency?.toLowerCase() || 'sek';

      // Parse printful_data if it's a string
      const printfulData = typeof product.printful_data === 'string' 
        ? JSON.parse(product.printful_data) 
        : product.printful_data;

      // Printful can only ship a specific variant (size/colour)
      const selectedVariant: any = pickVariant({ printful_data: printfulData }, it.variantId);
      if (!selectedVariant) {
        console.error('No variant for product:', it.productId, it.variantId);
        throw new Error(`Variant: please choose a size or colour for ${product.title_override || product.title}`);
      }
      const quantity = Math.max(1, Math.min(20, Math.floor(Number(it.quantity) || 1)));
      it.quantity = quantity;
      resolvedItems.push({ productId: product.id, quantity, variantId: selectedVariant.id.toString() });

      // A chosen variant has its own price; otherwise the product price (with
      // the admin's override), as the shop and cart pages show it
      const variantPrice = Math.round(parseFloat(selectedVariant.retail_price || '0') * 100);
      const finalPrice = it.variantId
        ? variantPrice
        : (product.price_override || product.custom_price || product.price || variantPrice);

      subtotal += finalPrice * it.quantity;

      const finalTitle = product.title_override || product.title || 'Product';
      const finalDescription = product.description_override || product.custom_description || product.description || '';
      const finalImage = product.main_image_override || product.image_url;

      console.log('Processing item:', {
        productId: it.productId,
        variantId: it.variantId,
        finalPrice,
        finalTitle,
        selectedVariant: selectedVariant ? selectedVariant.name : 'none'
      });

      lineItems.push({
        price_data: {
          currency,
          product_data: {
            name: selectedVariant ? `${finalTitle} - ${selectedVariant.name}` : finalTitle,
            description: finalDescription,
            images: finalImage ? [finalImage] : [],
          },
          unit_amount: finalPrice,
        },
        quantity: it.quantity,
      });
    }

    // Shipping from the shop settings for the chosen country, as the cart page
    // shows it (never the browser's number)
    const { data: shippingSetting } = await supabase
      .from('platform_settings')
      .select('setting_value')
      .eq('setting_key', 'shipping_settings')
      .maybeSingle();
    const shippingCost = shippingFor(shippingSetting?.setting_value as any, shippingCountry, subtotal);
    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency,
          product_data: { name: `Shipping to ${SHIP_COUNTRIES[shippingCountry]}` },
          unit_amount: shippingCost,
        },
        quantity: 1,
      });
    }

    // Validate and apply coupon if provided
    let validatedDiscount = 0;
    let validatedCouponId = null;
    let validatedCouponCode = null;

    if (couponId && couponCode) {
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('id', couponId)
        .single();

      if (couponError || !coupon) {
        console.error('Coupon not found:', couponId);
        throw new Error('Invalid coupon');
      }

      // Validate coupon
      if (!coupon.is_active) {
        throw new Error('Coupon is not active');
      }

      const now = new Date();
      if (coupon.valid_from && new Date(coupon.valid_from) > now) {
        throw new Error('Coupon is not yet valid');
      }
      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        throw new Error('Coupon has expired');
      }

      // Check applicable_to - must be 'all', 'products', or 'both'
      const validApplicableTo = ['all', 'products', 'both'];
      if (!validApplicableTo.includes(coupon.applicable_to)) {
        throw new Error('Coupon is not valid for products');
      }

      if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
        throw new Error('Coupon usage limit reached');
      }

      if (coupon.minimum_amount !== null && subtotal < coupon.minimum_amount) {
        throw new Error(`Minimum purchase amount of ${coupon.minimum_amount / 100} ${currency.toUpperCase()} required`);
      }

      // Calculate discount
      if (coupon.discount_type === 'percentage') {
        validatedDiscount = Math.floor(subtotal * coupon.discount_value / 100);
      } else {
        validatedDiscount = coupon.discount_value;
      }

      // Apply maximum discount cap
      if (coupon.maximum_discount_amount !== null && validatedDiscount > coupon.maximum_discount_amount) {
        validatedDiscount = coupon.maximum_discount_amount;
      }

      validatedCouponId = coupon.id;
      validatedCouponCode = coupon.code;

      console.log('Coupon validated:', {
        couponId: validatedCouponId,
        code: validatedCouponCode,
        discount: validatedDiscount,
        clientDiscount: discountAmount
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY_SHOP") || "", { apiVersion: "2025-08-27.basil" });

    // Create Stripe coupon if we have a validated discount
    let stripeCouponId: string | undefined;
    if (validatedDiscount > 0 && validatedCouponCode) {
      const stripeCoupon = await stripe.coupons.create({
        amount_off: validatedDiscount,
        currency: currency,
        duration: 'once',
        name: `Discount: ${validatedCouponCode}`,
      });
      stripeCouponId = stripeCoupon.id;
    }

    const sessionParams: any = {
      customer_email: customerEmail || undefined,
      line_items: lineItems,
      mode: 'payment',
      shipping_address_collection: { allowed_countries: [shippingCountry] },
      phone_number_collection: { enabled: true },
      success_url: `${siteUrl}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,
      metadata: {
        type: 'cart',
        // Stripe caps metadata values at 500 characters: items_0, items_1, ...
        ...splitMetadata('items', JSON.stringify(resolvedItems)),
        shipping_cost: String(shippingCost),
        shipping_country: shippingCountry, 
        currency,
        coupon_id: validatedCouponId || '',
        coupon_code: validatedCouponCode || '',
        discount_amount: String(validatedDiscount)
      }
    };

    // Apply Stripe coupon if created
    if (stripeCouponId) {
      sessionParams.discounts = [{ coupon: stripeCouponId }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error) {
    console.error('Error creating cart payment:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return safe error message to client
    const isUserError = error instanceof Error && (
      error.message?.includes('No items') || 
      error.message?.includes('not found') ||
      error.message?.includes('Variant')
    );
    const clientMessage = isUserError 
      ? error.message 
      : 'Unable to create payment session. Please try again or contact support.';
    
    return new Response(JSON.stringify({ error: clientMessage }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
