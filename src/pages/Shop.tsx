import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Star, Loader2, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import MainNavigation from "@/components/MainNavigation";

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

const Shop = () => {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => {
        const { title, description } = getDisplayData(product);
        const searchText = searchTerm.toLowerCase();
        return title.toLowerCase().includes(searchText) || 
               description.toLowerCase().includes(searchText);
      });
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  const fetchProducts = async () => {
    try {
      // First sync with Printful to get latest products
      await supabase.functions.invoke('sync-printful-products');
      
      // Then fetch visible products
      const { data, error } = await supabase
        .from('shop_products')
        .select('*')
        .eq('is_visible_shop', true)
        .eq('visible', true)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products. Please try again.",
        variant: "destructive",
      });
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
          customerEmail: '', // Stripe Checkout will collect this
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNavigation showBackButton currentPage="shop" />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading products...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation showBackButton currentPage="shop" />
      
      {/* Header */}
      <section className="bg-gradient-to-r from-primary/10 to-secondary/10 py-20 pt-28">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">Nordic Store</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Discover unique Nordic-inspired products that bring the beauty of Scandinavia to your home.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background/50 backdrop-blur-sm"
            />
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchTerm ? "No products found" : "No products available"}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm ? "Try adjusting your search terms" : "Check back soon for new arrivals!"}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-foreground">
                  {searchTerm ? `Search Results (${filteredProducts.length})` : `All Products (${filteredProducts.length})`}
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map(product => {
                  const { title, description, price, imageUrl } = getDisplayData(product);
                  
                  return (
                    <Card key={product.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
                      <Link to={`/product/${product.id}`} className="block">
                        <div className="aspect-[4/3] overflow-hidden">
                          <img 
                            src={imageUrl || '/placeholder.svg'} 
                            alt={title} 
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                        </div>
                      </Link>
                      
                      <CardHeader className="pb-2">
                        <Link to={`/product/${product.id}`}>
                          <CardTitle className="text-lg font-semibold line-clamp-2 hover:text-primary transition-colors">
                            {title}
                          </CardTitle>
                        </Link>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <p className="text-muted-foreground text-sm line-clamp-2">
                          {description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-xl font-bold text-primary">
                            {formatPrice(price, product.currency)}
                          </div>
                          
                          <Button 
                            onClick={() => handlePurchase(product)} 
                            disabled={purchasing === product.id} 
                            size="sm"
                          >
                            {purchasing === product.id ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
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
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Shop;