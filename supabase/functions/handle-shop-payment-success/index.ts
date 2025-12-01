import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Verify Stripe webhook signature for SHOP account
const verifyStripeSignature = (req: Request, body: string): boolean => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_SHOP');
  
  if (!signature || !webhookSecret) {
    console.error('Missing signature or webhook secret');
    return false;
  }
  
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY_SHOP") || "", {
      apiVersion: "2025-08-27.basil",
    });
    stripe.webhooks.constructEvent(body, signature, webhookSecret);
    return true;
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return false;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    
    // Verify webhook signature for security
    if (!verifyStripeSignature(req, rawBody)) {
      console.error('Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    // Parse request body
    const requestBody = JSON.parse(rawBody);
    const { session_id } = requestBody;
    
    if (!session_id) {
      console.error("Missing session ID in request");
      throw new Error("Session ID is required");
    }

    // Validate session ID format (Stripe session IDs start with cs_)
    if (!session_id.startsWith('cs_')) {
      console.error("Invalid session ID format:", session_id);
      throw new Error("Invalid session ID format");
    }

    const userAgent = req.headers.get('user-agent') || 'unknown';
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    
    console.log(`Shop payment handler called from IP: ${clientIP}, Session: ${session_id}`);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY_SHOP") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id, { expand: ['line_items'] });
    
    if (!session) {
      throw new Error("Session not found");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check for duplicate processing (idempotency)
    const { data: existingSession } = await supabase
      .from('processed_sessions')
      .select('id, session_type, created_record_id')
      .eq('session_id', session_id)
      .single();
    
    if (existingSession) {
      console.log('Session already processed:', session_id);
      return new Response(JSON.stringify({
        success: true,
        type: existingSession.session_type,
        orderId: existingSession.created_record_id,
        message: 'Already processed'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let result = { success: true, type: 'unknown', orderId: null };

    // Handle product orders
    if (session.metadata?.type === 'product') {
      const metadata = session.metadata;
      
      // Get shipping details from session
      const shippingDetails = session.shipping_details || session.customer_details;
      const shippingAddress = shippingDetails?.address ? {
        name: shippingDetails.name || session.customer_details?.name,
        address1: shippingDetails.address.line1,
        address2: shippingDetails.address.line2,
        city: shippingDetails.address.city,
        state_code: shippingDetails.address.state,
        country_code: shippingDetails.address.country,
        zip: shippingDetails.address.postal_code,
      } : null;

      // Get product details
      const { data: product } = await supabase
        .from('shop_products')
        .select('*')
        .eq('id', metadata.product_id)
        .single();

      if (!product) {
        throw new Error('Product not found');
      }

      // Create order record
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_email: session.customer_details?.email || session.customer_email,
          customer_name: shippingDetails?.name || session.customer_details?.name,
          customer_phone: session.customer_details?.phone,
          total_amount: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency?.toUpperCase() || 'SEK',
          status: 'pending',
          stripe_payment_intent_id: session.payment_intent as string,
          product_data: {
            product_id: metadata.product_id,
            printful_product_id: metadata.printful_product_id,
            printful_variant_id: metadata.printful_variant_id,
            quantity: parseInt(metadata.quantity || '1'),
            variant_name: metadata.variant_name,
            title: product.title_override || product.title,
            price: session.amount_total ? session.amount_total / 100 : 0,
          },
          shipping_address: shippingAddress,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Record processed session
      await supabase.from('processed_sessions').insert({
        session_id,
        session_type: 'product',
        ip_address: clientIP,
        user_agent: userAgent,
        created_record_id: order.id
      });

      // Create Printful order if shipping address provided
      if (shippingAddress && metadata.printful_product_id && metadata.printful_variant_id) {
        try {
          console.log('Creating Printful order for:', order.id);
          await supabase.functions.invoke('create-printful-order', {
            body: {
              orderId: order.id,
              recipient: shippingAddress,
              items: [{
                variant_id: parseInt(metadata.printful_variant_id),
                quantity: parseInt(metadata.quantity || '1'),
              }],
            },
          });
        } catch (printfulError) {
          console.error('Failed to create Printful order:', printfulError);
          // Don't fail the whole transaction if Printful fails
        }
      }

      result = { success: true, type: 'product', orderId: order.id };
    }
    
    // Handle cart orders
    else if (session.metadata?.type === 'cart') {
      const metadata = session.metadata;
      const items = JSON.parse(metadata.items || '[]');
      
      const shippingDetails = session.shipping_details || session.customer_details;
      const shippingAddress = shippingDetails?.address ? {
        name: shippingDetails.name || session.customer_details?.name,
        address1: shippingDetails.address.line1,
        address2: shippingDetails.address.line2,
        city: shippingDetails.address.city,
        state_code: shippingDetails.address.state,
        country_code: shippingDetails.address.country,
        zip: shippingDetails.address.postal_code,
      } : null;

      // Create cart order record
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_email: session.customer_details?.email || session.customer_email,
          customer_name: shippingDetails?.name || session.customer_details?.name,
          customer_phone: session.customer_details?.phone,
          total_amount: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency?.toUpperCase() || metadata.currency?.toUpperCase() || 'SEK',
          status: 'pending',
          stripe_payment_intent_id: session.payment_intent as string,
          product_data: { items, shipping_cost: parseFloat(metadata.shipping_cost || '0') },
          shipping_address: shippingAddress,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Record processed session
      await supabase.from('processed_sessions').insert({
        session_id,
        session_type: 'cart',
        ip_address: clientIP,
        user_agent: userAgent,
        created_record_id: order.id
      });

      result = { success: true, type: 'cart', orderId: order.id };
    }

    console.log('Shop payment processed successfully:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing shop payment:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return new Response(
      JSON.stringify({ error: "Payment processing failed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
