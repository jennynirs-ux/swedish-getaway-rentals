import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-PRINTFUL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Read optional body to support hard replace mode
    let replaceMode = false;
    try {
      const body = await req.json();
      replaceMode = body?.mode === 'replace';
    } catch (_) {
      // no body provided
    }

    logStep("Starting Printful sync", { replaceMode });

    const printfulToken = Deno.env.get("PRINTFUL_API_TOKEN");
    if (!printfulToken) {
      throw new Error("PRINTFUL_API_TOKEN is not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch all products from Printful store (paginate all pages)
    logStep("Fetching products from Printful");
    const limit = 100; // Printful supports pagination, fetch up to 100 per page
    let offset = 0;
    const printfulProducts: any[] = [];
    while (true) {
      const url = `https://api.printful.com/store/products?offset=${offset}&limit=${limit}`;
      const resp = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${printfulToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!resp.ok) {
        throw new Error(`Printful API error: ${resp.status} ${resp.statusText}`);
      }

      const data = await resp.json();
      const batch = data.result || [];
      logStep("Fetched batch from Printful", { batch: batch.length, offset });
      if (batch.length === 0) break;
      printfulProducts.push(...batch);
      offset += batch.length;
      if (batch.length < limit) break; // last page
    }
logStep("Fetched products from Printful", { count: printfulProducts.length });

    // If replace mode, clear existing products first
    if (replaceMode) {
      logStep("Replace mode enabled - clearing existing products");
      await supabase
        .from('shop_products')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
    }

    // Get existing products from database
    const { data: existingProducts, error: fetchError } = await supabase
      .from('shop_products')
      .select('*');

    if (fetchError) {
      throw fetchError;
    }

    const existingProductMap = new Map(
      (replaceMode ? [] : (existingProducts?.map(p => [p.printful_product_id, p]) || []))
    );

    // Track which Printful products we've seen
    const seenPrintfulIds = new Set<string>();
    const upsertPromises = [];

    // Process each Printful product
    for (const printfulProduct of printfulProducts) {
      seenPrintfulIds.add(printfulProduct.id.toString());
      
      // Get detailed product info including variants
      const detailResponse = await fetch(`https://api.printful.com/store/products/${printfulProduct.id}`, {
        headers: {
          "Authorization": `Bearer ${printfulToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!detailResponse.ok) {
        logStep("Failed to fetch product details", { productId: printfulProduct.id });
        continue;
      }

      const detailData = await detailResponse.json();
      const productDetail = detailData.result;
      
      // Use the first variant for pricing and main product data
      const mainVariant = productDetail.sync_variants?.[0];
      if (!mainVariant) {
        logStep("No variants found for product", { productId: printfulProduct.id });
        continue;
      }

      // Prepare all mockup images
      const allImages: string[] = [];
      
      // Add main product image
      if (printfulProduct.thumbnail_url) {
        allImages.push(printfulProduct.thumbnail_url);
      }

      // Add all variant mockup images
      for (const variant of productDetail.sync_variants || []) {
        if (variant.files) {
          variant.files.forEach((file: any) => {
            if (file.type === 'preview' && file.preview_url && !allImages.includes(file.preview_url)) {
              allImages.push(file.preview_url);
            }
          });
        }
      }

      const existing = existingProductMap.get(printfulProduct.id.toString());
      
      const productData = {
        printful_product_id: printfulProduct.id.toString(),
        printful_sync_variant_id: mainVariant.id?.toString(),
        title: existing?.title_override || printfulProduct.name,
        description: existing?.description_override || productDetail.product?.description || printfulProduct.name,
        price: Math.round(parseFloat(mainVariant.retail_price || '0') * 100), // Convert to cents from Printful retail_price
        currency: mainVariant.currency || 'SEK',
        image_url: allImages[0] || printfulProduct.thumbnail_url,
        additional_images_override: allImages.slice(1),
        printful_data: {
          product: productDetail.product,
          variants: productDetail.sync_variants,
          all_images: allImages,
        },
        visible: existing?.visible !== false,
        is_visible_shop: existing?.is_visible_shop !== false,
        is_visible_home: existing?.is_visible_home || false,
        sort_order: existing?.sort_order,
        // Preserve any existing overrides
        title_override: existing?.title_override,
        description_override: existing?.description_override,
        price_override: existing?.price_override,
        main_image_override: existing?.main_image_override,
        custom_description: existing?.custom_description,
        custom_price: existing?.custom_price,
      };

      if (existing) {
        // Update existing product (only if no local overrides)
        const updateData: any = {
          printful_data: productData.printful_data,
          updated_at: new Date().toISOString(),
        };

        // Only update these fields if no override exists
        if (!existing.title_override) updateData.title = productData.title;
        if (!existing.description_override) updateData.description = productData.description;
        if (!existing.price_override) updateData.price = productData.price; // Always sync with Printful retail_price unless overridden
        if (!existing.main_image_override) updateData.image_url = productData.image_url;
        
        // Always update additional images and currency
        updateData.additional_images_override = productData.additional_images_override;
        updateData.currency = productData.currency;
        updateData.printful_sync_variant_id = productData.printful_sync_variant_id;

        upsertPromises.push(
          supabase
            .from('shop_products')
            .update(updateData)
            .eq('printful_product_id', printfulProduct.id.toString())
        );
      } else {
        // Insert new product
        upsertPromises.push(
          supabase
            .from('shop_products')
            .insert(productData)
        );
      }
    }

    // Execute all upserts
    await Promise.all(upsertPromises);

    // Mark products as unavailable if they no longer exist in Printful
    const unavailableProducts = existingProducts?.filter(
      p => p.printful_product_id && !seenPrintfulIds.has(p.printful_product_id)
    ) || [];

    if (unavailableProducts.length > 0) {
      await supabase
        .from('shop_products')
        .update({ 
          visible: false, 
          is_visible_shop: false, 
          is_visible_home: false,
          updated_at: new Date().toISOString()
        })
        .in('printful_product_id', unavailableProducts.map(p => p.printful_product_id));
      
      logStep("Marked unavailable products", { count: unavailableProducts.length });
    }

    logStep("Sync completed successfully", { 
      processed: printfulProducts.length,
      unavailable: unavailableProducts.length 
    });

    return new Response(JSON.stringify({ 
      success: true, 
      processed: printfulProducts.length,
      unavailable: unavailableProducts.length 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR during sync", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});