import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Edit2, Eye, EyeOff, Home, RefreshCw } from "lucide-react";

  interface ShopProduct {
    id: string;
    printful_id?: string;
    title: string;
    description: string;
    price: number;
    currency: string;
    image_url: string;
    title_override?: string | null;
    description_override?: string | null;
    price_override?: number | null;
    main_image_override?: string | null;
    additional_images_override?: string[];
    is_visible_shop?: boolean;
    is_visible_home?: boolean;
    sort_order?: number | null;
    created_at?: string;
  }
  
  const ShopProductsManagement = () => {
    const [products, setProducts] = useState<ShopProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
  
    useEffect(() => {
      loadProducts();
    }, []);
  
   const loadProducts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-printful-products');
  
      console.log("👉 Raw Supabase response:", { data, error });
  
      if (error) {
        throw new Error(error.message || "Unknown error from fetch-printful-products");
      }
  
      // Försök hämta produkterna oavsett var de ligger
      let products: any[] = [];
      if (Array.isArray(data)) {
        products = data;
      } else if (data?.products && Array.isArray(data.products)) {
        products = data.products;
      } else if (data?.result?.items && Array.isArray(data.result.items)) {
        products = data.result.items;
      } else {
        console.warn("⚠️ Could not parse products, got:", data);
      }
  
      setProducts(products);
    } catch (err) {
      console.error("❌ Error loading products:", err);
      toast({
        title: "Error",
        description: "Failed to load products. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };



  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: currency,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading products…</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">No products found</h3>
        <p className="text-muted-foreground mb-4">
          Click "Sync with Printful" to import your products
        </p>
        <Button onClick={loadProducts} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          Sync with Printful
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Shop Products</h2>
        <Button onClick={loadProducts} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          Sync with Printful
        </Button>
      </div>

      <div className="grid gap-4">
        {products.map((product) => (
          <Card key={product.id}>
            <CardContent className="p-4 flex gap-4">
              <img
                src={product.image_url}
                alt={product.title}
                className="w-20 h-20 object-cover rounded"
              />
              <div className="flex-1">
                <h3 className="font-semibold">{product.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {product.description?.substring(0, 80)}…
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-bold text-primary">
                    {formatPrice(product.price, product.currency)}
                  </span>
                  {product.is_visible_shop ? (
                    <Badge>Shop</Badge>
                  ) : (
                    <Badge variant="secondary">Hidden</Badge>
                  )}
                  {product.is_visible_home && <Badge variant="outline">Homepage</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ShopProductsManagement;
