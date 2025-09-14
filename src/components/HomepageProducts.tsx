import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
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

  if (loading) return null;

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Featured Products
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div key={product.id} className="border rounded-lg p-4">
              <img
                src={product.image_url || "/placeholder.svg"}
                alt={product.title || "Product"}
                className="w-full h-48 object-contain mb-4"
              />
              <h3 className="text-lg font-semibold">{product.title}</h3>
              <p className="text-sm text-gray-600">{product.description}</p>
              <p className="font-bold mt-2">
                {product.price
                  ? `${(product.price / 100).toFixed(2)} ${
                      product.currency || "SEK"
                    }`
                  : ""}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomepageProducts;
