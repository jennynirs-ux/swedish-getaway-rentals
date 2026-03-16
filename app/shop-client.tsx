'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import MainNavigation from '@/components/MainNavigation';
import { useCart } from '@/context/CartContext';
import ShopFilters, { ShopFilters as ShopFiltersType } from '@/components/ShopFilters';
import forestHeroBg from '@/assets/forest-hero-bg.jpg';

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

interface ShopClientProps {
  initialProducts: ShopProduct[];
}

const ShopClient = ({ initialProducts }: ShopClientProps) => {
  const [products, setProducts] = useState<ShopProduct[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const { addItem } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ShopFiltersType>({
    sortBy: 'newest',
    productType: undefined,
    color: undefined,
    tags: [],
  });

  const getDisplayData = (product: ShopProduct) => {
    const title = product.title_override || product.title;
    const description =
      product.description_override ||
      product.custom_description ||
      product.description ||
      '';
    const price = product.price_override || product.custom_price || product.price;
    const imageUrl = product.main_image_override || product.image_url;

    return { title, description, price, imageUrl };
  };

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  const availableProductTypes = useMemo(() => {
    const types = new Set<string>();
    products.forEach((product) => {
      if (product.product_type) types.add(product.product_type);
    });
    return Array.from(types).sort();
  }, [products]);

  const availableColors = useMemo(() => {
    const colors = new Set<string>();
    products.forEach((product) => {
      if (product.color) colors.add(product.color);
    });
    return Array.from(colors).sort();
  }, [products]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    products.forEach((product) => {
      if (product.tags) {
        product.tags.forEach((tag) => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [products]);

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products;

    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(lowerSearch) ||
          p.description.toLowerCase().includes(lowerSearch)
      );
    }

    if (filters.productType) {
      filtered = filtered.filter((p) => p.product_type === filters.productType);
    }

    if (filters.color) {
      filtered = filtered.filter((p) => p.color === filters.color);
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter((p) =>
        filters.tags.every((tag) => p.tags?.includes(tag))
      );
    }

    let sorted = [...filtered];
    if (filters.sortBy === 'price-low-high') {
      sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (filters.sortBy === 'price-high-low') {
      sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (filters.sortBy === 'newest') {
      sorted.sort((a, b) => (b.sort_order || 0) - (a.sort_order || 0));
    }

    return sorted;
  }, [products, searchTerm, filters]);

  const handleAddToCart = async (product: ShopProduct) => {
    try {
      setPurchasing(product.id);
      const displayData = getDisplayData(product);

      addItem({
        id: product.id,
        title: displayData.title,
        price: displayData.price,
        image: displayData.imageUrl,
        quantity: 1,
      });

      toast({
        title: 'Added to cart',
        description: `${displayData.title} has been added to your cart.`,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: 'Error',
        description: 'Failed to add item to cart. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />

      <div className="relative h-80 flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <img src={forestHeroBg} alt="Shop header" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/30 to-black/70"></div>
        </div>
        <div className="relative z-10 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            The Nordic Collection
          </h1>
          <p className="text-xl text-white/90">Curated Nordic design and lifestyle products</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <ShopFilters
            onFiltersChange={setFilters}
            productTypes={availableProductTypes}
            colors={availableColors}
            tags={availableTags}
            currentFilters={filters}
          />

          <div className="flex-1">
            <div className="mb-6 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground mt-2">Loading products...</p>
              </div>
            ) : filteredAndSortedProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No products found. Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedProducts.map((product) => {
                  const displayData = getDisplayData(product);
                  return (
                    <Card key={product.id} className="flex flex-col h-full hover:shadow-lg transition-shadow">
                      <CardContent className="p-0">
                        <div className="relative h-64 overflow-hidden rounded-t-lg">
                          <img
                            src={displayData.imageUrl}
                            alt={displayData.title}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        </div>
                      </CardContent>
                      <CardHeader className="flex-1 flex flex-col">
                        <CardTitle className="line-clamp-2">{displayData.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {displayData.description}
                        </p>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold">
                            {displayData.price} {product.currency}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => handleAddToCart(product)}
                            disabled={purchasing === product.id}
                            className="gap-2"
                          >
                            {purchasing === product.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ShoppingCart className="w-4 h-4" />
                            )}
                            Add
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopClient;
