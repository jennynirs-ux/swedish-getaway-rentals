import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const headers = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    // Input validation and sanitization
    const requestBody = await req.json();
    const { productId, quantity = 1, customerEmail, customerName, variantId } = requestBody;
    
    if (!productId) {
      console.error("Missing product ID in request");
      throw new Error("Product ID is required");
    }

    // Validate product ID format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      console.error("Invalid product ID format:", productId);
      throw new Error("Invalid product ID format");
    }

    // Validate quantity
    if (typeof quantity !== 'number' || quantity < 1 || quantity > 100) {
      console.error("Invalid quantity:", quantity);
      throw new Error("Quantity must be between 1 and 100");
    }

    // Validate email if provided
    if (customerEmail) {
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(customerEmail)) {
        console.error("Invalid email format:", customerEmail);
        throw new Error("Invalid email format");
      }
    }

    // Rate limiting check
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    
    console.log(`Product payment request from IP: ${clientIP}, User-Agent: ${userAgent}, Product: ${productId}`);

    // Get product details from database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: product, error } = await supabase
      .from("shop_products")
      .select("*")
      .eq("id", productId)
      .single();

    if (error || !product) {
      throw new Error("Product not found");
    }

    // Determine which variant to use
    let selectedVariant = null;
    if (variantId && product.printful_data?.variants) {
      selectedVariant = product.printful_data.variants.find((v: any) => v.id?.toString() === variantId);
    }
    
    // Use variant price if available, otherwise use product price
    const finalPrice = selectedVariant 
      ? Math.round(parseFloat(selectedVariant.retail_price || '0') * 100)
      : (product.price_override || product.custom_price || product.price);
    
    const finalTitle = product.title_override || product.title;
    const finalDescription = product.description_override || product.custom_description || product.description;
    const finalImage = product.main_image_override || product.image_url;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY_SHOP") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create checkout session for product
    const session = await stripe.checkout.sessions.create({
      customer_email: customerEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: product.currency.toLowerCase(),
            product_data: {
              name: selectedVariant ? `${finalTitle} - ${selectedVariant.name}` : finalTitle,
              description: finalDescription,
              images: finalImage ? [finalImage] : [],
            },
            unit_amount: finalPrice,
          },
          quantity,
        },
      ],
      mode: "payment",
      shipping_address_collection: {
        allowed_countries: ['SE', 'NO', 'DK', 'FI', 'DE', 'GB', 'US', 'CA', 'AU', 'FR', 'ES', 'IT', 'NL', 'BE'],
      },
      success_url: `${req.headers.get("origin")}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/shop`,
      metadata: {
        type: "product",
        product_id: productId,
        printful_product_id: product.printful_product_id,
        printful_variant_id: selectedVariant?.id?.toString() || product.printful_sync_variant_id,
        quantity: quantity.toString(),
        variant_name: selectedVariant?.name || '',
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...headers, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating product payment:", error);
    
    // Don't expose internal error details to client
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isValidationError = errorMessage.includes('Product ID is required') || 
                             errorMessage.includes('Invalid') || 
                             errorMessage.includes('Product not found') ||
                             errorMessage.includes('Quantity must be');
    
    const clientError = isValidationError ? errorMessage : "Payment processing failed. Please try again.";
    
    return new Response(JSON.stringify({ error: clientError }), {
      headers: { ...headers, "Content-Type": "application/json" },
      status: isValidationError ? 400 : 500,
    });
  }
});