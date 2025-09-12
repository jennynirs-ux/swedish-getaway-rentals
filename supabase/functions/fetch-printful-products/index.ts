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
        // Convert price from USD cents to SEK (rough conversion)
        const priceInSEK = Math.round((product.retail_price || 0) * 11); // Approximate USD to SEK conversion
        
        const productData = {
          printful_product_id: product.id.toString(),
          title: product.name || "Untitled Product",
          description: product.description || "",
          price: priceInSEK,
          currency: "SEK",
          image_url: product.thumbnail_url || "",
          printful_data: product,
        };

        // Upsert product
        await supabase
          .from("shop_products")
          .upsert(productData, { 
            onConflict: "printful_product_id",
            ignoreDuplicates: false 
          });
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