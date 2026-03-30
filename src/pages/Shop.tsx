// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import MainNavigation from "@/components/MainNavigation";
import { useCart } from "@/context/CartContext";
import ShopFilters, { ShopFilters as ShopFiltersType } from "@/components/ShopFilters";
import forestHeroBg from "@/assets/forest-hero-bg.webp";

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
  product_type?: string;
  color?: string;
  tags?: string[];
}

const Shop = () => {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const { addItem } = useCart();
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<ShopFiltersType>({
    sortBy: "newest",
    productType: undefined,
    color: undefined,
    tags: [],
  });

  const getDisplayData = (product: ShopProduct) => {
    const title = product.title_override || product.title;
    const description =
      product.description_override ||
      product.custom_description ||
      product.description || "";
    const price =
      product.price_override || product.custom_price || product.price;
    const imageUrl = product.main_image_override || product.image_url;

    return { title, description, price, imageUrl };
  };

  useEffect(() => {
    document.title = 'Shop | Nordic Getaways';
    fetchProducts();
  }, []);

  // Extract filter options from products
  const availableProductTypes = useMemo(() => {
    const types = new Set<string>();
    products.forEach(product => {
      if (product.product_type) types.add(product.product_type);
    });
    return Array.from(types).sort();
  }, [products]);

  const availableColors = useMemo(() => {
    const colors = new Set<string>();
    products.forEach(product => {
      if (product.color) colors.add(product.color);
    });
    return Array.from(colors).sort();
  }, [products]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    products.forEach(product => {
      if (product.tags) {
        product.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [products]);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(product => {
        const { title, description } = getDisplayData(product);
        const searchText = searchTerm.toLowerCase();
        return (
          title.toLowerCase().includes(searchText) ||
          description.toLowerCase().includes(searchText)
        );
      });
    }

    // Apply filters
    if (filters.productType) {
      filtered = filtered.filter(product => product.product_type === filters.productType);
    }

    if (filters.color) {
      filtered = filtered.filter(product => product.color === filters.color);
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(product => 
        filters.tags!.some(tag => product.tags?.includes(tag))
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      const aData = getDisplayData(a);
      const bData = getDisplayData(b);

      switch (filters.sortBy) {
        case "price-low":
          return aData.price - bData.price;
        case "price-high":
          return bData.price - aData.price;
        case "name":
          return aData.title.localeCompare(bData.title);
        case "newest":
        default:
          return 0; // Keep original order (already sorted by created_at in query)
      }
    });

    return sorted;
  }, [products, searchTerm, filters]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("shop_products")
        .select("*, product_type, color, tags")
        .eq("is_visible_shop", true)
        .eq("visible", true)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to load products. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (product: ShopProduct) => {
    setPurchasing(product.id);
    try {
      const { title, price, imageUrl } = getDisplayData(product);
      addItem({
        productId: product.id,
        title,
        price,
        currency: product.currency,
        quantity: 1,
        image: imageUrl,
      });
      toast({ title: "Added to cart", description: title });
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast({
        title: "Error",
        description: "Failed to add to cart.",
        variant: "destructive",
      });
    } finally {
      setPurchasing(null);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: currency,
    }).format(price / 100);
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
      <section className="relative py-20 pt-28 overflow-hidden">
        {/* Bakgrundsbild */}
        <div className="absolute inset-0">
          <img
            src={forestHeroBg}
            alt="Nordic forest background"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        </div>
      
        {/* Innehåll */}
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold !text-white mb-6">
            The Nordic Collection
          </h1>
          <p className="text-2xl !text-white max-w-3xl mx-auto">
            Discover unique Nordic-inspired products that bring the beauty of
            Scandinavia to your home.
          </p>
      
          {/* Search Bar */}
          <div className="max-w-md mx-auto relative mt-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 !text-white w-4 h-4" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-black/40 !text-white placeholder:!text-white"
            />
          </div>
        </div>
      </section>


      {/* Products Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <div className="lg:w-64 shrink-0">
              <ShopFilters
                filters={filters}
                onFiltersChange={setFilters}
                availableProductTypes={availableProductTypes}
                availableColors={availableColors}
                availableTags={availableTags}
              />
            </div>

            {/* Products Content */}
            <div className="flex-1">
              {filteredAndSortedProducts.length === 0 ? (
                <div className="text-center py-20">
                  <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {searchTerm ? "No products found" : "No products found"}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm
                      ? "Try adjusting your search terms or filters"
                      : "No products found. Click Sync with Printful to import your products."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-foreground">
                      {searchTerm
                        ? `Search Results (${filteredAndSortedProducts.length})`
                        : `All Products (${filteredAndSortedProducts.length})`}
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredAndSortedProducts.map((product) => {
                  const { title, description, price, imageUrl } =
                    getDisplayData(product);

                  return (
                    <Card
                      key={product.id}
                      className="group hover:shadow-md transition-all duration-300 overflow-hidden border"
                    >
                      <Link to={`/product/${product.id}`} className="block">
                        <div className="aspect-[4/3] overflow-hidden bg-muted">
                          <img
                            src={imageUrl || "/placeholder.svg"}
                            alt={title}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      </Link>

                      <CardHeader className="p-3 pb-1">
                        <Link to={`/product/${product.id}`}>
                          <CardTitle className="text-sm font-semibold line-clamp-2 hover:text-primary transition-colors">
                            {title}
                          </CardTitle>
                        </Link>
                      </CardHeader>

                      <CardContent className="px-3 pb-3 space-y-2">
                        <p className="text-muted-foreground text-xs line-clamp-2">
                          {description}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="text-base font-bold text-primary">
                            {formatPrice(price, product.currency)}
                          </div>

                          <Button
                            onClick={() => handleAddToCart(product)}
                            disabled={purchasing === product.id}
                            size="sm"
                            className="text-xs px-2"
                          >
                            {purchasing === product.id ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <ShoppingCart className="w-3 h-3 mr-1" />
                            )}
                            Add
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
          </div>
        </div>
      </section>
    </div>
  );
};

export default Shop;
