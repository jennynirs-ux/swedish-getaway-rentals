import { useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";
import LazyImage from "@/components/LazyImage";
import { Skeleton } from "@/components/ui/skeleton";
import bookCover from "@/assets/book-cover.png";

// A small row near the bottom of the home page: three products from the shop
// and Jenny's book. The cabins come first; this is for guests who scroll on.

interface StripProduct {
  id: string;
  title: string;
  price: number;
  currency: string;
  image_url: string | null;
  title_override: string | null;
  price_override: number | null;
  custom_price: number | null;
  main_image_override: string | null;
}

const formatPrice = (price: number, currency: string) =>
  new Intl.NumberFormat("sv-SE", { style: "currency", currency }).format(price / 100);

const ShopStrip = () => {
  const productsQueryFn = useCallback(async () => {
    const { data, error } = await supabase
      .from("shop_products")
      .select("id, title, price, currency, image_url, title_override, price_override, custom_price, main_image_override")
      .eq("is_visible_home", true)
      .eq("visible", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) throw error;
    return { data: (data || []) as StripProduct[], error: null };
  }, []);

  const { data, loading } = useOptimizedQuery("home-shop-strip", productsQueryFn, {
    cacheTime: 10 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
    enableRealtime: false,
  });
  const products = data ?? [];

  return (
    <section className="py-12 border-t border-border">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-baseline justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-foreground">The Nordic Collection</h2>
          <Link to="/shop" className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Visit the shop
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading
            ? [1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />)
            : products.map((p) => {
                const title = p.title_override || p.title;
                const price = p.price_override || p.custom_price || p.price;
                return (
                  <Link
                    key={p.id}
                    to={`/product/${p.id}`}
                    className="group overflow-hidden rounded-lg border border-border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-square overflow-hidden bg-white">
                      <LazyImage
                        src={p.main_image_override || p.image_url || "/placeholder.svg"}
                        alt={title}
                        className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium text-foreground line-clamp-2">{title}</h3>
                      <p className="text-sm font-semibold text-primary mt-1">{formatPrice(price, p.currency)}</p>
                    </div>
                  </Link>
                );
              })}

          <div className="overflow-hidden rounded-lg border border-border bg-card flex flex-col">
            <div className="aspect-square overflow-hidden bg-muted/40 p-4">
              <LazyImage
                src={bookCover}
                alt="Cover of the book When the Ocean Changed Everything"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Holiday read</p>
              <h3 className="text-sm font-medium text-foreground mt-1">When the Ocean Changed Everything</h3>
              <p className="text-sm mt-2 flex flex-wrap gap-x-3">
                <a
                  href="https://bokshop.bod.se/when-the-ocean-changed-everything-jenny-nirs-9789180807661"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  English
                </a>
                <a
                  href="https://bokshop.bod.se/naer-havet-foeraendrade-allt-jenny-nirs-9789180801843"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Swedish
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShopStrip;
