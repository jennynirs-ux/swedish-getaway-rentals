import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CartItem = { productId: string; quantity: number; variantId?: string };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, customerEmail, shippingCost, couponId, couponCode, discountAmount } = await req.json();
    if (!Array.isArray(items) || items.length === 0) throw new Error('No items provided');

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Load products and build line items
    const lineItems: any[] = [];
    let currency = 'sek';
    let subtotal = 0;

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

      let selectedVariant: any = null;
      if (it.variantId && printfulData?.variants) {
        selectedVariant = printfulData.variants.find((v: any) => v.id?.toString() === it.variantId);
        if (!selectedVariant) {
          console.error('Variant not found:', it.variantId, 'in product:', it.productId);
          throw new Error(`Variant ${it.variantId} not found for product ${it.productId}`);
        }
      }

      const finalPrice = selectedVariant
        ? Math.round(parseFloat(selectedVariant.retail_price || '0') * 100)
        : (product.price_override || product.custom_price || product.price || 0);

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

    // Add shipping as a separate line item so total matches (admin settings)
    if (typeof shippingCost === 'number' && shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency,
          product_data: { name: 'Shipping' },
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

      // Add discount as negative line item
      if (validatedDiscount > 0) {
        lineItems.push({
          price_data: {
            currency,
            product_data: { name: `Discount (${validatedCouponCode})` },
            unit_amount: -validatedDiscount,
          },
          quantity: 1,
        });
      }
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY_SHOP") || "", { apiVersion: "2025-08-27.basil" });

    const session = await stripe.checkout.sessions.create({
      customer_email: customerEmail || undefined,
      line_items: lineItems,
      mode: 'payment',
      shipping_address_collection: { allowed_countries: ['SE','NO','DK','FI','DE','GB','US','CA','NL','FR','ES','IT'] },
      phone_number_collection: { enabled: true },
      success_url: `${req.headers.get('origin')}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/cart`,
      metadata: { 
        type: 'cart', 
        items: JSON.stringify(items), 
        shipping_cost: String(shippingCost || 0), 
        currency,
        coupon_id: validatedCouponId || '',
        coupon_code: validatedCouponCode || '',
        discount_amount: String(validatedDiscount)
      }
    });

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
