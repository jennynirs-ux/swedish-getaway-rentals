import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const printfulToken = Deno.env.get("PRINTFUL_API_TOKEN");
    if (!printfulToken) {
      throw new Error("Printful API token not configured");
    }

    // Fetch products from Printful
    const response = await fetch("https://api.printful.com/store/products", {
      headers: {
        "Authorization": `Bearer ${printfulToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Printful API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Printful products fetched:", data.result?.length || 0);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Sync products with our database
    if (data.result && Array.isArray(data.result)) {
      for (const product of data.result) {
        // Get sync variants for each product to have proper variant IDs
        const variantsResponse = await fetch(`https://api.printful.com/sync/products/${product.id}`, {
          headers: {
            "Authorization": `Bearer ${printfulToken}`,
            "Content-Type": "application/json",
          },
        });

        let productData = {
          printful_product_id: product.id.toString(),
          title: product.name || "Untitled Product",
          description: product.description || "",
          price: Math.round((product.retail_price || 2500)), // Default price in SEK cents
          currency: "SEK",
          image_url: product.thumbnail_url || "",
          printful_data: product,
        };

        // If we can get variant details, use the first variant's price
        if (variantsResponse.ok) {
          const variantsData = await variantsResponse.json();
          if (variantsData.result && variantsData.result.sync_variants && variantsData.result.sync_variants.length > 0) {
            const firstVariant = variantsData.result.sync_variants[0];
            if (firstVariant.retail_price) {
              // Convert USD to SEK (approximate rate 1 USD = 11 SEK)
              productData.price = Math.round(parseFloat(firstVariant.retail_price) * 11 * 100); // Convert to cents
            }
            
            // Update printful_data to include variant information
            productData.printful_data = {
              ...product,
              sync_variants: variantsData.result.sync_variants,
              sync_product_id: variantsData.result.id
            };
            
            // Use the sync variant ID as the product identifier for ordering
            productData.printful_product_id = firstVariant.id.toString();
          }
        }

        // Upsert product while preserving local overrides
        const { data: existingProduct } = await supabase
          .from("shop_products")
          .select("*")
          .eq("printful_product_id", productData.printful_product_id)
          .single();

        // If product exists, preserve local overrides
        if (existingProduct) {
          const updateData = {
            ...productData,
            // Preserve existing local overrides
            title_override: existingProduct.title_override,
            description_override: existingProduct.description_override,
            price_override: existingProduct.price_override,
            main_image_override: existingProduct.main_image_override,
            additional_images_override: existingProduct.additional_images_override,
            is_visible_shop: existingProduct.is_visible_shop,
            is_visible_home: existingProduct.is_visible_home,
            sort_order: existingProduct.sort_order,
          };

          await supabase
            .from("shop_products")
            .update(updateData)
            .eq("id", existingProduct.id);
        } else {
          // New product, set default visibility
          await supabase
            .from("shop_products")
            .insert({
              ...productData,
              is_visible_shop: true,
              is_visible_home: false
            });
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      products_synced: data.result?.length || 0 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error fetching Printful products:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});