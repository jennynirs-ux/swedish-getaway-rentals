import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ORDER-SUCCESS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    logStep("Processing order success", { sessionId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    logStep("Retrieved session", { 
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email 
    });

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    // Parse metadata
    const items = JSON.parse(session.metadata?.items || "[]");
    const shippingCost = parseInt(session.metadata?.shipping_cost || "0");
    const currency = session.metadata?.currency || "SEK";

    // Get shipping address from session
    const shippingAddress = session.shipping_details?.address ? {
      name: session.shipping_details.name,
      address: {
        line1: session.shipping_details.address.line1,
        line2: session.shipping_details.address.line2,
        city: session.shipping_details.address.city,
        postal_code: session.shipping_details.address.postal_code,
        state: session.shipping_details.address.state,
        country: session.shipping_details.address.country,
      },
      phone: session.customer_details?.phone,
    } : null;

    // Fetch product details for the items
    const productIds = items.map((item: any) => item.productId);
    const { data: products, error: productsError } = await supabase
      .from('shop_products')
      .select('*')
      .in('id', productIds);

    if (productsError) {
      throw productsError;
    }

    logStep("Fetched products", { count: products?.length });

    // Build product data with variant information
    const productData = items.map((item: any) => {
      const product = products?.find(p => p.id === item.productId);
      if (!product) return null;

      let variantInfo = null;
      if (item.variantId && product.printful_data?.variants) {
        variantInfo = product.printful_data.variants.find((v: any) => 
          v.id?.toString() === item.variantId
        );
      }

      return {
        product_id: item.productId,
        quantity: item.quantity,
        variant_id: item.variantId,
        variant_name: variantInfo?.name,
        title: product.title_override || product.title,
        price: variantInfo?.retail_price ? 
          Math.round(parseFloat(variantInfo.retail_price) * 100) : 
          (product.price_override || product.custom_price || product.price),
        printful_sync_variant_id: variantInfo?.id,
        printful_product_id: product.printful_product_id,
      };
    }).filter(Boolean);

    // Calculate total amount (should match what Stripe charged)
    const productTotal = productData.reduce((sum: number, item: any) => 
      sum + (item.price * item.quantity), 0
    );
    const totalAmount = productTotal + shippingCost;

    // Create order record
    const orderData = {
      customer_email: session.customer_details?.email,
      customer_name: session.customer_details?.name || session.shipping_details?.name,
      customer_phone: session.customer_details?.phone,
      total_amount: totalAmount,
      product_data: productData,
      shipping_address: shippingAddress,
      stripe_payment_intent_id: session.payment_intent,
      status: 'paid',
      currency,
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    logStep("Order created successfully", { orderId: order.id });

    return new Response(JSON.stringify({ 
      success: true, 
      orderId: order.id,
      orderData: productData
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    logStep("ERROR in order success", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});