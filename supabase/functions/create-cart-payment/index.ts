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
    const { items, customerEmail, shippingCost } = await req.json();
    if (!Array.isArray(items) || items.length === 0) throw new Error('No items provided');

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Load products and build line items
    const lineItems: any[] = [];
    let currency = 'sek';
    for (const it of items as CartItem[]) {
      const { data: product, error } = await supabase
        .from('shop_products')
        .select('*')
        .eq('id', it.productId)
        .single();
      if (error || !product) throw new Error('Product not found');

      currency = product.currency.toLowerCase();

      let selectedVariant: any = null;
      if (it.variantId && product.printful_data?.variants) {
        selectedVariant = product.printful_data.variants.find((v: any) => v.id?.toString() === it.variantId);
      }

      const finalPrice = selectedVariant
        ? Math.round(parseFloat(selectedVariant.retail_price || '0') * 100)
        : (product.price_override || product.custom_price || product.price);

      const finalTitle = product.title_override || product.title;
      const finalDescription = product.description_override || product.custom_description || product.description;
      const finalImage = product.main_image_override || product.image_url;

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

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    const session = await stripe.checkout.sessions.create({
      customer_email: customerEmail || undefined,
      line_items: lineItems,
      mode: 'payment',
      shipping_address_collection: { allowed_countries: ['SE','NO','DK','FI','DE','GB','US','CA','NL','FR','ES','IT'] },
      phone_number_collection: { enabled: true },
      success_url: `${req.headers.get('origin')}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/cart`,
      metadata: { type: 'cart', items: JSON.stringify(items), shipping_cost: String(shippingCost || 0), currency }
    });

    return new Response(JSON.stringify({ url: session.url }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error) {
    console.error('Error creating cart payment:', error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
