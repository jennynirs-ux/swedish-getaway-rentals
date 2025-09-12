import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

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

const HomepageProducts = () => {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      // First sync with Printful to get latest products
      await supabase.functions.invoke('fetch-printful-products');
      
      // Then fetch visible products for homepage (exactly 6 products)
      const { data, error } = await supabase
        .from('shop_products')
        .select('*')
        .eq('is_visible_home', true)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

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
    const imageUrl = product.main_image_override || product.image_url;
    
    return { title, description, price, imageUrl };
  };

  if (loading || products.length === 0) {
    return null;
  }

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {products.map((product) => {
            const { title, description, price, imageUrl } = getDisplayData(product);
            
            return (
              <Card key={product.id} className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md">
                <div className="aspect-[4/3] overflow-hidden rounded-t-lg">
                  <img
                    src={imageUrl || '/placeholder.svg'}
                    alt={title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {title}
                  </h3>
                  
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xl font-bold text-primary">
                      {formatPrice(price, product.currency)}
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => handlePurchase(product)}
                      disabled={purchasing === product.id}
                      className="bg-primary hover:bg-primary/90"
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
};

export default HomepageProducts;