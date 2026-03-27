import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_URL") || "",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PRINTFUL-ORDER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();
    
    if (!orderId) {
      throw new Error("Order ID is required");
    }

    logStep("Processing Printful order creation", { orderId });

    const printfulToken = Deno.env.get("PRINTFUL_API_TOKEN");
    if (!printfulToken) {
      throw new Error("PRINTFUL_API_TOKEN is not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // Get product details to find variant ID
    const { data: product, error: productError } = await supabase
      .from('shop_products')
      .select('*')
      .eq('printful_product_id', order.product_data?.printful_product_id)
      .single();

    if (productError || !product) {
      logStep("Product not found, skipping Printful order");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Product not found in catalog, order recorded locally only" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Extract shipping address from order
    const shippingAddress = order.shipping_address;
    if (!shippingAddress) {
      throw new Error("Shipping address is required for Printful order");
    }

    // Prepare Printful order data
    const printfulOrderData = {
      recipient: {
        name: order.customer_name || shippingAddress.name || '',
        email: order.customer_email || '',
        address1: shippingAddress.address?.line1 || '',
        address2: shippingAddress.address?.line2 || '',
        city: shippingAddress.address?.city || '',
        country_code: shippingAddress.address?.country || 'SE',
        state_code: shippingAddress.address?.state || '',
        zip: shippingAddress.address?.postal_code || '',
        phone: order.customer_phone || shippingAddress.phone || '',
      },
      items: [{
        sync_variant_id: parseInt(product.printful_sync_variant_id),
        quantity: order.product_data?.quantity || 1,
        retail_price: ((order.product_data?.price || 0) / 100).toFixed(2), // Convert from cents
      }],
      external_id: order.id, // Link back to our order
    };

    logStep("Creating Printful order", { printfulOrderData });

    // Create order in Printful
    const printfulResponse = await fetch("https://api.printful.com/orders", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${printfulToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(printfulOrderData),
    });

    if (!printfulResponse.ok) {
      const errorData = await printfulResponse.text();
      logStep("Printful order creation failed", { 
        status: printfulResponse.status, 
        error: errorData 
      });
      throw new Error(`Printful API error: ${printfulResponse.status} - ${errorData}`);
    }

    const printfulResult = await printfulResponse.json();
    const printfulOrder = printfulResult.result;

    logStep("Printful order created successfully", { 
      printfulOrderId: printfulOrder.id,
      status: printfulOrder.status 
    });

    // Update our order with Printful order ID
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        printful_order_id: printfulOrder.id.toString(),
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      logStep("Failed to update order with Printful ID", updateError);
      // Don't throw here - the Printful order was created successfully
    }

    return new Response(JSON.stringify({ 
      success: true, 
      printful_order_id: printfulOrder.id,
      status: printfulOrder.status 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR creating Printful order", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});