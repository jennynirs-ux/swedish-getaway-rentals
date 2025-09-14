import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface ShopProduct {
  id: string;
  title?: string;
  description?: string;
  price?: number;
  currency?: string;
  image_url?: string;
}

const HomepageProducts = () => {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("shop_products")
        .select("*")
        .limit(6);

      if (error) {
        console.error("Supabase error:", error);
      } else {
        setProducts(data || []);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price?: number, currency?: string) => {
    if (!price || !currency) return "";
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: currency,
    }).format(price / 100);
  };

  if (loading) return null;

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Nordic Essentials
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Bring a piece of Nordic beauty home with our curated collection of
            authentic Swedish products.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {products.map((product) => (
            <Card
              key={product.id}
              className="group hover:shadow-lg transition-all duration-300 border-0 shadow-sm overflow-hidden"
            >
              <Link to={`/product/${product.id}`} className="block">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={product.image_url || "/placeholder.svg"}
                    alt={product.title || "Product"}
                    loading="lazy"
                    className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </Link>

              <CardContent className="p-3 space-y-2">
                <Link to={`/product/${product.id}`}>
                  <h3 className="text-sm font-semibold text-foreground line-clamp-2 hover:text-primary transition-colors">
                    {product.title}
                  </h3>
                </Link>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-lg font-bold text-primary">
                    {formatPrice(product.price, product.currency)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
