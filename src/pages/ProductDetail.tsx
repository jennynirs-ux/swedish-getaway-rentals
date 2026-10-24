import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Link } from "@/i18n/router";
import { ArrowLeft, ShoppingCart, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import MainNavigation from "@/components/MainNavigation";
import { useCart } from "@/context/CartContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { buildProductJsonLd, productDescription, productPath, SHOP_BRAND } from "@/lib/productSeo";
import type { ShippingSettings } from "../../supabase/functions/_shared/shop-shipping";
import { listedPrice } from "../../supabase/functions/_shared/shop-variants";
import { type Copy, LOCALES, useCopy, useLang } from "@/i18n";

const en = {
  error: "Error",
  loadFailed: "Failed to load product details.",
  added: "Added to cart",
  addFailed: "Failed to add to cart.",
  metaDefault: `Nordic designs from ${SHOP_BRAND}, printed to order.`,
  // Same as productDescription's fallback (src/lib/productSeo.ts)
  printedToOrder: (title: string) => `${title} from ${SHOP_BRAND}, printed to order.`,
  notFound: "Product Not Found",
  backToShop: "Back to Shop",
  back: "Back",
  imageAlt: (title: string, n: number) => `${title} view ${n}`,
  from: "From ",
  inStock: "In Stock",
  description: "Description",
  options: "Options",
  selectOption: "Select an option",
  quantity: "Quantity",
  processing: "Processing...",
  addToCart: "Add to Cart",
  selectToContinue: "Please select an option to continue",
  freeShipping: (amount: string) => `Free shipping in Sweden on orders from ${amount}`,
  quality: "High-quality printing and materials",
  sustainable: "Sustainable production process",
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    error: "Något gick fel",
    loadFailed: "Det gick inte att ladda produkten.",
    added: "Tillagd i varukorgen",
    addFailed: "Det gick inte att lägga till i varukorgen.",
    metaDefault: `Nordisk design från ${SHOP_BRAND}, tryckt på beställning.`,
    printedToOrder: (title) => `${title} från ${SHOP_BRAND}, tryckt på beställning.`,
    notFound: "Produkten hittades inte",
    backToShop: "Tillbaka till butiken",
    back: "Tillbaka",
    imageAlt: (title, n) => `${title}, bild ${n}`,
    from: "Från ",
    inStock: "I lager",
    description: "Beskrivning",
    options: "Alternativ",
    selectOption: "Välj ett alternativ",
    quantity: "Antal",
    processing: "Bearbetar…",
    addToCart: "Lägg i varukorgen",
    selectToContinue: "Välj ett alternativ för att fortsätta",
    freeShipping: (amount) => `Fri frakt inom Sverige när du handlar för minst ${amount}`,
    quality: "Tryck och material av hög kvalitet",
    sustainable: "Hållbar tillverkning",
  },
  de: {
    error: "Fehler",
    loadFailed: "Die Produktdetails konnten nicht geladen werden.",
    added: "Zum Warenkorb hinzugefügt",
    addFailed: "Der Artikel konnte nicht in den Warenkorb gelegt werden.",
    metaDefault: `Nordische Designs von ${SHOP_BRAND}, auf Bestellung gedruckt.`,
    printedToOrder: (title) => `${title} von ${SHOP_BRAND}, auf Bestellung gedruckt.`,
    notFound: "Produkt nicht gefunden",
    backToShop: "Zurück zum Shop",
    back: "Zurück",
    imageAlt: (title, n) => `${title}, Ansicht ${n}`,
    from: "Ab ",
    inStock: "Auf Lager",
    description: "Beschreibung",
    options: "Optionen",
    selectOption: "Option auswählen",
    quantity: "Menge",
    processing: "Wird verarbeitet…",
    addToCart: "In den Warenkorb",
    selectToContinue: "Bitte wähle eine Option, um fortzufahren",
    freeShipping: (amount) => `Kostenloser Versand innerhalb Schwedens ab ${amount} Bestellwert`,
    quality: "Hochwertiger Druck und hochwertige Materialien",
    sustainable: "Nachhaltige Herstellung",
  },
};

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
  price_max?: number | null;
  main_image_override?: string;
  additional_images_override?: string[];
  printful_data?: any;
  visible?: boolean;
  is_visible_shop?: boolean;
  is_visible_home?: boolean;
  printful_product_id?: string;
  printful_sync_variant_id?: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

const ProductDetail = () => {
  const t = useCopy(COPY);
  const lang = useLang();
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const { addItem } = useCart();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  // For the shipping price in the product data Google reads (same rates as the cart)
  const [shipping, setShipping] = useState<ShippingSettings | null>(null);
  const [shippingLoaded, setShippingLoaded] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  useEffect(() => {
    supabase
      .from('platform_settings')
      .select('setting_value')
      .eq('setting_key', 'shipping_settings')
      .maybeSingle()
      .then(({ data }) => {
        setShipping((data?.setting_value as ShippingSettings | undefined) ?? null);
        setShippingLoaded(true);
      });
  }, []);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('shop_products')
        .select('*')
        .eq('id', id)
        .eq('visible', true)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: t.error,
        description: t.loadFailed,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDisplayData = (product: ShopProduct) => {
    const title = product.title_override || product.title;
    const description = product.description_override || product.custom_description || product.description;
    const { price, from } = listedPrice(product);
    const imageUrl = product.main_image_override || product.image_url;
    
    // Get all available images
    const allImages = [imageUrl];
    if (product.additional_images_override) {
      allImages.push(...product.additional_images_override);
    }
    if (product.printful_data?.all_images && Array.isArray(product.printful_data.all_images)) {
      product.printful_data.all_images.forEach((img: string) => {
        if (!allImages.includes(img)) {
          allImages.push(img);
        }
      });
    }
    
    return { title, description, price, from, allImages: allImages.filter(Boolean) };
  };

  // English keeps the Swedish price style it has always had ("249,00 kr")
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat(lang === 'en' ? 'sv-SE' : LOCALES[lang], {
      style: 'currency',
      currency: currency,
    }).format(price / 100);
  };

  const getVariantPrice = (variant: any) => {
    if (!variant?.retail_price) return null;
    return Math.round(parseFloat(variant.retail_price) * 100);
  };

  const getCurrentPrice = () => {
    if (!product) return 0;
    
    if (selectedVariant && product.printful_data?.variants && Array.isArray(product.printful_data.variants)) {
      const variant = product.printful_data.variants.find((v: any) => v.id?.toString() === selectedVariant);
      const variantPrice = getVariantPrice(variant);
      if (variantPrice) return variantPrice;
    }
    
    const { price } = getDisplayData(product);
    return price;
  };

  const handleAddToCart = async () => {
    if (!product) return;
    
    setPurchasing(true);
    try {
      const { title } = getDisplayData(product);
      addItem({ 
        productId: product.id, 
        title, 
        price: currentPrice, 
        currency: product.currency, 
        quantity, 
        image: product.main_image_override || product.image_url, 
        variantId: selectedVariant, 
        variantName: product.printful_data?.variants?.find((v: any) => v.id?.toString() === selectedVariant)?.name || null 
      });
      toast({ title: t.added, description: title });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: t.error,
        description: t.addFailed,
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  const nextImage = () => {
    if (!product) return;
    const { allImages } = getDisplayData(product);
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    if (!product) return;
    const { allImages } = getDisplayData(product);
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const seo = product ? getDisplayData(product) : null;
  // The product's own description (from Printful, in English) when it has one,
  // otherwise productDescription's fallback in the page's language
  const ownDescription = seo && productDescription({ title: seo.title, description: seo.description });
  const metaDescription = seo
    ? ownDescription === en.printedToOrder(seo.title) ? t.printedToOrder(seo.title) : ownDescription
    : t.metaDefault;
  usePageMeta({
    title: seo ? `${seo.title} – ${SHOP_BRAND}` : SHOP_BRAND,
    description: metaDescription,
    path: productPath(id ?? ""),
    image: seo?.allImages[0],
    jsonLd: product && seo
      ? {
          ...buildProductJsonLd(
            { id: product.id, title: seo.title, description: seo.description, price: seo.price, currency: product.currency, images: seo.allImages },
            shipping,
          ),
          description: metaDescription,
        }
      : undefined,
    ready: !loading && shippingLoaded,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <MainNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">{t.notFound}</h1>
            <Link to="/shop">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t.backToShop}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { title, description, from, allImages } = getDisplayData(product);
  const currentPrice = getCurrentPrice();
  const variants = (product.printful_data?.variants && Array.isArray(product.printful_data.variants)) ? product.printful_data.variants : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-4 md:p-6">
        <div className="container mx-auto">
          <Link to="/shop">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-foreground border-border bg-background/80 hover:bg-background/90 backdrop-blur-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t.backToShop}</span>
              <span className="sm:hidden">{t.back}</span>
            </Button>
          </Link>
        </div>
      </nav>
      
      <div className="container mx-auto px-4 py-8 pt-20">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="relative aspect-square">
                <img
                  src={allImages[currentImageIndex] || '/placeholder.svg'}
                  alt={title}
                  className="w-full h-full object-cover"
                />
                
                {allImages.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-background/80 hover:bg-background"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-background/80 hover:bg-background"
                      onClick={nextImage}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </Card>

            {/* Thumbnail Strip */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {allImages.slice(0, 4).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                      currentImageIndex === index 
                        ? 'border-primary' 
                        : 'border-border hover:border-muted-foreground'
                    }`}
                  >
                    <img
                      src={image}
                      alt={t.imageAlt(title, index + 1)}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
              <div className="text-3xl font-bold text-primary mb-4">
                {from && !selectedVariant && <span className="text-lg font-normal text-muted-foreground">{t.from}</span>}
                {formatPrice(currentPrice, product.currency)}
              </div>
              <Badge variant="secondary" className="mb-4">
                {t.inStock}
              </Badge>
            </div>

            {description && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{t.description}</h3>
                <p className="text-muted-foreground leading-relaxed">{description}</p>
              </div>
            )}

            {/* Variant Selection */}
            {variants.length > 1 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{t.options}</h3>
                <Select value={selectedVariant || ''} onValueChange={setSelectedVariant}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t.selectOption} />
                  </SelectTrigger>
                  <SelectContent>
                    {variants.map((variant) => (
                      <SelectItem key={variant.id} value={variant.id?.toString()}>
                        {variant.name} {variant.retail_price && `- ${formatPrice(getVariantPrice(variant) || 0, product.currency)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Quantity Selection */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{t.quantity}</h3>
              <Select value={quantity.toString()} onValueChange={(value) => setQuantity(parseInt(value))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Purchase Button */}
            <Card>
              <CardContent className="p-6">
                <Button
                   onClick={handleAddToCart}
                   disabled={purchasing || (variants.length > 1 && !selectedVariant)}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-lg"
                  size="lg"
                >
                  {purchasing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t.processing}
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      {t.addToCart}
                      {(variants.length <= 1 || selectedVariant) && ` - ${formatPrice(currentPrice * quantity, product.currency)}`}
                    </>
                  )}
                </Button>
                
                {variants.length > 1 && !selectedVariant && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    {t.selectToContinue}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Product Features */}
            <div className="space-y-2 text-sm text-muted-foreground">
              {shipping?.free_shipping_threshold ? (
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                  {t.freeShipping(formatPrice(shipping.free_shipping_threshold, "SEK"))}
                </div>
              ) : null}
              <div className="flex items-center">
                <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                {t.quality}
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                {t.sustainable}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;