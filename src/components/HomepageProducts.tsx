import { memo, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import LazyImage from "@/components/LazyImage";
import { Skeleton } from "@/components/ui/skeleton";

interface ShopProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url: string;
  custom_description?: string;
  custom_price?: number;
  title_override?: string;
  description_override?: string;
  price_override?: number;
  main_image_override?: string;
  additional_images_override?: string[];
  is_visible_shop: boolean;
  is_visible_home: boolean;
  sort_order?: number;
  printful_data?: any;
}

const HomepageProducts = memo(() => {
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const productsQueryFn = useCallback(async () => {
    const { data, error } = await supabase
      .from('shop_products')
      .select(`
        id,
        title,
        description,
        price,
        currency,
        image_url,
        custom_description,
        custom_price,
        title_override,
        description_override,
        price_override,
        main_image_override,
        is_visible_home,
        is_visible_shop,
        visible,
        sort_order,
        printful_data
      `)
      .eq('is_visible_home', true)
      .eq('visible', true)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(6);

    if (error) throw error;
    return { data: data || [], error: null };
  }, []);

  const { data: products = [], loading } = useOptimizedQuery(
    'homepage-products',
    productsQueryFn,
    {
      cacheTime: 10 * 60 * 1000,
      staleTime: 3 * 60 * 1000,
      enableRealtime: true,
      realtimeFilter: {
        event: '*',
        schema: 'public',
        table: 'shop_products'
      }
    }
  );

  const handlePurchase = async (product: ShopProduct) => {
    setPurchasing(product.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-product-payment', {
        body: {
          productId: product.id,
          quantity: 1,
          customerEmail: '',
        }
      });

      if (error) throw error;
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: "Error",
        description: "Failed to create payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPurchasing(null);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: currency,
    }).format(price / 100);
  };

  const getDisplayData = (product: ShopProduct) => {
    const title = product.title_override || product.title;
    const description = product.description_override || product.custom_description || product.description;
    const price = product.price_override || product.custom_price || product.price;
    const imageUrl = product.main_image_override || product.image_url || "/placeholder.jpg"; // ✅ fallback

    return { title, description, price, imageUrl };
  };

  if (loading) {
    return (
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-[4/3] w-full" />
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex items-center justify-between pt-1">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Nordic Essentials
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Bring a piece of Nordic beauty home with our curated collection of authentic Swedish products.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {products.map((product) => {
            const { title, description, price, imageUrl } = getDisplayData(product);

            return (
              <Card key={product.id} className="group hover:shadow-lg transition-all duration-300 border-0 shadow-sm overflow-hidden">
                <Link to={`/product/${product.id}`} className="block">
                  <div className="aspect-[4/3] overflow-hidden">
                    <LazyImage
                      src={imageUrl}
                      fallbackSrc="/placeholder.jpg"
                      alt={title}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </Link>

              <CardContent className="p-3 space-y-2">
                <Link to={`/product/${product.id}`}>
                  <h3 className="text-sm font-semibold text-foreground line-clamp-2 hover:text-primary transition-colors">
                    {title}
                  </h3>
                </Link>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
                  <div className="text-lg font-bold text-primary">
                    {formatPrice(price, product.currency)}
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => handlePurchase(product)}
                    disabled={purchasing === product.id}
                    className="bg-primary hover:bg-primary/90 text-xs px-3 py-1 w-full sm:w-auto"
                  >
                    {purchasing === product.id ? (
                      <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full mr-1" />
                    ) : (
                      <ShoppingCart className="w-3 h-3 mr-1" />
                    )}
                    Buy Now
                  </Button>
                </div>
              </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Link to="/shop">
            <Button variant="outline" size="lg" className="group">
              View All Products
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
});

HomepageProducts.displayName = 'HomepageProducts';

export default HomepageProducts;
